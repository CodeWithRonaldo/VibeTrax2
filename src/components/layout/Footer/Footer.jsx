import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>🎵 VibeTrax</span>
          <p className={styles.tagline}>
            Music NFT marketplace powered by Bitcoin-backed MUSD on Mezo.
          </p>
        </div>

        <div className={styles.links}>
          <Link to="/marketplace" className={styles.link}>Marketplace</Link>
          <Link to="/upload" className={styles.link}>Upload Track</Link>
          <Link to="/artist-dashboard" className={styles.link}>Artist Dashboard</Link>
          <Link to="/my-collection" className={styles.link}>My Collection</Link>
        </div>

        <div className={styles.powered}>
          <p className={styles.poweredLabel}>Powered by</p>
          <div className={styles.badges}>
            <span className={styles.badge}>Mezo</span>
            <span className={styles.badge}>MUSD</span>
            <span className={styles.badge}>Bitcoin</span>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© 2025 VibeTrax. Built on Mezo.</p>
      </div>
    </footer>
  )
}
