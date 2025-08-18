import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, Plus, X, Loader2, Send, Save } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useInvoices } from '@/hooks/use-invoices';
import axios from 'axios';

const baseInvoiceSchema = z.object({
  issuerName: z.string().min(1, 'Your name/company name is required'),
  issuerEmail: z.string().min(1, 'Your email is required').email('Invalid email address'),
  customerEmail: z.string().min(1, 'Customer email is required').email('Invalid email address'),
  customerName: z.string().min(1, 'Customer name is required'),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Price must be positive'),
  })).min(1, 'At least one line item is required'),
  dueDate: z.date({ required_error: 'Due date is required' }),
  memo: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const createInvoiceSchema = z.discriminatedUnion('currencyType', [
  baseInvoiceSchema.extend({
    currencyType: z.literal('fiat'),
    fiatCurrency: z.string().min(1, 'Fiat currency is required'),
    recipientAddress: z.string().optional(),
    preferredNetwork: z.string().optional(),
  }),
  baseInvoiceSchema.extend({
    currencyType: z.literal('usdc'),
    fiatCurrency: z.string().optional(),
    recipientAddress: z.string()
      .min(1, 'Recipient wallet address is required for USDC invoices')
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format (must be 42 characters starting with 0x)'),
    preferredNetwork: z.string().min(1, 'Preferred network is required for USDC invoices'),
  }),
]);

type CreateInvoiceForm = z.infer<typeof createInvoiceSchema>;

const API_BASE_URL = 'https://invoice-flow-server.vercel.app';

