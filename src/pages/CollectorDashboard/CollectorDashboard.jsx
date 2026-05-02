import { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import VibeTraxABI from '../../contracts/abi/VibeTrax.json'
import { VIBETRAX_ADDRESS } from '../../config/contracts'
import { useMetadata } from '../../hooks/useMetadata'
import { useMUSDBalance, useListForResale, useCancelListing } from '../../hooks/useVibeTrax'
import { formatMUSD, shortenAddress } from '../../utils/format'
import { resolveIPFS } from '../../utils/pinata'
import Badge from '../../components/common/Badge/Badge'
import Button from '../../components/common/Button/Button'
import Modal from '../../components/common/Modal/Modal'
import Input from '../../components/common/Input/Input'
import AudioPlayer from '../../components/common/AudioPlayer/AudioPlayer'
import Spinner from '../../components/common/Spinner/Spinner'
import styles from './CollectorDashboard.module.css'

function OwnedNFTCard({ tokenId, ownerAddress }) {
  const [showPlayer, setShowPlayer] = useState(false)
  const [showResale, setShowResale] = useState(false)
  const [resalePrice, setResalePrice] = useState('')
  const [txStatus, setTxStatus] = useState('')

  const { data: trackId } = useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'tokenToTrack',
    args: [BigInt(tokenId)],
  })

  const { data: track } = useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'getTrack',
    args: trackId !== undefined ? [trackId] : undefined,
    enabled: trackId !== undefined,
  })

  const { data: listing } = useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'getListing',
    args: [BigInt(tokenId)],
  })

  const { data: owner } = useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'ownerOf',
    args: [BigInt(tokenId)],
  })

  const { data: meta } = useMetadata(track ? track[1] : null)
  const { listForResale, isPending: isListing } = useListForResale()
  const { cancelListing, isPending: isCancelling } = useCancelListing()

  if (!owner || !ownerAddress || owner.toLowerCase() !== ownerAddress.toLowerCase()) return null
  if (!track) return null

  const [artist, , audioURI, , , pricePerCopy] = track
  const isListed = listing?.active
  const listedPrice = listing?.price
  const minPrice = formatMUSD(pricePerCopy)
  const cover = meta?.image ? resolveIPFS(meta.image) : null
  const audioSrc = resolveIPFS(audioURI)

  const handleList = async () => {
    try {
      setTxStatus('Listing...')
      await listForResale(tokenId, resalePrice)
      setTxStatus('Listed!')
      setShowResale(false)
    } catch (e) {
      setTxStatus(`Error: ${e.shortMessage || e.message}`)
    }
  }

  const handleCancel = async () => {
    try {
      setTxStatus('Cancelling...')
      await cancelListing(tokenId)
      setTxStatus('Cancelled')
    } catch (e) {
      setTxStatus(`Error: ${e.shortMessage || e.message}`)
    }
  }

  return (
    <div className={styles.nftCard}>
      <div className={styles.nftCoverWrap}>
        {cover ? (
          <img src={cover} alt={meta?.name} className={styles.nftCover} />
        ) : (
          <div className={styles.nftCoverPlaceholder}>🎵</div>
        )}
        {isListed && (
          <div className={styles.listedBadge}>Listed</div>
        )}
      </div>

      <div className={styles.nftInfo}>
        <div className={styles.nftTopRow}>
          <Badge variant="purple">Owned</Badge>
          <span className={styles.tokenId}>#{tokenId}</span>
        </div>

        <h3 className={styles.nftName}>{meta?.name || 'Loading...'}</h3>
        <p className={styles.nftArtist}>
          {meta?.artist || shortenAddress(artist)}
        </p>

        {isListed && (
          <div className={styles.listedPrice}>
            <span>Listed for:</span>
            <strong>{formatMUSD(listedPrice)} MUSD</strong>
          </div>
        )}

        <div className={styles.nftActions}>
          <Button variant="secondary" size="sm" onClick={() => setShowPlayer(!showPlayer)}>
            {showPlayer ? 'Hide Player' : '▶ Play'}
          </Button>
          <Link to={`/track/${trackId}`}>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
          {isListed ? (
            <Button variant="danger" size="sm" onClick={handleCancel} loading={isCancelling}>
              Cancel Listing
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowResale(true)}>
              Sell
            </Button>
          )}
        </div>

        {txStatus && (
          <p className={[styles.txStatus, txStatus.startsWith('Error') ? styles.txError : styles.txOk].join(' ')}>
            {txStatus}
          </p>
        )}

        {showPlayer && (
          <AudioPlayer
            src={audioSrc}
            title={meta?.name}
            artist={meta?.artist || shortenAddress(artist)}
            cover={cover}
            isOwner={true}
          />
        )}
      </div>

      <Modal
        isOpen={showResale}
        onClose={() => setShowResale(false)}
        title="List for Resale"
        size="sm"
      >
        <div className={styles.resaleForm}>
          <p className={styles.resaleDesc}>
            Minimum price: <strong>{minPrice} MUSD</strong>
          </p>
          <Input
            label="Your Price"
            type="number"
            value={resalePrice}
            onChange={(e) => setResalePrice(e.target.value)}
            placeholder={minPrice}
            suffix="MUSD"
            min={minPrice}
            step="0.01"
          />
          {resalePrice && (
            <div className={styles.breakdown}>
              <div className={styles.breakdownRow}>
                <span>Platform fee (1%)</span>
                <span>{(parseFloat(resalePrice) * 0.01).toFixed(4)} MUSD</span>
              </div>
              <div className={styles.breakdownRow}>
                <span>Artist royalty (1%)</span>
                <span>{(parseFloat(resalePrice) * 0.01).toFixed(4)} MUSD</span>
              </div>
              <div className={[styles.breakdownRow, styles.breakdownTotal].join(' ')}>
                <span>You receive</span>
                <span>{(parseFloat(resalePrice) * 0.98).toFixed(4)} MUSD</span>
              </div>
            </div>
          )}
          <Button
            fullWidth
            onClick={handleList}
            loading={isListing}
            disabled={!resalePrice || parseFloat(resalePrice) < parseFloat(minPrice)}
          >
            List for Resale
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default function CollectorDashboard() {
  const { address, isConnected } = useAccount()
  const queryClient = useQueryClient()
  const { data: musdBalance } = useMUSDBalance(address)

  // Invalidate all contract reads when wallet changes so ownerOf refetches
  useEffect(() => {
    queryClient.invalidateQueries()
  }, [address])

  const { data: trackCount, isLoading } = useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'trackCount',
  })

  if (!isConnected) {
    return (
      <div className={styles.gated}>
        <span>🔒</span>
        <h2>Connect your wallet</h2>
        <p>Connect to view your music collection.</p>
      </div>
    )
  }

  // We scan all token IDs (trackId × copies). Simple approach for demo.
  const count = trackCount ? Number(trackCount) : 0
  // For MVP, we scan token IDs 0..count*10 and filter by owner
  const tokenIds = Array.from({ length: count * 10 }, (_, i) => i)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Collection</h1>
          <p className={styles.address}>{shortenAddress(address)}</p>
        </div>
        <Link to="/marketplace">
          <Button variant="outline">Browse Marketplace</Button>
        </Link>
      </div>

      <div className={styles.balanceBar}>
        <div className={styles.balItem}>
          <p className={styles.balLabel}>MUSD Balance</p>
          <p className={styles.balValue}>{formatMUSD(musdBalance ?? 0n)} MUSD</p>
        </div>
        <div className={styles.balDivider} />
        <div className={styles.balItem}>
          <p className={styles.balLabel}>Network</p>
          <p className={styles.balValue}>Mezo Testnet</p>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Owned NFTs</h2>
        <p className={styles.sectionDesc}>
          Your music NFTs. Owners unlock full high-quality audio streaming.
        </p>

        {isLoading ? (
          <div className={styles.loading}><Spinner /></div>
        ) : count === 0 ? (
          <div className={styles.empty}>
            <span>🎵</span>
            <p>No tracks found. Go buy some music!</p>
            <Link to="/marketplace"><Button>Browse Marketplace</Button></Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {tokenIds.map((id) => (
              <OwnedNFTCard key={id} tokenId={id} ownerAddress={address} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
