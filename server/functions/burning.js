import { encodeFunctionData } from "viem";
import { createWallet, createPublic } from "../utils/viem.js";
import { TOKEN_MESSENGER_DEPOSIT_FOR_BURN_ABI } from "../constants/abi.js";

export async function depositForBurn({
  // contract and args
  tokenMessengerAddress,
  amount,
  destinationDomain,
  mintRecipientBytes32,
  burnTokenAddress,
  destinationCallerBytes32,
  maxFee,
  minFinalityThreshold,

  // sending contexts (all optional)
  walletClient,
  privateKey,
  chain,
  rpcUrl,
  // behavior
  send = false,
  waitForReceipt = false,
}) {
  if (!tokenMessengerAddress) throw new Error("tokenMessengerAddress is required");
  if (amount === undefined || amount === null) throw new Error("amount is required");
  if (destinationDomain === undefined || destinationDomain === null) throw new Error("destinationDomain is required");
  if (!mintRecipientBytes32) throw new Error("mintRecipientBytes32 is required");
  if (!burnTokenAddress) throw new Error("burnTokenAddress is required");
  if (!destinationCallerBytes32) throw new Error("destinationCallerBytes32 is required");
  if (maxFee === undefined || maxFee === null) throw new Error("maxFee is required");
  if (minFinalityThreshold === undefined || minFinalityThreshold === null) throw new Error("minFinalityThreshold is required");

  const data = encodeFunctionData({
    abi: TOKEN_MESSENGER_DEPOSIT_FOR_BURN_ABI,
    functionName: "depositForBurn",
    args: [
      typeof amount === "bigint" ? amount : BigInt(amount),
      Number(destinationDomain),
      mintRecipientBytes32,
      burnTokenAddress,
      destinationCallerBytes32,
      typeof maxFee === "bigint" ? maxFee : BigInt(maxFee),
      Number(minFinalityThreshold),
    ],
  });

  if (!send && !walletClient && !privateKey) {
    return { to: tokenMessengerAddress, data };
  }

  if (walletClient) {
    const hash = await walletClient.sendTransaction({ to: tokenMessengerAddress, data });
    if (waitForReceipt) {
      const publicClient = createPublic({ chain: walletClient.chain ?? chain, rpcUrl });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    return { hash, to: tokenMessengerAddress, data };
  }

  if (privateKey) {
    if (!chain) throw new Error("chain is required when using privateKey");
    const serverWallet = createWallet({ chain, rpcUrl, privateKey });
    const hash = await serverWallet.sendTransaction({ to: tokenMessengerAddress, data });
    if (waitForReceipt) {
      const publicClient = createPublic({ chain, rpcUrl });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    return { hash, to: tokenMessengerAddress, data };
  }

  return { to: tokenMessengerAddress, data };
}


