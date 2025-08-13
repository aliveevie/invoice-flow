import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentInvoices } from '@/components/dashboard/RecentInvoices';
import { DollarSign, FileText, Clock, TrendingUp } from 'lucide-react';

export default function Dashboard() {
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
                value="$45,231.89"
                change="+20.1%"
                changeType="positive"
                icon={DollarSign}
                description="All-time earnings"
              />
              <StatsCard
                title="Total Invoices"
                value="158"
                change="+12"
                changeType="positive"
                icon={FileText}
                description="Invoices created"
              />
              <StatsCard
                title="Pending"
                value="$8,432.10"
                change="-4.3%"
                changeType="negative"
                icon={Clock}
                description="Awaiting payment"
              />
              <StatsCard
                title="Settlement Rate"
                value="94.2%"
                change="+2.1%"
                changeType="positive"
                icon={TrendingUp}
                description="Successful settlements"
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentInvoices />
              
              {/* Quick Actions */}
              <div className="space-y-6">
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