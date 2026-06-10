import React, { useState, useMemo } from 'react';
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  FileText, 
  Send, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Plus, 
  CheckCircle, 
  X, 
  ChevronRight, 
  History, 
  Check, 
  TrendingUp, 
  Users, 
  Building,
  ArrowRight,
  Edit3,
  Sparkles,
  ExternalLink,
  Lock,
  Tag,
  Trophy,
  Target,
  Settings as SettingsIcon,
  Package,
  Layers,
  Sparkle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  PropertyContact, 
  Invoice, 
  Interaction, 
  Appointment, 
  Member, 
  Product, 
  Bundle, 
  STATUS_COLORS,
  PropertyStage,
  PropertyStatus,
  Settings
} from '../types';

interface HomeDashboardProps {
  properties: PropertyContact[];
  updateProperty: (id: string, updates: Partial<PropertyContact>) => void;
  team: Member[];
  catalog: { products: Product[]; bundles: Bundle[] };
  onFocusProperty: (id: string) => void;
  onOpenMap: () => void;
  activeTab: 'dashboard' | 'contacts' | 'appointments';
  setActiveTab: (tab: 'dashboard' | 'contacts' | 'appointments' | 'map') => void;
  onOpenCatalog: () => void;
  onOpenSettings: () => void;
  onAddNewLead: () => void;
  onOpenPropertyEditor: (id: string) => void;
  settings: Settings;
  onOpenOverdueInvoices?: () => void;
}

