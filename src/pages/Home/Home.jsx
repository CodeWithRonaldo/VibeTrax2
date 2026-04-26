import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Button from '../../components/common/Button/Button'
import styles from './Home.module.css'

const HOW_IT_WORKS = [
  {
    icon: '🎵',
    step: '01',
    title: 'Artists Upload',
    desc: 'Upload your track, set how many NFT copies to mint, price in MUSD, and optionally split revenue with collaborators.',
  },
  {
    icon: '🛒',
    step: '02',
    title: 'Fans Buy & Own',
    desc: 'Purchase a copy to own it. Owners unlock high-quality audio streaming anytime.',
  },
  {
    icon: '💸',
    step: '03',
    title: 'Instant Payouts',
    desc: 'Revenue splits automatically on-chain — artist, collaborators, and platform all paid in MUSD instantly.',
  },
  {
    icon: '🔄',
    step: '04',
    title: 'Resell Freely',
    desc: "List your NFT at any price above the original mint price. Royalties flow back to the artist on every resale.",
  },
]

const STATS = [
  { label: 'Platform Fee', value: '1%', sub: 'on every sale' },
  { label: 'Resale Royalty', value: '1%', sub: 'back to artists' },
  { label: 'Currency', value: 'MUSD', sub: 'Bitcoin-backed stablecoin' },
  { label: 'Network', value: 'Mezo', sub: 'EVM · Chain 31611' },
]

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>Built on Mezo · Powered by MUSD</div>
          <h1 className={styles.heroTitle}>
            Own the music.<br />
            <span className={styles.gradient}>Support the artist.</span>
          </h1>
          <p className={styles.heroDesc}>
            VibeTrax is a music NFT marketplace where every track is tokenized.
            Buy a copy to unlock high-quality audio. Artists and collaborators
            get paid automatically in Bitcoin-backed MUSD.
          </p>
          <div className={styles.heroCTAs}>
            <Link to="/marketplace">
              <Button size="lg">Explore Marketplace</Button>
            </Link>
            {isConnected ? (
              <Link to="/upload">
                <Button size="lg" variant="outline">Upload Your Track</Button>
              </Link>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <Button size="lg" variant="outline" onClick={openConnectModal}>
                    Connect Wallet
                  </Button>
                )}
              </ConnectButton.Custom>
            )}
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.vinylOuter}>
            <div className={styles.vinylInner}>
              <div className={styles.vinylDot} />
            </div>
          </div>
          <div className={styles.floatingCard}>
            <div className={styles.fcTop}>
              <span className={styles.fcDot} />
              <span className={styles.fcLabel}>MUSD</span>
            </div>
            <p className={styles.fcPrice}>150 MUSD</p>
            <p className={styles.fcSub}>NFT Copy · 1 of 50</p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className={styles.statsBar}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.stat}>
            <p className={styles.statValue}>{s.value}</p>
            <p className={styles.statLabel}>{s.label}</p>
            <p className={styles.statSub}>{s.sub}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionDesc}>
            Transparent, on-chain music ownership — no intermediaries.
          </p>
        </div>
        <div className={styles.howGrid}>
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className={styles.howCard}>
              <div className={styles.howIcon}>{item.icon}</div>
              <span className={styles.howStep}>{item.step}</span>
              <h3 className={styles.howTitle}>{item.title}</h3>
              <p className={styles.howDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MUSD callout */}
      <section className={styles.musdSection}>
        <div className={styles.musdCard}>
          <div className={styles.musdLeft}>
            <span className={styles.musdBadge}>MUSD</span>
            <h2 className={styles.musdTitle}>Bitcoin-backed payments</h2>
            <p className={styles.musdDesc}>
              All transactions on VibeTrax use MUSD — Mezo's native stablecoin
              backed by Bitcoin collateral. Buy music, earn royalties, and get
              paid without ever selling your Bitcoin.
            </p>
            <Link to="/marketplace">
              <Button>Browse Tracks</Button>
            </Link>
          </div>
          <div className={styles.musdRight}>
            <div className={styles.musdFlow}>
              <div className={styles.musdFlowItem}>
                <span>🔒</span>
                <p>BTC as collateral</p>
              </div>
              <div className={styles.musdArrow}>→</div>
              <div className={styles.musdFlowItem}>
                <span>💵</span>
                <p>Mint MUSD</p>
              </div>
              <div className={styles.musdArrow}>→</div>
              <div className={styles.musdFlowItem}>
                <span>🎵</span>
                <p>Buy music NFTs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Ready to get started?</h2>
        <p className={styles.ctaDesc}>
          Connect your wallet, browse tracks, or upload your first music NFT.
        </p>
        <div className={styles.ctaBtns}>
          <Link to="/marketplace">
            <Button size="lg">Explore Marketplace</Button>
          </Link>
          {isConnected && (
            <Link to="/upload">
              <Button size="lg" variant="secondary">Upload Track</Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
