const PINATA_JWT = import.meta.env.VITE_PINATA_JWT
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud'

export async function uploadFileToPinata(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  })

  if (!res.ok) throw new Error('Failed to upload file to Pinata')
  const data = await res.json()
  return `ipfs://${data.IpfsHash}`
}

export async function uploadJSONToPinata(json) {
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pinataContent: json }),
  })

  if (!res.ok) throw new Error('Failed to upload JSON to Pinata')
  const data = await res.json()
  return `ipfs://${data.IpfsHash}`
}

export function resolveIPFS(uri) {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) {
    return `${PINATA_GATEWAY}/ipfs/${uri.slice(7)}`
  }
  return uri
}
