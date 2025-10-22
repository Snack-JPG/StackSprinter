# ArbitrageMarkets Frontend

A real-time arbitrage detection dashboard for Kalshi and Polymarket prediction markets, built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- Real-time arbitrage opportunity tracking via WebSocket
- Interactive dashboard with filtering and sorting
- Detailed market comparison and analysis
- Risk scoring and profit calculations
- Responsive design with dark mode support
- Professional UI with Shadcn/ui components

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Real-time**: Socket.io client
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running on `localhost:3001`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` to configure:
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:3001)
- `NEXT_PUBLIC_SOCKET_URL`: WebSocket URL (default: http://localhost:3001)

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
frontend/
├── app/                      # Next.js app directory
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Main dashboard page
│   ├── globals.css          # Global styles and Tailwind imports
│   └── api/                 # API routes
├── components/              # React components
│   ├── ui/                  # Shadcn/ui base components
│   ├── dashboard/           # Dashboard-specific components
│   ├── MarketDetails.tsx    # Market detail view
│   └── RiskIndicator.tsx    # Risk visualization
├── lib/                     # Utility libraries
│   ├── socket.ts            # Socket.io client setup
│   ├── api.ts               # REST API client
│   └── utils.ts             # Helper functions
├── types/                   # TypeScript type definitions
│   └── index.ts
├── hooks/                   # Custom React hooks
│   └── useArbitrageOpportunities.ts
└── public/                  # Static assets
```

## Key Components

### Dashboard (`app/page.tsx`)
Main dashboard displaying:
- Real-time connection status
- Summary statistics cards
- Filter and sort controls
- Opportunity table with expandable details

### OpportunityTable
Displays arbitrage opportunities with:
- Market names and prices
- Spread and profit calculations
- Match confidence scores
- Risk indicators
- Expandable details with market comparison

### Filters
- Minimum profit percentage
- Category selection
- Sort by: profit, spread, risk, confidence, timestamp
- Sort order: ascending/descending

### Real-time Updates
- Automatic WebSocket connection
- Live opportunity updates
- Connection status indicator
- Auto-refresh toggle

## API Integration

The frontend connects to the backend API at `localhost:3001`:

- `GET /api/opportunities` - Fetch all opportunities
- `GET /api/stats` - Get dashboard statistics
- WebSocket events:
  - `opportunities` - Full opportunity list update
  - `newOpportunity` - New opportunity added
  - `opportunityExpired` - Opportunity removed

## Styling

Uses Tailwind CSS with custom color schemes:
- **Profit levels**: Green (high), Yellow (medium), Red (low)
- **Risk levels**: Green (low), Yellow (medium), Red (high)
- **Dark mode**: Full dark mode support via Tailwind

## Development

### Build for production
```bash
npm run build
```

### Start production server
```bash
npm start
```

### Lint
```bash
npm run lint
```

### Type check
```bash
npm run type-check
```

## UX Decisions

1. **Color Coding**: Opportunities are color-coded based on profit and risk levels for quick visual scanning
2. **Expandable Rows**: Click any row to see detailed market information and resolution criteria comparison
3. **Real-time Status**: Clear indicator shows WebSocket connection status
4. **Auto-refresh Toggle**: Users can disable real-time updates for better control
5. **Responsive Design**: Mobile-friendly layout with collapsible filters
6. **Loading States**: Skeleton loaders provide visual feedback during data fetching
7. **Empty States**: Clear messaging when no opportunities match filters

## License

MIT
