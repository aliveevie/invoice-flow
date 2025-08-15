import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Header } from '../components/layout/Header';
import { useInvoices } from '../hooks/use-invoices';
import { formatDate } from 'date-fns';

export default function InvoicePaid() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { getInvoice } = useInvoices();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (invoiceId) {
      const foundInvoice = getInvoice(invoiceId);
      setInvoice(foundInvoice);
    }
    setLoading(false);
  }, [invoiceId, getInvoice]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p>Loading payment confirmation...</p>
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 max-w-3xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">Payment Successful!</h1>
        <p className="text-gray-600">Your USDC payment has been processed successfully via CCTP.</p>
      </div>

      {/* Invoice Details */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Invoice {invoice.id}</CardTitle>
              <p className="text-gray-600">
                Paid on {invoice.paidAt ? formatDate(new Date(invoice.paidAt), 'PPP p') : 'Just now'}
              </p>
            </div>
            <Badge variant="default" className="bg-green-600">
              PAID
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-green-700">Amount Paid:</span>
                <span className="font-semibold text-green-800">
                  {invoice.subtotal.toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Payment Method:</span>
                <span className="font-semibold text-green-800">CCTP Cross-Chain Transfer</span>
              </div>
              {invoice.paymentNetwork && (
                <div className="flex justify-between">
                  <span className="text-green-700">From Network:</span>
                  <span className="font-semibold text-green-800 capitalize">
                    {invoice.paymentNetwork.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              )}
              {invoice.receiveNetwork && (
                <div className="flex justify-between">
                  <span className="text-green-700">To Network:</span>
                  <span className="font-semibold text-green-800 capitalize">
                    {invoice.receiveNetwork.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          {(invoice.paymentTxHash || invoice.receiveTxHash) && (
            <div>
              <h3 className="font-semibold mb-3">Transaction Details</h3>
              <div className="space-y-2">
                {invoice.paymentTxHash && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Burn Transaction:</p>
                    <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                      {invoice.paymentTxHash}
                    </p>
                  </div>
                )}
                {invoice.receiveTxHash && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Mint Transaction:</p>
                    <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                      {invoice.receiveTxHash}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Invoice Details */}
          <div>
            <h3 className="font-semibold mb-3">Invoice Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{invoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{invoice.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-medium">
                  {formatDate(new Date(invoice.dueDate), 'PPP')}
                </span>
              </div>
              {invoice.paidBy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid From Wallet:</span>
                  <span className="font-mono text-sm">
                    {invoice.paidBy.slice(0, 6)}...{invoice.paidBy.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="font-semibold mb-3">Items Paid</h3>
            <div className="space-y-2">
              {invoice.lineItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {(item.quantity * item.unitPrice).toFixed(2)} USDC
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={() => navigate('/')} variant="outline">
          Go to Home
        </Button>
        <Button onClick={() => navigate(`/pay-invoice/${invoice.id}`)}>
          View Invoice Again
        </Button>
        <Button 
          onClick={() => window.print()} 
          variant="outline"
        >
          Print Receipt
        </Button>
      </div>

      {/* Footer Note */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Thank you for your payment! This transaction was processed securely using Circle's CCTP protocol.</p>
        <p className="mt-2">Keep this confirmation for your records.</p>
      </div>
      </div>
    </div>
  );
}
