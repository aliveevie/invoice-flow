import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export function buildTransport(rpcUrl) {
  return rpcUrl ? http(rpcUrl) : http();
}

export function normalizePrivateKey(privateKey) {
  if (!privateKey) return undefined;
  return privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
}

export function getAccount(privateKey) {
  const normalized = normalizePrivateKey(privateKey);
  if (!normalized) return undefined;
  return privateKeyToAccount(normalized);
}

export function createWallet({ chain, rpcUrl, privateKey, account }) {
  const resolvedAccount = account ?? (privateKey ? getAccount(privateKey) : undefined);
  return createWalletClient({
    chain,
    transport: buildTransport(rpcUrl),
    account: resolvedAccount,
  });
}

export function createPublic({ chain, rpcUrl }) {
  return createPublicClient({
    chain,
    transport: buildTransport(rpcUrl),
  });
}


