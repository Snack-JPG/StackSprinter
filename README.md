# ArbitrageMarkets - Real-Time Prediction Market Arbitrage Detector

**Find profitable arbitrage opportunities between Kalshi and Polymarket in real-time**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)

---

## 📋 Overview

ArbitrageMarkets is a real-time arbitrage detection platform that identifies profitable betting opportunities between two major prediction markets:

- **Kalshi** - Regulated US prediction market allowing event-based trading
- **Polymarket** - Crypto-based prediction market with global reach

The platform uses AI-powered semantic matching to find equivalent markets across both platforms, calculates potential arbitrage opportunities, analyzes risks, and sends real-time alerts when profitable opportunities arise.

## ✨ Key Features

### 🎯 Real-Time Opportunity Detection
- Continuous monitoring of both Kalshi and Polymarket APIs
- Sub-minute latency for opportunity identification
- WebSocket connections for instant price updates
- Configurable profit threshold alerts

### 🤖 AI-Powered Market Matching
- OpenAI embeddings for semantic market similarity
- Fuzzy matching to find equivalent events across platforms
- Automatic market pair discovery and validation
- Manual override capabilities for edge cases

### 📊 Risk Analysis
- Different resolution criteria detection
- Settlement timeline comparison
- Liquidity analysis on both sides
- Maximum position size recommendations
- Historical accuracy tracking

### 🔔 Alert System
- Real-time browser notifications
- Email alerts for high-value opportunities
- Customizable profit threshold filters
- Alert history and performance tracking

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **WebSocket Client** - Real-time data streaming
- **Recharts** - Data visualization

### Backend
- **Express/Fastify** - High-performance Node.js server
- **TypeScript** - End-to-end type safety
- **WebSocket Server** - Real-time communication
- **Node-cron** - Scheduled market polling

### Data Layer
- **PostgreSQL** - Primary database for structured data
- **Redis** - Caching layer for market data (30-60s TTL)
- **OpenAI API** - Text embeddings for market matching
- **Kalshi API** - Market data from Kalshi
- **Polymarket API** - Market data from Polymarket

### Infrastructure
- **Docker** - Containerized deployment
- **Nginx** - Reverse proxy and load balancing
- **PM2** - Process management
- **Vercel** (optional) - Frontend deployment

## 🚀 Quick Start

### Prerequisites

```bash
# Required
node -v  # v18+ required
npm -v   # v9+ required
docker -v  # For PostgreSQL and Redis

# Install dependencies
npm install
```

### Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Add your API credentials (see API_GUIDE.md)
# - KALSHI_API_KEY
# - KALSHI_API_SECRET
# - OPENAI_API_KEY
```

### Local Development

```bash
# Start infrastructure (PostgreSQL + Redis)
docker-compose up -d

# Run database migrations
npm run db:migrate

# Start backend server
npm run dev:backend

# Start frontend (in separate terminal)
npm run dev:frontend

# Access the application
open http://localhost:3000
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup instructions.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │ Opportunities │  │   Settings   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────┬────────────────────────────────┘
                             │ WebSocket + REST
                             │
┌────────────────────────────▼────────────────────────────────┐
│                   Backend (Express/Fastify)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   API Routes │  │  WebSocket   │  │   Cron Jobs  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Market Fetcher│  │ AI Matcher   │  │ Arbitrage    │     │
│  │              │  │              │  │ Calculator   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────┬───────────────────┬─────────────┬────────────┘
              │                   │             │
    ┌─────────▼─────────┐  ┌──────▼──────┐  ┌──▼──────┐
    │   PostgreSQL      │  │    Redis    │  │ OpenAI  │
    │                   │  │             │  │   API   │
    │ • markets         │  │ • cache     │  └─────────┘
    │ • matched_pairs   │  │ • sessions  │
    │ • opportunities   │  └─────────────┘
    │ • alerts          │
    │ • users           │
    └───────────────────┘
              │
    ┌─────────▼──────────┐
    │  External APIs     │
    │                    │
    │  • Kalshi API      │
    │  • Polymarket API  │
    └────────────────────┘
```

## 📚 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed system architecture and design decisions
- [API_GUIDE.md](API_GUIDE.md) - External API integration guide
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development setup and contribution guidelines

## 🔗 API Reference

### REST Endpoints

```
GET  /api/opportunities       - List current arbitrage opportunities
GET  /api/markets/kalshi      - Fetch Kalshi markets
GET  /api/markets/polymarket  - Fetch Polymarket markets
GET  /api/matched-pairs       - View matched market pairs
POST /api/alerts/subscribe    - Subscribe to alerts
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for complete API documentation.

## ⚠️ Disclaimer

**This application is for informational and educational purposes only.**

- **Not Financial Advice**: ArbitrageMarkets does not provide financial, investment, or trading advice. All calculations and opportunities shown are for informational purposes only.

- **Risk Warning**: Arbitrage trading carries significant risks, including:
  - Different resolution criteria between platforms
  - Settlement timing differences
  - Liquidity constraints
  - Platform-specific fees and limits
  - Regulatory considerations
  - Execution risk (prices may change before orders fill)

- **Due Diligence**: Users must conduct their own research and understand the terms, conditions, and resolution criteria of each platform before placing any trades.

- **Regulatory Compliance**: Users are responsible for ensuring compliance with all applicable laws and regulations in their jurisdiction.

- **No Guarantees**: Past performance and detected opportunities do not guarantee future results.

## 📄 License

MIT License

Copyright (c) 2025 ArbitrageMarkets

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Built with:** [Next.js](https://nextjs.org/) • [TypeScript](https://typescriptlang.org/) • [PostgreSQL](https://postgresql.org/) • [Redis](https://redis.io/) • [OpenAI](https://openai.com/)
