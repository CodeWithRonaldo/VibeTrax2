// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

/**
 * @title VibeTrax
 * @notice Music NFT marketplace on Mezo for upcoming artists.
 *
 * How it works:
 *  - Artist uploads a track with a standard (preview) audio URI and an
 *    encrypted premium CID. The encrypted CID is decrypted client-side
 *    only for wallets that own a copy of the track.
 *  - Artist sets a price per copy and total number of copies.
 *  - Artist locks in collaborators and their primary-sale share at mint time.
 *    Shares cannot be changed after minting.
 *  - One wallet can only hold one primary copy of any given track.
 *  - Primary sale proceeds: platform fee deducted first, remainder split
 *    between artist and collaborators per their agreed BPS shares.
 *  - Secondary sale proceeds: platform fee deducted, 100% of remainder
 *    goes to the reseller. Artist and collaborators receive nothing on resale.
 *  - Resale price must be >= original mint price (price floor).
 *  - Sellers can cancel and relist at any price >= mint price.
 *  - All payments are in MUSD (Bitcoin-backed stablecoin on Mezo).
 *
 * Revenue split summary:
 *  Primary:  platform fee (BPS) | collaborator shares (BPS each) | artist gets remainder
 *  Resale:   platform fee (BPS) | seller gets remainder
 */
