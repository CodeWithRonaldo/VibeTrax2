import { formatUnits, parseUnits } from 'viem'

// MUSD has 18 decimals
export const MUSD_DECIMALS = 18

export function formatMUSD(amount) {
  if (!amount && amount !== 0n) return '0'
  try {
    const formatted = formatUnits(BigInt(amount), MUSD_DECIMALS)
    const num = parseFloat(formatted)
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2)
  } catch {
    return '0'
  }
}

export function parseMUSD(amount) {
  try {
    return parseUnits(String(amount), MUSD_DECIMALS)
  } catch {
    return 0n
  }
}

export function shortenAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatDate(timestamp) {
  if (!timestamp) return ''
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function calcPlatformFee(price) {
  if (!price && price !== 0n) return 0n
  return (BigInt(price) * 100n) / 10000n
}

export function calcRoyalty(price) {
  if (!price && price !== 0n) return 0n
  return (BigInt(price) * 100n) / 10000n
}

export function calcSellerProceeds(price) {
  const fee = calcPlatformFee(price)
  const royalty = calcRoyalty(price)
  return BigInt(price) - fee - royalty
}
