import { useReadContract } from 'wagmi'
import { Link } from 'react-router-dom'
import VibeTraxABI from '../../contracts/abi/VibeTrax.json'
import { VIBETRAX_ADDRESS } from '../../config/contracts'
import { useMetadata } from '../../hooks/useMetadata'
import { formatMUSD } from '../../utils/format'
import { resolveIPFS } from '../../utils/pinata'
import Badge from '../../components/common/Badge/Badge'
import styles from './TrackCardFull.module.css'

export default function TrackCardFull({ trackId, filter, search }) {
  const { data: track } = useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'getTrack',
    args: [BigInt(trackId)],
  })

  const { data: meta } = useMetadata(track ? track[1] : null)

  if (!track) return null

  const [artist, , , , copies, sold, pricePerCopy] = track
  const available = Number(copies) - Number(sold)
  const isSoldOut = available === 0

  // Apply filters
  if (filter === 'available' && isSoldOut) return null
  if (filter === 'sold out' && !isSoldOut) return null
  if (search && meta?.name && !meta.name.toLowerCase().includes(search.toLowerCase())) return null

  const cover = meta?.image ? resolveIPFS(meta.image) : null

  return (
    <Link to={`/track/${trackId}`} className={styles.card}>
      <div className={styles.coverWrap}>
        {cover ? (
          <img src={cover} alt={meta?.name} className={styles.cover} />
        ) : (
          <div className={styles.coverPlaceholder}>🎵</div>
        )}
        <div className={styles.overlay}>
          <span className={styles.playIcon}>▶</span>
        </div>
        {isSoldOut && <div className={styles.soldOut}>Sold Out</div>}
      </div>

      <div className={styles.info}>
        <div className={styles.topRow}>
          <Badge variant="purple">Music NFT</Badge>
          <span className={styles.copies}>{available}/{Number(copies)} left</span>
        </div>
        <h3 className={styles.title}>{meta?.name || 'Loading...'}</h3>
        <p className={styles.artist}>{meta?.artist || `${artist?.slice(0, 6)}...${artist?.slice(-4)}`}</p>
        <div className={styles.bottom}>
          <div>
            <p className={styles.priceLabel}>Price</p>
            <p className={styles.price}>{formatMUSD(pricePerCopy)} MUSD</p>
          </div>
          <div className={styles.buyBtn}>Buy</div>
        </div>
      </div>
    </Link>
  )
}
