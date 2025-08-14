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
app.use(express.json());

const PORT = 5454;

app.get("/", (req, res) => {
  res.send("server is running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Build-only endpoints for UI to sign & send
app.post("/cctp/approve", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Request body is required" });
    }
    const { network, amount } = req.body;
    if (!network) return res.status(400).json({ error: "network is required" });
    const tokenAddress = USDC[network];
    const spenderAddress = TOKEN_MESSENGER[network];
    if (!tokenAddress || !spenderAddress) return res.status(400).json({ error: "Unsupported network" });
    if (amount === undefined || amount === null) return res.status(400).json({ error: "amount is required" });
    console.log(`[CCTP][approve.build] network=${network} amount=${amount} token=${tokenAddress} spender=${spenderAddress}`);
    const built = await approveToken({ tokenAddress, spenderAddress, amount, send: false });
    console.log(`[CCTP][approve.build] success`);
    return res.json(built);
  } catch (e) {
    console.error(`[CCTP][approve.build][error]`, e);
    return res.status(500).json({ error: e?.message || String(e), stage: "approve.build" });
  }
});

app.post("/cctp/burn", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Request body is required" });
    }
    const { sourceNetwork, destinationNetwork, amount, destinationAddress, maxFee, minFinalityThreshold } = req.body;

    if (!sourceNetwork) return res.status(400).json({ error: "sourceNetwork is required" });
    if (!destinationNetwork) return res.status(400).json({ error: "destinationNetwork is required" });
    if (!amount) return res.status(400).json({ error: "amount is required" });
    if (!destinationAddress) return res.status(400).json({ error: "destinationAddress is required" });

    const tokenMessengerAddress = TOKEN_MESSENGER[sourceNetwork];
    const burnTokenAddress = USDC[sourceNetwork];
    const destinationDomain = CCTP_DOMAIN[destinationNetwork];
    if (!tokenMessengerAddress || !burnTokenAddress || destinationDomain === undefined) {
      return res.status(400).json({ error: "Unsupported network(s)" });
    }
    console.log(`[CCTP][burn.build] sourceNetwork=${sourceNetwork} destinationNetwork=${destinationNetwork} amount=${amount} tokenMessenger=${tokenMessengerAddress} burnToken=${burnTokenAddress} destinationDomain=${destinationDomain}`);

    const built = await depositForBurn({
      tokenMessengerAddress,
      amount,
      destinationDomain,
      mintRecipientBytes32: toBytes32Address(destinationAddress),
      burnTokenAddress,
      destinationCallerBytes32: ZERO_BYTES32,
      maxFee: maxFee ?? DEFAULT_MAX_FEE,
      minFinalityThreshold: minFinalityThreshold ?? DEFAULT_MIN_FINALITY_THRESHOLD_FAST,
      send: false,
    });
    console.log(`[CCTP][burn.build] success`);
    return res.json(built);
  } catch (e) {
    console.error(`[CCTP][burn.build][error]`, e);
    return res.status(500).json({ error: e?.message || String(e), stage: "burn.build" });
  }
});

app.get("/cctp/attestation", async (req, res) => {
  try {
    const { txHash, sourceNetwork } = req.query || {};
    if (!txHash) return res.status(400).json({ error: "txHash is required" });
    if (!sourceNetwork) return res.status(400).json({ error: "sourceNetwork is required" });
    const sourceDomain = CCTP_DOMAIN[sourceNetwork];
    if (sourceDomain === undefined) return res.status(400).json({ error: "Unsupported sourceNetwork" });
    console.log(`[CCTP][attestation.poll] txHash=${txHash} sourceNetwork=${sourceNetwork} sourceDomain=${sourceDomain}`);
    const attestation = await retrieveAttestation({
      transactionHash: String(txHash),
      baseUrl: IRIS_API.sandboxBaseUrl,
      sourceDomain,
      intervalMs: DEFAULT_ATTESTATION_POLL_INTERVAL_MS,
      timeoutMs: 5 * 60 * 1000,
    });
    console.log(`[CCTP][attestation.poll] success`);
    return res.json(attestation);
  } catch (e) {
    console.error(`[CCTP][attestation.poll][error]`, e);
    return res.status(500).json({ error: e?.message || String(e), stage: "attestation.poll" });
  }
});

app.post("/cctp/mint", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Request body is required" });
    }
    const { destinationNetwork, message, attestation } = req.body;
    if (!destinationNetwork) return res.status(400).json({ error: "destinationNetwork is required" });
    if (!message || !attestation) return res.status(400).json({ error: "message and attestation are required" });
    const messageTransmitterAddress = MESSAGE_TRANSMITTER[destinationNetwork];
    if (!messageTransmitterAddress) return res.status(400).json({ error: "Unsupported destinationNetwork" });
    console.log(`[CCTP][mint.build] destinationNetwork=${destinationNetwork} messageTransmitter=${messageTransmitterAddress}`);
    const built = await receiveMessageMint({
      messageTransmitterAddress,
      message,
      attestation,
      send: false,
    });
    console.log(`[CCTP][mint.build] success`);
    return res.json(built);
  } catch (e) {
    console.error(`[CCTP][mint.build][error]`, e);
    return res.status(500).json({ error: e?.message || String(e), stage: "mint.build" });
  }
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