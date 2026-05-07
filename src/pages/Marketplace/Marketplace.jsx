import { useState } from "react";
import { useReadContract } from "wagmi";
import NFTCard from "../../components/common/NFTCard/NFTCard";
import Spinner from "../../components/common/Spinner/Spinner";
import Input from "../../components/common/Input/Input";
import styles from "./Marketplace.module.css";
import VibeTraxABI from "../../contracts/abi/VibeTrax.json";
import { VIBETRAX_ADDRESS } from "../../config/contracts";
import TrackCardFull from "./TrackCardFull";

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: trackCount, isLoading } = useReadContract({
    address: VIBETRAX_ADDRESS,
    abi: VibeTraxABI,
    functionName: "trackCount",
  });

  const count = trackCount ? Number(trackCount) : 0;

  const trackIds = Array.from({ length: count }, (_, i) => i);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Marketplace</h1>
        <p className={styles.subtitle}>
          Own the music. Every track is an NFT — buy a copy, unlock high-quality
          audio.
        </p>
      </div>

      <div className={styles.controls}>
        <Input
          placeholder="Search tracks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          prefix="🔍"
          className={styles.searchInput}
        />
        <div className={styles.filters}>
          {["all", "available", "sold out"].map((f) => (
            <button
              key={f}
              className={[
                styles.filterBtn,
                filter === f ? styles.activeFilter : "",
              ].join(" ")}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
          <p>Loading tracks...</p>
        </div>
      ) : count === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🎵</span>
          <h3>No tracks yet</h3>
          <p>Be the first to upload a music NFT on VibeTrax.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {trackIds.map((id) => (
            <TrackCardFull
              key={id}
              trackId={id}
              filter={filter}
              search={search}
            />
          ))}
        </div>
      )}
    </div>
  );
}
