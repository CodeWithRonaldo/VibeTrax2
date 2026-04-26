import { useState, useRef, useEffect } from 'react'
import styles from './AudioPlayer.module.css'

export default function AudioPlayer({ src, title, artist, cover, isOwner = false, previewDuration = 30 }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const effectiveSrc = isOwner ? src : src
  const limit = isOwner ? Infinity : previewDuration

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      setProgress((audio.currentTime / audio.duration) * 100 || 0)
      if (!isOwner && audio.currentTime >= previewDuration) {
        audio.pause()
        audio.currentTime = 0
        setPlaying(false)
        setProgress(0)
      }
    }

    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => { setPlaying(false); setProgress(0) }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [isOwner, previewDuration])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }

  const seek = (e) => {
    const audio = audioRef.current
    if (!audio) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const seekTo = pct * audio.duration
    if (!isOwner && seekTo > previewDuration) return
    audio.currentTime = seekTo
    setProgress(pct * 100)
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  return (
    <div className={styles.player}>
      <audio ref={audioRef} src={effectiveSrc} preload="metadata" />

      {cover && (
        <img src={cover} alt={title} className={styles.cover} />
      )}

      <div className={styles.info}>
        <p className={styles.title}>{title || 'Unknown Track'}</p>
        <p className={styles.artist}>{artist || 'Unknown Artist'}</p>
      </div>

      <button className={styles.playBtn} onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className={styles.progressArea}>
        <div className={styles.progressBar} onClick={seek}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          {!isOwner && (
            <div
              className={styles.previewLimit}
              style={{ left: `${(previewDuration / (duration || previewDuration)) * 100}%` }}
            />
          )}
        </div>
        <div className={styles.times}>
          <span>{fmt(currentTime)}</span>
          <span>{isOwner ? fmt(duration) : `${fmt(previewDuration)} preview`}</span>
        </div>
      </div>

      {!isOwner && (
        <div className={styles.lockBadge}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Own to unlock full
        </div>
      )}
    </div>
  )
}
