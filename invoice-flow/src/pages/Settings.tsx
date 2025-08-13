import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Plus, Trash2, ExternalLink } from 'lucide-react';

export default function Settings() {
  return (
    <div className="flex h-screen bg-gradient-bg">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground mt-2">
                Configure your organization and payment preferences
              </p>
            </div>

            {/* Organization Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input id="orgName" placeholder="Your Company Name" defaultValue="InvoiceFlow Inc." />
                  </div>
                  <div>
                    <Label htmlFor="orgEmail">Contact Email</Label>
                    <Input id="orgEmail" type="email" placeholder="contact@company.com" defaultValue="finance@invoiceflow.com" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="orgAddress">Business Address</Label>
                  <Input id="orgAddress" placeholder="123 Business St, City, Country" defaultValue="123 Innovation Drive, San Francisco, CA" />
                </div>
              </CardContent>
            </Card>

            {/* Settlement Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Settlement Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="targetChain">Default Target Chain</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target chain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base</SelectItem>
                      <SelectItem value="arbitrum">Arbitrum</SelectItem>
                      <SelectItem value="optimism">Optimism</SelectItem>
                      <SelectItem value="avalanche">Avalanche</SelectItem>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    All payments will be automatically settled to this chain via CCTP
                  </p>
                </div>

                <div>
                  <Label htmlFor="targetAddress">Settlement Address</Label>
                  <Input 
                    id="targetAddress" 
                    placeholder="0x..." 
                    defaultValue="0x1234567890123456789012345678901234567890"
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    USDC will be deposited to this address after settlement
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Settlement Policy</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Immediate Settlement</Label>
                      <p className="text-sm text-muted-foreground">
                        Bridge payments immediately when received
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Batch Settlements</Label>
                      <p className="text-sm text-muted-foreground">
                        Bundle multiple payments for lower fees
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <div>
                    <Label htmlFor="batchThreshold">Batch Threshold (USDC)</Label>
                    <Input 
                      id="batchThreshold" 
                      type="number" 
                      placeholder="1000" 
                      defaultValue="1000"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Minimum amount to trigger batch settlement
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Chains */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Supported Payment Chains</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4" />
                  Add Chain
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Base', address: '0x1234...5678', enabled: true },
                    { name: 'Arbitrum', address: '0xabcd...efgh', enabled: true },
                    { name: 'Optimism', address: '0x9876...5432', enabled: true },
                    { name: 'Avalanche', address: '0xfedc...ba98', enabled: false },
                    { name: 'Ethereum', address: '0x1111...2222', enabled: true },
                  ].map((chain) => (
                    <div key={chain.name} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${chain.enabled ? 'bg-success' : 'bg-muted'}`} />
                        <div>
                          <div className="font-medium">{chain.name}</div>
                          <div className="text-sm text-muted-foreground font-mono">{chain.address}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={chain.enabled ? 'default' : 'secondary'}>
                          {chain.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                        <Switch defaultChecked={chain.enabled} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Webhooks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Webhook Endpoints</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4" />
                  Add Webhook
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <div className="font-medium">https://api.yourapp.com/webhooks/invoices</div>
                      <div className="text-sm text-muted-foreground">
                        Events: invoice.paid, settlement.completed
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Active</Badge>
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                    <strong>Available Events:</strong>
                    <br />
                    • invoice.issued • invoice.paid • invoice.expired
                    <br />
                    • settlement.initiated • settlement.settled
                    <br />
                    • payment.underpaid • payment.overpaid
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button variant="hero">
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}