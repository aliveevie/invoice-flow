import "dotenv/config";
import express from "express";
import {
  approveToken,
  depositForBurn,
  retrieveAttestation,
  receiveMessageMint,
  sendInvoiceEmail,
  sendReminderEmail,
  sendPaymentReceiptEmails,
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
// CORS for local UI (allow all during dev)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

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
    const { sourceNetwork, destinationNetwork, amount, destinationAddress, minFinalityThreshold } = req.body;

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
      maxFee: DEFAULT_MAX_FEE,
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

// Email endpoint for sending invoice notifications
app.post("/invoice/send-email", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Request body is required" });
    }
    
    const { invoice, baseUrl } = req.body;
    
    if (!invoice) {
      return res.status(400).json({ error: "Invoice data is required" });
    }
    
    if (!invoice.customerEmail) {
      return res.status(400).json({ error: "Customer email is required" });
    }
    
    console.log(`[EMAIL] Sending invoice email for ${invoice.id} to ${invoice.customerEmail}`);
    
    const result = await sendInvoiceEmail(invoice, baseUrl);
    
    console.log(`[EMAIL] Successfully sent invoice email for ${invoice.id}`);
    
    return res.json({
      success: true,
      message: "Invoice email sent successfully",
      ...result
    });
    
  } catch (error) {
    console.error(`[EMAIL] Error sending invoice email:`, error);
    return res.status(500).json({ 
      error: error?.message || String(error), 
      stage: "email.send" 
    });
  }
});

// Reminder email endpoint for sending payment reminders
app.post("/invoice/send-reminder", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Request body is required" });
    }
    
    const { invoice, baseUrl } = req.body;
    
    if (!invoice) {
      return res.status(400).json({ error: "Invoice data is required" });
    }
    
    if (!invoice.customerEmail) {
      return res.status(400).json({ error: "Customer email is required" });
    }
    
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: "Cannot send reminder for paid invoice" });
    }
    
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: "Cannot send reminder for cancelled invoice" });
    }
    
    console.log(`[EMAIL] Sending reminder email for ${invoice.id} to ${invoice.customerEmail}`);
    
    const result = await sendReminderEmail(invoice, baseUrl);
    
    console.log(`[EMAIL] Successfully sent reminder email for ${invoice.id}`);
    
    return res.json({
      success: true,
      message: "Reminder email sent successfully",
      ...result
    });
    
  } catch (error) {
    console.error(`[EMAIL] Error sending reminder email:`, error);
    return res.status(500).json({ 
      error: error?.message || String(error), 
      stage: "reminder.send" 
    });
  }
});

// Payment receipt endpoint for sending payment confirmations to both parties
app.post("/invoice/send-payment-receipt", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Request body is required" });
    }
    
    const { invoice, paymentDetails, baseUrl } = req.body;
    
    if (!invoice) {
      return res.status(400).json({ error: "Invoice data is required" });
    }
    
    if (!invoice.customerEmail || !invoice.issuerEmail) {
      return res.status(400).json({ error: "Both customer and issuer emails are required" });
    }
    
    if (invoice.status !== 'paid') {
      return res.status(400).json({ error: "Invoice must be paid to send payment receipt" });
    }
    
    console.log(`[EMAIL] Sending payment receipt emails for ${invoice.id} to both parties`);
    
    const result = await sendPaymentReceiptEmails(invoice, paymentDetails, baseUrl);
    
    console.log(`[EMAIL] Successfully sent payment receipt emails for ${invoice.id}`);
    
    return res.json({
      success: true,
      message: "Payment receipt emails sent successfully to both parties",
      ...result
    });
    
  } catch (error) {
    console.error(`[EMAIL] Error sending payment receipt emails:`, error);
    return res.status(500).json({ 
      error: error?.message || String(error), 
      stage: "payment-receipt.send" 
    });
  }
});

// Note: No server-signed transfer endpoints. All build-only; UI signs via user wallet.

app.listen(PORT, () => {
  console.log(`server is starting on port ${PORT}`);
});