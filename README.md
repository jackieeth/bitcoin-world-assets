# Bitcoin World Assets

[Bitcoin 2025 Hackathon Finalist (honorable mentions)!!]

**Bitcoin World Assets** (https://bitcoinworldassets.com) is a web application for visualizing and exploring Bitcoin World Assets (BWAs) as digital world real estate natively tied to Bitcoin blocks. Each BWA represents the first Satoshi ("Uncommon Sat") of a Bitcoin block, visualized as a unique digital 3D world. The project integrates BTC block data, BTC Ordinals protocol, rare sats, and 3D visualization. If you own Bitcoin, you may own BWAs.

![image](https://github.com/user-attachments/assets/41cb8081-1c14-4854-b104-07df455be578)

## Inspiration
Can digital worlds be built on BTC blocks with digital assets such as BTC ordinals, inscriptions, and rare sats? The records of these BTC digital assets have been sealed in BTC blocks because they are all BTC transactions of UTXOs. BTC ordinals (inscriptions) were created with immutable text, image, video, or self-contained HTML pages, and then are transacted via BTC transfers.

Why virtual worlds on BTC blocks? Bitcoin signifies the most decentralized and secure network. It is reasonable to use BTC blocks as the foundation layer of the BTC digital world. What does the digital world look like? There has been a tradition of staring at the mempool to see the next block, fee-rate changes, looking up transaction details, and other data inquiries on Bitcoin blockchain data. The mempool project started using a way to visualize BTC transactions as rectangles moving inside a right rectangle (the block) to represent mempool activities of unconfirmed transactions. After confirmation (block was mined), the layout of rectangles freezes. This was the Mempool algorithm called BitFeed. This square look of a rectangular collage has been a tradition to visualize how a BTC block's "look" is. Can these blocks be treated like real estate in digital worlds?

There have been many digital world projects, many with blockchain ownership tokens. However, BTC is still the most durable, immutable, and decentralized platform. Building digital worlds on other blockchains is like stepping on empty stairs. They may just disappear one day. A related project called Bitmap started a rush of inscribing btc block numbers from 0 to 889000 (the latest btc block height number) as '<blockheight>.bitmap' for claiming ownership of the inscribed block. This is a great crowd-initiated example of a metaverse initiative using BTC digital assets. However, what constitutes the ownership of the BTC block?

### How do we define the ownership of BTC blocks? 
Blocks were mined by miners who achieved and be verified with proof-of-work via btc network consensus. Do miners own the BTC blocks they mined? Miners do own the BTC block rewards from the coinbase transaction (the first tx of the block). Since Bitcoin consists of a network of nodes, all BTC blocks are stored at the node operators' networked machines, relaying transactions. bitmap inscriptions may self-claim the ownership of BTC blocks, but it is arguable.

The **Uncommon Sats** approach is to use the first satoshi of the block to represent the block ownership. In BTC ordinal theory, the first Satoshi of the block is an "uncommon" Satoshi. In the early days of Bitcoin, certain miners were sending the first satoshi to themselves as record-keeping. This may be a more BTC way of characterizing BTC block ownership. To settle this block ownership debate, let us adopt both because the bitmap project contributes from the organic community-building aspect as **social deeds**, and the uncommon sat approach represents the technical details based on how Bitcoin works as **crypto deeds**. 

BTC block ownership _can_ be represented as the following:

- social deeds: `<blockHeight>.bitmap` - FCFS text BTC Ordinals inscriptions up to the current block height. 
- crypto deeds: `Uncommon Sat` - the first satoshi of the BTC block rewards created by Bitcoin and miner proof of work. We characterize these as _Bitcoin World Assets (BWAs)_.

### How to build digital worlds with BWAs? 
Current digital assets are arranged in unstructured and arbitrary ways. Organizing digital assets as a personal collectible gallery was popular in 2021 due to the NFT boom. Here, we suggest a 3D world-building approach to organizing digital assets with 3d representation methods based on the Bitcoin block layouts (the BitFeed representation). We provide a direct download link for each block's 3d data for world builders to integrate BWAs in 3D apps like games.

## What it does
When a BTC user pastes their BTC or Ordinal address, this website will display Bitcoin World Assets (i.e., "Uncommon" satoshis) that they cryptographically own in this wallet. In this grid view, each BWA is visualized based on its own BTC block TXs using the mempool.space's BitFeed representation (the most popular and commonly accepted BTC block visualization). After the user clicks on the Bitcoin World Asset thumbnail image, it transits to a full page 3D visualization of this BWA with info and downloadable 3D data.

- **Paste BTC/Ordinal Address:** Instantly discover and visualize the rare "Uncommon Sats" you own.
- **Gallery of BWAs:** View your BWAs (Uncommon Sats), including block number, attributes, and block images (visualized using the BitFeed representation).
- **3D Block Visualization:** Explore Bitcoin blocks as interactive 3D models, with each transaction mapped as a 3D parcel and downloadable 3D data.

![image](https://github.com/user-attachments/assets/51f3b486-eb1e-48ae-96bf-0d5131de6a82)

![image](https://github.com/user-attachments/assets/7e20e4fa-9932-4a65-a93b-3e7f3fecedaa)

## How we built it
This is the tech stack:
- **Next.js** (React)
- **TypeScript**
- **Three.js** (3D rendering)
- **Custom BTC APIs** (Rebar, Ordiscan, Quark20)
- **Tailwind CSS** (styling)
- **Lucide React** (icons)
- **Metaverse Markup Language** (3D data)

## Challenges we ran into
The biggest challenge is to make it obvious for people to recognize that **the place** to build digital worlds is on BTC blocks. Other than that, there are a few more things:
1. It is tricky to define the ownership of BTC blocks. Can block ownership be claimed by social consensus, like the way `.bitmap` text inscription was formulated? Is there a BTC-centric convention and history that we can follow? Is there a definition given by cryptographic proofs?
2. We had to use multiple APIs and our calculations related to Sat indexing and rarity data. There are BTC block images based on the BitFeed representation algorithm, but there are 840k+ of those. We need an efficient way to index and present them.
3. Visualizing each BTC block can be tricky because there is a new block every 10 minutes. Although mempool.space has the visualization but there shall be an integrated API for devs to use those images or 3d data easily.
4. It'd be great to have more devs to build things on BTC blocks, but how can we make this process easier and enjoyable?

## Accomplishments that we're proud of

We identified a fair distributed BTC asset class (i.e., using Uncommon Sats as the foundation layer of digital worlds) and provided a wallet inspection tool for it. We accomplished:
1. a static one-pager web-client site for BTC asset lookup with just an address WITHOUT wallet signin (read-only, safe, and easy-to-use),
2. a smooth experience of browsing visualized BTC blocks in 2D AND 3D,
3. downloadable 3D data and image-index up-to block 840k, and
4. possibilities for building durable digital worlds on top of Bitcoin blocks.

## What we learned

We had to define **Bitcoin World Assets with Uncommon Sats** for highlighting this cryptographically valid and verifiable BTC asset class. To make BWAs more approachable, we had to visualize them in 2D and 3D, as well as making their 3D data available for download so that world builders, game devs, or 3d developers can use these 3D data to build more on top of these assets.

## What's next for Bitcoin World Assets

Currently, this is a website for inspecting BTC wallet assets and 3D visualization. We want to integrate the "building" aspect on top of these _root_ digital world assets as well as packaging this into a simple API call for future BWA developers.

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jackieeth/bitcoin-world-assets.git
   cd bitcoin-world-assets
   ```

2. **Install dependencies:**
   ```bash
   pnpm i
   # or
   yarn
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory and set the following (get API keys from [Ordiscan](https://ordiscan.com/docs/api#introduction) and [Quark20](https://x.com/quark20hq)):

   ```
   NEXT_PUBLIC_ORDISCAN_API_KEY=your_ordiscan_api_key
   NEXT_PUBLIC_QUARK20_API_KEY=your_quark20_api_key
   NEXT_PUBLIC_QUARK20_API_URL=your_quark20_api_uri
   NEXT_PUBLIC_BLOCKIMAGE_URL=your_blockimage_storage_uri
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser:**  
   Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

- `/components` – React UI components (LandingPage, Gallery, etc.)
- `/lib` – Core logic (block image fetching, Mondrian layout, 3D scene generation)
- `/app` – Next.js pages and routing
- `/styles` – Static assets and styles

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
