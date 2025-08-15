import { useState, useEffect } from 'react';

export interface Invoice {
  id: string;
  customerName: string;
  customerEmail: string;
  currencyType: 'fiat' | 'usdc';
  fiatCurrency?: string;
  recipientAddress?: string; // Wallet address where USDC should be sent (required for USDC invoices)
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
  };
}
