import { Link, NavLink } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { isConnected } = useAccount()

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>🎵</span>
          <span className={styles.logoText}>VibeTrax</span>
        </Link>

        <div className={styles.links}>
          <NavLink
            to="/marketplace"
            className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
          >
            Marketplace
          </NavLink>
          {isConnected && (
            <>
              <NavLink
                to="/upload"
                className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
              >
                Upload
              </NavLink>
              <NavLink
                to="/artist-dashboard"
                className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
              >
                Artist
              </NavLink>
              <NavLink
                to="/my-collection"
                className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
              >
                My Collection
              </NavLink>
            </>
          )}
        </div>

        <div className={styles.right}>
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus="avatar"
          />
        </div>
      </div>
    </nav>
  )
}
