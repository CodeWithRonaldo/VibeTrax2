import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useReadContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import VibeTraxABI from '../../contracts/abi/VibeTrax.json'
import { VIBETRAX_ADDRESS } from '../../config/contracts'
import { useMetadata } from '../../hooks/useMetadata'
import { useMUSDBalance } from '../../hooks/useVibeTrax'
import { formatMUSD, shortenAddress } from '../../utils/format'
import { resolveIPFS } from '../../utils/pinata'
import Badge from '../../components/common/Badge/Badge'
import Button from '../../components/common/Button/Button'
import Spinner from '../../components/common/Spinner/Spinner'
import styles from './ArtistDashboard.module.css'

function ArtistTrackRow({ trackId, artistAddress, onVisible }) {
  const { data: track } = useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'getTrack',
    args: [BigInt(trackId)],
  })

  const { data: meta } = useMetadata(track ? track[1] : null)

  const artist = track?.[0]
  const isOwner = !!track && !!artistAddress && artist?.toLowerCase() === artistAddress?.toLowerCase()

  // Must be in a useEffect — never call state setters during render
  useEffect(() => {
    if (isOwner) onVisible?.(trackId)
  }, [isOwner, trackId])

  if (!track || !artistAddress || !isOwner) return null

  const [, , , , copies, sold, pricePerCopy] = track
  const available = Number(copies) - Number(sold)
  const revenue = BigInt(pricePerCopy) * BigInt(sold)
  const cover = meta?.image ? resolveIPFS(meta.image) : null

  return (
    <div className={styles.trackRow}>
      <div className={styles.trackLeft}>
        <div className={styles.trackCover}>
          {cover ? <img src={cover} alt={meta?.name} /> : <span>🎵</span>}
        </div>
        <div>
          <p className={styles.trackName}>{meta?.name || 'Loading...'}</p>
          <p className={styles.trackMeta}>{meta?.genre || 'Unknown genre'}</p>
        </div>
      </div>
      <div className={styles.trackStats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{Number(sold)}/{Number(copies)}</span>
          <span className={styles.statLbl}>Sold</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{formatMUSD(revenue)}</span>
          <span className={styles.statLbl}>Gross MUSD</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{formatMUSD(pricePerCopy)}</span>
          <span className={styles.statLbl}>Price</span>
        </div>
        <Badge variant={available > 0 ? 'green' : 'red'}>
          {available > 0 ? `${available} left` : 'Sold out'}
        </Badge>
      </div>
      <Link to={`/track/${trackId}`}>
        <Button variant="ghost" size="sm">View →</Button>
      </Link>
    </div>
  )
}

export default function ArtistDashboard() {
  const { address, isConnected } = useAccount()
  const queryClient = useQueryClient()
  const { data: musdBalance } = useMUSDBalance(address)

  // Invalidate all contract reads when wallet changes
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
        <span className={styles.gatedIcon}>🔒</span>
        <h2>Connect your wallet</h2>
        <p>Connect to view your artist dashboard.</p>
      </div>
    )
  }

  const count = trackCount ? Number(trackCount) : 0
  const trackIds = Array.from({ length: count }, (_, i) => i)
  const [visibleTrackIds, setVisibleTrackIds] = useState(new Set())

  // Reset when address or trackCount changes
  useEffect(() => { setVisibleTrackIds(new Set()) }, [address, count])

  const handleTrackVisible = (trackId) => {
    setVisibleTrackIds((prev) => {
      if (prev.has(trackId)) return prev
      const next = new Set(prev)
      next.add(trackId)
      return next
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Artist Dashboard</h1>
          <p className={styles.address}>{shortenAddress(address)}</p>
        </div>
        <Link to="/upload">
          <Button>+ Upload Track</Button>
        </Link>
      </div>

      {/* Balance card */}
      <div className={styles.balanceCard}>
        <div className={styles.balanceItem}>
          <p className={styles.balanceLabel}>MUSD Balance</p>
          <p className={styles.balanceValue}>{formatMUSD(musdBalance ?? 0n)} MUSD</p>
          <p className={styles.balanceSub}>Bitcoin-backed stablecoin</p>
        </div>
        <div className={styles.balanceDivider} />
        <div className={styles.balanceItem}>
          <p className={styles.balanceLabel}>Your Tracks</p>
          <p className={styles.balanceValue}>{visibleTrackIds.size}</p>
          <p className={styles.balanceSub}>Tracks you uploaded</p>
        </div>
        <div className={styles.balanceDivider} />
        <div className={styles.balanceItem}>
          <p className={styles.balanceLabel}>Network</p>
          <p className={styles.balanceValue}>Mezo</p>
          <p className={styles.balanceSub}>Testnet · Chain 31611</p>
        </div>
      </div>

      {/* Tracks */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Your Tracks</h2>

        {isLoading ? (
          <div className={styles.loading}><Spinner /></div>
        ) : count === 0 ? (
          <div className={styles.empty}>
            <span>🎵</span>
            <p>No tracks yet. Upload your first track!</p>
            <Link to="/upload"><Button variant="outline">Upload Track</Button></Link>
          </div>
        ) : (
          <div className={styles.trackList}>
            {trackIds.map((id) => (
              <ArtistTrackRow key={id} trackId={id} artistAddress={address} onVisible={handleTrackVisible} />
            ))}
          </div>
        )}
      </div>

      {/* Revenue info */}
      <div className={styles.infoSection}>
        <h2 className={styles.sectionTitle}>Revenue Breakdown</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>💸</span>
            <h3>Primary Sales</h3>
            <p>You receive your defined share % from every first-time purchase, minus the 1% platform fee.</p>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>🔄</span>
            <h3>Resale Royalties</h3>
            <p>Earn 1% on every resale of your music NFTs — automatically paid on-chain to your wallet.</p>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>👥</span>
            <h3>Collaborators</h3>
            <p>Your collaborators receive their defined share on primary sales. Resale royalties flow per your settings.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