export default function HomeDashboard({
  properties,
  updateProperty,
  team,
  catalog,
  onFocusProperty,
  onOpenMap,
  activeTab,
  setActiveTab,
  onOpenCatalog,
  onOpenSettings,
  onAddNewLead,
  onOpenPropertyEditor,
  settings,
  onOpenOverdueInvoices
}: HomeDashboardProps) {
  // Custom safe initials generator
  const getInitials = (firstName?: string, lastName?: string) => {
    const f = firstName && firstName.trim() ? firstName.trim()[0] : '';
    const l = lastName && lastName.trim() ? lastName.trim()[0] : '';
    return (f + l || 'U').toUpperCase();
  };

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<PropertyStage | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<PropertyStatus | 'all'>('all');
  const [filterPremiseType, setFilterPremiseType] = useState<'all' | 'Residential' | 'Commercial'>('all');
  
  // Tabs within details drawer
  const [activeDetailTab, setActiveDetailTab] = useState<'history' | 'message' | 'invoice' | 'appointment'>('history');

  // Sub-states for message form
  const [messageType, setMessageType] = useState<'SMS' | 'Email'>('SMS');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);

  // New Invoice Form
  const [invoiceItems, setInvoiceItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);

  // New Appointment Form
  const [apptTitle, setApptTitle] = useState('');
  const [apptDate, setApptDate] = useState(new Date().toISOString().split('T')[0]);
  const [apptTime, setApptTime] = useState('10:00');
  const [apptMemberId, setApptMemberId] = useState(team[0]?.id || '');
  const [apptNotes, setApptNotes] = useState('');
  const [apptSuccess, setApptSuccess] = useState(false);

  // Selected Contact from sliding focus tray
  const selectedContact = useMemo(() => {
    if (!selectedContactId) return null;
    return properties.find(p => p.id === selectedContactId) || null;
  }, [properties, selectedContactId]);

  // Filters for Contacts Directory
  const filteredContacts = useMemo(() => {
    return properties.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      
      // Stage, Status & Premise Filters
      if (filterStage !== 'all' && p.stage !== filterStage) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterPremiseType !== 'all' && p.type !== filterPremiseType) return false;

      if (!q) return true;

      const mainName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      const addressMatch = (p.address || '').toLowerCase().includes(q);
      const nameMatch = mainName.includes(q);
      const emailMatch = (p.email || '').toLowerCase().includes(q);
      const phoneMatch = (p.phone || '').toLowerCase().includes(q);

      const subContactsMatch = p.contacts?.some(c => 
        `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      ) || false;

      return addressMatch || nameMatch || emailMatch || phoneMatch || subContactsMatch;
    });
  }, [properties, searchQuery, filterStage, filterStatus, filterPremiseType]);

  // Total statistics calculations
  const totalOutstandingAR = useMemo(() => {
    let outstanding = 0;
    properties.forEach(p => {
      p.invoices?.forEach(inv => {
        if (inv.status === 'Unpaid' || inv.status === 'Overdue') {
          outstanding += inv.total;
        }
      });
    });
    return outstanding;
  }, [properties]);

  const stats = useMemo(() => {
    const activeApptsToday = properties.flatMap(p => p.appointments || []).filter(appt => {
      const apptDay = new Date(appt.startTime).toDateString();
      const today = new Date().toDateString();
      return apptDay === today;
    }).length;

    return {
      totalContacts: properties.length,
      customers: properties.filter(p => p.stage === 'customer').length,
      appointmentsToday: activeApptsToday,
      outstandings: totalOutstandingAR
    };
  }, [properties, totalOutstandingAR]);

  // Today's scheduled consultations timetable
  const todaysAppointments = useMemo(() => {
    return properties.flatMap(p => {
      return (p.appointments || []).map(appt => ({
        ...appt,
        property: p
      }));
    }).filter(appt => {
      const apptDay = new Date(appt.startTime).toDateString();
      const today = new Date().toDateString();
      return apptDay === today;
    }).sort((a, b) => a.startTime - b.startTime);
  }, [properties]);

  // Dynamic calculations for Operational Targets
  const weeklyKnocksTarget = settings.operationalTargets?.weeklyKnocks || 40;
  const monthlyConvertedTarget = settings.operationalTargets?.monthlyConverted || 15;
  const collectionGoalTarget = settings.operationalTargets?.collectionGoal || 3000;

  const weeklyKnocksCount = useMemo(() => {
    let count = 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    properties.forEach(p => {
      p.interactions?.forEach(inter => {
        if (inter.createdAt >= sevenDaysAgo) {
          count++;
        }
      });
    });
    const knockedPropertiesCount = properties.filter(p => p.status !== 'Not Visited').length;
    return Math.max(count, knockedPropertiesCount);
  }, [properties]);

  const totalCollected = useMemo(() => {
    let paid = 0;
    properties.forEach(p => {
      p.invoices?.forEach(inv => {
        if (inv.status === 'Paid') {
          paid += inv.total;
        }
      });
    });
    return paid;
  }, [properties]);

  // Consolidated activity timeline events across all properties for dashboard view
  const recentTimelineEvents = useMemo(() => {
    const events: { 
      id: string;
      propertyName: string;
      address: string;
      propertyId: string;
      type: string;
      content: string;
      createdAt: number;
    }[] = [];

    properties.forEach(p => {
      const pName = p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : p.address.split(',')[0];
      
      // Add interactions
      p.interactions?.forEach(inter => {
        events.push({
          id: inter.id,
          propertyName: pName,
          address: p.address,
          propertyId: p.id,
          type: inter.type === 'Text' ? 'dispatch' : 'note',
          content: inter.content,
          createdAt: inter.createdAt
        });
      });

      // Add invoices
      p.invoices?.forEach(inv => {
        events.push({
          id: inv.id,
          propertyName: pName,
          address: p.address,
          propertyId: p.id,
          type: 'invoice',
          content: `Invoiced total amount of $${inv.total.toFixed(2)} (${inv.status})`,
          createdAt: inv.createdAt
        });
      });

      // Add appointments
      p.appointments?.forEach(appt => {
        events.push({
          id: appt.id,
          propertyName: pName,
          address: p.address,
          propertyId: p.id,
          type: 'appointment',
          content: `Consultation Booked: ${appt.title}`,
          createdAt: appt.startTime || Date.now()
        });
      });
    });

    return events.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  }, [properties]);

  // Message dispatcher templates template matching
  const templates = {
    SMS: [
      { id: 't1', label: 'Intro & Welcome', text: 'Hi [Name], thanks for chatting with us today. Here is my contact card if you need anything details about our offers.' },
      { id: 't2', label: 'Follow-up Scheduled', text: 'Hey [Name], looking forward to our meeting on [Date/Time]. Let me know if you need to reschedule!' },
      { id: 't3', label: 'Invoice Issued', text: 'Hello [Name], your digital invoice is ready for review. Click the secure portal link below to process payment.' }
    ],
    Email: [
      { id: 'e1', label: 'Professional Quote Follow-up', text: 'Dear [Name],\n\nThank you for the opportunity to discuss your service plans. I have updated your quote options and attached the detailed line-item breakdown.\n\nPlease don\'t hesitate to reach out if you have any questions.\n\nBest regards,\n[Rep Name]' },
      { id: 'e2', label: 'Service Confirmation', text: 'Dear [Name],\n\nThis is to confirm your doorstep consultation appointment on [Date/Time]. Our expert team member will be arriving shortly. We look forward to meeting you.\n\nBest respects,\nDoorStep CRM Team' }
    ]
  };

  const handleTemplateSelect = (text: string) => {
    if (!selectedContact) return;
    const dateStr = new Date(apptDate).toLocaleDateString();
    let parsed = text
      .replace(/\[Name\]/g, `${selectedContact.firstName || 'Valued Client'}`)
      .replace(/\[Date\/Time\]/g, `${dateStr} ${apptTime}`)
      .replace(/\[Rep Name\]/g, team[0]?.name || 'Your Agent');
    setCustomMessage(parsed);
  };

  const handleSendMessage = () => {
    if (!selectedContact || !customMessage.trim()) return;
    setIsSendingMessage(true);

    setTimeout(() => {
      const mockInteraction: Interaction = {
        id: 'i_' + Date.now(),
        type: messageType === 'SMS' ? 'Text' : 'Note',
        content: `[${messageType} Sent] ${customMessage}`,
        createdAt: Date.now(),
        authorId: team[0]?.id || 'system'
      };

      updateProperty(selectedContact.id, {
        interactions: [...(selectedContact.interactions || []), mockInteraction]
      });

      setIsSendingMessage(false);
      setMessageSuccess(true);
      setCustomMessage('');
      setTimeout(() => setMessageSuccess(false), 2000);
    }, 1000);
  };

  // Invoice creation methods
  const handleAddProductToInvoice = (productId: string) => {
    setInvoiceItems(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) {
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const handleRemoveInvoiceItem = (productId: string) => {
    setInvoiceItems(prev => prev.filter(i => i.productId !== productId));
  };

  const currentInvoiceTotal = useMemo(() => {
    let subtotal = 0;
    invoiceItems.forEach(item => {
      const p = catalog.products.find(prod => prod.id === item.productId);
      if (p) {
        subtotal += p.price * item.quantity;
      }
    });
    return subtotal;
  }, [invoiceItems, catalog]);

  const handleCreateInvoice = () => {
    if (!selectedContact || invoiceItems.length === 0) return;

    const lineItems = invoiceItems.map(item => {
      const prod = catalog.products.find(p => p.id === item.productId)!;
      return {
        id: 'li_' + Date.now() + Math.random(),
        productId: item.productId,
        name: prod.name,
        price: prod.price,
        quantity: item.quantity,
        description: prod.description,
        isSelected: true
      };
    });

    const newInvoice: Invoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber: 'INV-' + (Math.floor(1000 + Math.random() * 9000)),
      lineItems,
      subtotal: currentInvoiceTotal,
      total: currentInvoiceTotal,
      status: 'Unpaid',
      createdAt: Date.now(),
      dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
      notes: invoiceNotes
    };

    const mockInteraction: Interaction = {
      id: 'i_' + Date.now(),
      type: 'Note',
      content: `Created Invoice ${newInvoice.invoiceNumber} for $${newInvoice.total.toFixed(2)}`,
      createdAt: Date.now(),
      authorId: team[0]?.id || 'system'
    };

    updateProperty(selectedContact.id, {
      invoices: [...(selectedContact.invoices || []), newInvoice],
      interactions: [...(selectedContact.interactions || []), mockInteraction],
      stage: selectedContact.stage === 'prospect' ? 'lead' : selectedContact.stage
    });

    setInvoiceItems([]);
    setInvoiceNotes('');
    setInvoiceSuccess(true);
    setTimeout(() => setInvoiceSuccess(false), 2000);
  };

  const handleToggleInvoicePaid = (invoiceId: string) => {
    if (!selectedContact) return;
    const updated = (selectedContact.invoices || []).map(inv => {
      if (inv.id === invoiceId) {
        const nextStatus: 'Paid' | 'Unpaid' = inv.status === 'Paid' ? 'Unpaid' : 'Paid';
        return { ...inv, status: nextStatus };
      }
      return inv;
    });

    updateProperty(selectedContact.id, { invoices: updated });
  };

  // Appointment scheduling methods
  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !apptTitle.trim()) return;

    const combinedDateTime = new Date(`${apptDate}T${apptTime}`).getTime() || Date.now();

    const newAppt: Appointment = {
      id: 'appt_' + Date.now(),
      title: apptTitle,
      startTime: combinedDateTime,
      endTime: combinedDateTime + 45 * 60 * 1000, // 45 mins default
      memberId: apptMemberId,
      notes: apptNotes
    };

    const assignedAgent = team.find(m => m.id === apptMemberId);
    const mockInteraction: Interaction = {
      id: 'i_' + Date.now(),
      type: 'Note',
      content: `Scheduled Visit: ${apptTitle} with ${assignedAgent?.name || 'Assigned Rep'} on ${new Date(combinedDateTime).toLocaleString()}`,
      createdAt: Date.now(),
      authorId: team[0]?.id || 'system'
    };

    updateProperty(selectedContact.id, {
      appointments: [...(selectedContact.appointments || []), newAppt],
      interactions: [...(selectedContact.interactions || []), mockInteraction]
    });

    setApptTitle('');
    setApptNotes('');
    setApptSuccess(true);
    setTimeout(() => setApptSuccess(false), 2000);
  };

  const handleDeleteAppointment = (apptId: string) => {
    if (!selectedContact) return;
    const updated = (selectedContact.appointments || []).filter(a => a.id !== apptId);
    updateProperty(selectedContact.id, { appointments: updated });
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] flex flex-col h-full min-h-0 overflow-y-auto relative text-[#1E293B]">
      
      {/* ==================== 1. DASHBOARD OVERVIEW VIEW ==================== */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6 pb-24 animate-in fade-in duration-300">
          
          {/* Dashboard Header Banner */}
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
            <div>
              <div className="flex items-center gap-1.5 mb-1 bg-blue-50 text-[#2563EB] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Live Operational Systems
              </div>
              <h1 className="text-2xl font-black text-[#1E293B] tracking-tight">Operator Dashboard</h1>
              <p className="text-xs font-semibold text-[#64748B] mt-1">
                Real-time tracking of canvassing status, client invoicing outstanding AR, and frontline scheduled consults.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-[#64748B] bg-slate-100 px-3 py-1.5 rounded-xl">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
              <button 
                onClick={onOpenMap}
                className="px-4 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                View Map
              </button>
            </div>
          </div>

          {/* Quick Metrics Statistics Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Cards 1: Total mapped leads */}
            <div 
              onClick={() => setActiveTab('contacts')}
              className="bg-white border border-slate-100 hover:border-slate-300 p-5 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer transition-all hover:scale-[1.01]"
              title="Show All Contacts"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] tracking-wider block mb-1">Total Pins Recorded</span>
                <div className="text-2xl font-black text-[#1E293B]">{stats.totalContacts}</div>
                <span className="text-[10px] font-bold text-slate-500 hover:underline flex items-center gap-0.5 mt-1.5">
                  Browse List <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 shadow-inner">
                <Building className="w-5 h-5" />
              </div>
            </div>

            {/* Cards 2: Customers converted */}
            <div 
              onClick={() => {
                setActiveTab('contacts');
                setFilterStage('customer');
              }}
              className="bg-white border border-slate-100 hover:border-emerald-300 p-5 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer transition-all hover:scale-[1.01]"
              title="Show Saved Customers"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] tracking-wider block mb-1">Converted Clients</span>
                <div className="text-2xl font-black text-emerald-600">{stats.customers}</div>
                <span className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5 mt-1.5">
                  Filter Active <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Cards 3: Consultations booked today */}
            <div 
              onClick={() => setActiveTab('appointments')}
              className="bg-white border border-slate-100 hover:border-blue-300 p-5 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer transition-all hover:scale-[1.01]"
              title="View Today's Timetable"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] tracking-wider block mb-1">Visits Scheduled Today</span>
                <div className="text-2xl font-black text-blue-600">{stats.appointmentsToday}</div>
                <span className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 mt-1.5">
                  View Timeline <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-550 shadow-inner">
                <CalendarIcon className="w-5 h-5" />
              </div>
            </div>

            {/* Cards 4: Outstanding balances */}
            <div 
              onClick={() => {
                if (onOpenOverdueInvoices) {
                  onOpenOverdueInvoices();
                } else {
                  setActiveTab('contacts');
                }
              }}
              className="bg-white border border-slate-100 hover:border-red-300 p-5 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer transition-all hover:scale-[1.01]"
              title="Outstanding Balances Overview"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#94A3B8] tracking-wider block mb-1">Outstanding AR Total</span>
                <div className="text-2xl font-black text-[#EF4444]">${stats.outstandings.toFixed(2)}</div>
                <span className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-0.5 mt-1.5">
                  Check Accounts <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Box: Progress Goals Tracking & Team members lists */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Target checklist progress */}
              <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                    <Target className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Operational Targets</h3>
                </div>

                <div className="space-y-4">
                  {/* Knock target */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                      <span>Weekly Territory Knocks</span>
                      <span className="font-extrabold font-mono">{weeklyKnocksCount} completed • {Math.round((weeklyKnocksCount / weeklyKnocksTarget) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (weeklyKnocksCount / weeklyKnocksTarget) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Converts target */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                      <span>Monthly Converted Clients</span>
                      <span className="font-extrabold font-mono">{stats.customers} / {monthlyConvertedTarget} Convert • {Math.round((stats.customers / monthlyConvertedTarget) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (stats.customers / monthlyConvertedTarget) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Consult Schedule goal */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                      <span>Collection Goal reached</span>
                      <span className="font-extrabold font-mono">${totalCollected.toFixed(2)} / ${collectionGoalTarget} Target • {Math.round((totalCollected / collectionGoalTarget) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (totalCollected / collectionGoalTarget) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Frontline Team Status */}
              <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Frontline Field Team</h3>
                </div>

                <div className="space-y-3.5">
                  {team.map(m => (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: m.color }}>
                          {m.name.split(' ')[0][0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate leading-none mb-1">{m.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{m.role}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9.5px] font-extrabold uppercase text-slate-500">Active</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
            </div>

            {/* Right Box: Live Notes log timeline feed & Quick Action shortcuts */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Recent activity chronological feed */}
              <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm space-y-4 flex-1">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <History className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Recent Operational Log Stream</h3>
                </div>

                <div className="space-y-4">
                  {recentTimelineEvents.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                      <p className="text-xs font-semibold text-slate-400 italic">No notes, dispatcher records, or logs registered yet.</p>
                    </div>
                  ) : (
                    recentTimelineEvents.map(ev => {
                      const dateObj = new Date(ev.createdAt);
                      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      
                      return (
                        <div 
                          key={ev.id} 
                          onClick={() => {
                            onOpenPropertyEditor(ev.propertyId);
                          }}
                          className="flex gap-4 items-start hover:bg-slate-50 p-2 rounded-xl transition-all cursor-pointer group text-left"
                        >
                          <div className={cn(
                            "w-8.5 h-8.5 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 border",
                            ev.type === 'dispatch' ? "bg-pink-50 border-pink-100 text-pink-600" :
                            ev.type === 'invoice' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                            ev.type === 'appointment' ? "bg-blue-50 border-blue-100 text-blue-600" :
                            "bg-indigo-50 border-indigo-100 text-indigo-600"
                          )}>
                            {ev.type === 'dispatch' ? <MessageSquare className="w-4 h-4" /> :
                             ev.type === 'invoice' ? <DollarSign className="w-4 h-4" /> :
                             ev.type === 'appointment' ? <CalendarIcon className="w-4 h-4" /> :
                             <FileText className="w-4 h-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                {ev.propertyName}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-widest shrink-0">
                                {dateStr} {timeStr}
                              </span>
                            </div>
                            
                            <p className="text-[11px] text-slate-500 font-semibold line-clamp-2 mt-0.5 leading-normal">
                              {ev.content}
                            </p>
                            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mt-1 leading-none">
                              <MapPin className="w-2.5 h-2.5" />
                              {ev.address.split(',')[0]}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bento Quick Shortcuts */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Quick CRM Utility Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Shortcut 1 */}
                  <div 
                    onClick={onAddNewLead}
                    className="bg-white border border-slate-150 p-4.5 rounded-2xl shadow-sm hover:border-[#2563EB] cursor-pointer transition-all hover:scale-[1.03] text-left flex flex-col justify-between min-h-[110px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 leading-none mb-0.5 uppercase tracking-wide">Add Pin</h4>
                      <p className="text-[9px] font-medium text-slate-400 uppercase leading-none">Canvassing lead</p>
                    </div>
                  </div>

                  {/* Shortcut 2 */}
                  <div 
                    onClick={onOpenCatalog}
                    className="bg-white border border-slate-150 p-4.5 rounded-2xl shadow-sm hover:border-indigo-500 cursor-pointer transition-all hover:scale-[1.03] text-left flex flex-col justify-between min-h-[110px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Package className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 leading-none mb-0.5 uppercase tracking-wide">Offer Catalog</h4>
                      <p className="text-[9px] font-medium text-slate-400 uppercase leading-none">Product packages</p>
                    </div>
                  </div>

                  {/* Shortcut 3 */}
                  <div 
                    onClick={onOpenSettings}
                    className="bg-white border border-slate-150 p-4.5 rounded-2xl shadow-sm hover:border-slate-400 cursor-pointer transition-all hover:scale-[1.03] text-left flex flex-col justify-between min-h-[110px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                      <SettingsIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 leading-none mb-0.5 uppercase tracking-wide">Admin Hub</h4>
                      <p className="text-[9px] font-medium text-slate-400 uppercase leading-none">Manage variables</p>
                    </div>
                  </div>

                  {/* Shortcut 4 */}
                  <div 
                    onClick={() => setActiveTab('appointments')}
                    className="bg-white border border-slate-150 p-4.5 rounded-2xl shadow-sm hover:border-purple-500 cursor-pointer transition-all hover:scale-[1.03] text-left flex flex-col justify-between min-h-[110px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 leading-none mb-0.5 uppercase tracking-wide">Scheduler</h4>
                      <p className="text-[9px] font-medium text-slate-400 uppercase leading-none">Timeline consults</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ==================== 2. CONTACTS DIRECTORY VIEW ==================== */}
      {activeTab === 'contacts' && (
        <div className="flex-1 w-full flex flex-col h-full min-h-0 animate-in fade-in duration-300">
          
          {/* Top Search Controls Header bar */}
          <div className="bg-white border-b border-[#E2E8F0] p-6 shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-[#2563EB] tracking-wider bg-blue-50 px-2.5 py-1 rounded-full w-fit block mb-1">
                CRM Client Database
              </span>
              <h1 className="text-xl font-black text-[#1E293B] tracking-tight">Canvassing Contacts Directory</h1>
            </div>

            <button 
              onClick={onAddNewLead}
              className="px-4 py-2 bg-slate-900 border border-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer max-w-fit"
            >
              <Plus className="w-4 h-4" />
              Add Record
            </button>
          </div>

          <div className="p-6 shrink-0 bg-slate-50 border-b border-[#E2E8F0] space-y-4">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
              
              {/* Custom search query */}
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#94A3B8]" />
                <input 
                  type="text" 
                  placeholder="Search lead name, telephone, emails, addresses or sub-contacts..." 
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl py-3 pl-11 pr-4 text-xs font-bold leading-tight placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Premise Type drop filter */}
              <div className="flex items-center gap-2.5 shrink-0 bg-white border border-[#CBD5E1] px-3.5 py-2 rounded-xl shadow-sm">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <select 
                  className="bg-transparent text-xs font-black uppercase tracking-tight text-slate-705 border-none outline-none focus:ring-0 p-0"
                  value={filterPremiseType}
                  onChange={e => setFilterPremiseType(e.target.value as any)}
                >
                  <option value="all">PREMISE: ALL</option>
                  <option value="Residential">RESIDENTIAL</option>
                  <option value="Commercial">COMMERCIAL</option>
                </select>
              </div>

              {/* Visit Status Filter Dropdown */}
              <div className="flex items-center gap-2.5 shrink-0 bg-white border border-[#CBD5E1] px-3.5 py-2 rounded-xl shadow-sm">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <select 
                  className="bg-transparent text-xs font-black uppercase tracking-tight text-slate-705 border-none outline-none focus:ring-0 p-0"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                >
                  <option value="all">VISIT: ALL</option>
                  <option value="Not Visited">NOT VISITED</option>
                  <option value="Knocked">KNOCKED</option>
                  <option value="No Answer">NO ANSWER</option>
                  <option value="Interested">INTERESTED</option>
                  <option value="Follow-Up Needed">FOLLOW-UP NEEDED</option>
                </select>
              </div>

            </div>

            {/* Quick Category Tab Stages selector */}
            <div className="max-w-7xl mx-auto flex gap-1.5 overflow-x-auto pb-0.5 invisible-scrollbar">
              {(['all', 'prospect', 'lead', 'opportunity', 'customer'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterStage(tab)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 transition-all cursor-pointer shadow-sm border",
                    filterStage === tab 
                      ? "bg-slate-900 border-slate-950 text-white" 
                      : "bg-white border-[#CBD5E1]/60 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Content List */}
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="max-w-7xl mx-auto p-6">
              
              {filteredContacts.length === 0 ? (
                <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-1">No matching active records found</h3>
                  <p className="text-xs font-semibold text-slate-400 max-w-md mx-auto">
                    Try adjusting your criteria, search bar keyword, or add a brand new lead pin on the Map.
                  </p>
                  <button 
                    onClick={() => { setSearchQuery(''); setFilterStage('all'); setFilterStatus('all'); setFilterPremiseType('all'); }} 
                    className="mt-4 px-4 py-2 bg-slate-100 text-[10px] text-slate-700 font-extrabold uppercase hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
                  {filteredContacts.map(p => {
                    const initials = getInitials(p.firstName, p.lastName);
                    const outstandingCount = p.invoices?.filter(i => i.status === 'Unpaid' || i.status === 'Overdue').length || 0;
                    
                    return (
                      <div 
                        key={p.id}
                        onClick={() => onOpenPropertyEditor(p.id)}
                        className="bg-white border border-slate-200 rounded-2xl hover:border-slate-350 p-5 shadow-sm hover:shadow-md cursor-pointer text-left flex flex-col justify-between transition-all group relative overflow-hidden active:scale-[0.98]"
                      >
                        {/* Status colored ribbon */}
                        <div className="absolute top-0 bottom-0 left-0 w-1" style={{ backgroundColor: STATUS_COLORS[p.status] || '#CBD5E1' }} />
                        
                        <div>
                          {/* Header name & stage parameters */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8.5 h-8.5 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-[11px] shrink-0 border">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                  {p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'Unnamed Lead'}
                                </h3>
                                <p className="text-[9.5px] font-semibold text-slate-400 capitalize">{p.type}</p>
                              </div>
                            </div>

                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider shrink-0",
                              p.stage === 'customer' ? "bg-emerald-100 text-emerald-800" :
                              p.stage === 'opportunity' ? "bg-amber-100 text-amber-800" :
                              p.stage === 'lead' ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"
                            )}>
                              {p.stage}
                            </span>
                          </div>

                          {/* Address positioning details */}
                          <p className="text-[10.5px] text-slate-500 font-semibold flex items-center gap-1.5 mt-3.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{p.address}</span>
                          </p>

                          {/* Basic demographics contacts */}
                          <div className="mt-3.5 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                            <span className="truncate flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-405 shrink-0" /> {p.phone || 'No phone'}
                            </span>
                            <span className="truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-405 shrink-0" /> {p.email || 'No email'}
                            </span>
                          </div>
                        </div>

                        {/* Extra indicators footer block */}
                        <div className="flex items-center justify-between gap-1 mt-4.5 pt-3 border-t border-slate-100/60">
                          <span className="text-[10.5px] font-extrabold uppercase text-slate-500 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[p.status] || '#CBD5E1' }} />
                            {p.status}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {outstandingCount > 0 && (
                              <span className="text-[9px] font-black bg-red-100 text-red-650 px-2 py-0.5 rounded-full uppercase">
                                AR Overdue
                              </span>
                            )}
                            <span className="text-[9.5px] font-black text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                              Open Record &rarr;
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ==================== 3. APPOINTMENTS SCHEDULE TIMELINE VIEW ==================== */}
      {activeTab === 'appointments' && (
        <div className="flex-1 w-full p-6 space-y-6 pb-24 animate-in fade-in duration-300 max-w-7xl mx-auto">
          
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-[10.5px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full uppercase tracking-wider block mb-1 w-fit">
                Field Agenda Schedule
              </span>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Scheduled doorstep Consultations</h1>
              <p className="text-xs font-bold text-slate-400 leading-tight">Calendar agenda of all field appointments matching today: {new Date().toLocaleDateString()}</p>
            </div>
            
            <div className="text-xs font-black text-[#2563EB] bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100 shrink-0">
              {todaysAppointments.length} Consults Booked Today
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm space-y-4">
            {todaysAppointments.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-xl space-y-3">
                <CalendarIcon className="w-12 h-12 text-slate-350 mx-auto" />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">No door-to-door visits booked today</h3>
                <p className="text-xs font-semibold text-slate-450 max-w-xs mx-auto">
                  Click on any contact in your CRM Contacts Directory and select Schedule Visit to book consultations on-site!
                </p>
                <button 
                  onClick={() => setActiveTab('contacts')} 
                  className="px-4 py-2 bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Browse Directory to Schedule
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {todaysAppointments.map(appt => {
                  const hourFormatted = new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const assignedRep = team.find(m => m.id === appt.memberId);
                  const initials = getInitials(appt.property.firstName, appt.property.lastName);

                  return (
                    <div 
                      key={appt.id}
                      onClick={() => {
                        onOpenPropertyEditor(appt.property.id);
                      }}
                      className="group border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/10 p-5 transition-all text-left cursor-pointer flex flex-col justify-between relative overflow-hidden bg-white shadow-sm hover:shadow active:scale-[0.98]"
                    >
                      {/* Side Glowing status ribbon */}
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500" />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-[#2563EB] font-mono shrink-0 bg-blue-50 px-2.5 py-1 rounded-xl">
                            {hourFormatted}
                          </span>
                          
                          {assignedRep && (
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white truncate max-w-[125px]" style={{ backgroundColor: assignedRep.color }}>
                              {assignedRep.name.split(' ')[0]} (Rep)
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                            {appt.title}
                          </h4>

                          <p className="text-[11px] font-semibold text-slate-500 truncate flex items-center gap-1 mt-1 font-sans">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {appt.property.address}
                          </p>
                        </div>

                        {appt.notes && (
                          <div className="text-[10px] text-slate-500 font-bold bg-[#F8FAFC] border border-slate-150 p-2.5 rounded-xl uppercase tracking-wider line-clamp-2">
                            Note: {appt.notes}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex justify-between items-center text-[10px]">
                        <span className="font-extrabold text-[#2563EB]">
                          Agent: {assignedRep?.name || 'Unassigned'}
                        </span>
                        <span className="font-black text-[#94A3B8] uppercase tracking-wider group-hover:text-[#2563EB] transition-colors">
                          Open Details &rarr;
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 4. CUSTOMER SPOTLIGHT FOCUS TRAY OVERLAY (COVERING THE VIEW WITH 100% FOCUS!) ==================== */}
      <AnimatePresence>
        {selectedContactId && selectedContact && (
          <div className="fixed inset-0 z-[2800] overflow-hidden flex justify-end">
            
            {/* Dark glass backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContactId(null)}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
              id="selected-backdrop-overlay"
            />

            {/* Sliding Container drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 220 }}
              className="relative bg-white w-full md:max-w-4xl h-full shadow-2xl flex flex-col z-10"
              id="selected-sliding-drawer"
            >
              
              {/* Drawer Sticky Title Header */}
              <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedContactId(null)}
                    className="p-2.5 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 shrink-0 cursor-pointer flex items-center justify-center active:scale-90"
                    title="Back"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180 text-slate-700" />
                  </button>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest block leading-none mb-1">PWA Client Management</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-base font-black text-slate-900 tracking-tight leading-none truncate max-w-[220px] md:max-w-[390px]">
                        {selectedContact.firstName || selectedContact.lastName ? `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim() : 'Unnamed Lead'}
                      </h2>
                      <button
                        onClick={() => {
                          setSelectedContactId(null);
                          onOpenPropertyEditor(selectedContact.id);
                        }}
                        className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 hover:border-blue-200 transition-all cursor-pointer flex items-center justify-center active:scale-95 shrink-0"
                        title="Edit status, activity, and contact details"
                        aria-label="Edit status, activity, and contact details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => onFocusProperty(selectedContact.id)}
                    className="p-2 px-3 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-xl text-[10.5px] font-black text-indigo-600 uppercase tracking-widest transition-transform flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Find on Map"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Map View
                  </button>

                  <button 
                    onClick={() => setSelectedContactId(null)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                    title="Close Spotlight Panel"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Drawer Body Scroll Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#F8FAFC]">
                
                {/* 1. Demographics & lead information panel blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary card */}
                  <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-3.5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] border-b border-slate-100 pb-1.5">Primary Demographics</h4>
                    
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-405 shrink-0" /> Email</span>
                        <a href={`mailto:${selectedContact.email}`} className="font-extrabold text-blue-600 hover:underline truncate max-w-[170px] md:max-w-[240px]">
                          {selectedContact.email || 'None registered'}
                        </a>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-405 shrink-0" /> Phone</span>
                        <a href={`tel:${selectedContact.phone}`} className="font-extrabold text-slate-800 hover:underline">
                          {selectedContact.phone || 'None registered'}
                        </a>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-405 shrink-0" /> Key Decision Maker</span>
                        <span className="font-black text-slate-800">
                          {selectedContact.isDecisionMaker ? 'Yes' : 'No / Unreported'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profile info details card */}
                  <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-3.5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] border-b border-slate-100 pb-1.5">Lead Profile Information</h4>
                    
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Premises Name</span>
                        <span className="font-black text-slate-800 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" />
                          {selectedContact.businessName || 'Residential Site'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Canvassing Status</span>
                        <span className="font-extrabold uppercase text-xs" style={{ color: STATUS_COLORS[selectedContact.status] }}>
                          {selectedContact.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Active Stage</span>
                        <span className="font-black text-indigo-600 capitalize bg-indigo-50 px-2 py-0.5 rounded-lg text-[10.5px]">
                          {selectedContact.stage}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags block */}
                <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Premise Characteristics Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedContact.tags?.length > 0 ? (
                      selectedContact.tags.map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-[10.5px] font-bold text-indigo-700 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-indigo-400" /> {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400 italic">No custom premise tags.</span>
                    )}
                  </div>
                </div>

                {/* 2. Client dispatch tools tab selection action hubs */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm flex flex-col overflow-hidden">
                  
                  {/* Tab titles list */}
                  <div className="flex border-b border-[#E2E8F0] bg-slate-50 overflow-x-auto">
                    {[
                      { id: 'history', label: 'Activity Logs', icon: <History className="w-4 h-4 text-indigo-400" /> },
                      { id: 'message', label: 'Send Note/Dispatch', icon: <MessageSquare className="w-4 h-4 text-pink-400" /> },
                      { id: 'invoice', label: 'Digital Invoice', icon: <DollarSign className="w-4 h-4 text-emerald-400" /> },
                      { id: 'appointment', label: 'Schedule Visit', icon: <CalendarIcon className="w-4 h-4 text-blue-400" /> }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveDetailTab(tab.id as any);
                          setMessageType(tab.id === 'message' ? 'SMS' : messageType);
                        }}
                        className={cn(
                          "px-5 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
                          activeDetailTab === tab.id 
                            ? "border-[#2563EB] text-[#2563EB] bg-white font-black" 
                            : "border-transparent text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Render Content */}
                  <div className="p-5">
                    
                    {/* ====== Activity tab ====== */}
                    {activeDetailTab === 'history' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Communications & Log History</h4>
                          <span className="text-[10px] font-bold text-slate-400">Total Interactions: {selectedContact.interactions?.length || 0}</span>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {selectedContact.interactions?.length > 0 ? (
                            [...selectedContact.interactions].sort((a,b) => b.createdAt - a.createdAt).map((item, idx) => (
                              <div key={idx} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1 my-1">
                                <div className="flex items-center justify-between text-[10px] text-gray-400">
                                  <span className="font-extrabold uppercase text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md">{item.type}</span>
                                  <span className="font-bold">{new Date(item.createdAt).toLocaleString()}</span>
                                </div>
                                {item.authorName && (
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Logged by {item.authorName}</p>
                                )}
                                <p className="text-xs font-bold text-slate-800 leading-normal">{item.content}</p>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center bg-slate-50/50 border border-slate-150 border-dashed rounded-xl">
                              <p className="text-xs font-semibold text-slate-400 italic">No notes, dispatcher records, or logs registered yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ====== Message dispatch dispatch tab ====== */}
                    {activeDetailTab === 'message' && (
                      <div className="space-y-4 text-left">
                        <div className="flex gap-2 p-1 bg-slate-100 border border-slate-200 rounded-xl max-w-fit">
                          {['SMS', 'Email'].map(t => (
                            <button
                              key={t}
                              onClick={() => {
                                setMessageType(t as any);
                                setMessageTemplate('');
                                setCustomMessage('');
                              }}
                              className={cn(
                                "px-4 py-2 rounded-lg text-[10.5px] font-black uppercase tracking-widest cursor-pointer transition-all",
                                messageType === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"
                              )}
                            >
                              Send {t} Message
                            </button>
                          ))}
                        </div>

                        {/* Templates list selection */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Select Template Dispatch</label>
                          <div className="flex gap-1.5 overflow-x-auto pb-1.5 invisible-scrollbar">
                            {(templates[messageType] || []).map(t => (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setMessageTemplate(t.id);
                                  handleTemplateSelect(t.text);
                                }}
                                className={cn(
                                  "px-3.5 py-2 border rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer",
                                  messageTemplate === t.id 
                                    ? "bg-slate-900 border-slate-950 text-white" 
                                    : "bg-white border-slate-200 hover:border-slate-350 text-slate-600"
                                )}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Body dispatch custom message */}
                        <div className="space-y-3">
                          <textarea 
                            className="w-full bg-slate-50 border border-[#CBD5E1] rounded-2xl p-4 text-xs font-bold min-h-[120px] focus:ring-2 focus:ring-[#2563EB]/10 leading-relaxed text-slate-800"
                            placeholder="Type customized dispatched content here..."
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                          />

                          {messageSuccess && (
                            <div className="bg-emerald-50 text-emerald-600 text-xs font-black p-2.5 rounded-lg border border-emerald-250 flex items-center gap-1.5">
                              <CheckCircle className="w-4.5 h-4.5 text-emerald-500" /> Dispatched Successfully Recorded!
                            </div>
                          )}

                          <button 
                            onClick={handleSendMessage}
                            disabled={isSendingMessage || !customMessage.trim()}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {isSendingMessage ? 'Transmitting Dispatched Message...' : `Send ${messageType} Message Response`}
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ====== Invoice generation catalog tab ====== */}
                    {activeDetailTab === 'invoice' && (
                      <div className="space-y-4 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          
                          {/* Products offers menu selection */}
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest leading-none">Catalog Menu Selection</label>
                            <div className="border border-[#E2E8F0] p-1 bg-slate-50 rounded-2xl max-h-[220px] overflow-y-auto space-y-1.5">
                              {catalog.products.map(p => (
                                <div key={p.id} className="bg-white border border-slate-150 p-2.5 rounded-xl flex items-center justify-between">
                                  <div className="min-w-0 pr-2">
                                    <h5 className="text-[11px] font-black leading-none mb-0.5 text-slate-800 truncate">{p.name}</h5>
                                    <p className="text-[9px] font-black text-indigo-600 leading-none">${p.price.toFixed(2)}</p>
                                  </div>
                                  <button 
                                    onClick={() => handleAddProductToInvoice(p.id)}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-[9px] font-black uppercase text-indigo-600 border border-indigo-100 transition-all cursor-pointer"
                                  >
                                    + Add Item
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Created items cart */}
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Invoice Line Items Cart</label>
                            <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl min-h-[200px] flex flex-col justify-between">
                              <div className="space-y-1.5 overflow-y-auto max-h-[160px]">
                                {invoiceItems.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic text-center py-10">Cart is empty. Select services left.</p>
                                ) : (
                                  invoiceItems.map(item => {
                                    const p = catalog.products.find(prod => prod.id === item.productId);
                                    if (!p) return null;
                                    return (
                                      <div key={item.productId} className="flex justify-between items-center bg-white p-2 border border-slate-100 rounded-xl">
                                        <div className="min-w-0 flex-1 pr-2">
                                          <p className="text-[11px] font-black text-slate-800 truncate">{p.name}</p>
                                          <p className="text-[9px] text-indigo-600 font-bold leading-none">Qty: {item.quantity} x ${p.price}</p>
                                        </div>
                                        <button 
                                          onClick={() => handleRemoveInvoiceItem(p.id)}
                                          className="p-1 px-2 text-[9px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {invoiceItems.length > 0 && (
                                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                  <span className="text-xs font-black uppercase text-slate-500">Gross Total:</span>
                                  <span className="text-sm font-black text-slate-900">${currentInvoiceTotal.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Invoice Notes */}
                        <div className="space-y-3">
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-xs font-bold"
                            placeholder="Add invoice payment terms or custom notes..."
                            value={invoiceNotes}
                            onChange={e => setInvoiceNotes(e.target.value)}
                          />

                          {invoiceSuccess && (
                            <div className="bg-emerald-50 text-emerald-600 text-xs font-black p-2.5 rounded-lg border border-[#A7F3D0]">
                              Secure digital invoice generated & recorded successfully!
                            </div>
                          )}

                          <button 
                            onClick={handleCreateInvoice}
                            disabled={invoiceItems.length === 0}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Issue Professional Digital Invoice
                          </button>
                        </div>

                        {/* Existing Invoices List */}
                        {selectedContact.invoices?.length > 0 && (
                          <div className="pt-4 border-t border-slate-100 space-y-2">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Issued Invoices</h5>
                            <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                              {selectedContact.invoices.map(inv => (
                                <div key={inv.id} className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs">
                                  <div>
                                    <p className="font-black text-slate-800">{inv.invoiceNumber} • ${inv.total.toFixed(2)}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(inv.createdAt).toLocaleDateString()} • Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                                  </div>
                                  <button 
                                    onClick={() => handleToggleInvoicePaid(inv.id)}
                                    className={cn(
                                      "px-3 py-1.5 text-[9.5px] font-black uppercase rounded-lg border transition-colors cursor-pointer",
                                      inv.status === 'Paid' 
                                        ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                                        : "bg-amber-50 border-amber-100 text-amber-600"
                                    )}
                                  >
                                    {inv.status}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ====== Schedule appointments field tab ====== */}
                    {activeDetailTab === 'appointment' && (
                      <form onSubmit={handleCreateAppointment} className="space-y-4 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Appt target */}
                          <div className="space-y-1.5 col-span-full">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Title / Consultation Goal</label>
                            <input 
                              type="text" 
                              required
                              className="w-full bg-slate-50 border border-[#CBD5E1] rounded-xl px-4 py-2 text-xs font-bold"
                              placeholder="e.g. Roof repair inspection estimate / Contract validation interview"
                              value={apptTitle}
                              onChange={e => setApptTitle(e.target.value)}
                            />
                          </div>

                          {/* Appt Date */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Appointment Date</label>
                            <input 
                              type="date" 
                              required
                              className="w-full bg-slate-50 border border-[#CBD5E1] rounded-xl px-4 py-2 text-xs font-bold"
                              value={apptDate}
                              onChange={e => setApptDate(e.target.value)}
                            />
                          </div>

                          {/* Appt Time */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Scheduled Time</label>
                            <input 
                              type="time" 
                              required
                              className="w-full bg-slate-50 border border-[#CBD5E1] rounded-xl px-4 py-2 text-xs font-bold"
                              value={apptTime}
                              onChange={e => setApptTime(e.target.value)}
                            />
                          </div>

                          {/* Field Agent assigned */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Designated Field Representative</label>
                            <select 
                              className="w-full bg-slate-50 border border-[#CBD5E1] rounded-xl px-4 py-2 text-xs font-bold"
                              value={apptMemberId}
                              onChange={e => setApptMemberId(e.target.value)}
                            >
                              {team.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                              ))}
                            </select>
                          </div>

                          {/* Appt Notes */}
                          <div className="space-y-1.5 col-span-full">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Internal Agent Notes</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-50 border border-[#CBD5E1] rounded-xl px-4 py-2 text-xs font-bold"
                              placeholder="Add address gate-key instructions, client constraints, etc."
                              value={apptNotes}
                              onChange={e => setApptNotes(e.target.value)}
                            />
                          </div>

                        </div>

                        {apptSuccess && (
                          <div className="bg-emerald-50 text-emerald-600 text-xs font-black p-2.5 rounded-lg border border-emerald-200">
                            Visit consultations booked & assigned successfully!
                          </div>
                        )}

                        <button 
                          type="submit"
                          className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CalendarIcon className="w-4 h-4 text-white" /> Schedule Doorstep Consultation
                        </button>

                        {/* Existing scheduled list */}
                        {selectedContact.appointments?.length > 0 && (
                          <div className="pt-4 border-t border-slate-100 space-y-2">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scheduled Consults</h5>
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                              {selectedContact.appointments.map(a => {
                                const rep = team.find(m => m.id === a.memberId);
                                return (
                                  <div key={a.id} className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs">
                                    <div className="min-w-0 pr-2">
                                      <p className="font-extrabold text-slate-800 truncate">{a.title}</p>
                                      <p className="text-[9.5px] text-indigo-600 font-bold uppercase truncate">
                                        {new Date(a.startTime).toLocaleString()} • {rep?.name || 'Unassigned'}
                                      </p>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={() => handleDeleteAppointment(a.id)}
                                      className="text-red-500 hover:text-red-700 font-bold p-1 px-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-[10px]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </form>
                    )}

                  </div>
                </div>

              </div>
              
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
