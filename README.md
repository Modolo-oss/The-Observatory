# 🔭 The Observatory

**Live Benchmarking Platform for Sanctum Gateway**

The Observatory enables developers and operations teams to **execute real transaction benchmarks** on Solana mainnet through Sanctum Gateway, providing instant performance metrics and comprehensive reports to prove Gateway's ROI.

Built for the [Sanctum Gateway Hackathon](https://solana.com) - demonstrating Gateway's value through measurable performance data.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791.svg)](https://neon.tech/)

---

## 🎯 Quick Start for Judges & Reviewers

**Default Admin Account (Auto-created on first startup):**

```
📧 Email:    admin@observatory.dev
🔑 Password: Observatory2024!
```

**Access the app:**
1. Visit the landing page
2. Click **"Sign In"** button
3. Login with credentials above
4. Navigate to **Benchmarking** page
5. Generate wallet → Fund it with SOL → Run benchmark!

> **Note:** The admin account is automatically created when the server starts for the first time. Perfect for demos and hackathon judging!

---

## 🚀 Features

### 🎯 Core Benchmarking Capabilities
- **Live Mainnet Benchmarking** - Execute real Solana transactions through Sanctum Gateway
- **Instant Performance Reports** - Get immediate metrics: success rate, latency, transaction cost
- **Client-Side Wallet Management** - Secure wallet generation with private keys never leaving your browser
- **Historical Tracking** - Analyze performance trends across multiple benchmark runs
- **Interactive Charts** - Visualize latency distribution, success rates, and cost analysis
- **CSV Export** - Download detailed benchmark reports for further analysis
- **Public API** - Programmatic access to benchmark data for CI/CD integration

### 🔐 Security & API
- **Client-Side Signing** - Private keys never transmitted to server (secure architecture)
- **Multi-tenant Authentication** - Secure user registration and login with bcrypt hashing
- **API Key Management** - Generate API keys with bcrypt hashing for programmatic access
- **Rate Limiting** - Configurable rate limits per API key
- **Session Management** - PostgreSQL-backed sessions with secure cookies

### 🎨 User Experience
- **Premium Glassmorphism UI** - Dark-first design inspired by Linear, Stripe, and Vercel
- **Real-time Updates** - WebSocket-powered live benchmark progress
- **Mobile Responsive** - Fully responsive design for all screen sizes
- **Interactive Charts** - Beautiful data visualizations with Recharts
- **Benchmark Assistant** - AI-powered chat for analyzing your benchmark results

---

## 🏗️ Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     THE OBSERVATORY                             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Generate   │  │  Configure   │  │  Run Live    │         │
│  │   Wallet     │→ │  Benchmark   │→ │  Benchmark   │         │
│  │  (Client)    │  │  Parameters  │  │  (Mainnet)   │         │
│  └──────────────┘  └──────────────┘  └──────┬───────┘         │
│                                              │                  │
│                                              ↓                  │
│                                   ┌──────────────────┐         │
│                                   │  Gateway API     │         │
│                                   │  buildGateway... │         │
│                                   │  sendTransaction │         │
│                                   └─────────┬────────┘         │
│                                             │                  │
└─────────────────────────────────────────────┼──────────────────┘
                                              │
                                              ↓
                                   ┌──────────────────┐
                                   │ Solana Mainnet   │
                                   │ Real Transactions│
                                   └──────────────────┘
```

### Benchmark Execution Flow

```mermaid
sequenceDiagram
    participant User as 👤 User Browser
    participant Client as 🖥️ Frontend (Client-Side)
    participant Server as 🔧 Backend API
    participant Gateway as 🌉 Sanctum Gateway
    participant Chain as ⛓️ Solana Mainnet

    User->>Client: Configure & Start Benchmark
    Client->>Client: Generate Keypair (Client-Side)
    
    loop For Each Transaction
        Client->>Server: POST /api/benchmarks/build-unsigned-tx
        Server->>Gateway: buildGatewayTransaction()
        Gateway-->>Server: Optimized Unsigned TX
        Server-->>Client: Return Unsigned TX
        
        Client->>Client: Sign TX with Local Keypair
        
        Client->>Server: POST /api/benchmarks/submit-signed-tx
        Server->>Gateway: sendTransaction()
        Gateway->>Chain: Submit to Mainnet
        Chain-->>Gateway: Confirmation
        Gateway-->>Server: Success + Metrics
        Server-->>Client: WebSocket: Progress Update
        Client->>Client: Update Progress Bar
    end
    
    Client->>Server: POST /api/benchmarks/complete-run
    Server-->>Client: Final Aggregated Metrics
    Client->>Client: Display Results & Charts

    Note over Client,Chain: ✅ Private Keys NEVER Leave Browser
    Note over Gateway,Chain: ✅ Real Mainnet Transactions
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite with HMR
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** TanStack Query (React Query v5)
- **UI Components:** Radix UI primitives + shadcn/ui
- **Styling:** Tailwind CSS with custom design system
- **Charts:** Recharts for data visualization
- **Blockchain:** @solana/web3.js (client-side signing)
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** Neon PostgreSQL (serverless)
- **ORM:** Drizzle ORM with Drizzle Kit
- **Session:** connect-pg-simple (PostgreSQL store)
- **WebSocket:** ws library for real-time updates
- **Authentication:** bcrypt + express-session
- **Rate Limiting:** express-rate-limit

### External Services
- **Sanctum Gateway API:** Transaction routing and optimization
- **Solana Mainnet RPC:** Balance checks and blockchain queries
- **OpenRouter API:** Claude 3.5 Sonnet for benchmark analysis
- **Neon Database:** Managed PostgreSQL

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (or Neon account)
- Sanctum Gateway API key
- OpenRouter API key (optional, for AI features)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/the-observatory.git
cd the-observatory
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database
PGHOST=your-neon-host.neon.tech
PGDATABASE=your_database_name
PGUSER=your_username
PGPASSWORD=your_password
PGPORT=5432

# Sanctum Gateway API Key (REQUIRED for benchmarks)
SANCTUM_GATEWAY_API_KEY=your_sanctum_api_key_here

# OpenRouter API Key (OPTIONAL - for AI Benchmark Assistant)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Session Secret (REQUIRED in production)
SESSION_SECRET=your_super_secret_session_key_min_32_chars

# Environment
NODE_ENV=development
```

### 4. Database Setup
```bash
# Push schema to database
npm run db:push

# If you get warnings about data loss, use force:
npm run db:push --force
```

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### 6. Access the Application

**Option A: Use Default Admin Account (Recommended)**
1. Open `http://localhost:5000`
2. Click **"Sign In"** button
3. Login with:
   - Email: `admin@observatory.dev`
   - Password: `Observatory2024!`
4. Navigate to **Benchmarking** page
5. Generate wallet and run your first benchmark!

**Option B: Create Your Own Account**
1. Open `http://localhost:5000`
2. Click **"Get Started"** button
3. Register at `/auth/register`
4. You'll be auto-redirected to dashboard

---

## 🗺️ Application Routes

### Public Routes (No Authentication)
| Route | Description |
|-------|-------------|
| `/` | Landing page with product overview |
| `/auth/login` | User login page |
| `/auth/register` | User registration page |

### Protected Routes (Requires Authentication)
| Route | Description |
|-------|-------------|
| `/dashboard` | Main dashboard with benchmark overview |
| `/benchmarking` | **🎯 Live benchmark execution page** |
| `/analytics` | Performance analytics and historical charts |
| `/api-keys` | API key management for Public API access |
| `/settings` | User account settings |

---

## 🔑 API Documentation

### Public API Endpoints

All Public API endpoints require authentication via API key:

```bash
X-API-Key: obs_your_api_key_here
```

#### 1. Get Benchmark Summary
```http
GET /api/public/benchmarks/summary
X-API-Key: obs_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBenchmarks": 15,
    "totalTransactions": 750,
    "avgSuccessRate": "96.4%",
    "avgLatency": "1.2s",
    "totalCost": "0.0375 SOL"
  },
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

#### 2. List Benchmark Runs
```http
GET /api/public/benchmarks?status=completed&limit=10
X-API-Key: obs_your_api_key_here
```

**Query Parameters:**
- `status` (optional): Filter by status (`running`, `completed`, `failed`)
- `limit` (optional): Number of results (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mainnet Performance Test",
      "status": "completed",
      "transactionCount": 50,
      "successRate": "98.0%",
      "avgLatency": "1.1s",
      "totalCost": "0.0025 SOL",
      "createdAt": "2025-10-29T10:00:00Z",
      "completedAt": "2025-10-29T10:05:00Z"
    }
  ],
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

#### 3. Get Specific Benchmark Run
```http
GET /api/public/benchmarks/:id
X-API-Key: obs_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Mainnet Performance Test",
    "status": "completed",
    "transactionCount": 50,
    "successfulTransactions": 49,
    "failedTransactions": 1,
    "successRate": "98.0%",
    "avgLatency": "1.1s",
    "minLatency": "0.8s",
    "maxLatency": "2.3s",
    "avgCost": "0.000050 SOL",
    "totalCost": "0.0025 SOL",
    "fromAddress": "5WwN8T9bk...",
    "toAddress": "9HVduMcDf...",
    "createdAt": "2025-10-29T10:00:00Z",
    "completedAt": "2025-10-29T10:05:00Z"
  },
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

