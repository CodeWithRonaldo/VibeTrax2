import { Link } from 'react-router-dom'
import Badge from '../Badge/Badge'
import styles from './NFTCard.module.css'
import { formatMUSD } from '../../../utils/format'
import { resolveIPFS } from '../../../utils/pinata'

export default function NFTCard({ track, trackId }) {
  if (!track) return null

  const { artist, metadataURI, copies, sold, pricePerCopy } = track
  const available = Number(copies) - Number(sold)
  const coverUrl = resolveIPFS(metadataURI)

  return (
    <Link to={`/track/${trackId}`} className={styles.card}>
      <div className={styles.coverWrap}>
        <img
          src={coverUrl}
          alt="Track cover"
          className={styles.cover}
          onError={(e) => { e.target.src = '/placeholder-cover.png' }}
        />
        <div className={styles.overlay}>
          <span className={styles.playIcon}>▶</span>
        </div>
        {available === 0 && (
          <div className={styles.soldOut}>Sold Out</div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.topRow}>
          <Badge variant="purple">Music NFT</Badge>
          <span className={styles.copies}>
            {available}/{Number(copies)} left
          </span>
        </div>

        <h3 className={styles.title}>Loading...</h3>
        <p className={styles.artist}>{artist?.slice(0, 6)}...{artist?.slice(-4)}</p>

        <div className={styles.bottom}>
          <div className={styles.price}>
            <span className={styles.priceLabel}>Price</span>
            <span className={styles.priceValue}>{formatMUSD(pricePerCopy)} MUSD</span>
          </div>
          <div className={styles.buyBtn}>Buy</div>
        </div>
      </div>
    </Link>
  )
}
