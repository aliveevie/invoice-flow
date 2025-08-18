import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentInvoices } from '@/components/dashboard/RecentInvoices';
import { DollarSign, FileText, Clock, TrendingUp } from 'lucide-react';
import { useInvoices } from '@/hooks/use-invoices';
import { useMemo } from 'react';

export default function Dashboard() {
  const { invoices, isLoading, getDashboardStats, getMonthlyStats } = useInvoices();

  // Calculate real statistics from invoice data
  const stats = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return {
        totalRevenue: 0,
        totalInvoices: 0,
        pendingAmount: 0,
        settlementRate: 0,
        revenueChange: 0,
        invoiceChange: 0,
        pendingChange: 0,
        settlementChange: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        draftInvoices: 0,
        cancelledInvoices: 0
      };
    }

    const monthlyStats = getMonthlyStats(2);
    const currentMonth = monthlyStats[1] || { revenue: 0, invoices: 0, paid: 0, total: 0 };
    const lastMonth = monthlyStats[0] || { revenue: 0, invoices: 0, paid: 0, total: 0 };

    // Calculate changes
    const revenueChange = lastMonth.revenue > 0 ? 
      ((currentMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100 : 0;
    
    const invoiceChange = lastMonth.invoices > 0 ? 
      ((currentMonth.invoices - lastMonth.invoices) / lastMonth.invoices) * 100 : 0;
    
    const pendingChange = lastMonth.invoices > 0 ? 
      ((currentMonth.invoices - lastMonth.invoices) / lastMonth.invoices) * 100 : 0;
    
    const settlementChange = lastMonth.total > 0 ? 
      ((currentMonth.settlementRate - lastMonth.settlementRate)) : 0;

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const pendingInvoices = invoices.filter(inv => inv.status === 'issued').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
    const draftInvoices = invoices.filter(inv => inv.status === 'draft').length;
    const cancelledInvoices = invoices.filter(inv => inv.status === 'cancelled').length;

    return {
      ...getDashboardStats(),
      revenueChange,
      invoiceChange,
      pendingChange,
      settlementChange,
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      draftInvoices,
      cancelledInvoices
    };
  }, [invoices, getDashboardStats, getMonthlyStats]);

  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage changes
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Get change type for styling
  const getChangeType = (change: number) => {
    if (change > 0) return 'positive' as const;
    if (change < 0) return 'negative' as const;
    return 'neutral' as const;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-bg">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 md:ml-64">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Loading dashboard...</p>
                </div>
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
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Overview of your invoice activity and payments
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Revenue"
                value={formatCurrency(stats.totalRevenue)}
                change={formatChange(stats.revenueChange)}
                changeType={getChangeType(stats.revenueChange)}
                icon={DollarSign}
                description="All-time earnings"
              />
              <StatsCard
                title="Total Invoices"
                value={stats.totalInvoices.toString()}
                change={formatChange(stats.invoiceChange)}
                changeType={getChangeType(stats.invoiceChange)}
                icon={FileText}
                description="Invoices created"
              />
              <StatsCard
                title="Pending"
                value={formatCurrency(stats.pendingAmount)}
                change={formatChange(stats.pendingChange)}
                changeType={getChangeType(stats.pendingChange)}
                icon={Clock}
                description="Awaiting payment"
              />
              <StatsCard
                title="Settlement Rate"
                value={`${stats.settlementRate.toFixed(1)}%`}
                change={formatChange(stats.settlementChange)}
                changeType={getChangeType(stats.settlementChange)}
                icon={TrendingUp}
                description="Successful settlements"
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentInvoices />
              
              {/* Quick Actions */}
              <div className="space-y-6">
                {/* Status Breakdown */}
                <div className="bg-card border rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Invoice Status Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Paid</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stats.paidInvoices}</span>
                        <span className="text-xs text-muted-foreground">
                          ({stats.paidInvoices > 0 ? ((stats.paidInvoices / stats.totalInvoices) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pending</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stats.pendingInvoices}</span>
                        <span className="text-xs text-muted-foreground">
                          ({stats.pendingInvoices > 0 ? ((stats.pendingInvoices / stats.totalInvoices) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overdue</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stats.overdueInvoices}</span>
                        <span className="text-xs text-muted-foreground">
                          ({stats.overdueInvoices > 0 ? ((stats.overdueInvoices / stats.totalInvoices) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Draft</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stats.draftInvoices}</span>
                        <span className="text-xs text-muted-foreground">
                          ({stats.draftInvoices > 0 ? ((stats.draftInvoices / stats.totalInvoices) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cancelled</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stats.cancelledInvoices}</span>
                        <span className="text-xs text-muted-foreground">
                          ({stats.cancelledInvoices > 0 ? ((stats.cancelledInvoices / stats.totalInvoices) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground">
                  <h3 className="text-xl font-semibold mb-2">Multi-Chain Payments</h3>
                  <p className="text-primary-foreground/80 mb-4">
                    Accept USDC payments on Base, Arbitrum, Optimism, Avalanche, and Ethereum with automatic settlement.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-primary-foreground/20 rounded-md text-xs">Base</span>
                    <span className="px-2 py-1 bg-primary-foreground/20 rounded-md text-xs">Arbitrum</span>
                    <span className="px-2 py-1 bg-primary-foreground/20 rounded-md text-xs">Optimism</span>
                    <span className="px-2 py-1 bg-primary-foreground/20 rounded-md text-xs">Avalanche</span>
                    <span className="px-2 py-1 bg-primary-foreground/20 rounded-md text-xs">Ethereum</span>
                  </div>
                </div>

                <div className="bg-gradient-accent rounded-xl p-6 text-accent-foreground">
                  <h3 className="text-xl font-semibold mb-2">CCTP Auto-Settlement</h3>
                  <p className="text-accent-foreground/80 mb-4">
                    Payments are automatically bridged to your preferred chain using Circle's CCTP v2 for seamless settlement.
                  </p>
                  <div className="text-sm text-accent-foreground/70">
                    ⚡ Instant bridging • 🔒 Secure attestations • 💰 Low fees
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}