#### 4. Get Benchmark Transactions
```http
GET /api/public/benchmarks/:id/transactions
X-API-Key: obs_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "signature": "5KHx2...7FYw",
      "status": "success",
      "latency": "1100ms",
      "feeSol": "0.000005",
      "createdAt": "2025-10-29T10:00:15Z"
    }
  ],
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

#### 5. Get Time Series Data
```http
GET /api/public/benchmarks/timeseries?days=7
X-API-Key: obs_your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-10-29",
      "benchmarks": 5,
      "transactions": 250,
      "avgSuccessRate": 96.4,
      "avgLatency": 1.2,
      "totalCost": 0.0125
    }
  ],
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

### Gateway Proxy Endpoints

These endpoints proxy directly to Sanctum Gateway (useful for testing):

#### Build Gateway Transaction
```http
POST /api/public/gateway/tip-instructions
X-API-Key: obs_your_api_key_here
Content-Type: application/json

{
  "transaction": "base64_encoded_unsigned_transaction",
  "options": {
    "cuPriceRange": "medium",
    "jitoTipRange": "medium"
  }
}
```

#### Send Transaction
```http
POST /api/public/gateway/send-transaction
X-API-Key: obs_your_api_key_here
Content-Type: application/json

{
  "transaction": "base64_encoded_signed_transaction",
  "encoding": "base64",
  "skipSimulation": true
}
```

