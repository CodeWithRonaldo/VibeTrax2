import { getConfig } from "@mezo-org/passport";

export const wagmiConfig = getConfig({
  appName: "VibeTrax",
  walletConnectProjectId:
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "vibetrax-demo",
  mezoNetwork: "testnet",
});
