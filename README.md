# Bitcoin World Assets

**Bitcoin World Assets** is a web application for visualizing and exploring Bitcoin World Assets (BWAs) as digital world real estate natively tied to Bitcoin blocks. Each BWA represents the first Satoshi ("Uncommon Sat") of a Bitcoin block, visualized as a unique digital 3D world. The project integrates BTC block data, BTC Ordinals protocol, rare sats, and 3D visualization.

## Features

- **Paste BTC/Ordinal Address:** Instantly discover and visualize the rare "Uncommon Sats" you own.
- **3D Block Visualization:** Explore Bitcoin blocks as interactive 3D models, with each transaction mapped as a parcel.
- **Gallery of BWAs:** View your BWAs (Uncommon Sats), including block number, attributes, and block images.

## Tech Stack

- **Next.js** (React)
- **TypeScript**
- **Three.js** (3D rendering)
- **Custom BTC APIs** (Ordiscan, Quark20)
- **Tailwind CSS** (styling)
- **Lucide React** (icons)

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

   Create a `.env.local` file in the root directory and set the following (get API keys from Ordiscan and Quark20):

   ```
   NEXT_PUBLIC_ORDISCAN_API_KEY=your_ordiscan_api_key
   NEXT_PUBLIC_QUARK20_API_KEY=your_quark20_api_key
   NEXT_PUBLIC_QUARK20_API_TXDATA_URL=your_quark20_api_uri
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

## Usage

- **Paste your BTC or Ordinal wallet address** on the landing page to see your rare Sats and their corresponding blocks.
- **Click on a block** to view its 3D visualization and details.
- **Explore the BWA gallery** to browse all your BWAs.

## Project Structure

- `/components` – React UI components (LandingPage, Gallery, etc.)
- `/lib` – Core logic (block image fetching, Mondrian layout, 3D scene generation)
- `/app` – Next.js pages and routing
- `/styles` – Static assets and styles

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
