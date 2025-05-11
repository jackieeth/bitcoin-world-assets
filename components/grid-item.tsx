import Image from "next/image"
import Link from "next/link"
import type { Item } from "@/components/gallery"

interface GridItemProps {
  item: Item
}

export function GridItem({ item }: GridItemProps) {
  const inscriptionId="";
  const fullImgUri = `https://bitmap-img.magiceden.dev/v1/${inscriptionId}`
  return (
    <div className="grid-item group relative overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm transition-all hover:border-white/30">
      <Link href={`#item-${item.id}`} className="block aspect-square">
        <Image
          src={fullImgUri}
          alt={item.title}
          width={500}
          height={500}
          className="h-full w-full object-cover grayscale transition-all duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent " />
        <div className="absolute bottom-0 left-0 right-0 p-4 ">
          <h3 className="text-sm font-bold uppercase tracking-wider">{item.title}</h3>
          <p className="mt-1 text-xs text-white/70">Nakamoto Matrix</p>
        </div>
      </Link>
    </div>
  )
}
