import { encodeFunctionData } from "viem";
import { createWallet, createPublic } from "../utils/viem.js";
import { MESSAGE_TRANSMITTER_RECEIVE_MESSAGE_ABI } from "../constants/abi.js";

export async function receiveMessageMint({
  messageTransmitterAddress,
  message,
  attestation,

  // sending contexts (all optional)
  walletClient,
  privateKey,
  chain,
  rpcUrl,

  // behavior
  send = false,
  waitForReceipt = false,
}) {
  if (!messageTransmitterAddress) throw new Error("messageTransmitterAddress is required");
  if (!message) throw new Error("message is required");
  if (!attestation) throw new Error("attestation is required");

  const data = encodeFunctionData({
    abi: MESSAGE_TRANSMITTER_RECEIVE_MESSAGE_ABI,
    functionName: "receiveMessage",
    args: [message, attestation],
  });

  if (!send && !walletClient && !privateKey) {
    return { to: messageTransmitterAddress, data };
  }

  if (walletClient) {
    const hash = await walletClient.sendTransaction({ to: messageTransmitterAddress, data });
    if (waitForReceipt) {
      const publicClient = createPublic({ chain: walletClient.chain ?? chain, rpcUrl });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    return { hash, to: messageTransmitterAddress, data };
  }

  if (privateKey) {
    if (!chain) throw new Error("chain is required when using privateKey");
    const serverWallet = createWallet({ chain, rpcUrl, privateKey });
    const hash = await serverWallet.sendTransaction({ to: messageTransmitterAddress, data });
    if (waitForReceipt) {
      const publicClient = createPublic({ chain, rpcUrl });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    return { hash, to: messageTransmitterAddress, data };
  }

  return { to: messageTransmitterAddress, data };
}


