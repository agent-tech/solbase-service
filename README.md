# X402 Cross-Chain Payment API Backend

> NestJS backend API for X402 cross-chain payment protocol (Solana → Base)

## 🎯 Project Overview

This is a clean, production-ready NestJS backend that provides API endpoints for the X402 cross-chain payment SDK. It enables users to pay on Solana while merchants receive payments on Base chain.

### Features

- ✅ **5 RESTful API Endpoints** - Complete payment intent lifecycle
- ✅ **Base Chain Integration** - USDC transfers using viem
- ✅ **Dual Database Support** - PostgreSQL (production) + SQLite (development)
- ✅ **API Documentation** - Auto-generated Swagger/OpenAPI docs
- ✅ **Structured Logging** - Winston-based logging system
- ✅ **Health Checks** - Terminus health monitoring
- ✅ **CORS Support** - Configurable cross-origin requests
- ✅ **Docker Ready** - Docker Compose for PostgreSQL + Redis

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.19.0
- pnpm (or npm/yarn)
- PostgreSQL (optional, can use SQLite for dev)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma Client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Start development server
pnpm start:dev
```

The API will be available at `http://localhost:3001`

### Using Docker

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Update DATABASE_URL in .env to:
# DATABASE_URL="postgresql://x402:x402_password@localhost:5432/x402_payments"

# Run migrations
pnpm prisma:migrate

# Start the app
pnpm start:dev
```

## 📚 API Endpoints

### Base URL

```
http://localhost:3001/api
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/intents` | Create payment intent |
| GET | `/intents?intent_id={id}` | Get payment intent status |
| POST | `/intents/:id/solana-proof` | Submit Solana payment proof |
| POST | `/intents/:id/trigger-base-payment` | Trigger Base chain payment |
| GET | `/intents/:id/receipt` | Get payment receipt |
| GET | `/health` | Health check endpoint |

### API Documentation

Swagger documentation is available at:

```
http://localhost:3001/api/docs
```

## 🗄️ Database Configuration

### SQLite (Development)

```env
DATABASE_URL="file:./dev.db"
```

No additional setup required.

### PostgreSQL (Production)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/x402_payments?schema=public"
```

Start PostgreSQL with Docker:

```bash
docker-compose up -d postgres
```

## ⚙️ Environment Variables

### Required

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="file:./dev.db"

# Solana
SOLANA_RECEIVER_ADDRESS=Your_Solana_Address
SOLANA_NETWORK=solana-devnet

# Base Chain
BASE_NETWORK=base-sepolia
BASE_PROXY_PRIVATE_KEY=0xYourPrivateKey

# CORS
CORS_ORIGINS=http://localhost:3000
```

### Optional

```env
# X402
FACILITATOR_URL=https://x402.org/facilitator

# Logging
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=10
```

## 🏗️ Project Structure

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── config/
│   ├── configuration.ts             # Configuration loader
│   └── validation.schema.ts         # Env validation (Joi)
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts # Global exception handling
│   ├── interceptors/
│   │   └── logging.interceptor.ts   # Request/response logging
│   └── decorators/
│       └── api-operation.decorator.ts
├── database/
│   ├── prisma.module.ts             # Prisma module
│   └── prisma.service.ts            # Prisma service
├── payment-intents/
│   ├── payment-intents.module.ts
│   ├── payment-intents.controller.ts # API routes
│   ├── payment-intents.service.ts    # Business logic
│   ├── base-payment.service.ts       # Base chain payments (viem)
│   ├── dto/                          # Data transfer objects
│   └── entities/                     # Domain entities
└── health/
    ├── health.module.ts
    └── health.controller.ts          # Health checks
```

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm start:dev          # Start with watch mode
pnpm start:debug        # Start in debug mode

# Building
pnpm build              # Build for production
pnpm start:prod         # Start production build

# Testing
pnpm test               # Run unit tests
pnpm test:watch         # Run tests in watch mode
pnpm test:cov           # Generate coverage report
pnpm test:e2e           # Run E2E tests

