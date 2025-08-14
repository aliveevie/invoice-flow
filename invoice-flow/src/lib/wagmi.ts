import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, base, arbitrum, optimism, avalanche, sepolia, avalancheFuji } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'USDC Invoice Platform',
  projectId: 'YOUR_PROJECT_ID', // Replace with your WalletConnect project ID
  chains: [mainnet, base, arbitrum, optimism, avalanche, sepolia, avalancheFuji],
  ssr: false,
});