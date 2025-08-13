import { encodeFunctionData } from "viem";
import { createWallet, createPublic, buildTransport, getAccount } from "../utils/viem.js";
import { ERC20_APPROVE_ABI } from "../constants/abi.js";

export async function approveToken({
  tokenAddress,
  spenderAddress,
  amount,
  // Optional sending contexts
  walletClient,
  privateKey,
  chain,
  rpcUrl,
  // Behavior flags
  send = false,
  waitForReceipt = false,
}) {
  if (!tokenAddress) throw new Error("tokenAddress is required");
  if (!spenderAddress) throw new Error("spenderAddress is required");
  if (amount === undefined || amount === null) throw new Error("amount is required");

  const data = encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [
      spenderAddress,
      typeof amount === "bigint" ? amount : BigInt(amount),
    ],
  });

  // If not sending, return the prepared tx for the caller to sign/send (e.g., UI wallet)
  if (!send && !walletClient && !privateKey) {
    return { to: tokenAddress, data };
  }

  // If a walletClient is provided, use it to send
  if (walletClient) {
    const hash = await walletClient.sendTransaction({ to: tokenAddress, data });
    if (waitForReceipt) {
      const publicClient = createPublic({
        chain: walletClient.chain ?? chain,
        rpcUrl,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    return { hash, to: tokenAddress, data };
  }

  // If privateKey is provided, send from server using provided chain/rpcUrl
  if (privateKey) {
    if (!chain) throw new Error("chain is required when using privateKey");
    const serverWallet = createWallet({ chain, rpcUrl, privateKey });
    const hash = await serverWallet.sendTransaction({ to: tokenAddress, data });
    if (waitForReceipt) {
      const publicClient = createPublic({ chain, rpcUrl });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    return { hash, to: tokenAddress, data };
  }

  // Fallback: return prepared tx
  return { to: tokenAddress, data };
}


