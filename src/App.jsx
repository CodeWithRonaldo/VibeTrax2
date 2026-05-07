import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { wagmiConfig } from "./config/wagmi";
import Layout from "./components/layout/Layout/Layout";
import Home from "./pages/Home/Home";
import Marketplace from "./pages/Marketplace/Marketplace";
import TrackDetail from "./pages/TrackDetail/TrackDetail";
import Upload from "./pages/Upload/Upload";
import ArtistDashboard from "./pages/ArtistDashboard/ArtistDashboard";
import CollectorDashboard from "./pages/CollectorDashboard/CollectorDashboard";
import "@rainbow-me/rainbowkit/styles.css";
import { mezoTestnet } from "@mezo-org/passport";

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#7c3aed",
            accentColorForeground: "white",
            borderRadius: "medium",
            fontStack: "system",
          })}
          initialChain={mezoTestnet}
        >
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/track/:trackId" element={<TrackDetail />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/artist-dashboard" element={<ArtistDashboard />} />
                <Route path="/my-collection" element={<CollectorDashboard />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
