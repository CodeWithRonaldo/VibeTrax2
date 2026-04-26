// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VibeTrax
 * @notice Music NFT marketplace on Mezo. Every track is minted as multiple
 *         ERC-721 copies. All payments are in MUSD (Bitcoin-backed stablecoin).
 *
 * Revenue model:
 *  - Platform fee: 1% on every sale (primary + resale)
 *  - Primary sale: remaining 99% split among artist + collaborators per defined shares
 *  - Resale royalty: 1% back to artist (+ collaborators if enabled)
 *  - Seller receives: 98% on resale
 *  - Price floor: resale price >= original mint price
 */
contract VibeTrax is ERC721, Ownable, ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant PLATFORM_FEE_BPS = 100;  // 1%
    uint256 public constant ROYALTY_BPS = 100;        // 1%
    uint256 public constant BPS_DENOM = 10_000;

    // ─── State ────────────────────────────────────────────────────────────────
    IERC20 public immutable musd;
    address public platformWallet;

    uint256 public trackCount;
    uint256 private _nextTokenId;

    struct Track {
        address artist;
        string metadataURI;   // IPFS JSON (name, image, description, genre)
        string audioURI;      // IPFS audio file
        uint256 copies;       // total mintable copies
        uint256 sold;         // copies already sold
        uint256 pricePerCopy; // in MUSD (18 decimals)
        bool collaboratorsGetRoyalty;
        // collaborators & shares stored separately
    }

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    // trackId → Track
    mapping(uint256 => Track) public tracks;
    // trackId → collaborator addresses
    mapping(uint256 => address[]) public trackCollaborators;
    // trackId → collaborator primary-sale share in BPS (e.g. 2000 = 20%)
    mapping(uint256 => mapping(address => uint256)) public collaboratorShareBPS;
    // tokenId → trackId
    mapping(uint256 => uint256) public tokenToTrack;
    // tokenId → Listing
    mapping(uint256 => Listing) public listings;

    // ─── Events ───────────────────────────────────────────────────────────────
    event TrackMinted(uint256 indexed trackId, address indexed artist, uint256 copies, uint256 pricePerCopy);
    event TrackPurchased(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event ListedForResale(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);
    event ResalePurchased(uint256 indexed tokenId, address indexed buyer, uint256 price);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _musd, address _platformWallet)
        ERC721("VibeTrax Music NFT", "VTRX")
        Ownable(msg.sender)
    {
        musd = IERC20(_musd);
        platformWallet = _platformWallet;
    }

    // ─── Artist: Mint a Track ─────────────────────────────────────────────────
    /**
     * @notice Mint a new music track as N NFT copies.
     * @param metadataURI   IPFS URI for track metadata JSON
     * @param audioURI      IPFS URI for audio file
     * @param copies        Number of purchasable copies
     * @param pricePerCopy  Price in MUSD (18 decimals)
     * @param collaborators Wallet addresses of collaborators (can be empty)
     * @param primarySharesBPS Primary sale share for each collaborator in BPS
     *                         (artist gets the remainder)
     * @param collaboratorsGetRoyalty Whether collaborators share the 1% resale royalty
     */
    function mintTrack(
        string calldata metadataURI,
        string calldata audioURI,
        uint256 copies,
        uint256 pricePerCopy,
        address[] calldata collaborators,
        uint256[] calldata primarySharesBPS,
        bool collaboratorsGetRoyalty
    ) external returns (uint256 trackId) {
        require(copies > 0, "VibeTrax: copies must be > 0");
        require(pricePerCopy > 0, "VibeTrax: price must be > 0");
        require(collaborators.length == primarySharesBPS.length, "VibeTrax: length mismatch");

        // Validate total collaborator shares < 10000 BPS (artist keeps remainder)
        uint256 totalCollab;
        for (uint256 i = 0; i < primarySharesBPS.length; i++) {
            totalCollab += primarySharesBPS[i];
        }
        require(totalCollab < BPS_DENOM, "VibeTrax: collaborator shares >= 100%");

        trackId = trackCount++;
        tracks[trackId] = Track({
            artist: msg.sender,
            metadataURI: metadataURI,
            audioURI: audioURI,
            copies: copies,
            sold: 0,
            pricePerCopy: pricePerCopy,
            collaboratorsGetRoyalty: collaboratorsGetRoyalty
        });

        for (uint256 i = 0; i < collaborators.length; i++) {
            trackCollaborators[trackId].push(collaborators[i]);
            collaboratorShareBPS[trackId][collaborators[i]] = primarySharesBPS[i];
        }

        emit TrackMinted(trackId, msg.sender, copies, pricePerCopy);
    }

    // ─── Fan: Buy Primary Copy ────────────────────────────────────────────────
    /**
     * @notice Purchase a primary-sale copy of a track.
     *         Buyer must have approved this contract to spend MUSD.
     */
    function buyTrack(uint256 trackId) external nonReentrant {
        Track storage track = tracks[trackId];
        require(track.artist != address(0), "VibeTrax: track does not exist");
        require(track.sold < track.copies, "VibeTrax: sold out");
        require(msg.sender != track.artist, "VibeTrax: artist cannot buy own track");

        uint256 price = track.pricePerCopy;
        musd.transferFrom(msg.sender, address(this), price);

        // Mint token
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        tokenToTrack[tokenId] = trackId;
        track.sold++;

        // Distribute payment
        _distributePrimary(trackId, price);

        emit TrackPurchased(tokenId, msg.sender, price);
    }

    // ─── Owner: List for Resale ────────────────────────────────────────────────
    /**
     * @notice List an owned NFT copy for resale.
     * @param tokenId  The NFT token to list
     * @param price    Resale price in MUSD — must be >= original mint price
     */
    function listForResale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "VibeTrax: not owner");
        require(!listings[tokenId].active, "VibeTrax: already listed");

        uint256 trackId = tokenToTrack[tokenId];
        uint256 mintPrice = tracks[trackId].pricePerCopy;
        require(price >= mintPrice, "VibeTrax: price below floor");

        listings[tokenId] = Listing({ seller: msg.sender, price: price, active: true });

        emit ListedForResale(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) external {
        require(listings[tokenId].active, "VibeTrax: not listed");
        require(listings[tokenId].seller == msg.sender, "VibeTrax: not seller");
        listings[tokenId].active = false;
        emit ListingCancelled(tokenId);
    }

    // ─── Buyer: Buy Resale ────────────────────────────────────────────────────
    /**
     * @notice Purchase a resale-listed NFT.
     */
    function buyResale(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.active, "VibeTrax: not listed");
        require(msg.sender != listing.seller, "VibeTrax: seller cannot buy own listing");

        uint256 price = listing.price;
        address seller = listing.seller;
        listing.active = false;

        musd.transferFrom(msg.sender, address(this), price);

        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);

        // Distribute resale proceeds
        _distributeResale(tokenId, price, seller);

        emit ResalePurchased(tokenId, msg.sender, price);
    }

    // ─── Internal: Payment Distribution ──────────────────────────────────────
    function _distributePrimary(uint256 trackId, uint256 totalPrice) internal {
        Track storage track = tracks[trackId];

        // 1% platform fee
        uint256 platformFee = (totalPrice * PLATFORM_FEE_BPS) / BPS_DENOM;
        uint256 remaining = totalPrice - platformFee;
        musd.transfer(platformWallet, platformFee);

        // Distribute collaborator shares
        address[] storage collabs = trackCollaborators[trackId];
        for (uint256 i = 0; i < collabs.length; i++) {
            uint256 share = (totalPrice * collaboratorShareBPS[trackId][collabs[i]]) / BPS_DENOM;
            remaining -= share;
            musd.transfer(collabs[i], share);
        }

        // Artist gets the remainder
        musd.transfer(track.artist, remaining);
    }

    function _distributeResale(uint256 tokenId, uint256 totalPrice, address seller) internal {
        uint256 trackId = tokenToTrack[tokenId];
        Track storage track = tracks[trackId];

        // 1% platform fee
        uint256 platformFee = (totalPrice * PLATFORM_FEE_BPS) / BPS_DENOM;
        // 1% royalty
        uint256 royalty = (totalPrice * ROYALTY_BPS) / BPS_DENOM;
        // Seller gets 98%
        uint256 sellerProceeds = totalPrice - platformFee - royalty;

        musd.transfer(platformWallet, platformFee);
        musd.transfer(seller, sellerProceeds);

        // Distribute royalty
        if (track.collaboratorsGetRoyalty) {
            _distributeRoyaltyWithCollaborators(trackId, royalty);
        } else {
            musd.transfer(track.artist, royalty);
        }
    }

    function _distributeRoyaltyWithCollaborators(uint256 trackId, uint256 royalty) internal {
        Track storage track = tracks[trackId];
        address[] storage collabs = trackCollaborators[trackId];

        // Calculate total collaborator share BPS for ratio calculation
        uint256 totalCollabBPS;
        for (uint256 i = 0; i < collabs.length; i++) {
            totalCollabBPS += collaboratorShareBPS[trackId][collabs[i]];
        }
        uint256 artistBPS = BPS_DENOM - totalCollabBPS;
        uint256 totalBPS = BPS_DENOM; // 10000

        uint256 remaining = royalty;
        for (uint256 i = 0; i < collabs.length; i++) {
            uint256 share = (royalty * collaboratorShareBPS[trackId][collabs[i]]) / totalBPS;
            remaining -= share;
            musd.transfer(collabs[i], share);
        }

        // Artist gets their proportion of royalty
        musd.transfer(track.artist, remaining);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function getTrack(uint256 trackId)
        external
        view
        returns (
            address artist,
            string memory metadataURI,
            string memory audioURI,
            uint256 copies,
            uint256 sold,
            uint256 pricePerCopy,
            bool collaboratorsGetRoyalty
        )
    {
        Track storage t = tracks[trackId];
        return (t.artist, t.metadataURI, t.audioURI, t.copies, t.sold, t.pricePerCopy, t.collaboratorsGetRoyalty);
    }

    function getListing(uint256 tokenId)
        external
        view
        returns (address seller, uint256 price, bool active)
    {
        Listing storage l = listings[tokenId];
        return (l.seller, l.price, l.active);
    }

    function getTrackCollaborators(uint256 trackId) external view returns (address[] memory) {
        return trackCollaborators[trackId];
    }

    function getCollaboratorShare(uint256 trackId, address collaborator) external view returns (uint256) {
        return collaboratorShareBPS[trackId][collaborator];
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setPlatformWallet(address _platformWallet) external onlyOwner {
        platformWallet = _platformWallet;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        uint256 trackId = tokenToTrack[tokenId];
        return tracks[trackId].metadataURI;
    }
}
