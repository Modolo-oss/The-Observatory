# The Observatory - Technical Documentation

## Overview

**The Observatory** is a live benchmarking platform for Sanctum Gateway, designed to demonstrate Gateway's value through measurable performance data. Built for the Solana Cypherpunk Hackathon, it executes real mainnet transactions and provides instant performance insights.

---

## 🎯 What Problem Does This Solve?

**Problem:** Teams evaluating Sanctum Gateway need concrete proof of ROI before committing to integration. Traditional approaches require:
- Weeks of custom infrastructure development
- Manual transaction tracking and analysis
- Complex data aggregation across multiple RPC endpoints
- Custom observability tooling

**Solution:** The Observatory provides **push-button benchmarking** with instant performance reports, eliminating the need for custom infrastructure.

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TanStack Query (data fetching)
- Wouter (routing)
- shadcn/ui + Radix UI (components)
- Tailwind CSS (styling)

**Backend:**
- Node.js + Express.js
- TypeScript
- Drizzle ORM
- Neon PostgreSQL (serverless)
- WebSocket (real-time updates)

**Blockchain:**
- Solana Web3.js
- Sanctum Gateway API
- bs58 (key encoding)

---

## ⚡ Sanctum Gateway Integration

### Core Integration Points

The Observatory integrates Gateway through **two critical API methods** as required by the hackathon:

#### 1. `buildGatewayTransaction` - Transaction Optimization

```typescript
// Location: server/routes/benchmarks.ts (lines 290-304)

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

**What this does:**
- Optimizes transaction for Gateway's routing algorithms
- Applies smart compute unit pricing
- Configures appropriate Jito tip ranges
- Prepares transaction for best delivery chances

#### 2. `sendTransaction` - Smart Transaction Delivery

```typescript
// Location: server/routes/benchmarks.ts (lines 313-315)

const result = await gatewayService.sendTransaction({
  signedTransaction: serializedTx,
});
```

**What this does:**
- Routes transaction through Gateway's optimized network
- Handles RPC + Jito bundle submission simultaneously
- Provides transaction finalization tracking
- Returns signature and delivery confirmation

#### 3. `getTipInstructions` - Jito Integration

```typescript
// Location: server/routes/benchmarks.ts (lines 244-246)

const tipInstructions = await gatewayService.getTipInstructions({
  feePayer: keypair.publicKey.toBase58(),
});
```

**What this does:**
- Fetches optimal Jito tip instructions
- Adds tip instructions to transaction
- Enables Jito bundle submission path
- Allows for potential tip refunds (if RPC lands first)

---

## 💰 Gateway's Unique Value Demonstrated

### 1. **Dual-Path Submission** (RPC + Jito)

Gateway sends transactions through **both** RPC and Jito Bundle paths simultaneously:
- If RPC lands first → **Jito tip refunded** (cost savings)
- If Jito lands first → Faster confirmation (performance win)
- User gets best of both worlds automatically

### 2. **Zero RPC Management**

**Without Gateway:**
```typescript
// Teams must manage their own RPC endpoints
const endpoints = ['rpc1', 'rpc2', 'rpc3'];
// Manual failover logic
// Rate limit handling
// Health checks
// Load balancing
```

**With Gateway:**
```typescript
// Just send to Gateway - it handles everything
await gatewayService.sendTransaction({ signedTransaction });
```

**Savings:** Weeks of infrastructure development eliminated

### 3. **Observability Built-In**

The Observatory tracks and displays:
- Success rate per benchmark run
- Average latency (transaction submission → confirmation)
- Total cost (network fees + tips)
- Historical trends across multiple runs

**Value:** Real-time insights without custom observability infrastructure

---

## 🔄 Complete Transaction Flow

```
1. User generates wallet (client-side Keypair)
   └─> Private key stays in browser localStorage
   └─> No server-side key storage (security best practice)

2. User funds wallet
   └─> Check balance via Gateway's RPC endpoint
   └─> Real SOL on mainnet (not testnet)

3. User configures benchmark
   └─> Number of transactions (1-100)
   └─> Amount per tx (0.0001-0.01 SOL)
   └─> Recipient address

4. Backend builds transactions
   └─> Creates Solana System Transfer
   └─> Fetches Jito tip instructions from Gateway
   └─> Adds tip instructions to transaction

5. Gateway optimizes transaction
   └─> buildGatewayTransaction() called
   └─> Compute units optimized
   └─> Jito tip range configured

6. Transaction signed & sent
   └─> Client-side wallet signs
   └─> sendTransaction() via Gateway API
   └─> Dual-path submission (RPC + Jito)

7. Real-time progress updates
   └─> WebSocket broadcasts progress
   └─> Frontend shows live success/fail counts
   └─> Latency measured for each tx

8. Results aggregated & stored
   └─> Success rate calculated
   └─> Average latency computed
   └─> Total cost tracked
   └─> Stored in PostgreSQL for historical analysis

9. Analytics & insights
   └─> Time series charts
   └─> Benchmark comparison
   └─> CSV export for external analysis
   └─> AI-powered Benchmark Assistant
```

---

## 🔐 Security Architecture

### Wallet Management

**Client-Side Generation:**
```typescript
// Wallet generated in browser using Solana's Web3.js
const keypair = Keypair.generate();
const privateKey = bs58.encode(keypair.secretKey);

