import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import { useMintTrack } from '../../hooks/useVibeTrax'
import { uploadFileToPinata, uploadJSONToPinata } from '../../utils/pinata'
import Button from '../../components/common/Button/Button'
import Input from '../../components/common/Input/Input'
import CollaboratorRow from '../../components/common/CollaboratorRow/CollaboratorRow'
import styles from './Upload.module.css'

const EMPTY_COLLABORATOR = { address: '', share: '' }

export default function Upload() {
  const { isConnected, address } = useAccount()
  const navigate = useNavigate()
  const { mintTrack, isPending, isConfirming } = useMintTrack()

  const [form, setForm] = useState({
    name: '',
    description: '',
    genre: '',
    artist: '',
    copies: '',
    price: '',
  })
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [collaborators, setCollaborators] = useState([])
  const [artistShare, setArtistShare] = useState(100)
  const [collaboratorsGetRoyalty, setCollaboratorsGetRoyalty] = useState(false)
  const [uploadStep, setUploadStep] = useState('')
  const [error, setError] = useState('')

  if (!isConnected) {
    return (
      <div className={styles.gated}>
        <span className={styles.gatedIcon}>🔒</span>
        <h2>Connect your wallet</h2>
        <p>You need to connect a wallet to upload a track.</p>
      </div>
    )
  }

  const totalCollabShare = collaborators.reduce((sum, c) => sum + (parseFloat(c.share) || 0), 0)
  const myShare = 100 - totalCollabShare

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addCollaborator = () => {
    setCollaborators((prev) => [...prev, { ...EMPTY_COLLABORATOR }])
  }

  const updateCollaborator = (index, field, value) => {
    setCollaborators((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    )
  }

  const removeCollaborator = (index) => {
    setCollaborators((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    if (!form.name) return 'Track name is required'
    if (!form.copies || Number(form.copies) < 1) return 'Must mint at least 1 copy'
    if (!form.price || Number(form.price) <= 0) return 'Price must be greater than 0'
    if (!audioFile) return 'Please upload an audio file'
    if (totalCollabShare >= 100) return 'Collaborator shares must total less than 100%'
    for (const c of collaborators) {
      if (!c.address || !c.address.startsWith('0x')) return 'All collaborator addresses must be valid'
      if (!c.share || parseFloat(c.share) <= 0) return 'All collaborator shares must be > 0'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    try {
      setUploadStep('Uploading audio...')
      const audioURI = await uploadFileToPinata(audioFile)

      let coverURI = ''
      if (coverFile) {
        setUploadStep('Uploading cover art...')
        coverURI = await uploadFileToPinata(coverFile)
      }

      setUploadStep('Uploading metadata...')
      const metadataURI = await uploadJSONToPinata({
        name: form.name,
        description: form.description,
        genre: form.genre,
        artist: form.artist || address,
        image: coverURI,
        audio: audioURI,
      })

      setUploadStep('Minting NFT on Mezo...')
      const collabAddresses = collaborators.map((c) => c.address)
      // Shares in basis points: artist gets myShare%, collabs get their shares
      // We pass all parties: [artist, ...collabs] with [myShare, ...collabShares]
      const allAddresses = [address, ...collabAddresses]
      const allShares = [myShare * 100, ...collaborators.map((c) => parseFloat(c.share) * 100)]

      await mintTrack({
        metadataURI,
        audioURI,
        copies: form.copies,
        pricePerCopy: form.price,
        collaborators: allAddresses,
        primaryShares: allShares,
        collaboratorsGetRoyalty,
      })

      setUploadStep('Minted successfully!')
      setTimeout(() => navigate('/artist-dashboard'), 1500)
    } catch (e) {
      setError(e.shortMessage || e.message || 'Upload failed')
      setUploadStep('')
    }
  }

  const busy = isPending || isConfirming || uploadStep !== '' && !uploadStep.includes('success')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Upload Track</h1>
        <p className={styles.subtitle}>
          Mint your music as an NFT. Set the price, copies, and collaborator revenue splits.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.grid}>
          {/* Left column */}
          <div className={styles.leftCol}>
            {/* Cover upload */}
            <div className={styles.coverUpload}>
              <label className={styles.coverLabel} htmlFor="cover">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className={styles.coverPreview} />
                ) : (
                  <div className={styles.coverPlaceholder}>
                    <span>🖼️</span>
                    <p>Upload Cover Art</p>
                    <span className={styles.coverHint}>JPG, PNG, GIF — recommended 1:1</span>
                  </div>
                )}
              </label>
              <input
                id="cover"
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className={styles.fileInput}
              />
            </div>

            {/* Audio upload */}
            <div className={styles.audioUpload}>
              <label className={styles.audioLabel}>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                  className={styles.fileInput}
                />
                <div className={[styles.audioBox, audioFile ? styles.audioSet : ''].join(' ')}>
                  <span>{audioFile ? '🎵' : '🎧'}</span>
                  <p>{audioFile ? audioFile.name : 'Upload Audio File'}</p>
                  <span className={styles.coverHint}>MP3, WAV, FLAC</span>
                </div>
              </label>
            </div>
          </div>

          {/* Right column */}
          <div className={styles.rightCol}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Track Details</h2>
              <div className={styles.fields}>
                <Input
                  label="Track Name"
                  required
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="e.g. Midnight Drive"
                />
                <Input
                  label="Artist Name"
                  value={form.artist}
                  onChange={(e) => handleFormChange('artist', e.target.value)}
                  placeholder="Your artist name"
                />
                <Input
                  label="Genre"
                  value={form.genre}
                  onChange={(e) => handleFormChange('genre', e.target.value)}
                  placeholder="e.g. Afrobeats, R&B, Hip Hop"
                />
                <div className={styles.fieldGroup}>
                  <label className={styles.textareaLabel}>Description</label>
                  <textarea
                    className={styles.textarea}
                    value={form.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Tell the story behind this track..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>NFT Settings</h2>
              <div className={styles.fields}>
                <div className={styles.twoCol}>
                  <Input
                    label="Number of Copies"
                    type="number"
                    required
                    value={form.copies}
                    onChange={(e) => handleFormChange('copies', e.target.value)}
                    placeholder="e.g. 50"
                    min={1}
                    hint="How many NFT copies fans can buy"
                  />
                  <Input
                    label="Price per Copy"
                    type="number"
                    required
                    value={form.price}
                    onChange={(e) => handleFormChange('price', e.target.value)}
                    placeholder="e.g. 100"
                    suffix="MUSD"
                    min={0.01}
                    step={0.01}
                  />
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitleRow}>
                <h2 className={styles.sectionTitle}>Collaborators</h2>
                <Button type="button" variant="outline" size="sm" onClick={addCollaborator}>
                  + Add
                </Button>
              </div>

              <div className={styles.artistShareRow}>
                <span className={styles.artistShareLabel}>Your share (artist)</span>
                <span className={[styles.artistShareValue, myShare < 0 ? styles.shareError : ''].join(' ')}>
                  {myShare.toFixed(1)}%
                </span>
              </div>

              {collaborators.length > 0 && (
                <div className={styles.collaboratorList}>
                  {collaborators.map((c, i) => (
                    <CollaboratorRow
                      key={i}
                      index={i}
                      collaborator={c}
                      onChange={updateCollaborator}
                      onRemove={removeCollaborator}
                    />
                  ))}
                </div>
              )}

              {collaborators.length > 0 && (
                <div className={styles.royaltyToggle}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={collaboratorsGetRoyalty}
                      onChange={(e) => setCollaboratorsGetRoyalty(e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span>Collaborators receive 1% resale royalty (split by share ratio)</span>
                  </label>
                  <p className={styles.royaltyHint}>
                    If unchecked, you (the artist) receive the full 1% royalty on resales.
                  </p>
                </div>
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {uploadStep && <p className={styles.step}>{uploadStep}</p>}

            <Button type="submit" fullWidth size="lg" loading={busy} disabled={busy}>
              {busy ? uploadStep || 'Uploading...' : 'Mint Track NFT'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
