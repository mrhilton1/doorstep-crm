import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  DollarSign, 
  Mail, 
  Phone, 
  Check, 
  AlertTriangle, 
  MessageSquare,
  ArrowRight,
  TrendingDown,
  Calendar,
  Building,
  User,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PropertyContact, Invoice } from '../types';

interface OverdueInvoicesOverlayProps {
  properties: PropertyContact[];
  updateProperty: (id: string, updates: Partial<PropertyContact>) => void;
  onClose: () => void;
  onFocusProperty?: (id: string) => void;
}

export default function OverdueInvoicesOverlay({
  properties,
  updateProperty,
  onClose,
  onFocusProperty
}: OverdueInvoicesOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Unpaid' | 'Overdue'>('all');
  const [simulatedReminderSent, setSimulatedReminderSent] = useState<string | null>(null);

  // Flatten all invoices with associated property data
  const outstandingInvoices = useMemo(() => {
    const list: {
      property: PropertyContact;
      invoice: Invoice;
    }[] = [];

    properties.forEach(p => {
      p.invoices?.forEach(inv => {
        if (inv.status === 'Unpaid' || inv.status === 'Overdue') {
          list.push({
            property: p,
            invoice: inv
          });
        }
      });
    });

    // Sort by due date (oldest due first, so most critical overdue are top)
    return list.sort((a, b) => a.invoice.dueDate - b.invoice.dueDate);
  }, [properties]);

  // Filter list by search query and specific status
  const filteredInvoices = useMemo(() => {
    return outstandingInvoices.filter(item => {
      const pName = `${item.property.firstName || ''} ${item.property.lastName || ''}`.toLowerCase();
      const addr = item.property.address.toLowerCase();
      const bName = (item.property.businessName || '').toLowerCase();
      const invNum = item.invoice.invoiceNumber.toLowerCase();
      
      const matchesSearch = pName.includes(searchQuery.toLowerCase()) || 
                            addr.includes(searchQuery.toLowerCase()) || 
                            bName.includes(searchQuery.toLowerCase()) ||
                            invNum.includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [outstandingInvoices, searchQuery, statusFilter]);

  // Total calculated outstanding sum
  const totalOutstanding = useMemo(() => {
    return outstandingInvoices.reduce((sum, item) => sum + item.invoice.total, 0);
  }, [outstandingInvoices]);

  // Filtered outstanding sum
  const filteredOutstanding = useMemo(() => {
    return filteredInvoices.reduce((sum, item) => sum + item.invoice.total, 0);
  }, [filteredInvoices]);

  // Mark paid feature
  const handleMarkPaid = (propertyId: string, invoiceId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    const updatedInvoices = (property.invoices || []).map(inv => {
      if (inv.id === invoiceId) {
        return { ...inv, status: 'Paid' as const };
      }
      return inv;
    });

    // Also add interaction activity log
    const invoiceNum = property.invoices?.find(inv => inv.id === invoiceId)?.invoiceNumber || 'Invoice';
    const totalAmount = property.invoices?.find(inv => inv.id === invoiceId)?.total || 0;
    
    const newInteraction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Note' as const,
      content: `Marked Invoice ${invoiceNum} ($${totalAmount.toFixed(2)}) as Paid in full.`,
      createdAt: Date.now(),
      authorId: 'system'
    };

    updateProperty(propertyId, { 
      invoices: updatedInvoices,
      interactions: [...(property.interactions || []), newInteraction]
    });
  };

  // Simulating payment reminder message trigger
  const handleSendReminder = (item: typeof outstandingInvoices[0]) => {
    const phone = item.property.phone || 'Customer';
    const number = item.invoice.invoiceNumber;
    const amount = `$${item.invoice.total.toFixed(2)}`;
    
    setSimulatedReminderSent(number);
    setTimeout(() => {
      setSimulatedReminderSent(null);
    }, 4000);
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[4000] bg-zinc-50 flex flex-col h-full text-slate-800"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E2E8F0] flex justify-between items-center bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-3 text-slate-800">
          <button 
            onClick={onClose} 
            className="p-2 border border-slate-200 rounded-xl bg-white mr-1 text-slate-500 hover:text-blue-600 transition-colors shadow-sm" 
            title="Back to Dashboard"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-lg font-black tracking-tight leading-none">Accounts Receivable (AR)</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Outstanding & Overdue Invoices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards Panel */}
      <div className="border-b border-[#E2E8F0] bg-white p-6 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Outstanding */}
        <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider mb-0.5">Total Outstanding</span>
            <div className="text-2xl font-black text-red-600">${totalOutstanding.toFixed(2)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shadow-sm">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Count Overdue */}
        <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider mb-0.5">Overdue Accounts</span>
            <div className="text-2xl font-black text-orange-600">
              {outstandingInvoices.filter(i => i.invoice.status === 'Overdue').length} Invoices
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
        </div>

        {/* Filters */}
        <div className="p-2 border border-slate-100 rounded-2xl flex items-center bg-slate-50 gap-1 h-fit my-auto">
          {(['all', 'Overdue', 'Unpaid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wide rounded-xl transition-all whitespace-nowrap px-3",
                statusFilter === f 
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {f === 'all' ? 'All Pending' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Search & Notifications */}
      <div className="px-6 py-4 bg-white border-b border-[#E2E8F0] flex flex-col gap-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, address line or INV number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold font-sans text-slate-800 shadow-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
          />
        </div>

        <AnimatePresence>
          {simulatedReminderSent && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-[11px] font-bold flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Simulated Payment Reminder notification dispatched successfully for invoice <strong>{simulatedReminderSent}</strong>!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invoices List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-100 rounded-3xl shadow-sm max-w-md mx-auto mt-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-md font-black text-slate-800">Clear Ledger!</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {searchQuery || statusFilter !== 'all' 
                ? "No outstanding accounts match your current directory filters." 
                : "Wonderful! Every generated digital invoice is paid and accounted for."}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button 
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} 
                className="mt-4 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-200 transition-all"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-3">
            {filteredInvoices.map(({ property, invoice }) => {
              const clientName = `${property.firstName || ''} ${property.lastName || ''}`.trim() || 'Associated Occupant';
              const daysAgo = Math.max(0, Math.floor((Date.now() - invoice.dueDate) / (1000 * 60 * 60 * 24)));
              
              return (
                <motion.div 
                  layout
                  key={invoice.id}
                  className={cn(
                    "bg-white border p-5 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300",
                    invoice.status === 'Overdue' ? "border-red-100" : "border-slate-100"
                  )}
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Invoice Meta Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black text-slate-500 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-full font-mono">
                        {invoice.invoiceNumber}
                      </span>
                      
                      {invoice.status === 'Overdue' ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {daysAgo} Days Overdue
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full">
                          Unpaid (Due In {Math.max(1, -daysAgo)} Days)
                        </span>
                      )}
                    </div>

                    {/* Address & Client */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-sm min-w-0">
                        <Building className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{property.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{clientName} • {property.businessName || 'Residential'}</span>
                        {property.phone && (
                          <span className="text-slate-400 text-[11px] ml-1">({property.phone})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financials & Action Controls */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-slate-50 pt-3 md:border-t-0 md:pt-0">
                    <div className="md:text-right pr-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Amount Due</p>
                      <p className={cn(
                        "text-xl font-black", 
                        invoice.status === 'Overdue' ? 'text-red-500' : 'text-slate-850'
                      )}>
                        ${invoice.total.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {/* Remind Button */}
                      <button 
                        onClick={() => handleSendReminder({ property, invoice })}
                        className="p-3 bg-slate-55 border border-slate-100 rounded-2xl hover:bg-slate-100 text-slate-550 transition-colors"
                        title="Dispatch SMS / Email reminder notice"
                      >
                        <MessageSquare className="w-4 h-4 text-slate-600" />
                      </button>

                      {/* Map Focus if available */}
                      {onFocusProperty && (
                        <button 
                          onClick={() => {
                            onClose();
                            onFocusProperty(property.id);
                          }}
                          className="p-3 bg-blue-50/50 border border-blue-100/50 hover:bg-blue-50 text-blue-600 rounded-2xl transition-all"
                          title="Locate client on Territory map"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}

                      {/* Complete Check Paid */}
                      <button 
                        onClick={() => handleMarkPaid(property.id, invoice.id)}
                        className="px-4 py-2.5 bg-emerald-600 border border-emerald-700 hover:bg-emerald-700 text-white rounded-2xl text-[11.5px] font-extrabold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4 text-emerald-100" />
                        Mark Paid
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
