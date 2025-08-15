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
      } else {
        setError('Invoice not found');
        console.log('Invoice not found:', invoiceId);
      }
    }
    setLoading(false);
  }, [invoiceId, getInvoice]);

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

  const switchNetwork = useCallback(async (targetChainId) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
      console.log(`Switched to chain ${targetChainId}`);
      
      // Wait a bit for the switch to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the switch worked
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId !== targetChainId) {
        throw new Error(`Failed to switch to chain ${targetChainId}. Current: ${currentChainId}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error switching network:', error);
      throw error;
    }
  }, []);

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

    try {
      const amount = getAmountSubunits(invoice.subtotal.toString());
      console.log(`Starting payment for ${invoice.subtotal} USDC (${amount} subunits)`);

      // Step 1: Switch to source network
      setPaymentStep('Switching to source network...');
      const sourceChainId = NETWORKS[selectedNetwork].chainId;
      await switchNetwork(sourceChainId);

      // Step 2: Approve USDC
      setPaymentStep('Building approval transaction...');
      const approvalData = await callServer('/cctp/approve', {
        network: selectedNetwork,
        amount: amount
      });

      setPaymentStep('Please approve USDC spending...');
      const approvalTx = await walletClient.sendTransaction({
        to: approvalData.to,
        data: approvalData.data,
      });
      console.log('Approval transaction sent:', approvalTx);

      setPaymentStep('Waiting for approval confirmation...');
      const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalTx });
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
        recipientAddress: invoice.recipientAddress
      });

      setPaymentStep('Please confirm USDC burn...');
      const burnTx = await walletClient.sendTransaction({
        to: burnData.to,
        data: burnData.data,
      });
      console.log('Burn transaction sent:', burnTx);

      setPaymentStep('Waiting for burn confirmation...');
      const burnReceipt = await publicClient.waitForTransactionReceipt({ hash: burnTx });
      console.log('Burn confirmed:', burnReceipt);

      // Step 4: Get attestation
      setPaymentStep('Retrieving attestation from Circle...');
      const attestationData = await callServer('/cctp/attestation', {
        transactionHash: burnTx,
        sourceNetwork: selectedNetwork
      });
      console.log('Attestation retrieved:', attestationData);

      // Step 5: Switch to destination network
      setPaymentStep('Switching to destination network...');
      const destChainId = NETWORKS[destinationNetwork].chainId;
      await switchNetwork(destChainId);

      // Create wallet client for destination network
      const destWalletClient = createWalletClient({
        chain: undefined,
        transport: custom((window as any).ethereum)
      });

      // Step 6: Mint USDC on destination
      setPaymentStep('Building mint transaction...');
      const mintData = await callServer('/cctp/mint', {
        destinationNetwork: destinationNetwork,
        message: attestationData.message,
        attestation: attestationData.attestation
      });

      setPaymentStep('Please confirm USDC mint...');
      const mintTx = await destWalletClient.sendTransaction({
        to: mintData.to,
        data: mintData.data,
      });
      console.log('Mint transaction sent:', mintTx);

      setPaymentStep('Waiting for mint confirmation...');
      const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });
      console.log('Mint confirmed:', mintReceipt);

      // Step 7: Update invoice status
      setPaymentStep('Updating invoice status...');
      updateInvoice(invoice.id, {
        status: 'paid',
        paymentTxHash: burnTx,
        paymentNetwork: selectedNetwork,
        receiveTxHash: mintTx,
        receiveNetwork: destinationNetwork,
        paidAt: new Date().toISOString(),
        paidBy: address
      });

      setSuccess(`Payment successful! Paid ${invoice.subtotal} USDC via CCTP transfer.`);
      setPaymentStep('Payment completed successfully!');
      
      // Redirect to success page after a delay
      setTimeout(() => {
        navigate(`/invoice-paid/${invoice.id}`);
      }, 3000);

    } catch (error) {
      console.error('Payment error:', error);
      setError(`Payment failed: ${error.message}`);
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

                    {/* Pay Button */}
                    <Button 
                      onClick={handlePayment}
                      disabled={paying || !isConnected || !invoice.recipientAddress}
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
