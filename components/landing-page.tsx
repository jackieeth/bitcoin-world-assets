"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Ordiscan } from "ordiscan";
import { Gallery, Item } from "@/components/gallery";

// Global cache for JSON content keyed by part
const blockJsonCache = new Map<number, any>();

interface LandingPageProps {
  onSearch: (query: string) => void;
}

export function LandingPage({ onSearch }: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rareSats, setRareSats] = useState<
    { blockNumber: number; satStash: number; sattributes: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [awaitGalleryItems, setAwaitGalleryItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    // Only navigate for non-BTC address searches.
    if (!trimmedQuery.startsWith("bc1")) {
      onSearch(trimmedQuery);
    }
    // If the query is a BTC address, we don't call onSearch,
    // so the Gallery component will display the fetched rare sats.
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    // Use a small timeout to ensure the state updates before submitting
    setTimeout(() => onSearch(suggestion), 10);
  };

  const satToBlock = (satNumber: number) => {
    const blockReward0 = 5000000000;
    const halvingInv = 210000;
    let epoch = 0;
    const blockReward = (epoch: number) => {
      return blockReward0 / 2 ** epoch;
    };
    const maxSatNumInEpoch = (epoch: number) => {
      // inclusive ending
      let halvingYear = 2012;
      let maxSatNum = 0;
      for (let index = 0; index < epoch; index++) {
        const reward = blockReward(index);
        maxSatNum += reward * halvingInv;
        halvingYear += 4;
      }
      return maxSatNum;
    };

    // check the epoch
    let maxEpochSat = 0;
    while (satNumber >= maxEpochSat) {
      epoch += 1;
      maxEpochSat = maxSatNumInEpoch(epoch);
    }
    const targetBlockOffset =
      (satNumber - maxSatNumInEpoch(epoch - 1)) / blockReward(epoch - 1);
    return Number(halvingInv * (epoch - 1) + targetBlockOffset);
  };

  // New handler for paste events
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData("Text").trim();
    // if (pasteData.startsWith("bc1")) { // basic validation for BTC address
    // setSearchQuery(pasteData); // update the state with the pasted BTC address
    setLoading(true); // start loading immediately when BTC address is pasted
    try {
      const apiKey = process.env.NEXT_PUBLIC_ORDISCAN_API_KEY;
      if (!apiKey) throw new Error("API key not provided");
      const ordiscan = new Ordiscan(apiKey);
      const response = await ordiscan.address.getRareSats({
        address: pasteData,
      });
      const filtered = response.filter((item: any) =>
        item.satributes.includes("UNCOMMON"),
      );
      const SatBlocks = [];
      for (const item of filtered) {
        for (const satStash of item.ranges) {
          const blockNumber = satToBlock(satStash[0]);
          SatBlocks.push({
            blockNumber: blockNumber,
            satStash: satStash[0],
            sattributes: item.satributes.join(" "),
          });
        }
      }
      setRareSats(SatBlocks);
      // console.log(SatBlocks);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
    // }
  };

  // Updated getBlockImage with caching support
  const getBlockImage = async (blockNumber: number) => {
    const part = Math.floor(blockNumber / 50000) * 50;

    let data;
    if (blockJsonCache.has(part)) {
      data = blockJsonCache.get(part);
    } else {
      const response = await fetch(`/content/blocks_${part}k.json`);
      data = await response.json();
      blockJsonCache.set(part, data);
    }

    const inscriptionId = data[`${blockNumber}`];
    if (!inscriptionId) {
      return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQABAwGq9NAAAAAASUVORK5CYII=`; // Placeholder image
    }
    return `https://bitmap-img.magiceden.dev/v1/${inscriptionId}`;
  };

  // Transform rareSats into the Item type
  useEffect(() => {
    const fetchGalleryItems = async () => {
      if (rareSats.length === 0) return;
      try {
        const items = await Promise.all(
          rareSats.map(async (sat, index) => ({
            id: index,
            title: `Block ${sat.blockNumber}`,
            description: `${sat.sattributes}`,
            category: "rare-sats",
            image: await getBlockImage(Number(sat.blockNumber)),
            sat: Number(sat.satStash),
            date: new Date().toISOString(),
          })),
        );
        setAwaitGalleryItems(items);
      } catch (error) {
        console.error("Error resolving gallery items:", error);
        setAwaitGalleryItems([]);
      } finally {
        setLoading(false); // stop loading when items have been processed
      }
    };

    fetchGalleryItems();
  }, [rareSats]);

  return (
    <div className="mt-3 landing-page flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-5xl space-y-8 transition-all duration-500">
        <h1 className="text-2xl font-bold tracking-tighter sm:text-5xl md:text-2xl lg:text-3xl">
          BITCOIN WORLD ASSETS
        </h1>
        <p className="mx-auto max-w-[800px] text-m text-white/70 md:text-l">
          DIGITAL REAL ESTATE on the 1st Satoshi (Uncommon Sats) of BTC BLOCKS
          <br /><br />
          Bitcoin blocks are digital real estates.
          By elevating ordinals, inscriptions, and rare sats, we transform immutable data into perpetual terrain, art, and story.
        </p>

        <form className="mx-auto flex w-full max-w-lg items-center space-x-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPaste={handlePaste} // attach new onPaste handler
              placeholder="Paste a BTC/Ordinal Wallet Address"
              className="h-12 w-full rounded-md border border-white/10 bg-black/40 px-4 pl-10 pr-4 text-white backdrop-blur-sm"
            />
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
          </div>
          {/* <Button type="submit" disabled={!searchQuery.trim()} className="h-12 px-6">
            Submit
          </Button> */}
        </form>

        {/* Show loading spinner if fetching data; otherwise display the Gallery */}
        {loading ? (
          <div className="flex justify-center items-center">
            <svg
              className="animate-spin h-8 w-8 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
          </div>
        ) : (
          rareSats.length > 0 && <Gallery itemsData={awaitGalleryItems} />
        )}
      </div>
    </div>
  );
}
