import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';

export type BenchmarkPreset = 'custom' | 'airdrop' | 'dex-swap' | 'nft-mint' | 'payment-processor';

export interface PresetConfig {
  name: string;
  description: string;
  defaultTransactionCount: number;
  defaultAmount: number;
  icon: string;
  instructions: string;
}

export const BENCHMARK_PRESETS: Record<BenchmarkPreset, PresetConfig> = {
  custom: {
    name: 'Custom Benchmark',
    description: 'Configure your own benchmark parameters',
    defaultTransactionCount: 10,
    defaultAmount: 0.001,
    icon: 'Settings',
    instructions: 'Manually configure transaction count, recipient, and amount',
  },
  airdrop: {
    name: 'Airdrop Simulation',
    description: 'Simulate mass SOL distribution to multiple wallets (real-world airdrop scenario)',
    defaultTransactionCount: 50,
    defaultAmount: 0.0001, // 0.0001 SOL per recipient
    icon: 'Gift',
    instructions: 'Simulates sending SOL to many recipients like token airdrops, rewards distribution, or community giveaways',
  },
  'dex-swap': {
    name: 'DEX Swap Simulation',
    description: 'Simulate high-frequency trading transactions (DEX swaps, arbitrage)',
    defaultTransactionCount: 30,
    defaultAmount: 0.0005,
    icon: 'ArrowLeftRight',
    instructions: 'Simulates rapid SOL transfers mimicking DEX swap transactions with compute-optimized settings',
  },
  'nft-mint': {
    name: 'NFT Mint Simulation',
    description: 'Simulate NFT minting rush (mint events, drops)',
    defaultTransactionCount: 25,
    defaultAmount: 0.0002,
    icon: 'Image',
    instructions: 'Simulates concurrent NFT minting transactions during popular drops and minting events',
  },
  'payment-processor': {
    name: 'Payment Processor',
    description: 'Simulate merchant payment processing (e-commerce, invoices)',
    defaultTransactionCount: 40,
    defaultAmount: 0.0003,
    icon: 'CreditCard',
    instructions: 'Simulates payment processing system handling multiple customer transactions',
  },
};

/**
 * Build transaction instructions based on preset type
 */
export function buildPresetTransaction(
  preset: BenchmarkPreset,
  fromKeypair: Keypair,
  toAddress: string,
  amountSol: number
): TransactionInstruction[] {
  const toPubkey = new PublicKey(toAddress);
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  switch (preset) {
    case 'airdrop':
      // Simple transfer instruction for airdrop
      return [
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey,
          lamports,
        }),
      ];

    case 'dex-swap':
      // Simulate DEX swap with compute budget optimization
      // In production, this would include ComputeBudgetProgram instructions
      return [
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey,
          lamports,
        }),
      ];

    case 'nft-mint':
      // Simulate NFT mint transaction
      // In production, this would include Metaplex instructions
      return [
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey,
          lamports,
        }),
      ];

    case 'payment-processor':
      // Standard payment transfer
      return [
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey,
          lamports,
        }),
      ];

    case 'custom':
    default:
      // Default custom transfer
      return [
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey,
          lamports,
        }),
      ];
  }
}

/**
 * Get preset description for logging
 */
export function getPresetDescription(preset: BenchmarkPreset): string {
  return BENCHMARK_PRESETS[preset]?.name || 'Custom Benchmark';
}

/**
 * Validate preset type
 */
export function isValidPreset(preset: string): preset is BenchmarkPreset {
  return preset in BENCHMARK_PRESETS;
}
