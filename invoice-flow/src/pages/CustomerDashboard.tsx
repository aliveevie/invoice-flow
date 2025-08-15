import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Header } from '../components/layout/Header';
import { useInvoices } from '../hooks/use-invoices';
import { formatDate } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function CustomerDashboard() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const { invoices, isLoading } = useInvoices();
  
  // Filter invoices by customer (based on wallet address or email)
  const customerInvoices = invoices.filter(invoice => 
    invoice.paidBy === address || 
    (invoice.currencyType === 'usdc' && invoice.recipientAddress === address)
  );

  const getStatusConfig = (invoice) => {
    if (invoice.paymentTxHash && !invoice.receiveTxHash) {
      return { 
        variant: 'destructive' as const, 
        text: 'Transfer Failed',
        description: 'Burn successful, mint failed. You can retry minting.'
      };
    }
    
    switch (invoice.status) {
      case 'paid':
        return { variant: 'default' as const, text: 'Paid', description: 'Payment completed successfully' };
      case 'issued':
        return { variant: 'secondary' as const, text: 'Pending Payment', description: 'Awaiting payment' };
      case 'overdue':
        return { variant: 'destructive' as const, text: 'Overdue', description: 'Payment is overdue' };
      case 'cancelled':
        return { variant: 'outline' as const, text: 'Cancelled', description: 'Invoice has been cancelled' };
      default:
        return { variant: 'secondary' as const, text: invoice.status, description: '' };
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Customer Dashboard</h1>
            <Alert>
              <AlertDescription>
                Please connect your wallet to view your invoices and payment history.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading your invoices...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Invoices</h1>
          <p className="text-gray-600">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>

        {customerInvoices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">
                No invoices found for your wallet address.
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Invoices you pay or that are addressed to your wallet will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {customerInvoices.map((invoice) => {
              const statusConfig = getStatusConfig(invoice);
              const isOverdue = invoice.status === 'overdue' || 
                (invoice.status === 'issued' && new Date() > new Date(invoice.dueDate));
              
              return (
                <Card key={invoice.id} className="hover:shadow-card transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{invoice.id}</h3>
                        <p className="text-gray-600">{invoice.customerName}</p>
                      </div>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.text}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Amount</p>
                        <p className="text-lg font-semibold">
                          {invoice.subtotal.toFixed(2)} {invoice.currencyType === 'usdc' ? 'USDC' : (invoice.fiatCurrency || 'USD')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Due Date</p>
                        <p className={`text-lg ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                          {formatDate(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                          {isOverdue && ' (Overdue)'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Created</p>
                        <p className="text-lg">{formatDate(new Date(invoice.createdAt), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>

                    {statusConfig.description && (
                      <p className="text-sm text-gray-600 mb-4">{statusConfig.description}</p>
                    )}

                    {/* Transaction Details */}
                    {(invoice.paymentTxHash || invoice.receiveTxHash) && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Transaction Details</h4>
                        <div className="space-y-1 text-sm">
                          {invoice.paymentTxHash && (
                            <div>
                              <span className="text-gray-600">Burn Tx: </span>
                              <span className="font-mono">{invoice.paymentTxHash.slice(0, 10)}...{invoice.paymentTxHash.slice(-8)}</span>
                              <span className="text-gray-500 ml-2">({invoice.paymentNetwork})</span>
                            </div>
                          )}
                          {invoice.receiveTxHash && (
                            <div>
                              <span className="text-gray-600">Mint Tx: </span>
                              <span className="font-mono">{invoice.receiveTxHash.slice(0, 10)}...{invoice.receiveTxHash.slice(-8)}</span>
                              <span className="text-gray-500 ml-2">({invoice.receiveNetwork})</span>
                            </div>
                          )}
                          {invoice.paidAt && (
                            <div>
                              <span className="text-gray-600">Paid: </span>
                              <span>{formatDate(new Date(invoice.paidAt), 'PPP p')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Failed Transfer Warning */}
                    {invoice.paymentTxHash && !invoice.receiveTxHash && (
                      <Alert className="mb-4">
                        <AlertDescription>
                          <div className="text-amber-700">
                            ⚠️ Your payment burn was successful but minting failed. 
                            {invoice.lastFailedStep && ` Failed at: ${invoice.lastFailedStep}.`}
                            <strong> Your USDC is safe and you can complete the transfer.</strong>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Separator className="my-4" />

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => navigate(`/pay-invoice/${invoice.id}`)}
                        variant="outline"
                      >
                        View Invoice
                      </Button>
                      
                      {invoice.status === 'paid' && (
                        <Button 
                          onClick={() => navigate(`/invoice-paid/${invoice.id}`)}
                          variant="outline"
                        >
                          View Receipt
                        </Button>
                      )}
                      
                      {invoice.paymentTxHash && !invoice.receiveTxHash && (
                        <Button 
                          onClick={() => navigate(`/pay-invoice/${invoice.id}`)}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          Complete Transfer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
