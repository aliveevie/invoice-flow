import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { 
  mainnet, 
  base, 
  arbitrum, 
  optimism, 
  avalanche, 
  sepolia, 
  avalancheFuji 
} from 'wagmi/chains';

// Define custom testnet chains that might not be available in wagmi/chains
const optimismSepolia = {
  id: 11155420,
  name: 'Optimism Sepolia',
  network: 'optimism-sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.optimism.io'] },
    public: { http: ['https://sepolia.optimism.io'] },
  },
  blockExplorers: {
    default: { name: 'Optimism Sepolia', url: 'https://sepolia-optimism.etherscan.io' },
  },
  testnet: true,
} as const;

const arbitrumSepolia = {
  id: 421614,
  name: 'Arbitrum Sepolia',
  network: 'arbitrum-sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia-arbitrum.arbitrum.io/rpc'] },
    public: { http: ['https://sepolia-arbitrum.arbitrum.io/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Arbitrum Sepolia', url: 'https://sepolia.arbiscan.io' },
  },
  testnet: true,
} as const;

const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Base Sepolia', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
} as const;

const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
    public: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'Polygon Amoy', url: 'https://www.oklink.com/amoy' },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: 'USDC Invoice Platform',
  projectId: 'YOUR_PROJECT_ID',
  chains: [
    mainnet, 
    base, 
    arbitrum, 
    optimism, 
    avalanche, 
    sepolia, 
    avalancheFuji,
    optimismSepolia,
    arbitrumSepolia,
    baseSepolia,
    polygonAmoy
  ],
  ssr: false,
});