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

  const traitLine = item.traits.join(" ")
  .replace("UNCOMMON", "")
  .replace("ALPHA", "")
  .replace(/\b(?:1D|2D|3D|4D|5D|6D|7D)\b/g, "")
  .trim()
  return (
    <div className={item.description.includes("ALPHA") ? "grid-item group relative overflow-hidden border border-white/10 bg-black/40 backdrop-blur-lg transition-all hover:border-white/50" : "grid-item group relative overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm transition-all hover:border-white/50"}>
      
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
            <Link
        href={`/block/${item.block}`}
        className="block hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >{item.title}</Link>
          </h3>
          <p className="mt-1 text-xs text-white/70">
            {item.description}{item.blockTime ? <small style={{color:"gray"}}>{" " + extractYearMonth(item.blockTime)+""}</small> : ""}<br/>
            <small style={{color:"gray"}}>SAT #{item.sat}{item.traits.length > 0 ? <span style={{color:"#ccc"}}><br/>{traitLine}</span>:<span/>}
              </small>
            {btcUsdPrice && item.priceSats > 0 && <Link
        href={`${item.listingUri}`}
        className="block hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      ><b><br/>{item.priceSats} sats (<span style={{fontSize: "1.2em"}}>~$</span>{Math.ceil(item.priceSats * btcUsdPrice/100000000)})</b></Link>}
          </p>
        </div>
    </div>
  );
}
