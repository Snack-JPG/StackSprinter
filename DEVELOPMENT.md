# 🛠️ Development Guide

This guide covers local development setup, testing strategies, debugging tips, and contribution guidelines for ArbitrageMarkets.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Running Locally](#running-locally)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Code Style](#code-style)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** v18 or higher ([download](https://nodejs.org/))
- **npm** v9 or higher (comes with Node.js)
- **Docker** and Docker Compose ([download](https://www.docker.com/))
- **Git** ([download](https://git-scm.com/))

### Optional Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Prisma (if using Prisma ORM)
  - Docker
- **Postman** or **Insomnia** for API testing
- **pgAdmin** or **TablePlus** for database management
- **Redis Insight** for Redis debugging

### API Credentials

You'll need credentials for development (see [API_GUIDE.md](API_GUIDE.md)):

- Kalshi API Key and Secret (optional - can use mock mode)
- OpenAI API Key (optional - can use mock mode)
- Polymarket requires no authentication

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/arbitrage-markets.git
cd arbitrage-markets
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Or if using pnpm
pnpm install

# Or if using yarn
yarn install
```

### 3. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

**Minimum required variables for development:**

```bash
NODE_ENV=development
PORT=3000
BACKEND_PORT=3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/arbitrage_markets

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-development-secret-min-32-chars

# Encryption
ENCRYPTION_KEY=your-64-char-hex-key-for-dev

# Optional: Use mock mode to develop without API credentials
MOCK_KALSHI_API=true
MOCK_POLYMARKET_API=true
MOCK_OPENAI_API=true
```

### 4. Start Infrastructure

```bash
# Start PostgreSQL and Redis via Docker
docker-compose up -d

# Verify containers are running
docker ps

# Should see:
# - postgres (port 5432)
# - redis (port 6379)
```

### 5. Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed with test data (optional)
npm run db:seed

# Verify database
npm run db:status
```

---

## Running Locally

### Development Mode (Hot Reload)

```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Start frontend (in a new terminal)
npm run dev:frontend

# Terminal 3: Watch tests (optional)
npm run test:watch
```

### Access Points

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **WebSocket**: `ws://localhost:3001/ws`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

### Single Command Startup

```bash
# Run everything concurrently
npm run dev

# This runs:
# - Frontend (Next.js)
# - Backend (Express/Fastify)
# - Type checking
```

---

## Project Structure

```
arbitrage-markets/
├── frontend/                    # Next.js application
│   ├── app/                     # App router pages
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx         # Dashboard home
│   │   │   ├── opportunities/   # Opportunities view
│   │   │   ├── markets/         # Markets view
│   │   │   └── settings/        # User settings
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles
│   ├── components/              # React components
│   │   ├── ui/                  # Reusable UI components
│   │   ├── features/            # Feature-specific components
│   │   └── layouts/             # Layout components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilities and helpers
│   ├── types/                   # TypeScript types
│   └── public/                  # Static assets
│
├── backend/                     # Backend application
│   ├── src/
│   │   ├── server.ts            # Entry point
│   │   ├── routes/              # API routes
│   │   │   ├── markets.ts
│   │   │   ├── opportunities.ts
│   │   │   └── alerts.ts
│   │   ├── services/            # Business logic
│   │   │   ├── kalshi/
│   │   │   ├── polymarket/
│   │   │   ├── matching/
│   │   │   ├── arbitrage/
│   │   │   └── notifications/
│   │   ├── jobs/                # Cron jobs
│   │   │   ├── market-fetcher.ts
│   │   │   └── opportunity-scanner.ts
│   │   ├── db/                  # Database
│   │   │   ├── migrations/
│   │   │   ├── models/
│   │   │   └── queries/
│   │   ├── middleware/          # Express middleware
│   │   ├── utils/               # Utilities
│   │   └── types/               # TypeScript types
│   └── tests/                   # Backend tests
│
├── shared/                      # Shared code
│   ├── types/                   # Shared TypeScript types
│   └── utils/                   # Shared utilities
│
├── scripts/                     # Utility scripts
│   ├── setup.sh                 # Initial setup
│   ├── seed-db.ts               # Database seeding
│   └── generate-keys.sh         # Generate secrets
│
├── docker/                      # Docker configs
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── nginx.conf
│
├── docs/                        # Additional documentation
│   └── diagrams/                # Architecture diagrams
│
├── .env.example                 # Environment template
├── docker-compose.yml           # Local infrastructure
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
└── README.md                    # Main documentation
```

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Changes

- Write code with TypeScript strict mode
- Add tests for new functionality
- Update documentation as needed
- Follow code style guidelines

### 3. Test Locally

```bash
# Run all tests
npm test

# Run specific test file
npm test -- market-matcher.test.ts

# Run tests in watch mode
npm run test:watch

# Check type errors
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

### 4. Commit Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add real-time opportunity alerts"

# Commit message format:
# - feat: new feature
# - fix: bug fix
# - docs: documentation changes
# - style: formatting changes
# - refactor: code refactoring
# - test: adding tests
# - chore: maintenance tasks
```

### 5. Push and Create PR

```bash
# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
# - Fill out PR template
# - Link related issues
# - Request reviews
```

---

## Testing

### Test Structure

```
tests/
├── unit/                        # Unit tests
│   ├── services/
│   │   ├── arbitrage-calculator.test.ts
│   │   └── market-matcher.test.ts
│   └── utils/
│       └── price-formatter.test.ts
│
├── integration/                 # Integration tests
│   ├── api/
│   │   ├── opportunities.test.ts
│   │   └── markets.test.ts
│   └── jobs/
│       └── market-fetcher.test.ts
│
└── e2e/                         # End-to-end tests
    ├── dashboard.spec.ts
    └── opportunities.spec.ts
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires running app)
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Writing Tests

```typescript
// Example unit test
import { describe, it, expect } from 'vitest';
import { calculateArbitrage } from '@/services/arbitrage/calculator';

describe('Arbitrage Calculator', () => {
  it('should calculate profit margin correctly', () => {
    const result = calculateArbitrage({
      kalshiPrice: 0.60,
      polymarketPrice: 0.45,
      strategy: 'buy_poly_yes'
    });

    expect(result.profitMargin).toBeCloseTo(15.0, 1);
  });

  it('should return null for unprofitable opportunities', () => {
    const result = calculateArbitrage({
      kalshiPrice: 0.50,
      polymarketPrice: 0.51,
      strategy: 'buy_kalshi_yes'
    });

    expect(result).toBeNull();
  });
});
```

### Test Database

```bash
# Use separate test database
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/arbitrage_markets_test

# Reset test DB before tests
npm run db:test:reset
```

---

## Debugging

### Backend Debugging

```bash
# Start backend in debug mode
npm run dev:backend:debug

# Attach debugger in VS Code
# Press F5 with this launch.json:
```

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Backend",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Frontend Debugging

```bash
# Next.js has built-in debugging
# Set breakpoints in VS Code and run:
npm run dev:frontend

# Or use browser DevTools
# Open Chrome DevTools → Sources → Page
```

### Database Debugging

```bash
# Connect to PostgreSQL
psql -U postgres -d arbitrage_markets

# View tables
\dt

# Query markets
SELECT * FROM markets LIMIT 10;

# Check active opportunities
SELECT
  o.profit_margin,
  mk.title as kalshi_market,
  mp.title as poly_market
FROM opportunities o
JOIN matched_pairs mp ON o.matched_pair_id = mp.id
JOIN markets mk ON mp.kalshi_market_id = mk.id
JOIN markets mp_market ON mp.polymarket_market_id = mp_market.id
WHERE o.is_active = true
ORDER BY o.profit_margin DESC;
```

### Redis Debugging

```bash
# Connect to Redis CLI
redis-cli

# View all keys
KEYS *

# Get cached markets
GET markets:kalshi:all

# Monitor real-time commands
MONITOR
```

### Logging

```typescript
// Use structured logging
import { logger } from '@/utils/logger';

logger.info('Market fetched', {
  platform: 'kalshi',
  marketId: 'ABC-123',
  price: 0.65
});

logger.error('API error', {
  error: error.message,
  stack: error.stack,
  context: { userId: '123' }
});
```

---

## Code Style

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### ESLint Rules

```bash
# Check for linting errors
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Prettier Formatting

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Naming Conventions

- **Files**: kebab-case (`market-fetcher.ts`)
- **Components**: PascalCase (`OpportunityCard.tsx`)
- **Functions**: camelCase (`calculateProfit()`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Types**: PascalCase (`Market`, `Opportunity`)

---

## Contributing

### Pull Request Process

1. **Fork** the repository
2. Create **feature branch**
3. Make changes with **tests**
4. **Lint** and **format** code
5. **Commit** with clear messages
6. **Push** to your fork
7. Create **Pull Request**
8. Address **review feedback**
9. **Merge** after approval

### PR Checklist

- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Code follows style guide
- [ ] No console.log statements
- [ ] Types are properly defined
- [ ] Error handling implemented
- [ ] Performance considerations addressed
- [ ] Security best practices followed

### Code Review Guidelines

**As Author:**
- Provide context in PR description
- Link related issues
- Self-review before requesting reviews
- Respond promptly to feedback

**As Reviewer:**
- Be constructive and specific
- Focus on logic and design
- Check for edge cases
- Verify tests are adequate

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev:frontend
```

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart container
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

#### Redis Connection Failed

```bash
# Check if Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
# Should return: PONG

# Restart if needed
docker-compose restart redis
```

#### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

#### TypeScript Errors

```bash
# Check TypeScript version
npm list typescript

# Rebuild types
npm run type-check

# Clear and rebuild
rm -rf node_modules/.cache
npm run dev
```

### Getting Help

- **Documentation**: Check [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md)
- **Issues**: Search [GitHub Issues](https://github.com/your-org/arbitrage-markets/issues)
- **Discussions**: Post in [GitHub Discussions](https://github.com/your-org/arbitrage-markets/discussions)
- **Discord**: Join our developer community (link in README)

---

## Additional Resources

### Recommended Reading

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

### Tools & Libraries

- [Zod](https://zod.dev/) - Schema validation
- [Prisma](https://www.prisma.io/) - Database ORM (if used)
- [Vitest](https://vitest.dev/) - Unit testing
- [Playwright](https://playwright.dev/) - E2E testing

---

**Happy coding!** If you have questions or run into issues, don't hesitate to ask for help.
