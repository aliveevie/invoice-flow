import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Download, Filter, Eye, MoreHorizontal, Loader2, Link2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useInvoices, type Invoice } from '@/hooks/use-invoices';
import { format } from 'date-fns';

const statusConfig = {
  draft: { variant: 'secondary' as const, color: 'text-muted-foreground' },
  issued: { variant: 'secondary' as const, color: 'text-warning' },
  paid: { variant: 'default' as const, color: 'text-success' },
  overdue: { variant: 'destructive' as const, color: 'text-destructive' },
  cancelled: { variant: 'outline' as const, color: 'text-muted-foreground' },
};

export default function Invoices() {
  const { invoices, isLoading, searchInvoices, filterInvoices, deleteInvoice, clearAllInvoices } = useInvoices();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const location = useLocation();

  // Force refresh when navigating back from create invoice
  useEffect(() => {
    console.log('Invoices component mounted/updated');
    console.log('Current invoices:', invoices);
    console.log('Invoices array length:', invoices?.length);
    console.log('localStorage data:', localStorage.getItem('invoices'));
  }, [location.pathname, invoices]);

  // Ensure invoices is always an array and filter invoices based on search and filters
  const filteredInvoices = (Array.isArray(invoices) ? invoices : []).filter(invoice => {
    // Search filter
    if (searchQuery) {
      const matchesSearch = 
        invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;

    // Currency filter
    if (currencyFilter !== 'all' && invoice.currencyType !== currencyFilter) return false;

    return true;
  });

  const handleDeleteInvoice = (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteInvoice(id);
    }
  };

  const handleCopyPaymentLink = async (invoiceId: string) => {
    const paymentUrl = `${window.location.origin}/pay-invoice/${invoiceId}`;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      // You might want to show a toast here
      console.log('Payment link copied:', paymentUrl);
    } catch (error) {
      console.error('Failed to copy payment link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = paymentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all invoices? This will remove all data and cannot be undone.')) {
      clearAllInvoices();
      // Force a page reload to ensure all components are refreshed
      window.location.reload();
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Customer', 'Email', 'Amount', 'Currency', 'Status', 'Due Date', 'Created Date', 'Chain'];
    const csvContent = [
      headers.join(','),
      ...filteredInvoices.map(invoice => [
        invoice.id,
        `"${invoice.customerName}"`,
        invoice.customerEmail,
        invoice.subtotal,
        invoice.currencyType === 'usdc' ? 'USDC' : (invoice.fiatCurrency || 'USD'),
        invoice.status,
        invoice.dueDate,
        format(new Date(invoice.createdAt), 'yyyy-MM-dd'),
        invoice.chain || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-bg">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 md:ml-64">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Safety check - ensure invoices is an array
  if (!Array.isArray(invoices)) {
    return (
      <div className="flex h-screen bg-gradient-bg">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 md:ml-64">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-muted-foreground mb-4">Error loading invoices</div>
                <Button onClick={() => window.location.reload()}>Reload Page</Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-bg">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
                <p className="text-muted-foreground mt-2">
                  {invoices.length === 0 ? 'No invoices yet' : `${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <Button variant="hero" asChild>
                <Link to="/invoices/new">
                  <Plus className="w-4 h-4" />
                  Create Invoice
                </Link>
              </Button>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Currency</SelectItem>
                      <SelectItem value="usdc">USDC</SelectItem>
                      <SelectItem value="fiat">Fiat</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={handleClearAll}>
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invoices List */}
            <div className="space-y-4">
              {filteredInvoices.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' || currencyFilter !== 'all' 
                        ? 'No invoices match your filters' 
                        : 'No invoices yet. Create your first invoice to get started!'}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredInvoices.map((invoice) => {
                  const config = statusConfig[invoice.status];
                  
                  return (
                    <Card key={invoice.id} className="hover:shadow-card transition-smooth">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div>
                              <div className="font-semibold text-lg">{invoice.id}</div>
                              <div className="text-sm text-muted-foreground">
                                {invoice.customerName} • {invoice.customerEmail}
                              </div>
                            </div>
                            
                            <div className="hidden md:flex flex-col">
                              <div className="text-sm text-muted-foreground">Created</div>
                              <div className="font-medium">{format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</div>
                            </div>
                            
                            <div className="hidden md:flex flex-col">
                              <div className="text-sm text-muted-foreground">Due Date</div>
                              <div className="font-medium">{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold text-xl">
                                {invoice.subtotal.toFixed(2)} {invoice.currencyType === 'usdc' ? 'USDC' : (invoice.fiatCurrency || 'USD')}
                              </div>
                              {invoice.chain && (
                                <div className="text-sm text-muted-foreground">
                                  via {invoice.chain}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              <Badge variant={config.variant}>
                                {invoice.status}
                              </Badge>
                              {invoice.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {invoice.tags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/invoices/${invoice.id}`}>
                                    <Eye className="w-4 h-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportToCSV()}>
                                  <Download className="w-4 h-4" />
                                  Download CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyPaymentLink(invoice.id)}>
                                  <Link2 className="w-4 h-4" />
                                  Copy Payment Link
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  Send Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteInvoice(invoice.id)}
                                >
                                  Delete Invoice
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}