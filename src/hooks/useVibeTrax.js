import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { parseUnits, maxUint256 } from 'viem'
import VibeTraxABI from '../contracts/abi/VibeTrax.json'
import { VIBETRAX_ADDRESS, MUSD_ADDRESS } from '../config/contracts'

// Minimal ERC20 ABI for MUSD approval
const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
]

export function useTrackCount() {
  return useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'trackCount',
  })
}

export function useTrack(trackId) {
  return useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'getTrack',
    args: [trackId],
    enabled: trackId !== undefined && trackId !== null,
  })
}

export function useListing(tokenId) {
  return useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'getListing',
    args: [tokenId],
    enabled: tokenId !== undefined && tokenId !== null,
  })
}

export function useTokenOwner(tokenId) {
  return useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'ownerOf',
    args: [tokenId],
    enabled: tokenId !== undefined && tokenId !== null,
  })
}

export function useTokenToTrack(tokenId) {
  return useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: 'tokenToTrack',
    args: [tokenId],
    enabled: tokenId !== undefined && tokenId !== null,
  })
}

export function useMUSDBalance(address) {
  return useReadContract({
    address: MUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  })
}

export function useMintTrack() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const mintTrack = async ({
    metadataURI,
    audioURI,
    copies,
    pricePerCopy,
    collaborators,
    primaryShares,
    collaboratorsGetRoyalty,
  }) => {
    return writeContractAsync({
      address: VIBETRAX_ADDRESS,
      abi: VibeTraxABI,
      functionName: 'mintTrack',
      args: [
        metadataURI,
        audioURI,
        BigInt(copies),
        parseUnits(String(pricePerCopy), 18),
        collaborators,
        primaryShares.map((s) => BigInt(s)),
        collaboratorsGetRoyalty,
      ],
    })
  }

  return { mintTrack, isPending, isConfirming, isSuccess, hash }
}

export function useApproveMUSD() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const approve = async () => {
    return writeContractAsync({
      address: MUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [VIBETRAX_ADDRESS, maxUint256],
    })
  }

  return { approve, isPending, isConfirming, isSuccess, hash }
}

export function useBuyTrack() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const buyTrack = async (trackId) => {
    return writeContractAsync({
      address: VIBETRAX_ADDRESS,
      abi: VibeTraxABI,
      functionName: 'buyTrack',
      args: [BigInt(trackId)],
    })
  }

  return { buyTrack, isPending, isConfirming, isSuccess, hash }
}

export function useListForResale() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const listForResale = async (tokenId, price) => {
    return writeContractAsync({
      address: VIBETRAX_ADDRESS,
      abi: VibeTraxABI,
      functionName: 'listForResale',
      args: [BigInt(tokenId), parseUnits(String(price), 18)],
    })
  }

  return { listForResale, isPending, isConfirming, isSuccess, hash }
}

export function useBuyResale() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const buyResale = async (tokenId) => {
    return writeContractAsync({
      address: VIBETRAX_ADDRESS,
      abi: VibeTraxABI,
      functionName: 'buyResale',
      args: [BigInt(tokenId)],
    })
  }

  return { buyResale, isPending, isConfirming, isSuccess, hash }
}

export function useCancelListing() {
  const { writeContractAsync, isPending, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const cancelListing = async (tokenId) => {
    return writeContractAsync({
      address: VIBETRAX_ADDRESS,
      abi: VibeTraxABI,
      functionName: 'cancelListing',
      args: [BigInt(tokenId)],
    })
  }

  return { cancelListing, isPending, isConfirming, isSuccess, hash }
}
