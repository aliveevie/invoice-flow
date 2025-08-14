import React, { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function TestCctpPage() {
  const { address, isConnected } = useAccount();
  const [logs, setLogs] = useState<string[]>([]);
  const [destAddress, setDestAddress] = useState("");
  const [amountSubunits, setAmountSubunits] = useState("");
  const [maxFeeSubunits, setMaxFeeSubunits] = useState("500");
  const appendLog = useCallback((m: string) => setLogs((l) => [...l, m]), []);

  const callServer = useCallback(async (method: string, path: string, body?: any) => {
    try {
      const res = await fetch(path, {
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

  const transfer = useCallback(async () => {
    if (!isConnected || !address) return appendLog("Connect wallet first");
    if (!destAddress) return appendLog("Enter destination address");
    if (!amountSubunits) return appendLog("Enter amount in subunits (6 decimals for USDC, e.g., 1000000)");
    if (!maxFeeSubunits) return appendLog("Enter maxFee in subunits (e.g., 500)");
    setLogs([]);
    try {
      // Derive networks from wallet
      const chainIdHex: string = await (window as any).ethereum.request({ method: "eth_chainId" });
      if (chainIdHex?.toLowerCase() !== "0xaa36a7") {
        appendLog("Wallet is not on Sepolia. Please switch to Sepolia and retry.");
        return;
      }
      const sourceNetwork = "sepolia";
      const destinationNetwork = "avalancheFuji";

      appendLog("Building approval...");
      const approval = await callServer("POST", "/cctp/approve", {
        network: sourceNetwork,
        amount: (BigInt(amountSubunits) + BigInt(maxFeeSubunits)).toString(),
      });
      appendLog("Sending approval...");
      // Use injected wallet to send built tx
      const approveHash = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [{ to: approval.to, data: approval.data }],
      });
      appendLog(`Approval tx: ${approveHash}`);

      appendLog("Building burn...");
      const burnBuilt = await callServer("POST", "/cctp/burn", {
        sourceNetwork,
        destinationNetwork,
        amount: amountSubunits,
        destinationAddress: destAddress,
        maxFee: maxFeeSubunits,
      });
      appendLog("Sending burn...");
      const burnHash = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [{ to: burnBuilt.to, data: burnBuilt.data }],
      });
      appendLog(`Burn tx: ${burnHash}`);

      appendLog("Waiting attestation...");
      const attestation = await callServer("GET", `/cctp/attestation?txHash=${burnHash}&sourceNetwork=${encodeURIComponent(sourceNetwork)}`);
      appendLog("Building mint...");
      const mintBuilt = await callServer("POST", "/cctp/mint", {
        destinationNetwork,
        message: attestation.message,
        attestation: attestation.attestation,
      });
      // Ensure wallet is on Fuji for mint
      const currentChain: string = await (window as any).ethereum.request({ method: "eth_chainId" });
      if (currentChain?.toLowerCase() !== "0xa869") {
        try {
          await (window as any).ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xa869" }],
          });
        } catch (err: any) {
          appendLog("Please switch wallet to Avalanche Fuji and retry mint.");
          throw err;
        }
      }
      appendLog("Sending mint on Fuji...");
      const mintHash = await (window as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [{ to: mintBuilt.to, data: mintBuilt.data }],
      });
      appendLog(`Mint tx: ${mintHash}`);
      appendLog("Success: 1 USDC transferred Sepolia -> Fuji");
    } catch (e: any) {
      console.error(e);
      appendLog(`Error: ${e?.message || String(e)}`);
    }
  }, [isConnected, address, destAddress, callServer, appendLog, amountSubunits, maxFeeSubunits]);

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
            <div>
              <label className="mr-2">Max Fee (subunits, e.g., 500)</label>
              <input className="border px-2 py-1 w-[300px]" value={maxFeeSubunits} onChange={(e) => setMaxFeeSubunits(e.target.value)} />
            </div>
            <div>
              <button onClick={transfer} disabled={!isConnected} className="px-4 py-2 bg-blue-600 text-white rounded">
                Start CCTP Transfer
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


