import { createWalletClient, http, encodeFunctionData, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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

  const approveAbi = [
    {
      type: "function",
      name: "approve",
      stateMutability: "nonpayable",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
    },
  ];

  const data = encodeFunctionData({
    abi: approveAbi,
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
      const publicClient = createPublicClient({
        chain: walletClient.chain ?? chain,
        transport: rpcUrl ? http(rpcUrl) : http(),
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    return { hash, to: tokenAddress, data };
  }

  // If privateKey is provided, send from server using provided chain/rpcUrl
  if (privateKey) {
    if (!chain) throw new Error("chain is required when using privateKey");
    const normalizedPrivateKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(normalizedPrivateKey);
    const transport = rpcUrl ? http(rpcUrl) : http();
    const serverWallet = createWalletClient({ chain, transport, account });
    const hash = await serverWallet.sendTransaction({ to: tokenAddress, data });
    if (waitForReceipt) {
      const publicClient = createPublicClient({ chain, transport });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    return { hash, to: tokenAddress, data };
  }

  // Fallback: return prepared tx
  return { to: tokenAddress, data };
}


