import React, { useCallback, useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { createWalletClient, custom } from "viem";

// Network configuration
const NETWORKS = {
  sepolia: {
    name: "Sepolia",
    chainId: "0xaa36a7",
    displayName: "Ethereum Sepolia Testnet"
  },
  avalancheFuji: {
    name: "Avalanche Fuji",
    chainId: "0xa869",
    displayName: "Avalanche Fuji Testnet"
  },
  optimismSepolia: {
    name: "Optimism Sepolia",
    chainId: "0xaa37dc",
    displayName: "Optimism Sepolia Testnet"
  },
  arbitrumSepolia: {
    name: "Arbitrum Sepolia",
    chainId: "0x66eee",
    displayName: "Arbitrum Sepolia Testnet"
  },
  baseSepolia: {
    name: "Base Sepolia",
    chainId: "0x14a33",
    displayName: "Base Sepolia Testnet"
  },
  polygonAmoy: {
    name: "Polygon Amoy",
    chainId: "0x13881",
    displayName: "Polygon Amoy Testnet"
  }
};

export default function TestCctpPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [logs, setLogs] = useState<string[]>([]);
  const [destAddress, setDestAddress] = useState("");
  const [amount, setAmount] = useState(""); // Human readable amount (e.g., "1.5")
  const [sourceNetwork, setSourceNetwork] = useState("sepolia");
  const [destinationNetwork, setDestinationNetwork] = useState("avalancheFuji");
  const [burnTxHash, setBurnTxHash] = useState<string>("");
  const [isRetryingAttestation, setIsRetryingAttestation] = useState(false);
  const appendLog = useCallback((m: string) => setLogs((l) => [...l, m]), []);

  // Convert human readable amount to subunits
  const getAmountSubunits = useCallback((humanAmount: string) => {
    if (!humanAmount || isNaN(Number(humanAmount))) return "0";
    const amountFloat = parseFloat(humanAmount);
    return Math.floor(amountFloat * 1000000).toString(); // USDC has 6 decimals
  }, []);

  // Convert subunits to human readable
  const getHumanReadableAmount = useCallback((subunits: string) => {
    if (!subunits || isNaN(Number(subunits))) return "0";
    const subunitsNum = parseInt(subunits);
    return (subunitsNum / 1000000).toFixed(6);
  }, []);

  const switchToNetwork = useCallback(async (networkKey: string) => {
    if (!walletClient) return appendLog("Wallet client not ready");
    const network = NETWORKS[networkKey as keyof typeof NETWORKS];
    if (!network) return appendLog(`Unknown network: ${networkKey}`);
    
    try {
      appendLog(`Manually switching to ${network.displayName}...`);
      await walletClient.request({
        method: "wallet_switchEthereumChain" as any,
        params: [{ chainId: network.chainId }],
      });
      appendLog(`Successfully switched to ${network.displayName}`);
    } catch (err: any) {
      appendLog(`Chain switch error: ${err.message}`);
    }
  }, [walletClient, appendLog]);

  const callServer = useCallback(async (method: string, path: string, body?: any) => {
    try {
      const res = await fetch(`http://localhost:5454${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let json: any;
      try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
      if (!res.ok) {
        const errMsg = json?.error || res.statusText || "Request failed";
        console.error(`[UI][${method} ${path}][error]`, json);
        throw new Error(errMsg);
      }
      return json;
    } catch (e) {
      console.error(`[UI][fetch][error]`, e);
      throw e;
    }
  }, []);

  const retryAttestation = useCallback(async () => {
    if (!burnTxHash) return appendLog("No burn transaction hash to retry");
    if (!walletClient) return appendLog("Wallet client not ready");
    setIsRetryingAttestation(true);
    try {
      appendLog("Retrying attestation...");
      const attestation = await callServer("GET", `/cctp/attestation?txHash=${burnTxHash}&sourceNetwork=${encodeURIComponent(sourceNetwork)}`);
      appendLog("Attestation retrieved successfully!");
      
      appendLog("Building mint...");
      const mintBuilt = await callServer("POST", "/cctp/mint", {
        destinationNetwork,
        message: attestation.message,
        attestation: attestation.attestation,
      });
      appendLog(`Mint built: to=${mintBuilt.to}, data=${mintBuilt.data}`);
      
      // Ensure wallet is on destination network for mint
      const destNetwork = NETWORKS[destinationNetwork as keyof typeof NETWORKS];
      appendLog(`Checking current chain...`);
      const currentChain = await walletClient.request({ 
        method: "eth_chainId" as any,
        params: []
      });
      appendLog(`Current chain: ${currentChain}`);
      
      if (String(currentChain).toLowerCase() !== destNetwork.chainId) {
        appendLog(`Switching to ${destNetwork.displayName}...`);
        try {
          await walletClient.request({
            method: "wallet_switchEthereumChain" as any,
            params: [{ chainId: destNetwork.chainId }],
          });
          appendLog(`Successfully switched to ${destNetwork.displayName}`);
          
          // Wait a moment for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify the switch
          const newChain = await walletClient.request({ 
            method: "eth_chainId" as any,
            params: []
          });
          appendLog(`New chain after switch: ${newChain}`);
          
          if (String(newChain).toLowerCase() !== destNetwork.chainId) {
            appendLog(`Chain switch failed. Please manually switch to ${destNetwork.displayName} and retry.`);
            return;
          }
          appendLog(`Confirmed on ${destNetwork.displayName}, proceeding with mint...`);
        } catch (err: any) {
          appendLog(`Chain switch error: ${err.message}. Please switch to ${destNetwork.displayName} manually and retry.`);
          return;
        }
      } else {
        appendLog(`Already on ${destNetwork.displayName}, proceeding with mint...`);
      }
      
      appendLog("Sending mint...");
      // Create a new wallet client for destination network to avoid chain mismatch
      const destWalletClient = createWalletClient({
        chain: { id: parseInt(destNetwork.chainId, 16), name: destNetwork.displayName } as any,
        transport: custom((window as any).ethereum),
        account: address as `0x${string}`,
      });
      
      const mintHash = await destWalletClient.sendTransaction({
        to: mintBuilt.to as `0x${string}`,
        data: mintBuilt.data as `0x${string}`,
        account: address as `0x${string}`,
        chain: undefined,
        kzg: undefined,
      });
      appendLog(`Mint tx: ${mintHash}`);
      appendLog(`Success: USDC transferred ${NETWORKS[sourceNetwork as keyof typeof NETWORKS].displayName} -> ${destNetwork.displayName}`);
    } catch (e: any) {
      console.error(e);
      appendLog(`Error: ${e?.message || String(e)}`);
    } finally {
      setIsRetryingAttestation(false);
    }
  }, [burnTxHash, callServer, appendLog, walletClient, address, sourceNetwork, destinationNetwork]);

  const transfer = useCallback(async () => {
    if (!isConnected || !address) return appendLog("Connect wallet first");
    if (!walletClient) return appendLog("Wallet client not ready");
    if (!destAddress) return appendLog("Enter destination address");
    if (!amount) return appendLog("Enter amount (e.g., 1.5 for 1.5 USDC)");
    
    const amountSubunits = getAmountSubunits(amount);
    if (amountSubunits === "0") return appendLog("Invalid amount");
    
    setLogs([]);
    setBurnTxHash(""); // Reset burn hash for new transfer
    try {
      // Check if wallet is on source network
      const sourceNetworkInfo = NETWORKS[sourceNetwork as keyof typeof NETWORKS];
      const currentChain = await walletClient.request({ 
        method: "eth_chainId" as any,
        params: []
      });
      
      if (String(currentChain).toLowerCase() !== sourceNetworkInfo.chainId) {
        appendLog(`Wallet is not on ${sourceNetworkInfo.displayName}. Attempting to switch...`);
        try {
          await walletClient.request({
            method: "wallet_switchEthereumChain" as any,
            params: [{ chainId: sourceNetworkInfo.chainId }],
          });
          appendLog(`Successfully switched to ${sourceNetworkInfo.displayName}`);
          
          // Wait for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify the switch
          const newChain = await walletClient.request({ 
            method: "eth_chainId" as any,
            params: []
          });
          
          if (String(newChain).toLowerCase() !== sourceNetworkInfo.chainId) {
            appendLog(`Failed to switch to ${sourceNetworkInfo.displayName}. Please manually switch and retry.`);
            return;
          }
          appendLog(`Confirmed on ${sourceNetworkInfo.displayName}`);
        } catch (err: any) {
          appendLog(`Failed to switch to ${sourceNetworkInfo.displayName}: ${err.message}`);
          appendLog(`Please manually switch to ${sourceNetworkInfo.displayName} and retry.`);
          return;
        }
      } else {
        appendLog(`Already on ${sourceNetworkInfo.displayName}`);
      }

      appendLog(`Starting CCTP transfer from ${sourceNetworkInfo.displayName} to ${NETWORKS[destinationNetwork as keyof typeof NETWORKS].displayName}`);
      appendLog(`Amount: ${amount} USDC (${amountSubunits} subunits)`);

      appendLog("Building approval...");
      const approval = await callServer("POST", "/cctp/approve", {
        network: sourceNetwork,
        amount: amountSubunits,
      });
      appendLog(`Approval built: to=${approval.to}, data=${approval.data}`);
      appendLog(`Note: Approval amount is exactly what you want to transfer: ${amount} USDC`);
      
      appendLog("Sending approval...");
      const approveHash = await walletClient.sendTransaction({
        to: approval.to as `0x${string}`,
        data: approval.data as `0x${string}`,
        account: address as `0x${string}`,
        chain: undefined,
        kzg: undefined,
      });
      appendLog(`Approval tx: ${approveHash}`);

      appendLog("Building burn...");
      const burnBuilt = await callServer("POST", "/cctp/burn", {
        sourceNetwork,
        destinationNetwork,
        amount: amountSubunits,
        destinationAddress: destAddress,
        maxFee: 500, // Protocol fee: 0.0005 USDC (500 subunits)
      });
      appendLog(`Burn built: to=${burnBuilt.to}, data=${burnBuilt.data}`);
      appendLog(`Note: maxFee=500 is the CCTP protocol fee (0.0005 USDC), not gas fees`);
      
      appendLog("Sending burn...");
      appendLog("⚠️  High gas fees shown are network fees, not CCTP protocol fees");
      appendLog("The maxFee=500 is correct for fast CCTP transfers");
      const burnHash = await walletClient.sendTransaction({
        to: burnBuilt.to as `0x${string}`,
        data: burnBuilt.data as `0x${string}`,
        account: address as `0x${string}`,
        chain: undefined,
        kzg: undefined,
      });
      appendLog(`Burn tx: ${burnHash}`);
      setBurnTxHash(burnHash); // Store burn hash for potential retry

      appendLog("Waiting attestation...");
      const attestation = await callServer("GET", `/cctp/attestation?txHash=${burnHash}&sourceNetwork=${encodeURIComponent(sourceNetwork)}`);
      appendLog("Attestation retrieved");
      
      appendLog("Building mint...");
      const mintBuilt = await callServer("POST", "/cctp/mint", {
        destinationNetwork,
        message: attestation.message,
        attestation: attestation.attestation,
      });
      appendLog(`Mint built: to=${mintBuilt.to}, data=${mintBuilt.data}`);
      
      // Ensure wallet is on destination network for mint
      const destNetwork = NETWORKS[destinationNetwork as keyof typeof NETWORKS];
      appendLog(`Checking current chain...`);
      const currentChainForMint = await walletClient.request({ 
        method: "eth_chainId" as any,
        params: []
      });
      appendLog(`Current chain: ${currentChainForMint}`);
      
      if (String(currentChainForMint).toLowerCase() !== destNetwork.chainId) {
        appendLog(`Switching to ${destNetwork.displayName}...`);
        try {
          await walletClient.request({
            method: "wallet_switchEthereumChain" as any,
            params: [{ chainId: destNetwork.chainId }],
          });
          appendLog(`Successfully switched to ${destNetwork.displayName}`);
          
          // Wait a moment for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify the switch
          const newChain = await walletClient.request({ 
            method: "eth_chainId" as any,
            params: []
          });
          appendLog(`New chain after switch: ${newChain}`);
          
          if (String(newChain).toLowerCase() !== destNetwork.chainId) {
            appendLog(`Chain switch failed. Please manually switch to ${destNetwork.displayName} and retry.`);
            return;
          }
          appendLog(`Confirmed on ${destNetwork.displayName}, proceeding with mint...`);
        } catch (err: any) {
          appendLog(`Chain switch error: ${err.message}. Please switch to ${destNetwork.displayName} manually and retry.`);
          return;
        }
      } else {
        appendLog(`Already on ${destNetwork.displayName}, proceeding with mint...`);
      }
      
      appendLog("Sending mint...");
      // Create a new wallet client for destination network to avoid chain mismatch
      const destWalletClient = createWalletClient({
        chain: { id: parseInt(destNetwork.chainId, 16), name: destNetwork.displayName } as any,
        transport: custom((window as any).ethereum),
        account: address as `0x${string}`,
      });
      
      const mintHash = await destWalletClient.sendTransaction({
        to: mintBuilt.to as `0x${string}`,
        data: mintBuilt.data as `0x${string}`,
        account: address as `0x${string}`,
        chain: undefined,
        kzg: undefined,
      });
      appendLog(`Mint tx: ${mintHash}`);
      appendLog(`Success: USDC transferred ${sourceNetworkInfo.displayName} -> ${destNetwork.displayName}`);
    } catch (e: any) {
      console.error(e);
      appendLog(`Error: ${e?.message || String(e)}`);
    }
  }, [isConnected, address, destAddress, callServer, appendLog, amount, sourceNetwork, destinationNetwork, getAmountSubunits, walletClient]);

  return (
    <div className="flex h-screen bg-gradient-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <h2 className="text-xl font-semibold mb-4">CCTP Test</h2>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <strong>How to use:</strong> Select your source network (where you have USDC), enter amount and destination address, 
            then select destination network. The system will automatically switch networks as needed for the transfer.
          </div>
          <div className="space-y-3 max-w-2xl">
            <div>
              <label className="mr-2">From Network</label>
              <select 
                className="border px-2 py-1 w-[200px]" 
                value={sourceNetwork} 
                onChange={(e) => setSourceNetwork(e.target.value)}
              >
                {Object.entries(NETWORKS).map(([key, network]) => (
                  <option key={key} value={key}>{network.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mr-2">To Network</label>
              <select 
                className="border px-2 py-1 w-[200px]" 
                value={destinationNetwork} 
                onChange={(e) => setDestinationNetwork(e.target.value)}
              >
                {Object.entries(NETWORKS).map(([key, network]) => (
                  <option key={key} value={key}>{network.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mr-2">Amount (USDC)</label>
              <input 
                className="border px-2 py-1 w-[200px]" 
                type="number" 
                step="0.000001" 
                min="0.000001"
                placeholder="1.5" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
              />
              <span className="ml-2 text-sm text-gray-600">
                {amount ? `(${getAmountSubunits(amount)} subunits)` : ""}
              </span>
            </div>
            <div>
              <label className="mr-2">Destination Address</label>
              <input className="border px-2 py-1 w-[420px]" value={destAddress} onChange={(e) => setDestAddress(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={transfer} disabled={!isConnected || !walletClient} className="px-4 py-2 bg-blue-600 text-white rounded">
                Start CCTP Transfer
              </button>
              {burnTxHash && (
                <button 
                  onClick={retryAttestation} 
                  disabled={isRetryingAttestation} 
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  {isRetryingAttestation ? "Retrying..." : "Retry Attestation"}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {Object.entries(NETWORKS).map(([key, network]) => (
                <button 
                  key={key}
                  onClick={() => switchToNetwork(key)} 
                  disabled={!isConnected || !walletClient} 
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                >
                  Switch to {network.name}
                </button>
              ))}
            </div>
            <div>
              <h4 className="font-medium">Logs</h4>
              <pre className="whitespace-pre-wrap text-sm">{logs.join("\n")}</pre>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}