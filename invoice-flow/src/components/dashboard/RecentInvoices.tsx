import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Invoice {
  id: string;
  customer: string;
  amount: string;
  currency: string;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  chain?: string;
}

const mockInvoices: Invoice[] = [
  {
    id: 'INV-001',
    customer: 'Acme Corp',
    amount: '1,200.00',
    currency: 'USDC',
    status: 'paid',
    dueDate: '2025-08-10',
    chain: 'Base'
  },
  {
    id: 'INV-002',
    customer: 'TechStart Ltd',
    amount: '850.00',
    currency: 'USD',
    status: 'pending',
    dueDate: '2025-08-15',
  },
  {
    id: 'INV-003',
    customer: 'Design Studio',
    amount: '2,500.00',
    currency: 'USDC',
    status: 'overdue',
    dueDate: '2025-08-05',
  },
];

const statusConfig = {
  paid: { 
    variant: 'default' as const, 
    icon: CheckCircle, 
    color: 'text-success' 
  },
  pending: { 
    variant: 'secondary' as const, 
    icon: Clock, 
    color: 'text-warning' 
  },
  overdue: { 
    variant: 'destructive' as const, 
    icon: AlertCircle, 
    color: 'text-destructive' 
  },
};

export function RecentInvoices() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Invoices</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/invoices">
            View all
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockInvoices.map((invoice) => {
            const config = statusConfig[invoice.status];
            const StatusIcon = config.icon;
            
            return (
              <div key={invoice.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-smooth">
                <div className="flex items-center gap-4">
                  <div className={`${config.color}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">{invoice.customer}</div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.id} • Due {invoice.dueDate}
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="font-medium">
                      {invoice.amount} {invoice.currency}
                    </div>
                    {invoice.chain && (
                      <div className="text-xs text-muted-foreground">
                        via {invoice.chain}
                      </div>
                    )}
                  </div>
                  <Badge variant={config.variant}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}