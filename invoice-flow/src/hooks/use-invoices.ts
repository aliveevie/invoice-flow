import { useState, useEffect } from 'react';

export interface Invoice {
  id: string;
  customerName: string;
  customerEmail: string;
  issuerName: string; // Name of the invoice issuer/company
  issuerEmail: string; // Email of the invoice issuer
  currencyType: 'fiat' | 'usdc';
  fiatCurrency?: string;
  recipientAddress?: string; // Wallet address where USDC should be sent (required for USDC invoices)
  preferredNetwork?: string; // Receiver's preferred network for USDC payments
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  dueDate: string;
  memo?: string;
  tags: string[];
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  chain?: string;
  // Payment-specific fields
  paymentTxHash?: string;
  paymentNetwork?: string;
  receiveTxHash?: string;
  receiveNetwork?: string;
  paidAt?: string;
  paidBy?: string;
  attestationMessage?: string;
  attestationSignature?: string;
  lastFailedStep?: string;
}

const STORAGE_KEY = 'invoices';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load invoices from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure parsed data is an array
        if (Array.isArray(parsed)) {
          setInvoices(parsed);
        } else {
          console.warn('Stored invoices data is not an array, starting with empty list');
          setInvoices([]);
        }
      } else {
        // Start with empty list - no sample data
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error loading invoices from localStorage:', error);
      // Start with empty list on error
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save invoices to localStorage whenever they change
  useEffect(() => {
    if (!isLoading && Array.isArray(invoices)) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
        console.log('Saved invoices to localStorage:', invoices.length, 'invoices');
      } catch (error) {
        console.error('Error saving invoices to localStorage:', error);
      }
    }
  }, [invoices, isLoading]);

  const createInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('createInvoice called with:', invoiceData);
    
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `INV-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log('New invoice created:', newInvoice);
    console.log('Previous invoices count:', invoices.length);
    
    const updatedInvoices = [newInvoice, ...invoices];
    console.log('Updated invoices array:', updatedInvoices.length, 'invoices');
    
    // Update state
    setInvoices(updatedInvoices);
    
    // Immediately save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
      console.log('Immediately saved to localStorage:', updatedInvoices.length, 'invoices');
    } catch (error) {
      console.error('Error immediately saving to localStorage:', error);
    }
    
    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(invoice => 
      invoice.id === id 
        ? { ...invoice, ...updates, updatedAt: new Date().toISOString() }
        : invoice
    ));
  };

  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(invoice => invoice.id !== id));
  };

  const clearAllInvoices = () => {
    setInvoices([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  };

  const getInvoice = (id: string) => {
    return invoices.find(invoice => invoice.id === id);
  };

  const getInvoicesByStatus = (status: Invoice['status']) => {
    return invoices.filter(invoice => invoice.status === status);
  };

  const searchInvoices = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return invoices.filter(invoice => 
      invoice.customerName.toLowerCase().includes(lowercaseQuery) ||
      invoice.customerEmail.toLowerCase().includes(lowercaseQuery) ||
      invoice.id.toLowerCase().includes(lowercaseQuery) ||
      invoice.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  };

  const filterInvoices = (filters: {
    status?: Invoice['status'];
    currencyType?: Invoice['currencyType'];
    chain?: string;
  }) => {
    return invoices.filter(invoice => {
      if (filters.status && invoice.status !== filters.status) return false;
      if (filters.currencyType && invoice.currencyType !== filters.currencyType) return false;
      if (filters.chain && invoice.chain !== filters.chain) return false;
      return true;
    });
  };

  // Dashboard utility functions
  const getDashboardStats = () => {
    if (!invoices || invoices.length === 0) {
      return {
        totalRevenue: 0,
        totalInvoices: 0,
        pendingAmount: 0,
        settlementRate: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        draftInvoices: 0,
        cancelledInvoices: 0
      };
    }

    const totalRevenue = invoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.subtotal, 0);
    
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(invoice => invoice.status === 'paid').length;
    const pendingInvoices = invoices.filter(invoice => invoice.status === 'issued').length;
    const overdueInvoices = invoices.filter(invoice => invoice.status === 'overdue').length;
    const draftInvoices = invoices.filter(invoice => invoice.status === 'draft').length;
    const cancelledInvoices = invoices.filter(invoice => invoice.status === 'cancelled').length;
    
    const pendingAmount = invoices
      .filter(invoice => invoice.status === 'issued' || invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + invoice.subtotal, 0);
    
    const settlementRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

    return {
      totalRevenue,
      totalInvoices,
      pendingAmount,
      settlementRate,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      draftInvoices,
      cancelledInvoices
    };
  };

  const getMonthlyStats = (months: number = 2) => {
    if (!invoices || invoices.length === 0) {
      return [];
    }

    const now = new Date();
    const stats = [];

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.createdAt);
        return invoiceDate >= monthStart && invoiceDate <= monthEnd;
      });

      const monthRevenue = monthInvoices
        .filter(invoice => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + invoice.subtotal, 0);

      const monthPaid = monthInvoices.filter(invoice => invoice.status === 'paid').length;
      const monthTotal = monthInvoices.length;

      stats.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        invoices: monthTotal,
        paid: monthPaid,
        settlementRate: monthTotal > 0 ? (monthPaid / monthTotal) * 100 : 0
      });
    }

    return stats.reverse();
  };

  return {
    invoices,
    isLoading,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    clearAllInvoices,
    getInvoice,
    getInvoicesByStatus,
    searchInvoices,
    filterInvoices,
    getDashboardStats,
    getMonthlyStats,
  };
}