# Database
pnpm prisma:generate    # Generate Prisma Client
pnpm prisma:migrate     # Run migrations
pnpm prisma:studio      # Open Prisma Studio
pnpm prisma:reset       # Reset database (WARNING: deletes all data)

# Code Quality
pnpm lint               # Run ESLint
pnpm format             # Format code with Prettier
```

## 📝 Implementation Guide

### Core Files to Implement

The project structure is set up. You need to implement these core files:

#### 1. Configuration (`src/config/configuration.ts`)

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  database: {
    url: process.env.DATABASE_URL,
  },
  solana: {
    receiverAddress: process.env.SOLANA_RECEIVER_ADDRESS,
    network: process.env.SOLANA_NETWORK || 'solana-devnet',
  },
  base: {
    network: process.env.BASE_NETWORK || 'base-sepolia',
    proxyPrivateKey: process.env.BASE_PROXY_PRIVATE_KEY,
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  facilitator: {
    url: process.env.FACILITATOR_URL || 'https://x402.org/facilitator',
  },
});
```

#### 2. Prisma Service (`src/database/prisma.service.ts`)

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

#### 3. Payment Intents Controller

Implement all 5 endpoints with proper decorators:
- `@Post()` - createIntent
- `@Get()` - getIntent
- `@Post(':id/solana-proof')` - submitSolanaProof
- `@Post(':id/trigger-base-payment')` - triggerBasePayment
- `@Get(':id/receipt')` - getReceipt

#### 4. Payment Intents Service

Business logic for:
- Intent creation with UUID generation
- Solana proof validation
- Base payment triggering
- Receipt generation
- Status state machine management

#### 5. Base Payment Service

Implement using viem:
- Private key validation
- USDC contract interaction
- Transaction execution and confirmation
- Error handling

### DTOs to Create

All DTOs should use class-validator decorators:

- `CreateIntentDto` - amount, merchant_recipient
- `QueryIntentDto` - intent_id
- `SolanaProofDto` - settle_proof, tx_hash, payer_wallet?
- Response DTOs for each endpoint

## 🔐 Security Considerations

### Production Checklist

- [ ] Use PostgreSQL instead of SQLite
- [ ] Move BASE_PROXY_PRIVATE_KEY to secure vault (AWS KMS, HashiCorp Vault)
- [ ] Enable rate limiting
- [ ] Add authentication/API keys if needed
- [ ] Configure CORS properly
- [ ] Use HTTPS
- [ ] Monitor proxy wallet balance (ETH + USDC)
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure proper logging
- [ ] Enable Helmet for security headers

## 📊 Testing

### Unit Tests

```bash
pnpm test
```

Test coverage should include:
- DTO validation
- Service business logic
- Error handling
- Status state machine

### E2E Tests

```bash
pnpm test:e2e
```

Test scenarios:
- Complete payment flow
- Invalid inputs
- Expired intents
- Status transitions

## 🚢 Deployment

### Build for Production

```bash
# Build the application
pnpm build

# Set NODE_ENV
export NODE_ENV=production

# Run migrations
pnpm prisma:migrate deploy

# Start production server
pnpm start:prod
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3001
CMD ["node", "dist/main"]
```

Build and run:

```bash
docker build -t x402-api-backend .
docker run -p 3001:3001 --env-file .env x402-api-backend
```

## 🔍 Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

Response:

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory": { "status": "up" }
  }
}
```

### Logs

Logs are output to console in JSON format (structured logging).

Production: Configure log aggregation (CloudWatch, Datadog, etc.)

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
pnpm prisma:studio
```

### Private Key Issues

```bash
# Ensure it starts with 0x
# Must be 66 characters (0x + 64 hex chars)
```

### CORS Errors

Update `CORS_ORIGINS` in `.env`:

```env
CORS_ORIGINS=http://localhost:3000,https://your-frontend.com
```

## 📖 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Viem Documentation](https://viem.sh/)
- [X402 Protocol](https://github.com/coinbase/x402)

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

---

**Built for the X402 Cross-Chain Payment SDK**
