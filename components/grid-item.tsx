import Image from "next/image";
import Link from "next/link";
import type { Item } from "@/components/gallery";

interface GridItemProps {
  item: Item;
  btcUsdPrice?: number; // Optional prop for BTC/USD price
}

function extractYearMonth(dateString: string) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() returns 0-based month
    return `${year}.${month}`;
}

export function GridItem({ item, btcUsdPrice }: GridItemProps) {
  return (
    <div className="grid-item group relative overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm transition-all hover:border-white/30">
      <Link
        href={item.priceSats && item.priceSats > 0 ? `https://magiceden.us/ordinals/marketplace/rare-sats?search=${item.sat}`:`/block/${item.block}`}
        className="block"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="aspect-square relative overflow-hidden">
          <Image
            src={item.image}
            alt={item.title}
            width={500}
            height={500}
            className="p-2 h-full w-full object-cover grayscale transition-all duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="p-4 bg-black/40">
          <h3 className="text-sm font-bold uppercase tracking-wider">
            {item.title}
          </h3>
          <p className="mt-1 text-xs text-white/70">
            {item.description}{item.blockTime ? <small style={{color:"gray"}}>{" " + extractYearMonth(item.blockTime)+""}</small> : ""}
            <br />
            <small style={{color:"gray"}}>SAT #{item.sat}</small>
            {btcUsdPrice && item.priceSats > 0 && <b><br/>{item.priceSats} sats (<span style={{fontSize: "1.2em"}}>~$</span>{Math.ceil(item.priceSats * btcUsdPrice/100000000)})</b>}
          </p>
        </div>
      </Link>
    </div>
  );
}