contract VibeTrax is  ERC721Enumerable, Ownable, ReentrancyGuard {

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Platform fee in basis points (100 = 1%)
    uint256 public constant PLATFORM_FEE_BPS = 100;

    /// @notice Basis point denominator
    uint256 public constant BPS_DENOM = 10_000;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice MUSD token contract (Bitcoin-backed stablecoin on Mezo)
    IERC20 public immutable musd;

    /// @notice Wallet that receives platform fees
    address public platformWallet;

    /// @notice Total number of tracks minted so far
    uint256 public trackCount;

    /// @notice Internal counter for NFT token IDs
    uint256 public nextTokenId;

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Track {
        address artist;
        /// @dev Full IPFS URI — publicly accessible by anyone (preview/trailer)
        string standardAudioURI;
        /// @dev AES-encrypted CID — client decrypts only for verified NFT owners
        string encryptedPremiumCID;
        /// @dev IPFS URI for track metadata JSON (name, image, description, genre)
        string metadataURI;
        /// @dev Total number of purchasable copies
        uint256 copies;
        /// @dev Number of copies sold so far
        uint256 sold;
        /// @dev Price per copy in MUSD (18 decimals)
        uint256 pricePerCopy;
    }

    struct Collaborator {
        address wallet;
        /// @dev Share of primary sale proceeds in BPS (e.g. 2000 = 20%)
        uint256 shareBPS;
    }

    struct SecondaryListing {
        address seller;
        uint256 price;
        bool active;
    }

    // ─── Mappings ─────────────────────────────────────────────────────────────

    /// @notice trackId => Track
    mapping(uint256 => Track) public tracks;

    /// @notice trackId => list of collaborators with their shares
    mapping(uint256 => Collaborator[]) public trackCollaborators;

    /// @notice tokenId => trackId (which track this NFT belongs to)
    mapping(uint256 => uint256) public tokenToTrack;

    /// @notice tokenId => SecondaryListing
    mapping(uint256 => SecondaryListing) public secondaryListings;

    /// @notice trackId => wallet => whether this wallet has bought a primary copy
    mapping(uint256 => mapping(address => bool)) public hasBoughtPrimary;

    /// @notice Tracks all secondary listing token IDs for enumeration
    uint256[] private _allSecondaryListingIds;

    /// @notice tokenId => index in _allSecondaryListingIds (1-based, 0 means not present)
    mapping(uint256 => uint256) private _secondaryListingIndex;

    /// @notice Tracks all trackIds for enumeration
    uint256[] private _allTrackIds;

    // ─── Events ───────────────────────────────────────────────────────────────

    event TrackCreated(
        uint256 indexed trackId,
        address indexed artist,
        uint256 copies,
        uint256 pricePerCopy
    );

    event PrimarySale(
        uint256 indexed trackId,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price
    );

    event SecondaryListingCreated(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event SecondaryListingCancelled(
        uint256 indexed tokenId,
        address indexed seller
    );

    event SecondarySale(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price
    );

    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _musd, address _platformWallet)
        ERC721("VibeTrax Music NFT", "VTRX")
        Ownable()
    {
        require(_musd != address(0), "VibeTrax: invalid MUSD address");
        require(_platformWallet != address(0), "VibeTrax: invalid platform wallet");
        musd = IERC20(_musd);
        platformWallet = _platformWallet;
    }

    // ─── Artist: Create a Track ───────────────────────────────────────────────

    /**
     * @notice Create a new music track available for purchase as NFT copies.
     *
     * @param metadataURI          IPFS URI pointing to track metadata JSON
     *                             (should include: name, image, description, genre)
     * @param standardAudioURI     IPFS URI for the preview/trailer audio.
     *                             This is public — anyone can listen.
     * @param encryptedPremiumCID  AES-encrypted CID of the full premium audio.
     *                             The React app decrypts this only for NFT owners.
     * @param copies               Total number of purchasable NFT copies
     * @param pricePerCopy         Price per copy in MUSD (18 decimals)
     * @param collaborators        Wallet addresses of collaborators
     * @param collaboratorShares   Primary sale share for each collaborator in BPS.
     *                             Must be in the same order as collaborators array.
     *                             Artist automatically receives the remainder after
     *                             platform fee and collaborator shares are deducted.
     *
     * @return trackId             The ID assigned to this track
     */
    function createTrack(
        string calldata metadataURI,
        string calldata standardAudioURI,
        string calldata encryptedPremiumCID,
        uint256 copies,
        uint256 pricePerCopy,
        address[] calldata collaborators,
        uint256[] calldata collaboratorShares
    ) external returns (uint256 trackId) {
        require(bytes(metadataURI).length > 0, "VibeTrax: metadataURI is empty");
        require(bytes(standardAudioURI).length > 0, "VibeTrax: standardAudioURI is empty");
        require(bytes(encryptedPremiumCID).length > 0, "VibeTrax: encryptedPremiumCID is empty");
        require(copies > 0, "VibeTrax: copies must be > 0");
        require(pricePerCopy > 0, "VibeTrax: pricePerCopy must be > 0");
        require(
            collaborators.length == collaboratorShares.length,
            "VibeTrax: collaborators and shares length mismatch"
        );

        // Validate collaborator shares. Total collaborator BPS must leave
        // enough room for the platform fee and at least 1 unit for the artist.
        uint256 totalCollabBPS;
        for (uint256 i = 0; i < collaboratorShares.length; i++) {
            require(collaborators[i] != address(0), "VibeTrax: collaborator cannot be zero address");
            require(collaborators[i] != msg.sender, "VibeTrax: artist cannot be a collaborator");
            require(collaboratorShares[i] > 0, "VibeTrax: collaborator share must be > 0");
            totalCollabBPS += collaboratorShares[i];
        }
        // Total collaborator BPS + platform fee must be strictly less than BPS_DENOM
        // so the artist always receives something from a primary sale.
        require(
            totalCollabBPS + PLATFORM_FEE_BPS < BPS_DENOM,
            "VibeTrax: collaborator shares leave nothing for artist"
        );

        trackId = trackCount++;

        tracks[trackId] = Track({
            artist: msg.sender,
            standardAudioURI: standardAudioURI,
            encryptedPremiumCID: encryptedPremiumCID,
            metadataURI: metadataURI,
            copies: copies,
            sold: 0,
            pricePerCopy: pricePerCopy
        });

        for (uint256 i = 0; i < collaborators.length; i++) {
            trackCollaborators[trackId].push(Collaborator({
                wallet: collaborators[i],
                shareBPS: collaboratorShares[i]
            }));
        }

        _allTrackIds.push(trackId);

        emit TrackCreated(trackId, msg.sender, copies, pricePerCopy);
    }

    // ─── Fan: Buy Primary Copy ────────────────────────────────────────────────

    /**
     * @notice Purchase a primary copy of a track.
     *
     * Requirements:
     *  - Track must exist and have copies remaining.
     *  - Caller must not be the artist.
     *  - Caller must not already own a primary copy of this track.
     *  - Caller must have approved this contract to spend at least pricePerCopy MUSD.
     *
     * @param trackId  The track to purchase a copy of
     */
    function buyPrimaryCopy(uint256 trackId) external nonReentrant {
        Track storage track = tracks[trackId];

        require(track.artist != address(0), "VibeTrax: track does not exist");
        require(track.sold < track.copies, "VibeTrax: track is sold out");
        require(msg.sender != track.artist, "VibeTrax: artist cannot buy their own track");
        require(
            !hasBoughtPrimary[trackId][msg.sender],
            "VibeTrax: wallet already owns a primary copy of this track"
        );

        uint256 price = track.pricePerCopy;

        // Pull MUSD from buyer into this contract before doing anything else
        musd.transferFrom(msg.sender, address(this), price);

        // Mint NFT to buyer
        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        tokenToTrack[tokenId] = trackId;

        track.sold++;
        hasBoughtPrimary[trackId][msg.sender] = true;

        // Distribute payment among platform, collaborators, and artist
        _distributePrimarySale(trackId, price);

        emit PrimarySale(trackId, tokenId, msg.sender, price);
    }

    // ─── NFT Owner: List for Secondary Sale ──────────────────────────────────

    /**
     * @notice List an owned NFT copy for secondary sale.
     *
     * Requirements:
     *  - Caller must own the token.
     *  - Token must not already be listed.
     *  - Price must be >= the original mint price of the track (price floor).
     *
     * @param tokenId  The NFT token to list
     * @param price    Asking price in MUSD (must be >= track's pricePerCopy)
     */
    function listForSale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "VibeTrax: caller does not own this token");
        require(!secondaryListings[tokenId].active, "VibeTrax: token is already listed");

        uint256 trackId = tokenToTrack[tokenId];
        require(
            price >= tracks[trackId].pricePerCopy,
            "VibeTrax: price cannot be below original mint price"
        );

        secondaryListings[tokenId] = SecondaryListing({
            seller: msg.sender,
            price: price,
            active: true
        });

        // Track for enumeration
        _secondaryListingIndex[tokenId] = _allSecondaryListingIds.length + 1;
        _allSecondaryListingIds.push(tokenId);

        emit SecondaryListingCreated(tokenId, msg.sender, price);
    }

    /**
     * @notice Cancel an active secondary listing.
     *         Seller can relist afterwards at any price >= mint price.
     *
     * @param tokenId  The NFT token to delist
     */
    function cancelListing(uint256 tokenId) external {
        SecondaryListing storage listing = secondaryListings[tokenId];
        require(listing.active, "VibeTrax: token is not listed");
        require(listing.seller == msg.sender, "VibeTrax: caller is not the seller");

        listing.active = false;
        _removeSecondaryListingFromIndex(tokenId);

        emit SecondaryListingCancelled(tokenId, msg.sender);
    }

    // ─── Buyer: Purchase Secondary Listing ───────────────────────────────────

    /**
     * @notice Purchase a secondary-listed NFT.
     *
     * Secondary sale revenue model:
     *  - Platform fee is deducted.
     *  - 100% of the remainder goes to the seller.
     *  - Artist and collaborators receive nothing on secondary sales.
     *
     * Requirements:
     *  - Listing must be active.
     *  - Caller must not be the seller.
     *  - Caller must have approved this contract to spend at least listing price MUSD.
     *
     * @param tokenId  The listed NFT token to purchase
     */
    function buySecondaryCopy(uint256 tokenId) external nonReentrant {
        SecondaryListing storage listing = secondaryListings[tokenId];

        require(listing.active, "VibeTrax: token is not listed for sale");
        require(msg.sender != listing.seller, "VibeTrax: seller cannot buy their own listing");

        uint256 price = listing.price;
        address seller = listing.seller;

        listing.active = false;
        _removeSecondaryListingFromIndex(tokenId);

        // Pull MUSD from buyer
        musd.transferFrom(msg.sender, address(this), price);

        // Transfer NFT from seller to buyer
        _transfer(seller, msg.sender, tokenId);

        // Distribute secondary sale proceeds
        _distributeSecondarySale(price, seller);

        emit SecondarySale(tokenId, msg.sender, price);
    }

    // ─── Internal: Payment Distribution ──────────────────────────────────────

    /**
     * @dev Distributes primary sale proceeds.
     *      Order: platform fee first, then collaborator shares, artist gets remainder.
     */
    function _distributePrimarySale(uint256 trackId, uint256 totalPrice) internal {
        Track storage track = tracks[trackId];

        uint256 platformFee = (totalPrice * PLATFORM_FEE_BPS) / BPS_DENOM;
        uint256 remaining = totalPrice - platformFee;

        musd.transfer(platformWallet, platformFee);

        Collaborator[] storage collabs = trackCollaborators[trackId];
        for (uint256 i = 0; i < collabs.length; i++) {
            uint256 share = (totalPrice * collabs[i].shareBPS) / BPS_DENOM;
            remaining -= share;
            musd.transfer(collabs[i].wallet, share);
        }

        // Artist receives whatever is left after platform fee and all collaborator shares
        musd.transfer(track.artist, remaining);
    }

    /**
     * @dev Distributes secondary sale proceeds.
     *      Platform fee deducted, seller receives 100% of the remainder.
     *      Artist and collaborators receive nothing on secondary sales.
     */
    function _distributeSecondarySale(uint256 totalPrice, address seller) internal {
        uint256 platformFee = (totalPrice * PLATFORM_FEE_BPS) / BPS_DENOM;
        uint256 sellerProceeds = totalPrice - platformFee;

        musd.transfer(platformWallet, platformFee);
        musd.transfer(seller, sellerProceeds);
    }

    // ─── Internal: Secondary Listing Index Management ─────────────────────────

    /**
     * @dev Removes a tokenId from the _allSecondaryListingIds array efficiently
     *      by swapping with the last element and popping.
     */
    function _removeSecondaryListingFromIndex(uint256 tokenId) internal {
        uint256 index = _secondaryListingIndex[tokenId];
        if (index == 0) return; // not in the list

        uint256 arrayIndex = index - 1;
        uint256 lastTokenId = _allSecondaryListingIds[_allSecondaryListingIds.length - 1];

        _allSecondaryListingIds[arrayIndex] = lastTokenId;
        _secondaryListingIndex[lastTokenId] = index;
        _allSecondaryListingIds.pop();
        delete _secondaryListingIndex[tokenId];
    }

    // ─── Views: Track Queries ─────────────────────────────────────────────────

    /**
     * @notice Get full details of a track.
     */
    function getTrack(uint256 trackId)
        external
        view
        returns (
            address artist,
            string memory metadataURI,
            string memory standardAudioURI,
            string memory encryptedPremiumCID,
            uint256 copies,
            uint256 sold,
            uint256 pricePerCopy,
            bool availableForPrimary
        )
    {
        Track storage t = tracks[trackId];
        return (
            t.artist,
            t.metadataURI,
            t.standardAudioURI,
            t.encryptedPremiumCID,
            t.copies,
            t.sold,
            t.pricePerCopy,
            t.sold < t.copies
        );
    }

    /**
     * @notice Get collaborators and their shares for a track.
     */
    function getTrackCollaborators(uint256 trackId)
        external
        view
        returns (address[] memory wallets, uint256[] memory shares)
    {
        Collaborator[] storage collabs = trackCollaborators[trackId];
        wallets = new address[](collabs.length);
        shares = new uint256[](collabs.length);
        for (uint256 i = 0; i < collabs.length; i++) {
            wallets[i] = collabs[i].wallet;
            shares[i] = collabs[i].shareBPS;
        }
    }

    /**
     * @notice Get all trackIds that still have primary copies available.
     *         Use this to render the primary listings section of the marketplace.
     */
    function getAvailablePrimaryListings() external view returns (uint256[] memory) {
        uint256 count;
        for (uint256 i = 0; i < _allTrackIds.length; i++) {
            Track storage t = tracks[_allTrackIds[i]];
            if (t.sold < t.copies) count++;
        }

        uint256[] memory result = new uint256[](count);
        uint256 cursor;
        for (uint256 i = 0; i < _allTrackIds.length; i++) {
            Track storage t = tracks[_allTrackIds[i]];
            if (t.sold < t.copies) {
                result[cursor++] = _allTrackIds[i];
            }
        }
        return result;
    }

    // ─── Views: Secondary Listing Queries ────────────────────────────────────

    /**
     * @notice Get details of a secondary listing.
     */
    function getSecondaryListing(uint256 tokenId)
        external
        view
        returns (address seller, uint256 price, bool active)
    {
        SecondaryListing storage l = secondaryListings[tokenId];
        return (l.seller, l.price, l.active);
    }

    /**
     * @notice Get all tokenIds that are currently listed for secondary sale.
     *         Use this to render the secondary listings section of the marketplace.
     */
    function getActiveSecondaryListings() external view returns (uint256[] memory) {
        return _allSecondaryListingIds;
    }

    // ─── Views: Combined Marketplace Query ───────────────────────────────────

    /**
     * @notice Check whether a wallet owns any NFT copy of a given track.
     *         The React app uses this to decide whether to decrypt the premium CID.
     *
     * @param trackId  The track to check
     * @param wallet   The wallet to check ownership for
     * @return owned   True if the wallet owns at least one NFT copy of this track
     */
    function ownsTrackCopy(uint256 trackId, address wallet) external view returns (bool owned) {
        uint256 balance = balanceOf(wallet);
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(wallet, i);
            if (tokenToTrack[tokenId] == trackId) {
                return true;
            }
        }
        return false;
    }

    // ─── ERC721 Overrides ─────────────────────────────────────────────────────

    /**
     * @notice Returns the metadata URI for a given token.
     *         All copies of the same track share the same metadata URI.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        uint256 trackId = tokenToTrack[tokenId];
        return tracks[trackId].metadataURI;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Update the platform fee recipient wallet.
     * @param _platformWallet  New wallet address
     */
    function setPlatformWallet(address _platformWallet) external onlyOwner {
        require(_platformWallet != address(0), "VibeTrax: invalid wallet address");
        emit PlatformWalletUpdated(platformWallet, _platformWallet);
        platformWallet = _platformWallet;
    }
}