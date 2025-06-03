"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Link, Search } from "lucide-react";
import { Ordiscan } from "ordiscan";
import { Gallery, Item } from "@/components/gallery";
import btclogo from "../styles/bitcoin-logo.png";
import { getBlockImage } from "@/lib/gen-bitfeed";
import { BlockVisualization } from "@/components/block-visualization";
import logoMH from "../styles/manh.png";

interface LandingPageProps {
  onSearch: (query: string) => void;
  initialSearchQuery?: string;
}

function shortenString(str: string): string {
  if (str.length <= 12) return str; // If the string is already short, return it as is
  return `${str.slice(0, 6)}...${str.slice(-6)}`;
}

export function LandingPage({
  onSearch,
  initialSearchQuery,
}: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [rareSats, setRareSats] = useState<
    {
      blockNumber: number;
      satStash: number;
      sattributes: string;
      priceSats?: number;
      blockTime?: string;
      listingUri?: string;
      listedOn?: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [awaitGalleryItems, setAwaitGalleryItems] = useState<Item[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPastingRef = useRef(false);
  const hasSearchedRef = useRef(false); // guard for initial paste handling
  const [justPasted, setJustPasted] = useState(false);
  const [latestHolders, setLatestHolders] = useState<
    { address: string; satDataLength: number; lastUpdate: number }[]
  >([]);
  const [uncommonFloorPrice, setUncommonFloorPrice] = useState<number | null>(
    null,
  );
  const [btcUsdPrice, setBtcUsdPrice] = useState<number | null>(null);
  const [btcBlockHeight, setBtcBlockHeight] = useState<number | null>(null);
  const [showListings, setShowListings] = useState(false);

  // Focus the input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  //Fetch latest holders on component mount
  useEffect(() => {
    const fetchLatestHolders = async () => {
      try {
        const payload: any = {
          passcode: process.env.NEXT_PUBLIC_QUARK20_API_KEY,
        };
        const headers = { "Content-Type": "application/x-www-form-urlencoded" };
        const body = new URLSearchParams(payload).toString();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_QUARK20_API_URL}/getblockleaders`,
          {
            method: "POST",
            headers: headers,
            body: body,
          },
        ).then((d) => d.json());

        const data = res["data"];
        if (data) {
          setLatestHolders(data); // Get the latest 5 holders
        }
      } catch (error) {
        console.error("Error fetching latest holders:", error);
      }
    };

    fetchLatestHolders();
  }, []);

  useEffect(() => {
    if (window.location.pathname !== "/") return;
    const ua = navigator.userAgent;
    const isMobileSafari =
      /iP(ad|hone|od)/.test(ua) && /WebKit/.test(ua) && !/Chrome/.test(ua);
    if (isMobileSafari) return;

    const fetchLatestListings = async () => {
      try {
        // get latest btc block and price from mempool.space api
        const latestBlockResponse = await fetch(
          "https://mempool.space/api/v1/blocks/tip/height",
        );
        const latestBlock = await latestBlockResponse.text();
        setBtcBlockHeight(Number(latestBlock));

        const latestBTCPriceResponse = await fetch(
          "https://mempool.space/api/v1/prices",
        );
        const latestBTCPrice = await latestBTCPriceResponse.json();
        setBtcUsdPrice(latestBTCPrice["USD"]);
      } catch (error) {
        console.error("Error fetching latest block or price:", error);
      }
      try {
        const SatBlocks: any = [];
        let uncommonFloorPrice: number = 1e9;

        try {
          // Fetch latest Magisat listings
          const resMagisat = await fetch(
            `${process.env.NEXT_PUBLIC_QUARK20_API_URL}/getlistings?marketplace=mg&passcode=${process.env.NEXT_PUBLIC_QUARK20_API_LISTING_KEY}`,
            {
              method: "GET",
              headers: {
                accept: "application/json",
              },
            },
          ).then((d) => d.json());

          const dataMagi = resMagisat["listings"];

          if (dataMagi) {
            for (const item of dataMagi) {
              const blockNumber = item.mainSatoshi.blockNumber;
              uncommonFloorPrice = Math.min(uncommonFloorPrice, item.price);
              if (blockNumber > 840000) continue; // Skip blocks after 840000
              let sattributes = "";
              const sortedSatributes = item.mainSatoshi.sattributes.sort(
                (a: any, b: any) => a.slug.localeCompare(b.slug),
              );
              for (const sattribue of sortedSatributes) {
                sattributes += sattribue.slug.toUpperCase() + " ";
              }

              if (sattributes.includes("INSCRIPTION")) {
                continue;
              }
              // Only include uncommon sats
              SatBlocks.push({
                blockNumber: blockNumber,
                satStash: item.mainSatoshi.rangeStart,
                sattributes: sattributes.trim(),
                priceSats: item.price,
                blockTime: item.mainSatoshi.blockTimestamp,
                listingUri: `https://magisat.io/listing/${item.id}`,
                listedOn: "Magisat",
              });
            }
          }
        } catch (error) {
          console.error("Error fetching latest listings from Magisat:", error);
        }

        try {
          // Fetch latest ME listings
          const resMagicEden = await fetch(
            `${process.env.NEXT_PUBLIC_QUARK20_API_URL}/getlistings?marketplace=me&passcode=${process.env.NEXT_PUBLIC_QUARK20_API_LISTING_KEY}`,
            {
              method: "GET",
              headers: {
                accept: "application/json",
              },
            },
          ).then((d) => d.json());

          const dataME = resMagicEden["listings"];

          if (dataME) {
            for (const item of dataME) {
              const blockNumber = satToBlock(
                item.rareSatsUtxo.satRanges[0].parentFrom,
              );
              uncommonFloorPrice = Math.min(
                uncommonFloorPrice,
                item.rareSatsUtxo.listedPrice,
              );
              if (blockNumber > 840000) continue; // Skip blocks after 840000
              if (
                item.rareSatsUtxo.satRanges[0].satributes.includes("Uncommon")
              ) {
                const sortedSatributes =
                  item.rareSatsUtxo.satRanges[0].satributes.sort(
                    (a: string, b: string) => a.localeCompare(b),
                  );
                SatBlocks.push({
                  blockNumber: blockNumber,
                  satStash: item.rareSatsUtxo.satRanges[0].parentFrom,
                  sattributes: sortedSatributes.join(" "),
                  priceSats: item.rareSatsUtxo.listedPrice,
                  blockTime: item.rareSatsUtxo.satRanges[0].blockInfo.blockTime,
                  // listingUri: `https://magiceden.us/ordinals/marketplace/rare-sats?search=${item.rareSatsUtxo.satRanges[0].parentFrom}`,
                  listingUri: `https://magiceden.us/ordinals/marketplace/rare-sats`,
                  listedOn: "MagicEden",
                });
              }
            }
          }
        } catch (error) {
          console.error("Error fetching latest listings from ME:", error);
        }
        setUncommonFloorPrice(uncommonFloorPrice);
        setRareSats(SatBlocks);

        if (SatBlocks.length === 0) {
          setLoading(false);
          // setErrorMessage("No BWAs (<840k) found in the latest listings");
        } else {
          setShowListings(true);
          setErrorMessage(null); // Clear error if successful
        }
      } catch (error) {
        console.error("Error fetching latest listings:", error);
      }
    };

    fetchLatestListings();
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
        item.satributes.some(
          (attribute: string) =>
            ["UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"].includes(
              attribute,
            ), //add full Rodarmor Rarity list
        ),
      );
      const SatBlocks = [];
      for (const item of filtered) {
        for (const satStash of item.ranges) {
          const blockNumber = satToBlock(satStash[0]);
          const sortedSatributes = item.satributes.sort(
            (a: string, b: string) => a.localeCompare(b),
          );
          SatBlocks.push({
            blockNumber: blockNumber,
            satStash: satStash[0],
            sattributes: sortedSatributes.join(" "),
          });
        }
      }
      setRareSats(SatBlocks);
      if (SatBlocks.length === 0) {
        setLoading(false);
        setErrorMessage("No BWAs found in this BTC address");
      } else {
        try {
          const payload: any = {
            passcode: process.env.NEXT_PUBLIC_QUARK20_API_KEY,
            satData: JSON.stringify(SatBlocks),
            ownerAddress: pasteData,
          };
          const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
          };
          const body = new URLSearchParams(payload).toString();
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_QUARK20_API_URL}/postowner`,
            {
              method: "POST",
              headers: headers,
              body: body,
            },
          ).then((d) => d.json());
        } catch (error) {}
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
            description: `${sat.sattributes.toUpperCase()}`,
            category: "rare-sats",
            block: sat.blockNumber,
            image: await getBlockImage(
              Number(sat.blockNumber),
              process.env.NEXT_PUBLIC_BLOCKIMAGE_URL || "",
            ),
            sat: Number(sat.satStash),
            date: new Date().toISOString(),
            priceSats: sat.priceSats || 0,
            showListings: showListings,
            blockTime: sat.blockTime || "",
            listingUri: sat.listingUri || "",
            listedOn: sat.listedOn || "",
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
      <div className="mt-20 max-w-5xl space-y-6 transition-all duration-500">
        <a href="/"><img
          src={logoMH.src}
          alt="Manhattan Logo"
          className="block mx-auto w-32 h-32"
        /></a>
        <div className="flex items-center justify-center">
          <a href="/">
            {/* <img
              src={btclogo.src}
              alt="Bitcoin Logo"
              className="w-12 h-12 mr-2" // adjust size and spacing as needed
            /> */}

            <h1 className="text-2xl font-bold tracking-tighter sm:text-5xl md:text-2xl lg:text-3xl">
              BITCOIN WORLD ASSETS
            </h1>
          </a>
        </div>
        <p className="mx-auto max-w-[800px] text-m text-white/70 md:text-l">
          TIMELESS DIGITAL WORLD REAL ESTATE
          <br />
          <br />
          {showListings &&
            btcBlockHeight &&
            uncommonFloorPrice &&
            btcUsdPrice && (
              <small>
                Total: {btcBlockHeight} BWAs, Floor: $
                {Math.floor((uncommonFloorPrice * btcUsdPrice) / 10000000) / 10}
                , MarketCap: $
                {Math.floor(
                  (((uncommonFloorPrice * btcUsdPrice) / 100000000) *
                    btcBlockHeight) /
                    100000,
                ) / 10}
                M<br />
              </small>
            )}
          <br />
          <small>
            Bitcoin World Assets (BWAs) are the <i>root</i> digital world real
            estate assets natively born with each block of Bitcoin. BWAs are immutable 
            <b> miner deeds</b>. BWAs are the 1st Satoshi (Uncommon Sats) of the BTC BLOCKS based on a tradition
            that early BTC miners used the 1st satoshis of their mined blocks for record-keeping. BWAs can be found as "Uncommon Sats" at
            marketplaces (e.g.,{" "}
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
            ). To build on this immutable digital world foundation at the satoshi level, we have been alpha testing a set of tools based on the Bitcoin Ordinal theory, crosschain infrastructure, and generative AIs.
            
          </small>
          <br /><br />
          <small>Join as a BWA OG now by inspecting your BTC wallet that contains at least one BWA.</small>
          
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
          rareSats.length > 0 && (
            <Gallery
              itemsData={awaitGalleryItems}
              btcUsdPrice={btcUsdPrice ?? undefined}
              showListings={showListings}
              bwaHolder={searchQuery}
            />
          )
        )}
        {true && errorMessage && (
          <div className="text-white-500 mb-4">{errorMessage}</div>
        )}
      </div>

      {latestHolders.length > 0 ? (
        <div className="text-gray-300 mt-8">
          - Latest BWA holders -<br />
          {latestHolders.map((holder, index) => (
            <small key={`b-${index}`}>
              <a href={`/address/${holder.address}`}>
                {shortenString(holder.address)}
              </a>

              {`: `}
              {holder.satDataLength}
              <br />
            </small>
          ))}
        </div>
      ) : (
        <div className="text-gray-300 mt-8">Loading...</div>
      )}

      {/* 3D Block Visualization Section */}
      <BlockVisualization blockHeight={518357} />
    </div>
  );
}
