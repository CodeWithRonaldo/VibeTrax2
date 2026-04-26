import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useReadContract } from 'wagmi'
import { parseUnits } from 'viem'
import VibeTraxABI from '../../contracts/abi/VibeTrax.json'
import { VIBETRAX_ADDRESS } from '../../config/contracts'
import { useMetadata } from '../../hooks/useMetadata'
import { useBuyTrack, useListForResale, useBuyResale, useCancelListing, useApproveMUSD } from '../../hooks/useVibeTrax'
import { formatMUSD, shortenAddress, calcPlatformFee, calcRoyalty, calcSellerProceeds } from '../../utils/format'
import { resolveIPFS } from '../../utils/pinata'
import Button from '../../components/common/Button/Button'
import Badge from '../../components/common/Badge/Badge'
import Modal from '../../components/common/Modal/Modal'
import AudioPlayer from '../../components/common/AudioPlayer/AudioPlayer'
import Input from '../../components/common/Input/Input'
import Spinner from '../../components/common/Spinner/Spinner'
import styles from './TrackDetail.module.css'

export default function TrackDetail() {
  const { trackId } = useParams()
  const { address, isConnected } = useAccount()
  const [resalePrice, setResalePrice] = useState('')
  const [showResaleModal, setShowResaleModal] = useState(false)
  const [txStatus, setTxStatus] = useState('')

  const { data: track, isLoading, refetch } = useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'getTrack',
    args: [BigInt(trackId)],
  })

  const { data: meta } = useMetadata(track ? track[1] : null)

  const { buyTrack, isPending: isBuying } = useBuyTrack()
  const { approve, isPending: isApproving } = useApproveMUSD()
  const { listForResale, isPending: isListing } = useListForResale()
  const { buyResale, isPending: isBuyingResale } = useBuyResale()
  const { cancelListing, isPending: isCancelling } = useCancelListing()

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
        <p>Loading track...</p>
      </div>
    )
  }

  if (!track) {
    return (
      <div className={styles.notFound}>
        <h2>Track not found</h2>
      </div>
    )
  }

  const [artist, metadataURI, audioURI, copies, sold, pricePerCopy, collaboratorsGetRoyalty] = track
  const available = Number(copies) - Number(sold)
  const isSoldOut = available === 0
  const cover = meta?.image ? resolveIPFS(meta.image) : null
  const audioSrc = resolveIPFS(audioURI)
  const isArtist = address?.toLowerCase() === artist?.toLowerCase()

  const handleBuy = async () => {
    try {
      setTxStatus('Approving MUSD...')
      await approve()
      setTxStatus('Purchasing...')
      await buyTrack(trackId)
      setTxStatus('Purchase successful!')
      refetch()
    } catch (e) {
      setTxStatus(`Error: ${e.shortMessage || e.message}`)
    }
  }

  const handleListResale = async () => {
    try {
      setTxStatus('Listing for resale...')
      await listForResale(trackId, resalePrice)
      setTxStatus('Listed!')
      setShowResaleModal(false)
      refetch()
    } catch (e) {
      setTxStatus(`Error: ${e.shortMessage || e.message}`)
    }
  }

  const minResalePrice = formatMUSD(pricePerCopy)

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Left: Cover + Player */}
        <div className={styles.left}>
          <div className={styles.coverWrap}>
            {cover ? (
              <img src={cover} alt={meta?.name} className={styles.cover} />
            ) : (
              <div className={styles.coverPlaceholder}>🎵</div>
            )}
          </div>

          <AudioPlayer
            src={audioSrc}
            title={meta?.name}
            artist={meta?.artist || shortenAddress(artist)}
            cover={cover}
            isOwner={false}
          />
        </div>

        {/* Right: Details */}
        <div className={styles.right}>
          <div className={styles.topRow}>
            <Badge variant="purple">Music NFT</Badge>
            {isSoldOut ? (
              <Badge variant="red">Sold Out</Badge>
            ) : (
              <Badge variant="green">{available} of {Number(copies)} available</Badge>
            )}
          </div>

          <h1 className={styles.trackTitle}>{meta?.name || 'Untitled Track'}</h1>
          <p className={styles.artistName}>
            by{' '}
            <span className={styles.artistAddress}>
              {meta?.artist || shortenAddress(artist)}
            </span>
          </p>

          {meta?.description && (
            <p className={styles.description}>{meta.description}</p>
          )}

          {meta?.genre && (
            <div className={styles.tags}>
              <Badge variant="default">{meta.genre}</Badge>
            </div>
          )}

          {/* Price box */}
          <div className={styles.priceBox}>
            <div className={styles.priceRow}>
              <div>
                <p className={styles.priceLabel}>Mint Price</p>
                <p className={styles.priceValue}>{formatMUSD(pricePerCopy)} MUSD</p>
              </div>
              <div className={styles.feeBreakdown}>
                <p className={styles.feeRow}>
                  <span>Platform fee (1%)</span>
                  <span>{formatMUSD(calcPlatformFee(pricePerCopy))} MUSD</span>
                </p>
                <p className={styles.feeRow}>
                  <span>Artist receives</span>
                  <span className={styles.feeGreen}>
                    {formatMUSD(BigInt(pricePerCopy) - calcPlatformFee(pricePerCopy))} MUSD
                  </span>
                </p>
              </div>
            </div>

            {isConnected ? (
              <Button
                fullWidth
                size="lg"
                onClick={handleBuy}
                disabled={isSoldOut || isArtist}
                loading={isBuying || isApproving}
              >
                {isSoldOut ? 'Sold Out' : isArtist ? 'Your Track' : `Buy for ${formatMUSD(pricePerCopy)} MUSD`}
              </Button>
            ) : (
              <Button fullWidth size="lg" variant="outline" disabled>
                Connect Wallet to Buy
              </Button>
            )}

            {txStatus && (
              <p className={[styles.txStatus, txStatus.startsWith('Error') ? styles.txError : styles.txOk].join(' ')}>
                {txStatus}
              </p>
            )}
          </div>

          {/* Resale section — show if connected owner */}
          {isConnected && !isArtist && (
            <div className={styles.resaleSection}>
              <h3 className={styles.resaleTitle}>Own a copy?</h3>
              <p className={styles.resaleDesc}>
                List your copy for resale. Minimum price: {minResalePrice} MUSD.
                Artist earns 1% royalty on every resale.
              </p>
              <Button variant="secondary" onClick={() => setShowResaleModal(true)}>
                List for Resale
              </Button>
            </div>
          )}

          {/* Track info */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Total copies</span>
              <span className={styles.infoValue}>{Number(copies)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Sold</span>
              <span className={styles.infoValue}>{Number(sold)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Royalties</span>
              <span className={styles.infoValue}>1%</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Collaborator royalties</span>
              <span className={styles.infoValue}>{collaboratorsGetRoyalty ? 'Yes' : 'Artist only'}</span>
            </div>
          </div>

          <div className={styles.artistCard}>
            <p className={styles.artistCardLabel}>Artist</p>
            <p className={styles.artistCardAddress}>{artist}</p>
          </div>
        </div>
      </div>

      {/* Resale modal */}
      <Modal
        isOpen={showResaleModal}
        onClose={() => setShowResaleModal(false)}
        title="List NFT for Resale"
      >
        <div className={styles.resaleModal}>
          <p className={styles.resaleModalDesc}>
            Set your resale price. Must be at least <strong>{minResalePrice} MUSD</strong> (original mint price).
          </p>

          <Input
            label="Resale Price"
            type="number"
            value={resalePrice}
            onChange={(e) => setResalePrice(e.target.value)}
            placeholder={minResalePrice}
            suffix="MUSD"
            min={minResalePrice}
            step="0.01"
          />

          {resalePrice && (
            <div className={styles.resaleBreakdown}>
              <p className={styles.breakdownRow}>
                <span>Platform fee (1%)</span>
                <span>{(parseFloat(resalePrice) * 0.01).toFixed(4)} MUSD</span>
              </p>
              <p className={styles.breakdownRow}>
                <span>Artist royalty (1%)</span>
                <span>{(parseFloat(resalePrice) * 0.01).toFixed(4)} MUSD</span>
              </p>
              <p className={[styles.breakdownRow, styles.breakdownTotal].join(' ')}>
                <span>You receive</span>
                <span>{(parseFloat(resalePrice) * 0.98).toFixed(4)} MUSD</span>
              </p>
            </div>
          )}

          <Button
            fullWidth
            onClick={handleListResale}
            loading={isListing}
            disabled={!resalePrice || parseFloat(resalePrice) < parseFloat(minResalePrice)}
          >
            List for Resale
          </Button>
        </div>
      </Modal>
    </div>
  )
}