### Rate Limiting
- Default: 100 requests per hour per API key
- Configurable per API key in dashboard
- 429 status code returned when limit exceeded

---

## 🔒 Security Features

### Client-Side Wallet Management
- **Private Key Generation:** Happens entirely in browser using `@solana/web3.js`
- **No Server Transmission:** Private keys NEVER sent to backend
- **Secure Architecture:** 
  1. Client generates wallet locally
  2. Server builds unsigned transaction (via Gateway)
  3. Client signs transaction locally
  4. Client sends only signed transaction to server
- **Export/Import:** Users can export/import wallets for backup

### API Key Security
- **Bcrypt Hashing:** All API keys hashed with 12 rounds before storage
- **One-time Display:** Full key shown only once during creation
- **Preview Display:** Only first 12 characters shown in UI after creation
- **Unique Constraints:** Database-level uniqueness on key hashes

### Session Security
- **PostgreSQL Store:** Sessions stored in database (not in-memory)
- **Required Secret:** `SESSION_SECRET` environment variable required
- **Secure Cookies:** HttpOnly, SameSite, and Secure flags in production
- **30-day Expiration:** Configurable session lifetime

### Password Security
- **Bcrypt Hashing:** Passwords hashed with 10 rounds
- **No Plaintext Storage:** Passwords never stored in plaintext
- **Secure Comparison:** Constant-time comparison via bcrypt

---

## 🌉 Sanctum Gateway Integration

The Observatory demonstrates **production-ready Sanctum Gateway integration** using the two required API methods:

### 1. `buildGatewayTransaction` - Transaction Optimization

**Location:** `server/services/sanctum-gateway.ts`

```typescript
const gatewayBuildResult = await gatewayService.buildGatewayTransaction({
  transaction: unsignedTxSerialized,
  options: {
    encoding: 'base64',
    skipSimulation: true,
    cuPriceRange: 'medium',  // Optimize compute unit pricing
    jitoTipRange: 'medium',  // Optimize Jito tip amount
  },
});
```

**What this enables:**
- Smart compute unit pricing optimization
- Jito tip configuration for priority execution
- Transaction preparation for Gateway's routing algorithms
- Returns optimized unsigned transaction for client-side signing

