import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Download, Filter, Eye, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const mockInvoices = [
  {
    id: 'INV-001',
    customer: 'Acme Corp',
    email: 'finance@acme.com',
    amount: '1,200.00',
    currency: 'USDC',
    status: 'paid',
    dueDate: '2025-08-10',
    createdDate: '2025-07-25',
    chain: 'Base',
    tags: ['annual', 'subscription']
  },
  {
    id: 'INV-002',
    customer: 'TechStart Ltd',
    email: 'billing@techstart.io',
    amount: '850.00',
    currency: 'USD',
    status: 'pending',
    dueDate: '2025-08-15',
    createdDate: '2025-08-01',
    tags: ['monthly']
  },
  {
    id: 'INV-003',
    customer: 'Design Studio',
    email: 'payments@designstudio.com',
    amount: '2,500.00',
    currency: 'USDC',
    status: 'overdue',
    dueDate: '2025-08-05',
    createdDate: '2025-07-20',
    chain: 'Arbitrum',
    tags: ['project', 'design']
  },
  {
    id: 'INV-004',
    customer: 'Dev Agency',
    email: 'accounts@devagency.com',
    amount: '3,200.00',
    currency: 'USDC',
    status: 'paid',
    dueDate: '2025-08-12',
    createdDate: '2025-07-28',
    chain: 'Optimism',
    tags: ['development', 'quarterly']
  },
];

const statusConfig = {
  paid: { variant: 'default' as const, color: 'text-success' },
  pending: { variant: 'secondary' as const, color: 'text-warning' },
  overdue: { variant: 'destructive' as const, color: 'text-destructive' },
};

export default function Invoices() {
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
                  Manage and track all your invoices
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
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Currency</SelectItem>
                      <SelectItem value="usdc">USDC</SelectItem>
                      <SelectItem value="usd">USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Filter className="w-4 h-4" />
                    More Filters
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invoices List */}
            <div className="space-y-4">
              {mockInvoices.map((invoice) => {
                const config = statusConfig[invoice.status];
                
                return (
                  <Card key={invoice.id} className="hover:shadow-card transition-smooth">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div>
                            <div className="font-semibold text-lg">{invoice.id}</div>
                            <div className="text-sm text-muted-foreground">
                              {invoice.customer} • {invoice.email}
                            </div>
                          </div>
                          
                          <div className="hidden md:flex flex-col">
                            <div className="text-sm text-muted-foreground">Created</div>
                            <div className="font-medium">{invoice.createdDate}</div>
                          </div>
                          
                          <div className="hidden md:flex flex-col">
                            <div className="text-sm text-muted-foreground">Due Date</div>
                            <div className="font-medium">{invoice.dueDate}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-xl">
                              {invoice.amount} {invoice.currency}
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
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Copy Payment Link
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Send Reminder
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}