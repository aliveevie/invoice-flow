import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Header } from '../components/layout/Header';
import { useInvoices } from '../hooks/use-invoices';
import { formatDate } from 'date-fns';
import axios from 'axios';

const NETWORKS = {
  sepolia: { name: "Sepolia", chainId: "0xaa36a7", displayName: "Ethereum Sepolia Testnet" },
  avalancheFuji: { name: "Avalanche Fuji", chainId: "0xa869", displayName: "Avalanche Fuji Testnet" },
  optimismSepolia: { name: "Optimism Sepolia", chainId: "0xaa37dc", displayName: "Optimism Sepolia Testnet" },
  arbitrumSepolia: { name: "Arbitrum Sepolia", chainId: "0x66eee", displayName: "Arbitrum Sepolia Testnet" },
  baseSepolia: { name: "Base Sepolia", chainId: "0x14a33", displayName: "Base Sepolia Testnet" },
  polygonAmoy: { name: "Polygon Amoy", chainId: "0x13881", displayName: "Polygon Amoy Testnet" }
};

const API_BASE_URL = 'http://localhost:5454';

const getNetworkRpcUrl = (networkKey: string) => {
  const rpcUrls = {
    sepolia: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
    avalancheFuji: 'https://api.avax-test.network/ext/bc/C/rpc',
    optimismSepolia: 'https://sepolia.optimism.io',
    arbitrumSepolia: 'https://sepolia-rollup.arbitrum.io/rpc',
    baseSepolia: 'https://sepolia.base.org',
    polygonAmoy: 'https://rpc-amoy.polygon.technology'
  };
  return rpcUrls[networkKey] || rpcUrls.sepolia;
};

const getNetworkExplorerUrl = (networkKey: string) => {
  const explorerUrls = {
    sepolia: 'https://sepolia.etherscan.io',
    avalancheFuji: 'https://testnet.snowtrace.io',
    optimismSepolia: 'https://sepolia-optimism.etherscan.io',
    arbitrumSepolia: 'https://sepolia.arbiscan.io',
    baseSepolia: 'https://sepolia.basescan.org',
    polygonAmoy: 'https://www.oklink.com/amoy'
  };
  return explorerUrls[networkKey] || explorerUrls.sepolia;
};