// Saved to localStorage (user's device only)
localStorage.setItem("benchmark_wallet", JSON.stringify({
  address: publicKey,
  privateKey: privateKey,
}));
```

**Benefits:**
- ✅ No server-side private key storage
- ✅ User maintains full custody
- ✅ Transparent key management
- ✅ Export/backup capabilities

**Security Warnings:**
- Clear UI warnings about private key security
- Export modal forces user to acknowledge key save
- Never transmits private key except during signing

---

## 📊 Database Schema

### Core Tables

**`benchmark_runs`** - Benchmark execution records
```sql
- id (UUID primary key)
- name (varchar)
- totalTransactions (int)
- successfulTransactions (int)
- failedTransactions (int)
- successRate (decimal)
- avgLatency (decimal)
- minLatency, maxLatency (decimal)
- avgCost, totalCost (decimal)
- status (enum: running, completed, failed)
- createdAt, completedAt (timestamp)
```

**`benchmark_transactions`** - Individual transaction records
```sql
- id (UUID primary key)
- runId (foreign key → benchmark_runs)
- txHash (varchar, Solana signature)
- status (enum: success, failed)
- latencyMs (int)
- feeSol (decimal)
- errorMessage (text, nullable)
- metadata (jsonb, Gateway routing info)
- createdAt, confirmedAt (timestamp)
```

---

## 🚀 Key Features

### 1. **Live Benchmarking**
- Execute 1-100 real mainnet transactions
- Real-time progress updates via WebSocket
- Instant success/failure feedback

### 2. **Performance Analytics**
- Historical benchmark tracking
- Time series visualization
- Success rate trends
- Latency analysis

### 3. **User Wallet Management**
- Client-side wallet generation
- Balance checking (via Gateway RPC)
- Secure private key handling
- No custodial risk

### 4. **AI Benchmark Assistant**
- Powered by OpenRouter (Claude 3.5 Sonnet)
- Analyzes benchmark results
- Provides performance insights
- Suggests optimizations

### 5. **Public API**
- RESTful API for automation
- API key authentication
- Rate limiting (100 req/min)
- CI/CD integration ready

### 6. **CSV Export**
- Download detailed reports
- External analysis support
- Shareable performance data

---

## 🎯 Why Gateway Made This Possible

### What Would Be Hard/Impossible Without Gateway:

1. **Dual-Path Transaction Routing**
   - Would require custom integration with multiple RPC providers
   - Manual Jito bundle submission logic
   - Complex failover handling
   - **Estimate:** 2-3 weeks development time

2. **Tip Refund Logic**
   - Track which path landed first (RPC vs Jito)
   - Refund calculation and accounting
   - **Impossible to implement** without Gateway's infrastructure

3. **Zero RPC Configuration**
   - No need to manage RPC endpoints
   - No rate limit handling
   - No health check monitoring
   - **Estimate:** 1-2 weeks saved

4. **Built-In Observability**
   - Gateway provides transaction tracking
   - Delivery method transparency
   - Performance metrics
   - **Estimate:** 2-3 weeks for custom solution

**Total Savings:** **6-8 weeks of development time** eliminated by using Gateway

---

## 📈 Performance Results

Based on real benchmarks executed on mainnet:

**Average Success Rate:** 25-100% (varies by network conditions)
**Average Latency:** 150-300ms (submission to confirmation)
**Cost Per Transaction:** ~0.000005 SOL (network fees)

**Gateway Advantages Observed:**
- Consistent delivery even during network congestion
- No RPC endpoint failures (Gateway handles failover)
- Simple integration (2 API calls vs weeks of custom code)

---

## 🔗 API Integration Example

For teams wanting to integrate Gateway based on our learnings:

```typescript
import { SanctumGatewayService } from './sanctum-gateway';

// Initialize
const gateway = new SanctumGatewayService(
  process.env.SANCTUM_GATEWAY_API_KEY,
  'mainnet'
);

// 1. Build optimized transaction
const buildResult = await gateway.buildGatewayTransaction({
  transaction: unsignedTxBase64,
  options: {
    cuPriceRange: 'medium',
    jitoTipRange: 'medium',
  },
});

// 2. Sign transaction (your signing logic)
transaction.sign(keypair);

// 3. Send via Gateway
const result = await gateway.sendTransaction({
  signedTransaction: signedTxBase64,
});

console.log('Transaction submitted:', result.signature);
```

---

## 🏆 Hackathon Submission Highlights

### ✅ Prize Criteria Met:

1. **Gateway Integration:** ✅
   - `buildGatewayTransaction()` implemented
   - `sendTransaction()` implemented
   - `getTipInstructions()` implemented

2. **Value Demonstration:** ✅
   - Live benchmarking proves Gateway's ROI
   - Measurable metrics (success rate, latency, cost)
   - Historical analytics show consistency

3. **Additional Tooling:** ✅
   - Public API for automation
   - AI-powered insights (Benchmark Assistant)
   - Wallet management system
   - Real-time WebSocket updates
   - CSV export for analysis

### 🎯 Unique Value Proposition:

"**Mission Control for Sanctum Gateway**" - The Observatory eliminates the need for custom benchmarking infrastructure, providing instant proof of Gateway's value through live mainnet testing.

---

## 📚 Additional Resources

- **Live Demo:** [Your Replit URL]
- **Source Code:** Available in this Replit
- **Gateway Docs:** https://docs.sanctum.so/gateway
- **API Endpoints:** See `/api-keys` page in app

---

## 🤝 Support & Contact

For questions about the integration or technical implementation:
- Review this documentation
- Check the Benchmark Assistant in the app
- Examine source code in `server/services/sanctum-gateway.ts`
- Review benchmark execution in `server/routes/benchmarks.ts`

---

**Built for Solana Cypherpunk Hackathon 2025**
**Powered by Sanctum Gateway**
