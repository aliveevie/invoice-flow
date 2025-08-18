import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInvoices, type Invoice } from '@/hooks/use-invoices';
import { formatDate } from 'date-fns';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Copy, 
  Mail, 
  Download, 
  ExternalLink,
  Wallet,
  Calendar,
  User,
  Mail as MailIcon,
  Tag,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const API_BASE_URL = 'https://invoice-flow-server.vercel.app';

const statusConfig = {
  draft: { 
    variant: 'secondary' as const, 
    icon: FileText, 
    color: 'text-muted-foreground',
    description: 'Draft invoice - not yet sent to customer'
  },
  issued: { 
    variant: 'secondary' as const, 
    icon: Clock, 
    color: 'text-warning',
    description: 'Invoice issued and awaiting payment'
  },
  paid: { 
    variant: 'default' as const, 
    icon: CheckCircle, 
    color: 'text-success',
    description: 'Payment completed successfully'
  },
  overdue: { 
    variant: 'destructive' as const, 
    icon: AlertCircle, 
    color: 'text-destructive',
    description: 'Payment is overdue'
  },
  cancelled: { 
    variant: 'outline' as const, 
    icon: XCircle, 
    color: 'text-muted-foreground',
    description: 'Invoice has been cancelled'
  },
};

export default function InvoiceDetails() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { getInvoice, deleteInvoice } = useInvoices();
  const { toast } = useToast();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      const foundInvoice = getInvoice(invoiceId);
      if (foundInvoice) {
        setInvoice(foundInvoice);
      }
    }
    setLoading(false);
  }, [invoiceId, getInvoice]);

  const handleDeleteInvoice = () => {
    if (!invoice) return;
    
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteInvoice(invoice.id);
      toast({
        title: "Invoice Deleted",
        description: "Invoice has been permanently deleted.",
        duration: 3000,
      });
      navigate('/invoices');
    }
  };

  const handleCopyPaymentLink = async () => {
    if (!invoice) return;
    
    const paymentUrl = `${window.location.origin}/pay-invoice/${invoice.id}`;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      toast({
        title: "Payment Link Copied!",
        description: "Payment link has been copied to clipboard.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to copy payment link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = paymentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "Payment Link Copied!",
        description: "Payment link has been copied to clipboard.",
        duration: 3000,
      });
    }
  };

  const handleSendReminder = async () => {
    if (!invoice) return;

    // Check if invoice can have reminder sent
    if (invoice.status === 'paid') {
      toast({
        title: "Cannot Send Reminder",
        description: "This invoice has already been paid.",
        variant: "destructive",
      });
      return;
    }

    if (invoice.status === 'cancelled') {
      toast({
        title: "Cannot Send Reminder",
        description: "Cannot send reminder for cancelled invoice.",
        variant: "destructive",
      });
      return;
    }

    if (invoice.status === 'draft') {
      toast({
        title: "Cannot Send Reminder",
        description: "Cannot send reminder for draft invoice. Please issue the invoice first.",
        variant: "destructive",
      });
      return;
    }

    setSendingReminder(true);

    try {
      const baseUrl = window.location.origin;
      
      const response = await axios.post(`${API_BASE_URL}/invoice/send-reminder`, {
        invoice,
        baseUrl
      });
      
      if (response.data.success) {
        const isOverdue = response.data.isOverdue;
        
        toast({
          title: `${isOverdue ? 'Overdue' : 'Payment'} Reminder Sent! 📧`,
          description: `${isOverdue ? 'Overdue payment' : 'Payment reminder'} sent to ${invoice.customerEmail}`,
          duration: 5000,
        });
      } else {
        throw new Error('Failed to send reminder email');
      }
    } catch (error) {
      console.error('Error sending reminder email:', error);
      toast({
        title: "Failed to Send Reminder",
        description: error.response?.data?.error || error.message || "Failed to send reminder email. Please try again.",
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const exportToCSV = () => {
    if (!invoice) return;
    
    const headers = ['ID', 'Customer', 'Email', 'Amount', 'Currency', 'Status', 'Due Date', 'Created Date', 'Chain'];
    const csvContent = [
      headers.join(','),
      [
        invoice.id,
        `"${invoice.customerName}"`,
        invoice.customerEmail,
        invoice.subtotal,
        invoice.currencyType === 'usdc' ? 'USDC' : (invoice.fiatCurrency || 'USD'),
        invoice.status,
        invoice.dueDate,
        formatDate(new Date(invoice.createdAt), 'yyyy-MM-dd'),
        invoice.chain || ''
      ].join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.id}-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-bg">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 md:ml-64">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading invoice...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-screen bg-gradient-bg">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 md:ml-64">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Invoice Not Found</h1>
              <p className="text-gray-600 mb-6">The invoice ID "{invoiceId}" could not be found.</p>
              <Button onClick={() => navigate('/invoices')} variant="outline">
                Back to Invoices
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const config = statusConfig[invoice.status];
  const StatusIcon = config.icon;
  const isOverdue = invoice.status === 'overdue' || 
    (invoice.status === 'issued' && new Date() > new Date(invoice.dueDate));

  return (
    <div className="flex h-screen bg-gradient-bg">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/invoices')}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Invoice {invoice.id}</h1>
                  <p className="text-muted-foreground">Created {formatDate(new Date(invoice.createdAt), 'PPP')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={config.variant} className="flex items-center gap-2">
                  <StatusIcon className="w-4 h-4" />
                  {invoice.status.toUpperCase()}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive">OVERDUE</Badge>
                )}
              </div>
            </div>

            {/* Status Alert */}
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <StatusIcon className="w-4 h-4" />
                {config.description}
                {isOverdue && (
                  <span className="text-destructive font-medium">
                    • This invoice is {Math.ceil((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                  </span>
                )}
              </AlertDescription>
            </Alert>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Invoice Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Customer Name</label>
                        <p className="font-medium">{invoice.customerName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="font-medium flex items-center gap-2">
                          <MailIcon className="w-4 h-4" />
                          {invoice.customerEmail}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Issuer</label>
                        <p className="font-medium">{invoice.issuerName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Issuer Email</label>
                        <p className="font-medium flex items-center gap-2">
                          <MailIcon className="w-4 h-4" />
                          {invoice.issuerEmail}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Line Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {invoice.lineItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {invoice.currencyType === 'usdc' ? 
                                `${(item.quantity * item.unitPrice).toFixed(2)} USDC` :
                                `${invoice.fiatCurrency} ${(item.quantity * item.unitPrice).toFixed(2)}`
                              }
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @ {invoice.currencyType === 'usdc' ? 
                                `${item.unitPrice.toFixed(2)} USDC` :
                                `${invoice.fiatCurrency} ${item.unitPrice.toFixed(2)}`
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Amount:</span>
                      <span>
                        {invoice.currencyType === 'usdc' ? 
                          `${invoice.subtotal.toFixed(2)} USDC` :
                          `${invoice.fiatCurrency} ${invoice.subtotal.toFixed(2)}`
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Details */}
                {invoice.status === 'paid' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Payment Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {invoice.paidBy && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Paid From Wallet</label>
                            <p className="font-mono text-sm flex items-center gap-2">
                              <Wallet className="w-4 h-4" />
                              {invoice.paidBy.slice(0, 6)}...{invoice.paidBy.slice(-4)}
                            </p>
                          </div>
                        )}
                        {invoice.paidAt && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Payment Date</label>
                            <p className="font-medium flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(new Date(invoice.paidAt), 'PPP')}
                            </p>
                          </div>
                        )}
                      </div>
                      {invoice.paymentTxHash && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Payment Transaction</label>
                          <p className="font-mono text-sm break-all">{invoice.paymentTxHash}</p>
                        </div>
                      )}
                      {invoice.receiveTxHash && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Receive Transaction</label>
                          <p className="font-mono text-sm break-all">{invoice.receiveTxHash}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* USDC Payment Details */}
                {invoice.currencyType === 'usdc' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        USDC Payment Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {invoice.recipientAddress && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Recipient Address</label>
                          <p className="font-mono text-sm break-all">{invoice.recipientAddress}</p>
                        </div>
                      )}
                      {invoice.preferredNetwork && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Preferred Network</label>
                          <p className="font-medium capitalize">{invoice.preferredNetwork}</p>
                        </div>
                      )}
                      {invoice.paymentNetwork && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Payment Network</label>
                          <p className="font-medium capitalize">{invoice.paymentNetwork}</p>
                        </div>
                      )}
                      {invoice.receiveNetwork && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Receive Network</label>
                          <p className="font-medium capitalize">{invoice.receiveNetwork}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Actions & Info */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleCopyPaymentLink}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Payment Link
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleSendReminder}
                      disabled={
                        sendingReminder || 
                        invoice.status === 'paid' || 
                        invoice.status === 'cancelled' ||
                        invoice.status === 'draft'
                      }
                    >
                      {sendingReminder ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Reminder
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={exportToCSV}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Invoice
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start"
                      onClick={handleDeleteInvoice}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Invoice
                    </Button>
                  </CardContent>
                </Card>

                {/* Invoice Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(new Date(invoice.dueDate), 'PPP')}
                        {isOverdue && (
                          <Badge variant="destructive" className="ml-2">OVERDUE</Badge>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Currency</label>
                      <p className="font-medium flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        {invoice.currencyType === 'usdc' ? 'USDC (Crypto)' : (invoice.fiatCurrency || 'USD')}
                      </p>
                    </div>
                    
                    {invoice.chain && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Blockchain</label>
                        <p className="font-medium">{invoice.chain}</p>
                      </div>
                    )}
                    
                    {invoice.tags.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tags</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {invoice.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Memo */}
                {invoice.memo && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{invoice.memo}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