export function CreateInvoiceForm() {
  const [currentTag, setCurrentTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createInvoice } = useInvoices();
  
  const form = useForm<CreateInvoiceForm>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      currencyType: 'usdc',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
      tags: [],
    },
  });

  const watchedCurrencyType = form.watch('currencyType');
  const watchedLineItems = form.watch('lineItems');
  const watchedTags = form.watch('tags') || [];

  const subtotal = watchedLineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const addLineItem = () => {
    const currentItems = form.getValues('lineItems');
    form.setValue('lineItems', [...currentItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    const currentItems = form.getValues('lineItems');
    if (currentItems.length > 1) {
      form.setValue('lineItems', currentItems.filter((_, i) => i !== index));
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !watchedTags.includes(currentTag.trim())) {
      form.setValue('tags', [...watchedTags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tag: string) => {
    form.setValue('tags', watchedTags.filter(t => t !== tag));
  };

  const sendInvoiceEmail = async (invoice: any) => {
    try {
      setIsSendingEmail(true);
      
      // Get the base URL for the payment link
      const baseUrl = window.location.origin;
      
      console.log('Sending invoice email for:', invoice.id);
      
      const response = await axios.post(`${API_BASE_URL}/invoice/send-email`, {
        invoice,
        baseUrl
      });
      
      if (response.data.success) {
        console.log('Email sent successfully:', response.data);
        toast({
          title: "Email Sent Successfully! 📧",
          description: `Invoice ${invoice.id} has been sent to ${invoice.customerEmail}`,
          duration: 5000,
        });
        return true;
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast({
        title: "Email Sending Failed",
        description: error.response?.data?.error || error.message || "Failed to send invoice email. The invoice was created successfully.",
        variant: "destructive",
        duration: 8000,
      });
      return false;
    } finally {
      setIsSendingEmail(false);
    }
  };

  const onSubmit = async (data: CreateInvoiceForm) => {
    console.log('onSubmit called with data:', data);
    console.log('Form is valid:', form.formState.isValid);
    console.log('Form errors:', form.formState.errors);
    
    setIsLoading(true);
    
    try {
      console.log('Form data submitted:', data);
      console.log('Subtotal calculated:', subtotal);
      
      // Create invoice data
      const invoiceData = {
        issuerName: data.issuerName,
        issuerEmail: data.issuerEmail,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        currencyType: data.currencyType,
        fiatCurrency: data.fiatCurrency,
        recipientAddress: data.recipientAddress,
        preferredNetwork: data.preferredNetwork,
        lineItems: data.lineItems.map(item => ({
          description: item.description || 'Untitled Item',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0
        })),
        subtotal: subtotal,
        dueDate: data.dueDate.toISOString(),
        memo: data.memo || '',
        tags: data.tags || [],
        status: 'issued' as const,
        chain: data.currencyType === 'usdc' ? 'Ethereum' : undefined,
      };

      console.log('Invoice data to save:', invoiceData);

      // Save to localStorage using the custom hook
      const newInvoice = createInvoice(invoiceData);

      console.log('Invoice created successfully:', newInvoice);
      console.log('Current invoices in localStorage:', localStorage.getItem('invoices'));

      // Send email notification
      console.log('Attempting to send invoice email...');
      const emailSent = await sendInvoiceEmail(newInvoice);
      
      if (emailSent) {
        toast({
          title: "Invoice Created & Sent Successfully! 🎉📧",
          description: `Invoice ${newInvoice.id} has been created and emailed to both you and ${newInvoice.customerName}`,
          duration: 5000,
        });
      } else {
        toast({
          title: "Invoice Created Successfully! 🎉",
          description: `Invoice ${newInvoice.id} has been created and saved. Email sending failed but the invoice is ready.`,
          duration: 5000,
        });
      }

      // Navigate back to invoices list
      navigate('/invoices');
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      
      toast({
        title: "Failed to Create Invoice",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = async () => {
    setIsLoading(true);
    
    try {
      const data = form.getValues();
      
      // Create draft invoice data
      const draftData = {
        issuerName: data.issuerName || 'Draft Company',
        issuerEmail: data.issuerEmail || 'draft@company.com',
        customerName: data.customerName || 'Draft Customer',
        customerEmail: data.customerEmail || 'draft@example.com',
        currencyType: data.currencyType,
        fiatCurrency: data.fiatCurrency,
        recipientAddress: data.recipientAddress,
        preferredNetwork: data.preferredNetwork,
        lineItems: (data.lineItems || [{ description: 'Draft item', quantity: 1, unitPrice: 0 }]).map(item => ({
          description: item.description || 'Untitled Item',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0
        })),
        subtotal: subtotal,
        dueDate: (data.dueDate || new Date()).toISOString(),
        memo: data.memo || '',
        tags: data.tags || [],
        status: 'draft' as const,
        chain: data.currencyType === 'usdc' ? 'Ethereum' : undefined,
      };

      // Save draft to localStorage
      const draftInvoice = createInvoice(draftData);
      
      toast({
        title: "Draft Saved",
        description: `Invoice draft ${draftInvoice.id} has been saved successfully.`,
      });
      
    } catch (error) {
      toast({
        title: "Failed to Save Draft",
        description: "Unable to save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Invoice</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Issuer Information */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Your Information (Invoice Issuer)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="issuerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name/Company Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your Company Name" 
                          disabled={isLoading || isSendingEmail}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issuerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Email *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="your-email@company.com" 
                          disabled={isLoading || isSendingEmail}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Email *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="customer@example.com" 
                          disabled={isLoading || isSendingEmail}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Customer Name" 
                          disabled={isLoading || isSendingEmail}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Invoice Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="currencyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isSendingEmail}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="usdc">USDC</SelectItem>
                          <SelectItem value="fiat">Fiat Currency</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedCurrencyType === 'fiat' && (
                  <FormField
                    control={form.control}
                    name="fiatCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiat Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchedCurrencyType === 'usdc' && (
                  <FormField
                    control={form.control}
                    name="recipientAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Wallet Address *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0x1234567890123456789012345678901234567890" 
                            {...field} 
                            disabled={isLoading}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          The wallet address where USDC payment will be received
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchedCurrencyType === 'usdc' && (
                  <FormField
                    control={form.control}
                    name="preferredNetwork"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Network for Receiving USDC *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select preferred network" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sepolia">Ethereum Sepolia Testnet</SelectItem>
                            <SelectItem value="avalancheFuji">Avalanche Fuji Testnet</SelectItem>
                            <SelectItem value="optimismSepolia">Optimism Sepolia Testnet</SelectItem>
                            <SelectItem value="arbitrumSepolia">Arbitrum Sepolia Testnet</SelectItem>
                            <SelectItem value="baseSepolia">Base Sepolia Testnet</SelectItem>
                            <SelectItem value="polygonAmoy">Polygon Amoy Testnet</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          The network where you prefer to receive USDC payments
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              disabled={isLoading}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date() || isLoading}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addLineItem}
                disabled={isLoading}
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {watchedLineItems.map((_, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Description</FormLabel>}
                            <FormControl>
                              <Input 
                                placeholder="Item description" 
                                disabled={isLoading}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Qty</FormLabel>}
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                disabled={isLoading}
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Unit Price</FormLabel>}
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={isLoading}
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {((watchedLineItems[index]?.quantity || 0) * (watchedLineItems[index]?.unitPrice || 0)).toFixed(2)}
                      </span>
                      {watchedLineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isLoading}
                          onClick={() => removeLineItem(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span>{subtotal.toFixed(2)} {watchedCurrencyType === 'usdc' ? 'USDC' : form.watch('fiatCurrency') || 'USD'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memo</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Optional notes or memo" 
                        disabled={isLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add tag"
                    value={currentTag}
                    disabled={isLoading}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addTag}
                    disabled={isLoading}
                  >
                    Add
                  </Button>
                </div>
                {watchedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {watchedTags.map((tag) => (
                      <div key={tag} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4"
                          disabled={isLoading}
                          onClick={() => removeTag(tag)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline"
              disabled={isLoading || isSendingEmail}
              onClick={saveDraft}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save as Draft
                </>
              )}
            </Button>

            <Button 
              type="submit" 
              variant="hero"
              disabled={isLoading || isSendingEmail || subtotal === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Invoice...
                </>
              ) : isSendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Create & Send Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}