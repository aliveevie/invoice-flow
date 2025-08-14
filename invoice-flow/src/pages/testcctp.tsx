import React, { useCallback, useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { createWalletClient, custom } from "viem";

export default function TestCctpPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [logs, setLogs] = useState<string[]>([]);
  const [destAddress, setDestAddress] = useState("");
  const [amountSubunits, setAmountSubunits] = useState("");
  const [burnTxHash, setBurnTxHash] = useState<string>("");
  const [isRetryingAttestation, setIsRetryingAttestation] = useState(false);
  const appendLog = useCallback((m: string) => setLogs((l) => [...l, m]), []);

  const switchToFuji = useCallback(async () => {
    if (!walletClient) return appendLog("Wallet client not ready");
    try {
      appendLog("Manually switching to Avalanche Fuji...");
      await walletClient.request({
        method: "wallet_switchEthereumChain" as any,
        params: [{ chainId: "0xa869" }],
      });
      appendLog("Successfully switched to Fuji");
    } catch (err: any) {
      appendLog(`Chain switch error: ${err.message}`);
    }
  }, [walletClient, appendLog]);

  const switchToSepolia = useCallback(async () => {
    if (!walletClient) return appendLog("Wallet client not ready");
    try {
      appendLog("Manually switching to Sepolia...");
      await walletClient.request({
        method: "wallet_switchEthereumChain" as any,
        params: [{ chainId: "0xaa36a7" }],
      });
      appendLog("Successfully switched to Sepolia");
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
      const attestation = await callServer("GET", `/cctp/attestation?txHash=${burnTxHash}&sourceNetwork=sepolia`);
      appendLog("Attestation retrieved successfully!");
      
      appendLog("Building mint...");
      const mintBuilt = await callServer("POST", "/cctp/mint", {
        destinationNetwork: "avalancheFuji",
        message: attestation.message,
        attestation: attestation.attestation,
      });
      appendLog(`Mint built: to=${mintBuilt.to}, data=${mintBuilt.data}`);
      
      // Ensure wallet is on Fuji for mint
      appendLog("Checking current chain...");
      const currentChain = await walletClient.request({ 
        method: "eth_chainId" as any,
        params: []
      });
      appendLog(`Current chain: ${currentChain}`);
      
      if (String(currentChain).toLowerCase() !== "0xa869") {
        appendLog("Switching to Avalanche Fuji...");
        try {
          await walletClient.request({
            method: "wallet_switchEthereumChain" as any,
            params: [{ chainId: "0xa869" }],
          });
          appendLog("Successfully switched to Fuji");
          
          // Wait a moment for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify the switch
          const newChain = await walletClient.request({ 
            method: "eth_chainId" as any,
            params: []
          });
          appendLog(`New chain after switch: ${newChain}`);
          
          if (String(newChain).toLowerCase() !== "0xa869") {
            appendLog("Chain switch failed. Please manually switch to Avalanche Fuji and retry.");
            return;
          }
          appendLog("Confirmed on Fuji, proceeding with mint...");
        } catch (err: any) {
          appendLog(`Chain switch error: ${err.message}. Please switch to Avalanche Fuji manually and retry.`);
          return;
        }
      } else {
        appendLog("Already on Fuji, proceeding with mint...");
      }
      
      appendLog("Sending mint on Fuji...");
      // Create a new wallet client for Fuji to avoid chain mismatch
      const fujiWalletClient = createWalletClient({
        chain: { id: 43113, name: 'Avalanche Fuji' } as any,
        transport: custom((window as any).ethereum),
        account: address as `0x${string}`,
      });
      
      const mintHash = await fujiWalletClient.sendTransaction({
        to: mintBuilt.to as `0x${string}`,
        data: mintBuilt.data as `0x${string}`,
        account: address as `0x${string}`,
        chain: undefined,
        kzg: undefined,
      });
      appendLog(`Mint tx: ${mintHash}`);
      appendLog("Success: USDC transferred Sepolia -> Fuji");
    } catch (e: any) {
      console.error(e);
      appendLog(`Error: ${e?.message || String(e)}`);
    } finally {
      setIsRetryingAttestation(false);
    }
  }, [burnTxHash, callServer, appendLog, walletClient, address]);

  const transfer = useCallback(async () => {
    if (!isConnected || !address) return appendLog("Connect wallet first");
    if (!walletClient) return appendLog("Wallet client not ready");
    if (!destAddress) return appendLog("Enter destination address");
    if (!amountSubunits) return appendLog("Enter amount in subunits (6 decimals for USDC, e.g., 1000000)");
    
    setLogs([]);
    setBurnTxHash(""); // Reset burn hash for new transfer
    try {
      // Derive networks from wallet
      const chainId = await walletClient.request({ 
        method: "eth_chainId" as any,
        params: []
      });
      if (String(chainId).toLowerCase() !== "0xaa36a7") {
        appendLog("Wallet is not on Sepolia. Please switch to Sepolia and retry.");
        return;
      }
      const sourceNetwork = "sepolia";
      const destinationNetwork = "avalancheFuji";

      appendLog("Building approval...");
      const approval = await callServer("POST", "/cctp/approve", {
        network: sourceNetwork,
        amount: amountSubunits, // User's exact transfer amount
      });
      appendLog(`Approval built: to=${approval.to}, data=${approval.data}`);
      appendLog(`Note: Approval amount is exactly what you want to transfer: ${amountSubunits} subunits`);
      
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
        maxFee: 500, // Protocol fee: 0.0005 USDC (500 subunits) - same as transfer.js
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
      
      // Ensure wallet is on Fuji for mint
      appendLog("Checking current chain...");
      const currentChain = await walletClient.request({ 
        method: "eth_chainId" as any,
        params: []
      });
      appendLog(`Current chain: ${currentChain}`);
      
      if (String(currentChain).toLowerCase() !== "0xa869") {
        appendLog("Switching to Avalanche Fuji...");
        try {
          await walletClient.request({
            method: "wallet_switchEthereumChain" as any,
            params: [{ chainId: "0xa869" }],
          });
          appendLog("Successfully switched to Fuji");
          
          // Wait a moment for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify the switch
          const newChain = await walletClient.request({ 
            method: "eth_chainId" as any,
            params: []
          });
          appendLog(`New chain after switch: ${newChain}`);
          
          if (String(newChain).toLowerCase() !== "0xa869") {
            appendLog("Chain switch failed. Please manually switch to Avalanche Fuji and retry.");
            return;
          }
          appendLog("Confirmed on Fuji, proceeding with mint...");
        } catch (err: any) {
          appendLog(`Chain switch error: ${err.message}. Please switch to Avalanche Fuji manually and retry.`);
          return;
        }
      } else {
        appendLog("Already on Fuji, proceeding with mint...");
      }
      
      appendLog("Sending mint on Fuji...");
      // Create a new wallet client for Fuji to avoid chain mismatch
      const fujiWalletClient = createWalletClient({
        chain: { id: 43113, name: 'Avalanche Fuji' } as any,
        transport: custom((window as any).ethereum),
        account: address as `0x${string}`,
      });
      
      const mintHash = await fujiWalletClient.sendTransaction({
        to: mintBuilt.to as `0x${string}`,
        data: mintBuilt.data as `0x${string}`,
        account: address as `0x${string}`,
        chain: undefined,
        kzg: undefined,
      });
      appendLog(`Mint tx: ${mintHash}`);
      appendLog("Success: USDC transferred Sepolia -> Fuji");
    } catch (e: any) {
      console.error(e);
      appendLog(`Error: ${e?.message || String(e)}`);
    }
  }, [isConnected, address, destAddress, callServer, appendLog, amountSubunits, walletClient]);

  return (
    <div className="flex h-screen bg-gradient-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <h2 className="text-xl font-semibold mb-4">CCTP Test</h2>
          <div className="space-y-3 max-w-2xl">
            <div>
              <label className="mr-2">Destination Address</label>
              <input className="border px-2 py-1 w-[420px]" value={destAddress} onChange={(e) => setDestAddress(e.target.value)} />
            </div>
            <div>
              <label className="mr-2">Amount (subunits, USDC 6 decimals e.g., 1000000)</label>
              <input className="border px-2 py-1 w-[300px]" value={amountSubunits} onChange={(e) => setAmountSubunits(e.target.value)} />
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
              <button onClick={switchToSepolia} disabled={!isConnected || !walletClient} className="px-3 py-1 bg-gray-600 text-white rounded text-sm">
                Switch to Sepolia
              </button>
              <button onClick={switchToFuji} disabled={!isConnected || !walletClient} className="px-3 py-1 bg-orange-600 text-white rounded text-sm">
                Switch to Fuji
              </button>
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