### 2. `sendTransaction` - Smart Transaction Delivery

**Location:** `server/services/sanctum-gateway.ts`

```typescript
const gatewayResult = await gatewayService.sendTransaction({
  transaction: signedTxSerialized,
  encoding: 'base64',
  skipSimulation: true,
});
```

**What this enables:**
- Intelligent routing across multiple RPC providers
- Jito bundle integration for MEV protection
- Automatic failover and retry logic
- Real-time transaction confirmation

### Gateway Configuration

```typescript
// server/index.ts
const sanctumGateway = new SanctumGatewayService(
  process.env.SANCTUM_GATEWAY_API_KEY,
  "mainnet" // or "devnet" for testing
);
```

### Why Gateway Matters

**Without Gateway:**
- Manual RPC provider management
- No automatic failover
- Complex Jito bundle integration
- Single point of failure

**With Gateway:**
- ✅ Automatic multi-provider routing
- ✅ Built-in Jito bundle support
- ✅ Smart retry logic
- ✅ Optimized transaction delivery
- ✅ Comprehensive metrics

---

## 📊 Benchmark Metrics Explained

### Success Rate
- **Definition:** Percentage of transactions confirmed on-chain
- **Formula:** `(successful / total) × 100`
- **Good Benchmark:** >95% success rate

### Latency
- **Definition:** Time from submission to confirmation
- **Units:** Milliseconds (ms) or seconds (s)
- **Measured:** Start to blockchain confirmation
- **Good Benchmark:** <2s average latency

### Transaction Cost
- **Definition:** Total fees paid for transaction
- **Units:** SOL (lamports converted)
- **Includes:** Base fee + priority fee + Jito tip (if applicable)
- **Good Benchmark:** <0.0001 SOL per transaction

### Metrics Dashboard
- **Real-time:** Live updates via WebSocket during benchmark
- **Historical:** Charts showing trends over time
- **Aggregated:** Summary statistics across all benchmarks
- **Exportable:** CSV download for external analysis

---

## 🎨 UI/UX Features

### Design System
- **Color Palette:** Dark-first with glassmorphism effects
- **Typography:** Inter (UI) + JetBrains Mono (data/code)
- **Components:** Built on Radix UI primitives
- **Inspiration:** Linear, Stripe Dashboard, Vercel

### Key Pages

#### Landing Page (`/`)
- Hero section with product value proposition
- Feature highlights
- Social proof and testimonials
- CTA buttons (Get Started, Sign In)

#### Benchmarking Page (`/benchmarking`)
- **Wallet Section:** Generate/import wallet, check balance
- **Configuration:** Set transaction count, recipient address, amount
- **Execution:** Start benchmark, real-time progress
- **Results:** Success rate, latency distribution, cost analysis

#### Analytics Page (`/analytics`)
- Time series charts (success rate, latency, cost over time)
- Benchmark run history table
- Filtering and sorting
- CSV export functionality

#### API Keys Page (`/api-keys`)
- Generate new API keys with custom rate limits
- View active keys (preview mode)
- Delete/revoke keys
- API documentation with curl examples

---

## 🚀 Deployment

### Deploy to Replit (Recommended)
1. Fork this Repl
2. Add environment variables in Secrets tab
3. Click "Run" button
4. Your app is live!

### Deploy to Production
1. Set `NODE_ENV=production`
2. Configure all environment variables
3. Run database migrations: `npm run db:push`
4. Build frontend: `npm run build`
5. Start server: `npm start`

### Environment Checklist
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `SANCTUM_GATEWAY_API_KEY` - Gateway API key
- ✅ `SESSION_SECRET` - Random 32+ character string
- ⚠️ `OPENROUTER_API_KEY` - Optional (AI features)

---

## 📖 Additional Documentation

- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Comprehensive technical documentation
- **[HACKATHON.md](./HACKATHON.md)** - Hackathon submission details and judging criteria

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- **Sanctum Gateway** - For providing the transaction routing infrastructure
- **Solana Foundation** - For the blockchain platform
- **Replit** - For hosting and development environment
- **OpenRouter** - For AI model access

---

## 📞 Support

For questions or support:
- Open an issue on GitHub
- Contact: admin@observatory.dev
- Documentation: [DOCUMENTATION.md](./DOCUMENTATION.md)

---

**Built with ❤️ for the Sanctum Gateway Hackathon**
