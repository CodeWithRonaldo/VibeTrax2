import { useState, useEffect } from 'react'
import { resolveIPFS } from '../utils/pinata'

const cache = new Map()

export function useMetadata(uri) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!uri) return
    const url = resolveIPFS(uri)

    if (cache.has(url)) {
      setData(cache.get(url))
      return
    }

    setLoading(true)
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        cache.set(url, json)
        setData(json)
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }, [uri])

  return { data, loading, error }
}
