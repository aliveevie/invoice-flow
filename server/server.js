import "dotenv/config";
import express from "express";
import { sepolia, avalancheFuji } from "viem/chains";
import {
  approveToken,
  depositForBurn,
  retrieveAttestation,
  receiveMessageMint,
} from "./functions/index.js";
import {
  USDC,
  TOKEN_MESSENGER,
  MESSAGE_TRANSMITTER,
  CCTP_DOMAIN,
  IRIS_API,
  DEFAULT_MAX_FEE,
  DEFAULT_MIN_FINALITY_THRESHOLD_FAST,
  DEFAULT_ATTESTATION_POLL_INTERVAL_MS,
} from "./constants/index.js";
import { toBytes32Address, ZERO_BYTES32 } from "./utils/bytes.js";

const app = express();

const PORT = 5454;

app.get("/", (req, res) => {
  res.send("server is running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Test endpoint to run the full flow with 1 USDC
app.get("/test/transfer", async (req, res) => {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    return res.status(400).json({ success: false, error: "Missing PRIVATE_KEY in environment" });
  }

  const DESTINATION_ADDRESS = "0x7A768a4fF560FCFCBf21689570A79A215B5f80A8";
  const amount = 1_000_000n; // 1 USDC (6 decimals)
  const maxFee = DEFAULT_MAX_FEE;
  const approvalAmount = amount + maxFee;

  try {
    console.log("[TEST] Starting approval...");
    const approveRes = await approveToken({
      tokenAddress: USDC.sepolia,
      spenderAddress: TOKEN_MESSENGER.sepolia,
      amount: approvalAmount,
      privateKey: PRIVATE_KEY,
      chain: sepolia,
      send: true,
      waitForReceipt: true,
    });
    console.log("[TEST] Approval tx:", approveRes.hash);

    console.log("[TEST] Burning on Sepolia...");
    const burnRes = await depositForBurn({
      tokenMessengerAddress: TOKEN_MESSENGER.sepolia,
      amount,
      destinationDomain: CCTP_DOMAIN.avalancheFuji,
      mintRecipientBytes32: toBytes32Address(DESTINATION_ADDRESS),
      burnTokenAddress: USDC.sepolia,
      destinationCallerBytes32: ZERO_BYTES32,
      maxFee,
      minFinalityThreshold: DEFAULT_MIN_FINALITY_THRESHOLD_FAST,
      privateKey: PRIVATE_KEY,
      chain: sepolia,
      send: true,
      waitForReceipt: true,
    });
    console.log("[TEST] Burn tx:", burnRes.hash);

    console.log("[TEST] Retrieving attestation...");
    const attestation = await retrieveAttestation({
      transactionHash: burnRes.hash,
      baseUrl: IRIS_API.sandboxBaseUrl,
      sourceDomain: CCTP_DOMAIN.sepolia,
      intervalMs: DEFAULT_ATTESTATION_POLL_INTERVAL_MS,
    });
    console.log("[TEST] Attestation retrieved");

    console.log("[TEST] Minting on Avalanche Fuji...");
    const mintRes = await receiveMessageMint({
      messageTransmitterAddress: MESSAGE_TRANSMITTER.avalancheFuji,
      message: attestation.message,
      attestation: attestation.attestation,
      privateKey: PRIVATE_KEY,
      chain: avalancheFuji,
      send: true,
      waitForReceipt: true,
    });
    console.log("[TEST] Mint tx:", mintRes.hash);

    return res.json({
      success: true,
      destinationAddress: DESTINATION_ADDRESS,
      amount: "1 USDC",
      approvalTx: approveRes.hash,
      burnTx: burnRes.hash,
      mintTx: mintRes.hash,
    });
  } catch (error) {
    console.error("[TEST] Transfer failed:", error);
    return res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`server is starting on port ${PORT}`);
});