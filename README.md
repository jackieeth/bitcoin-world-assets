# Bitcoin World Assets
**Bitcoin World Assets** (https://bitcoinworldassets.com) is a web application for visualizing and exploring Bitcoin World Assets (BWAs) as digital world real estate natively tied to Bitcoin blocks. Each BWA represents the first Satoshi ("Uncommon Sat") of a Bitcoin block, visualized as a unique digital 3D world. The project integrates BTC block data, BTC Ordinals protocol, rare sats, and 3D visualization.

![image](https://github.com/user-attachments/assets/41cb8081-1c14-4854-b104-07df455be578)

## Inspiration
Can digital worlds be built on BTC blocks with digital assets such as BTC ordinals, inscriptions, and rare sats? The records of these BTC digital assets have been sealed in BTC blocks because they are all BTC transactions of UTXOs. BTC ordinals (inscriptions) were created with immutable text, image, video, or self-contained HTML pages, and then are transacted via BTC transfers.

Why virtual worlds on BTC blocks? Bitcoin signifies the most decentralized and secure network. It is reasonable to use BTC blocks as the foundation layer of the BTC digital world. What does the digital world look like? There has been a tradition of staring at the mempool to see the next block, fee-rate changes, looking up transaction details, and other data inquiries on Bitcoin blockchain data. The mempool project started using a way to visualize BTC transactions as rectangles moving inside a right rectangle (the block) to represent mempool activities of unconfirmed transactions. After confirmation (block was mined), the layout of rectangles freezes. This was Mempool algorithm called BitFeed. This square look of a rectangular collage has been a tradition to visualize how a BTC block's "look". Can these blocks be treated like real estates of digital worlds?

There have been many digital world projects, many with blockchain ownership tokens. However, BTC is still the most durable, immutable, and decentralized platform. Building digital worlds on other blockchains is like stepping on empty stairs. They may just disappear one day. A related project called Bitmap started a rush of inscribing btc block number from 0 to 889000 (the latest btc block height number) as '<blockheight>.bitmap' for claiming ownership of the inscribed block. This is a great crowd-initiated example of a metaverse initiative using btc digital assets. however, what constitutes the ownership of the btc block?

How do we define the ownership of BTC blocks? Blocks were mined by miners who achieved and be verified with proof-of-work via btc network consensus. Do miners own the btc blocks they mined? Miners do own the btc block rewards from the coinbase transaction (the first tx of the block). Since btc blockchain consists of a network of nodes, all btc blocks are stored at the node operators' networked machines that are relaying transactions. bitmap inscriptions may self-claim the ownership of btc blocks but it is arguable.

The **Uncommon Sats** approach is to use the first satoshi of the block to represent the block ownership. in btc ordinal theory, the first satoshi of the block is an "uncommon" satoshi. in early days of bitcoin, certain miners were sending the first sat to themselves as record-keeping. This may be a more BTC way of characterizing btc block ownership. To settle this block ownership debate, let us adopt both because the bitmap project contributes from the community-building aspect and the uncommon sat approach representing the technical details based on how bitcoin works. how to build digital worlds with digital world assets? current digital assets are arranged in unstructured and arbitrary ways. organizing digital assets as a personal collectible gallery was very popular in 2021 due to the NFT boom. here we propose a way to organize digital assets as building their digital worlds with 3d representation methods. This method of organizing assets turns unstructured digital assets into digital world assets in 3d virtual worlds.

## What it does
When a BTC user pasted their BTC or Ordinal address, this website will display Bitcoin World Assets (i.e., "Uncommon" satoshis) that they cryptographically owned in this wallet. In this grid view, each BWA is visualized based on its own BTC block TXs using mempool.space's BitFeed representation (the most popular and commonly accepted BTC block visualization). After the user clicked on Bitcoin World Asset thumbnail image, it transits to a full page 3D visualization of this BWA with info and downloadable 3D data.

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

We have to use multiple APIs and our own calculations related to Sat indexing and rarity data for locating and visualizing each BTC blocks as BWA. There shall be an integrated API for it.

## Accomplishments that we're proud of

We identified a fair distributed BTC asset class (i.e., using Uncommon Sats as the foundation layer of digital worlds) and provided a wallet inspection tool for it. We accomplished:
1. a static one-pager web-client site for BTC asset lookup with just an address WITHOUT wallet signin (read-only, safe, and easy-to-use),
2. a smooth experience of browsing visualized BTC blocks in 2D AND 3D,
3. downloadable 3D data and image-index up-to block 840k, and
4. possibilities for building durable digital worlds on top of Bitcoin blocks.

## What we learned

It is tricky to define the ownership of BTC blocks. We had to define Bitcoin World Assets with Uncommon Sats for highlighting this cryptographically valid and verifiable BTC asset class as well as visualizing it with popular BitFeed representation.

## What's next for Bitcoin World Assets

Currently, this is a BTC wallet asset inspection and 3D visualization website. We'd like to integrate the "building" aspect on top of these _root_ digital world assets as well as packaging this into a simple API call for future BWA developers.

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
   yarn install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory and set the following (get API keys from Ordiscan and Quark20):

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
