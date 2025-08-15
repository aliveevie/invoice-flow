import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useInvoices } from '@/hooks/use-invoices';
import { format } from 'date-fns';

const statusConfig = {
  draft: { 
    variant: 'secondary' as const, 
    icon: Clock, 
    color: 'text-muted-foreground' 
  },
  issued: { 
    variant: 'secondary' as const, 
    icon: Clock, 
    color: 'text-warning' 
  },
  paid: { 
    variant: 'default' as const, 
    icon: CheckCircle, 
    color: 'text-success' 
  },
  overdue: { 
    variant: 'destructive' as const, 
    icon: AlertCircle, 
    color: 'text-destructive' 
  },
  cancelled: { 
    variant: 'outline' as const, 
    icon: Clock, 
    color: 'text-muted-foreground' 
  },
};

export function RecentInvoices() {
  const { invoices, isLoading } = useInvoices();

  // Get the 3 most recent invoices
  const recentInvoices = (invoices || []).slice(0, 3);

  if (isLoading) {
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
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

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
        {recentInvoices.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No invoices yet. Create your first invoice to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {recentInvoices.map((invoice) => {
              const config = statusConfig[invoice.status];
              const StatusIcon = config.icon;
              
              return (
                <div key={invoice.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-smooth">
                  <div className="flex items-center gap-4">
                    <div className={`${config.color}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{invoice.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.id} • Due {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="font-medium">
                        {invoice.subtotal.toFixed(2)} {invoice.currencyType === 'usdc' ? 'USDC' : (invoice.fiatCurrency || 'USD')}
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
        )}
      </CardContent>
    </Card>
  );
}