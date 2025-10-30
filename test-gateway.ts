// Automated test script for Sanctum Gateway integration
import { Keypair, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

const GATEWAY_API_KEY = "01K8HMCYMFBA3FT0RSWW0C68KV";
const GATEWAY_URL = `https://tpg.sanctum.so/v1/mainnet?apiKey=${GATEWAY_API_KEY}`;
const OBSERVATORY_API_KEY = "obs_0a755e73e8573ed1e298d7d199cd69f87f55660bca620be2ad8e7184f0e544e9";
const OBSERVATORY_URL = "http://localhost:5000";

// Free public RPC endpoints
const MAINNET_RPCS = [
  "https://rpc.gsnode.io",
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
];

async function createConnection(): Promise<Connection> {
  for (const rpc of MAINNET_RPCS) {
    try {
      const connection = new Connection(rpc, "confirmed");
      await connection.getLatestBlockhash();
      console.log(`✅ Connected to ${rpc}`);
      return connection;
    } catch (error) {
      console.log(`❌ Failed to connect to ${rpc}`);
    }
  }
  throw new Error("All RPC endpoints unavailable");
}

async function testGatewayTransaction() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 TESTING SANCTUM GATEWAY TRANSACTION");
  console.log("=".repeat(60) + "\n");

  // Load wallet from secret
  const privateKeyBase58 = process.env.TEST_WALLET_PRIVATE_KEY;
  if (!privateKeyBase58) {
    throw new Error("TEST_WALLET_PRIVATE_KEY not found in environment");
  }

  const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
  console.log(`📍 Wallet: ${keypair.publicKey.toBase58()}`);

  // Connect to Solana
  const connection = await createConnection();

  // Check balance
  const balance = await connection.getBalance(keypair.publicKey);
  const balanceSOL = balance / LAMPORTS_PER_SOL;
  console.log(`💰 Balance: ${balanceSOL.toFixed(4)} SOL`);

  if (balanceSOL < 0.002) {
    throw new Error(`Insufficient balance. Need at least 0.002 SOL, have ${balanceSOL.toFixed(4)} SOL`);
  }

  // STEP 1: Get tip instructions from Gateway
  console.log("\n📋 Step 1: Getting tip instructions from Gateway...");
  
  const tipRequest = {
    id: "test-tip",
    jsonrpc: "2.0",
    method: "getTipInstructions",
    params: [{
      feePayer: keypair.publicKey.toBase58()
    }]
  };

  console.log("Request:", JSON.stringify(tipRequest, null, 2));

  const tipResponse = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tipRequest),
  });

  const tipData = await tipResponse.json();
  console.log("Response:", JSON.stringify(tipData, null, 2));

  if (tipData.error) {
    throw new Error(`getTipInstructions failed: ${tipData.error.message}`);
  }

  const tipInstructions = tipData.result || [];
  console.log(`✅ Got ${tipInstructions.length} tip instructions`);

  // STEP 2: Build transaction
  console.log("\n🔨 Step 2: Building transaction with tip instructions...");
  
  const { blockhash } = await connection.getLatestBlockhash();
  console.log(`📦 Blockhash: ${blockhash}`);

  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = keypair.publicKey;

  // Add tip instructions
  tipInstructions.forEach((ix: any) => {
    const dataBytes = new Uint8Array(Object.values(ix.data));
    transaction.add({
      programId: new PublicKey(ix.programAddress),
      keys: ix.accounts.map((acc: any) => ({
        pubkey: new PublicKey(acc.address),
        isSigner: acc.isSigner,
        isWritable: acc.isWritable,
      })),
      data: Buffer.from(dataBytes),
    });
  });

  // Add transfer instruction (0.001 SOL test)
  const recipientAddress = "11111111111111111111111111111112"; // System program (burn address for testing)
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(recipientAddress),
      lamports: 0.001 * LAMPORTS_PER_SOL,
    })
  );

  console.log(`✅ Transaction built with ${transaction.instructions.length} instructions`);

  // STEP 3: Sign transaction
  console.log("\n✍️  Step 3: Signing transaction...");
  transaction.sign(keypair);
  console.log("✅ Transaction signed");

  // STEP 4: Serialize transaction
  const signedSerialized = transaction.serialize();
  const signedBase64 = Buffer.from(signedSerialized).toString("base64");
  console.log(`✅ Serialized (${signedBase64.length} chars)`);

  // STEP 5: Send via Gateway
  console.log("\n📤 Step 4: Sending transaction via Gateway...");

  const sendRequest = {
    id: "test-send",
    jsonrpc: "2.0",
    method: "sendTransaction",
    params: [signedBase64, { encoding: "base64" }]
  };

  const sendResponse = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sendRequest),
  });

  const sendData = await sendResponse.json();
  console.log("Response:", JSON.stringify(sendData, null, 2));

  if (sendData.error) {
    throw new Error(`sendTransaction failed: ${sendData.error.message}`);
  }

  const signature = sendData.result;
  console.log(`\n✅ SUCCESS! Transaction signature: ${signature}`);
  console.log(`🔍 View on Solscan: https://solscan.io/tx/${signature}`);

  return signature;
}

// Run test
testGatewayTransaction()
  .then(() => {
    console.log("\n" + "=".repeat(60));
    console.log("✨ TEST COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60) + "\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n" + "=".repeat(60));
    console.error("❌ TEST FAILED");
    console.error("=".repeat(60));
    console.error(error);
    process.exit(1);
  });