export default function PayInvoice() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const { getInvoice, updateInvoice } = useInvoices();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('sepolia');
  const [destinationNetwork, setDestinationNetwork] = useState('avalancheFuji');

  // Load invoice
  useEffect(() => {
    if (invoiceId) {
      console.log('Loading invoice:', invoiceId);
      const foundInvoice = getInvoice(invoiceId);
      if (foundInvoice) {
        setInvoice(foundInvoice);
        console.log('Invoice found:', foundInvoice);
        // Clear any previous error when invoice is found
        if (error === 'Invoice not found') {
          setError('');
        }
      } else if (!paying && !paymentStep) {
        // Only set error if we're not in the middle of payment processing
        console.log('Invoice not found:', invoiceId);
        // Don't set the error state during payment processing
      }
    }
    setLoading(false);
  }, [invoiceId, getInvoice, paying, error, paymentStep]);

  const getAmountSubunits = useCallback((humanAmount) => {
    if (!humanAmount || isNaN(Number(humanAmount))) return "0";
    const amountFloat = parseFloat(humanAmount);
    return Math.floor(amountFloat * 1000000).toString(); // USDC has 6 decimals
  }, []);

  const callServer = useCallback(async (endpoint, data) => {
    try {
      console.log(`[API] Calling ${endpoint}:`, data);
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, data);
      console.log(`[API] Response from ${endpoint}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[API] Error calling ${endpoint}:`, error);
      throw new Error(error.response?.data?.error || error.message);
    }
  }, []);

  const callServerGet = useCallback(async (endpoint, params) => {
    try {
      console.log(`[API] Calling GET ${endpoint}:`, params);
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, { params });
      console.log(`[API] Response from ${endpoint}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[API] Error calling ${endpoint}:`, error);
      throw new Error(error.response?.data?.error || error.message);
    }
  }, []);

  const switchNetwork = useCallback(async (networkKey) => {
    if (!walletClient) {
      throw new Error('Wallet client not ready');
    }

    const network = NETWORKS[networkKey];
    if (!network) {
      throw new Error(`Unknown network: ${networkKey}`);
    }

    try {
      console.log(`Checking current chain...`);
      const currentChain = await walletClient.request({ 
        method: "eth_chainId" as any,
        params: []
      });
      console.log(`Current chain: ${currentChain}, Target: ${network.chainId}`);
      
      if (String(currentChain).toLowerCase() === network.chainId.toLowerCase()) {
        console.log(`Already on ${network.displayName}`);
        return true;
      }

      console.log(`Switching to ${network.displayName}...`);
      try {
        await walletClient.request({
          method: "wallet_switchEthereumChain" as any,
          params: [{ chainId: network.chainId }],
        });
        console.log(`Successfully switched to ${network.displayName}`);
        
        // Wait a moment for the switch to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the switch
        const newChain = await walletClient.request({ 
          method: "eth_chainId" as any,
          params: []
        });
        console.log(`New chain after switch: ${newChain}`);
        
        if (String(newChain).toLowerCase() !== network.chainId.toLowerCase()) {
          throw new Error(`Chain switch verification failed. Expected: ${network.chainId}, Got: ${newChain}`);
        }
        
        console.log(`Confirmed on ${network.displayName}`);
        return true;
      } catch (switchError) {
        console.log(`Chain switch failed: ${switchError.message}`);
        // If the chain doesn't exist, try to add it
        if (switchError.message.includes('Unrecognized chain ID') || switchError.code === 4902) {
          console.log(`Attempting to add ${network.displayName} to wallet...`);
          try {
            await walletClient.request({
              method: 'wallet_addEthereumChain' as any,
              params: [
                {
                  chainId: network.chainId,
                  chainName: network.displayName,
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: [getNetworkRpcUrl(networkKey)],
                  blockExplorerUrls: [getNetworkExplorerUrl(networkKey)],
                },
              ],
            });
            console.log(`Successfully added ${network.displayName} to wallet`);
            
            // Now try to switch again
            await walletClient.request({
              method: "wallet_switchEthereumChain" as any,
              params: [{ chainId: network.chainId }],
            });
            console.log(`Successfully switched to ${network.displayName} after adding`);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
          } catch (addError) {
            console.error(`Failed to add chain: ${addError.message}`);
            throw new Error(`Failed to add ${network.displayName} to wallet. Please add it manually.`);
          }
        } else {
          throw switchError;
        }
      }
    } catch (error) {
      console.error('Error switching network:', error);
      throw new Error(`Failed to switch to ${network.displayName}: ${error.message}`);
    }
  }, [walletClient]);

  const handleRetryMint = async () => {
    if (!invoice || !isConnected || !address || !invoice.paymentTxHash) {
      setError('Cannot retry - missing required information');
      return;
    }

    setPaying(true);
    setError('');
    setSuccess('');

    try {
      // Start from attestation step since burn was already successful
      setPaymentStep('Retrieving attestation for previous burn...');
      const attestationData = await callServerGet('/cctp/attestation', {
        txHash: invoice.paymentTxHash,
        sourceNetwork: invoice.paymentNetwork || selectedNetwork
      });
      console.log('Attestation retrieved for retry:', attestationData);

      // Mint USDC on destination - following testcctp.tsx pattern
      setPaymentStep('Building mint transaction...');
      const mintData = await callServer('/cctp/mint', {
        destinationNetwork: destinationNetwork,
        message: attestationData.message,
        attestation: attestationData.attestation
      });
      console.log(`Mint built: to=${mintData.to}, data=${mintData.data}`);
      
      // Ensure wallet is on destination network for mint
      const destNetwork = NETWORKS[destinationNetwork];
      setPaymentStep('Checking current chain...');
      const currentChainForMint = await walletClient.request({ 
        method: "eth_chainId" as any,
        params: []
      });
      console.log(`Current chain: ${currentChainForMint}`);
      
      if (String(currentChainForMint).toLowerCase() !== destNetwork.chainId.toLowerCase()) {
        setPaymentStep(`Switching to ${destNetwork.displayName}...`);
        try {
          await walletClient.request({
            method: "wallet_switchEthereumChain" as any,
            params: [{ chainId: destNetwork.chainId }],
          });
          console.log(`Successfully switched to ${destNetwork.displayName}`);
          
          // Wait a moment for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify the switch
          const newChain = await walletClient.request({ 
            method: "eth_chainId" as any,
            params: []
          });
          console.log(`New chain after switch: ${newChain}`);
          
          if (String(newChain).toLowerCase() !== destNetwork.chainId.toLowerCase()) {
            throw new Error(`Chain switch failed. Please manually switch to ${destNetwork.displayName} and retry.`);
          }
          console.log(`Confirmed on ${destNetwork.displayName}, proceeding with mint...`);
        } catch (err: any) {
          // If the chain doesn't exist, try to add it
          if (err.message.includes('Unrecognized chain ID') || err.code === 4902) {
            console.log(`Attempting to add ${destNetwork.displayName} to wallet...`);
            try {
              await walletClient.request({
                method: 'wallet_addEthereumChain' as any,
                params: [
                  {
                    chainId: destNetwork.chainId,
                    chainName: destNetwork.displayName,
                    nativeCurrency: {
                      name: 'ETH',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: [getNetworkRpcUrl(destinationNetwork)],
                    blockExplorerUrls: [getNetworkExplorerUrl(destinationNetwork)],
                  },
                ],
              });
              console.log(`Successfully added ${destNetwork.displayName} to wallet`);
              
              // Now try to switch again
              await walletClient.request({
                method: "wallet_switchEthereumChain" as any,
                params: [{ chainId: destNetwork.chainId }],
              });
              console.log(`Successfully switched to ${destNetwork.displayName} after adding`);
              
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (addError) {
              console.error(`Failed to add chain: ${addError.message}`);
              throw new Error(`Failed to add ${destNetwork.displayName} to wallet. Please add it manually and retry.`);
            }
          } else {
            throw new Error(`Chain switch error: ${err.message}. Please switch to ${destNetwork.displayName} manually and retry.`);
          }
        }
      } else {
        console.log(`Already on ${destNetwork.displayName}, proceeding with mint...`);
      }
      
      setPaymentStep('Sending mint transaction...');
      // Create a new wallet client for destination network to avoid chain mismatch
      const destWalletClient = createWalletClient({
        chain: { id: parseInt(destNetwork.chainId, 16), name: destNetwork.displayName } as any,
        transport: custom((window as any).ethereum),
        account: address as `0x${string}`,
      });
      
      const mintTx = await destWalletClient.sendTransaction({
        to: mintData.to as `0x${string}`,
        data: mintData.data as `0x${string}`,
        account: address as `0x${string}`,
        chain: undefined,
        kzg: undefined,
      });
      console.log(`Mint tx: ${mintTx}`);
      console.log(`Success: USDC transferred ${invoice.paymentNetwork || selectedNetwork} -> ${destNetwork.displayName}`);

      // Update invoice status
      setPaymentStep('Updating invoice status...');
      updateInvoice(invoice.id, {
        status: 'paid',
        receiveTxHash: mintTx,
        receiveNetwork: destinationNetwork,
        paidAt: new Date().toISOString(),
        attestationMessage: attestationData.message,
        attestationSignature: attestationData.attestation,
        lastFailedStep: undefined // Clear the failed step
      });

      setSuccess(`Payment completed! Your USDC transfer is now complete.`);
      setPaymentStep('Retry successful - payment completed!');
      
      // Redirect to success page after a delay
      setTimeout(() => {
        navigate(`/invoice-paid/${invoice.id}`);
      }, 3000);

    } catch (error) {
      console.error('Retry error:', error);
      
      let errorMessage = '';
      if (error.message.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message.includes('Timed out while waiting')) {
        errorMessage = 'Transaction confirmation timed out. The transaction may still be processing. Please check your wallet.';
      } else if (error.message.includes('Unrecognized chain ID')) {
        errorMessage = `Network error: ${error.message}. Please add the required network to your wallet.`;
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      setError(`Retry failed: ${errorMessage}`);
      setPaymentStep('');
    } finally {
      setPaying(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice || !isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (invoice.currencyType !== 'usdc') {
      setError('This invoice can only be paid with USDC');
      return;
    }

    setPaying(true);
    setError('');
    setSuccess('');
    
    let burnTx: string | undefined = undefined; // Declare burnTx variable

    try {
      const amount = getAmountSubunits(invoice.subtotal.toString());
      console.log(`Starting payment for ${invoice.subtotal} USDC (${amount} subunits)`);

      // Step 1: Switch to source network
      setPaymentStep('Switching to source network...');
      await switchNetwork(selectedNetwork);

      // Step 2: Approve USDC
      setPaymentStep('Building approval transaction...');
      const approvalData = await callServer('/cctp/approve', {
        network: selectedNetwork,
        amount: amount
      });

      setPaymentStep('Please approve USDC spending...');
      const approvalTx = await walletClient.sendTransaction({
        to: approvalData.to as `0x${string}`,
        data: approvalData.data as `0x${string}`,
        account: address as `0x${string}`,
        chain: undefined,
        kzg: undefined,
      });
      console.log('Approval transaction sent:', approvalTx);

      setPaymentStep('Waiting for approval confirmation...');
      const approvalReceipt = await publicClient.waitForTransactionReceipt({ 
        hash: approvalTx,
        timeout: 120_000 // 2 minute timeout
      });
      console.log('Approval confirmed:', approvalReceipt);

      // Step 3: Burn USDC
      setPaymentStep('Building burn transaction...');
      // Validate recipient address
      if (!invoice.recipientAddress) {
        throw new Error('This invoice is missing a recipient address. Please contact the invoice issuer.');
      }

      const burnData = await callServer('/cctp/burn', {
        sourceNetwork: selectedNetwork,
        destinationNetwork: destinationNetwork,
        amount: amount,
        destinationAddress: invoice.recipientAddress
      });

      setPaymentStep('Please confirm USDC burn...');
      burnTx = await walletClient.sendTransaction({
        to: burnData.to as `0x${string}`,
        data: burnData.data as `0x${string}`,
        account: address as `0x${string}`,
        chain: undefined,
        kzg: undefined,
      });
      console.log('Burn transaction sent:', burnTx);

      setPaymentStep('Waiting for burn confirmation...');
      const burnReceipt = await publicClient.waitForTransactionReceipt({ 
        hash: burnTx,
        timeout: 120_000 // 2 minute timeout
      });
      console.log('Burn confirmed:', burnReceipt);

      // Save burn transaction immediately for retry capability
      console.log('Saving burn transaction for potential retry...');
      updateInvoice(invoice.id, {
        paymentTxHash: burnTx,
        paymentNetwork: selectedNetwork,
        paidBy: address,
        lastFailedStep: undefined // Clear any previous failed step
      });
      
      // Update local invoice state to show retry button if next steps fail
      const updatedInvoice = getInvoice(invoice.id);
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
      }

      // Step 4: Get attestation
      setPaymentStep('Retrieving attestation from Circle...');
      const attestationData = await callServerGet('/cctp/attestation', {
        txHash: burnTx,
        sourceNetwork: selectedNetwork
      });
      console.log('Attestation retrieved:', attestationData);

      // Step 5: Switch to destination network and mint
      setPaymentStep('Building mint transaction...');
      const mintData = await callServer('/cctp/mint', {
        destinationNetwork: destinationNetwork,
        message: attestationData.message,
        attestation: attestationData.attestation
      });
      console.log(`Mint built: to=${mintData.to}, data=${mintData.data}`);
      
      // Ensure wallet is on destination network for mint
      const destNetwork = NETWORKS[destinationNetwork];
      setPaymentStep('Checking current chain...');
      const currentChainForMint = await walletClient.request({ 
        method: "eth_chainId" as any,
        params: []
      });
      console.log(`Current chain: ${currentChainForMint}`);
      
      if (String(currentChainForMint).toLowerCase() !== destNetwork.chainId.toLowerCase()) {
        setPaymentStep(`Switching to ${destNetwork.displayName}...`);
        try {
          await walletClient.request({
            method: "wallet_switchEthereumChain" as any,
            params: [{ chainId: destNetwork.chainId }],
          });
          console.log(`Successfully switched to ${destNetwork.displayName}`);
          
          // Wait a moment for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify the switch
          const newChain = await walletClient.request({ 
            method: "eth_chainId" as any,
            params: []
          });
          console.log(`New chain after switch: ${newChain}`);
          
          if (String(newChain).toLowerCase() !== destNetwork.chainId.toLowerCase()) {
            throw new Error(`Chain switch failed. Please manually switch to ${destNetwork.displayName} and retry.`);
          }
          console.log(`Confirmed on ${destNetwork.displayName}, proceeding with mint...`);
        } catch (err: any) {
          // If the chain doesn't exist, try to add it
          if (err.message.includes('Unrecognized chain ID') || err.code === 4902) {
            console.log(`Attempting to add ${destNetwork.displayName} to wallet...`);
            try {
              await walletClient.request({
                method: 'wallet_addEthereumChain' as any,
                params: [
                  {
                    chainId: destNetwork.chainId,
                    chainName: destNetwork.displayName,
                    nativeCurrency: {
                      name: 'ETH',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: [getNetworkRpcUrl(destinationNetwork)],
                    blockExplorerUrls: [getNetworkExplorerUrl(destinationNetwork)],
                  },
                ],
              });
              console.log(`Successfully added ${destNetwork.displayName} to wallet`);
              
              // Now try to switch again
              await walletClient.request({
                method: "wallet_switchEthereumChain" as any,
                params: [{ chainId: destNetwork.chainId }],
              });
              console.log(`Successfully switched to ${destNetwork.displayName} after adding`);
              
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (addError) {
              console.error(`Failed to add chain: ${addError.message}`);
              throw new Error(`Failed to add ${destNetwork.displayName} to wallet. Please add it manually and retry.`);
            }
          } else {
            throw new Error(`Chain switch error: ${err.message}. Please switch to ${destNetwork.displayName} manually and retry.`);
          }
        }
      } else {
        console.log(`Already on ${destNetwork.displayName}, proceeding with mint...`);
      }
      
      setPaymentStep('Sending mint transaction...');
      // Create a new wallet client for destination network to avoid chain mismatch
      const destWalletClient = createWalletClient({
        chain: { id: parseInt(destNetwork.chainId, 16), name: destNetwork.displayName } as any,
        transport: custom((window as any).ethereum),
        account: address as `0x${string}`,
      });
      
      const mintTx = await destWalletClient.sendTransaction({
        to: mintData.to as `0x${string}`,
        data: mintData.data as `0x${string}`,
        account: address as `0x${string}`,
        chain: undefined,
        kzg: undefined,
      });
      console.log(`Mint tx: ${mintTx}`);
      console.log(`Success: USDC transferred ${NETWORKS[selectedNetwork].displayName} -> ${destNetwork.displayName}`);

      // Step 7: Update invoice status
      setPaymentStep('Updating invoice status...');
      updateInvoice(invoice.id, {
        status: 'paid',
        paymentTxHash: burnTx,
        paymentNetwork: selectedNetwork,
        receiveTxHash: mintTx,
        receiveNetwork: destinationNetwork,
        paidAt: new Date().toISOString(),
        paidBy: address,
        attestationMessage: attestationData.message,
        attestationSignature: attestationData.attestation
      });

      setSuccess(`Payment successful! Paid ${invoice.subtotal} USDC via CCTP transfer.`);
      setPaymentStep('Payment completed successfully!');
      
      // Redirect to success page after a delay
      setTimeout(() => {
        navigate(`/invoice-paid/${invoice.id}`);
      }, 3000);

    } catch (error) {
      console.error('Payment error:', error);
      
      let errorMessage = '';
      
      // Handle specific error types
      if (error.message.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message.includes('Timed out while waiting')) {
        errorMessage = 'Transaction confirmation timed out. The transaction may still be processing. Please check your wallet and try refreshing the page.';
      } else if (error.message.includes('Unrecognized chain ID') || error.message.includes('add it manually')) {
        errorMessage = `Network error: ${error.message}. Please add the required network to your wallet manually.`;
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction (including gas fees)';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      // If we have a burn transaction but failed later, save the burn details for retry
      if (typeof burnTx === 'string' && burnTx.startsWith('0x')) {
        console.log('Saving burn transaction details for retry...');
        updateInvoice(invoice.id, {
          status: 'issued', // Keep as issued since payment not complete
          paymentTxHash: burnTx,
          paymentNetwork: selectedNetwork,
          paidBy: address,
          lastFailedStep: paymentStep || 'Unknown step'
        });
        
        // Reload the invoice to show the retry button
        const updatedInvoice = getInvoice(invoice.id);
        if (updatedInvoice) {
          setInvoice(updatedInvoice);
        }
        
        setError(`Payment failed at: ${paymentStep}. Your burn transaction (${burnTx}) was successful. You can retry the minting process without losing your USDC. Error: ${errorMessage}`);
      } else {
        setError(`Payment failed: ${errorMessage}`);
      }
      
      setPaymentStep('');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invoice Not Found</h1>
          <p className="text-gray-600 mb-6">The invoice ID "{invoiceId}" could not be found.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const isOverdue = invoice.status === 'overdue' || 
    (invoice.status === 'issued' && new Date() > new Date(invoice.dueDate));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            ← Back
          </Button>
        </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Invoice {invoice.id}</CardTitle>
              <CardDescription>
                Created {formatDate(new Date(invoice.createdAt), 'PPP')}
              </CardDescription>
            </div>
            <Badge variant={
              invoice.status === 'paid' ? 'default' :
              invoice.status === 'overdue' ? 'destructive' :
              invoice.status === 'cancelled' ? 'secondary' :
              'outline'
            }>
              {invoice.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="font-semibold mb-2">Bill To:</h3>
            <p className="font-medium">{invoice.customerName}</p>
            <p className="text-gray-600">{invoice.customerEmail}</p>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <h3 className="font-semibold mb-3">Items</h3>
            <div className="space-y-2">
              {invoice.lineItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {invoice.currencyType === 'usdc' ? 
                        `${(item.quantity * item.unitPrice).toFixed(2)} USDC` :
                        `${invoice.fiatCurrency} ${(item.quantity * item.unitPrice).toFixed(2)}`
                      }
                    </p>
                    <p className="text-sm text-gray-600">
                      @ {invoice.currencyType === 'usdc' ? 
                        `${item.unitPrice.toFixed(2)} USDC` :
                        `${invoice.fiatCurrency} ${item.unitPrice.toFixed(2)}`
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold">Total Amount:</span>
            <span className="font-bold">
              {invoice.currencyType === 'usdc' ? 
                `${invoice.subtotal.toFixed(2)} USDC` :
                `${invoice.fiatCurrency} ${invoice.subtotal.toFixed(2)}`
              }
            </span>
          </div>

          {/* Due Date */}
          <div className="flex justify-between items-center">
            <span className="font-medium">Due Date:</span>
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              {formatDate(new Date(invoice.dueDate), 'PPP')}
              {isOverdue && ' (Overdue)'}
            </span>
          </div>

          {/* Recipient Address for USDC */}
          {invoice.currencyType === 'usdc' && invoice.recipientAddress && (
            <div className="flex justify-between items-center">
              <span className="font-medium">Payment To:</span>
              <span className="font-mono text-sm">
                {invoice.recipientAddress.slice(0, 6)}...{invoice.recipientAddress.slice(-4)}
              </span>
            </div>
          )}

          {/* Memo */}
          {invoice.memo && (
            <div>
              <h3 className="font-semibold mb-2">Notes:</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded">{invoice.memo}</p>
            </div>
          )}

          {/* Payment Section */}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.currencyType === 'usdc' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Pay with USDC (Cross-Chain)</h3>
                
                {!invoice.recipientAddress ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      This invoice is missing a recipient address and cannot be paid. Please contact the invoice issuer.
                    </AlertDescription>
                  </Alert>
                ) : !isConnected ? (
                  <Alert>
                    <AlertDescription>
                      Please connect your wallet to pay this invoice with USDC.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Network Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Pay From Network:</label>
                        <select 
                          value={selectedNetwork} 
                          onChange={(e) => setSelectedNetwork(e.target.value)}
                          className="w-full p-2 border rounded"
                          disabled={paying}
                        >
                          {Object.entries(NETWORKS).map(([key, network]) => (
                            <option key={key} value={key}>{network.displayName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Receive On Network:</label>
                        <select 
                          value={destinationNetwork} 
                          onChange={(e) => setDestinationNetwork(e.target.value)}
                          className="w-full p-2 border rounded"
                          disabled={paying}
                        >
                          {Object.entries(NETWORKS).map(([key, network]) => (
                            <option key={key} value={key}>{network.displayName}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Payment Status */}
                    {paymentStep && (
                      <Alert>
                        <AlertDescription>
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span>{paymentStep}</span>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Error Message */}
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Success Message */}
                    {success && (
                      <Alert>
                        <AlertDescription className="text-green-700">{success}</AlertDescription>
                      </Alert>
                    )}

                    {/* Retry Button for failed transfers */}
                    {invoice.paymentTxHash && !invoice.receiveTxHash && (
                      <Alert>
                        <AlertDescription className="mb-4">
                          <div className="text-amber-700">
                            ⚠️ Previous payment was partially completed. Your burn transaction ({invoice.paymentTxHash.slice(0, 10)}...) was successful.
                            You can retry minting without losing USDC.
                            {invoice.lastFailedStep && ` Last failed step: ${invoice.lastFailedStep}`}
                          </div>
                        </AlertDescription>
                        <Button 
                          onClick={handleRetryMint}
                          disabled={paying || !isConnected}
                          className="w-full mt-2"
                          variant="outline"
                        >
                          {paying ? 'Retrying Mint...' : 'Retry Minting (Complete Payment)'}
                        </Button>
                      </Alert>
                    )}

                    {/* Pay Button */}
                    <Button 
                      onClick={handlePayment}
                      disabled={paying || !isConnected || !invoice.recipientAddress || (invoice.paymentTxHash && !invoice.receiveTxHash)}
                      className="w-full"
                      size="lg"
                    >
                      {paying ? 'Processing Payment...' : `Pay ${invoice.subtotal.toFixed(2)} USDC`}
                    </Button>

                    <p className="text-sm text-gray-600 text-center">
                      This payment uses Circle's CCTP protocol for secure cross-chain USDC transfers.
                      You will pay from {NETWORKS[selectedNetwork].displayName} and receive USDC on {NETWORKS[destinationNetwork].displayName}.
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          {/* Already Paid */}
          {invoice.status === 'paid' && (
            <Alert>
              <AlertDescription className="text-green-700">
                ✅ This invoice has been paid successfully.
                {invoice.paidAt && ` Paid on ${formatDate(new Date(invoice.paidAt), 'PPP')}`}
              </AlertDescription>
            </Alert>
          )}

          {/* Cancelled */}
          {invoice.status === 'cancelled' && (
            <Alert variant="destructive">
              <AlertDescription>
                This invoice has been cancelled and cannot be paid.
              </AlertDescription>
            </Alert>
          )}

          {/* Fiat Currency Notice */}
          {invoice.currencyType === 'fiat' && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Alert>
              <AlertDescription>
                This invoice is in {invoice.fiatCurrency}. Please contact the invoice issuer for payment instructions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
