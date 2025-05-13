"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Link, Search } from "lucide-react";
import { Ordiscan } from "ordiscan";
import { Gallery, Item } from "@/components/gallery";
import btclogo from "../styles/bitcoin-logo.png";
import { getBlockImage } from "@/lib/gen-bitfeed";

interface LandingPageProps {
  onSearch: (query: string) => void;
  initialSearchQuery?: string;
}

export function LandingPage({
  onSearch,
  initialSearchQuery,
}: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [rareSats, setRareSats] = useState<
    { blockNumber: number; satStash: number; sattributes: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [awaitGalleryItems, setAwaitGalleryItems] = useState<Item[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPastingRef = useRef(false);
  const hasSearchedRef = useRef(false); // guard for initial paste handling
  const [justPasted, setJustPasted] = useState(false);

  // Focus the input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // If an initial address is provided, simulate paste handling on mount only once
  useEffect(() => {
    if (initialSearchQuery && !hasSearchedRef.current) {
      hasSearchedRef.current = true;
      const fakeEvent = {
        clipboardData: {
          getData: () => initialSearchQuery,
        },
        preventDefault: () => {},
      } as unknown as React.ClipboardEvent<HTMLInputElement>;
      handlePaste(fakeEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearchQuery]);

  // Function to convert sat number to block number
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

  // New handler for paste events with URL update
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isPastingRef.current) return; // Skip if already processing a paste event
    isPastingRef.current = true;

    e.preventDefault();
    const pasteData = e.clipboardData.getData("Text").trim();

    // Only prevent duplicate call if it's a user-initiated paste
    if ((e as any).isTrusted && pasteData === searchQuery) {
      isPastingRef.current = false;
      return; // Prevent duplicate calls
    }

    setSearchQuery(pasteData);
    setJustPasted(true);
    window.history.replaceState(null, "", `/address/${pasteData}`);
    setLoading(true);
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
      if (SatBlocks.length === 0) {
        setLoading(false);
      setErrorMessage("No BWAs found in this BTC address");
      }else{
      setErrorMessage(null); // Clear error if successful
    }
    } catch (error: any) {
      console.error(error);
      setLoading(false);
      setErrorMessage("Unable to process this BTC address");
    } finally {
      isPastingRef.current = false;
    }
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
            block: sat.blockNumber,
            image: await getBlockImage(
              Number(sat.blockNumber),
              process.env.NEXT_PUBLIC_BLOCKIMAGE_URL || ""
            ),
            sat: Number(sat.satStash),
            date: new Date().toISOString(),
          })),
        );
        setAwaitGalleryItems(items.sort((a, b) => a.sat - b.sat));
      } catch (error) {
        console.error("Error resolving gallery items:", error);
        setAwaitGalleryItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryItems();
  }, [rareSats]);

  // Handler for input click
  const handleInputClick = () => {
    if (justPasted) {
      setSearchQuery("");
      setJustPasted(false);
    }
  };

  return (
    <div className="landing-page flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mt-4 max-w-5xl space-y-8 transition-all duration-500">
        <div className="flex items-center justify-center">
          <img
            src={btclogo.src}
            alt="Bitcoin Logo"
            className="w-12 h-12 mr-2" // adjust size and spacing as needed
          />
          <h1 className="text-2xl font-bold tracking-tighter sm:text-5xl md:text-2xl lg:text-3xl">
            BITCOIN WORLD ASSETS
          </h1>
        </div>
        <p className="mx-auto max-w-[800px] text-m text-white/70 md:text-l">
          IMMUTABLE DIGITAL WORLD REAL ESTATE
          <br />
          <br />
          <small>
            Bitcoin World Assets (BWAs) are digital real estate natively born with each block of Bitcoin (fair distribution to miners). BWAs are the foundation of durable digital worlds that can be further built using BTC Ordinal inscriptions. BWAs are the 1st Satoshi (Uncommon Sats) of the BTC BLOCKS based on a tradition that early BTC miners used the 1st sats to represent BTC blocks for record-keeping. BWAs can be found as "Uncommon Sats" at marketplaces (e.g.,{" "}
            <a
              style={{ textDecoration: "underline" }}
              href={`https://magiceden.us/ordinals/marketplace/rare-sats`}
              target="_blank"
            >
              Magic Eden
            </a>
            ,{" "}
            <a
              style={{ textDecoration: "underline" }}
              href={`https://magisat.io/category/uncommon`}
              target="_blank"
            >
              Magisat
            </a>
            ...). How many do you own?
          </small>
        </p>

        <form className="mx-auto flex w-full max-w-3xl items-center space-x-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPaste={handlePaste}
              onClick={handleInputClick}
              placeholder="Paste a BTC/Ordinal Wallet Address"
              className="h-12 w-full rounded-md border border-white/10 bg-black/40 px-4 pl-10 pr-4 text-white backdrop-blur-sm"
            />
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center items-center mb-4">
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
        {errorMessage && (
          <div className="text-white-500 mb-4">{errorMessage}</div>
        )}
      </div>
    </div>
  );
}
