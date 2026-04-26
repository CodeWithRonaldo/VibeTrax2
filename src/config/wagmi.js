import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mezoTestnet } from './chains'

export const wagmiConfig = getDefaultConfig({
  appName: 'VibeTrax',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'vibetrax-demo',
  chains: [mezoTestnet],
  ssr: false,
})
