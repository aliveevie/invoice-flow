import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { CreateInvoiceForm } from '@/components/invoices/CreateInvoiceForm';

export default function CreateInvoice() {
  return (
    <div className="flex h-screen bg-gradient-bg">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <CreateInvoiceForm />
        </main>
      </div>
    </div>
  );
}