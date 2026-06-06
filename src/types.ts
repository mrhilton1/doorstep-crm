export type PropertyStatus = 'Not Visited' | 'Knocked' | 'No Answer' | 'Interested' | 'Follow-Up Needed';
export type PropertyType = 'Residential' | 'Commercial';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  email?: string;
  phone?: string;
  isDecisionMaker: boolean;
  customData?: Record<string, any>;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category?: string;
}

export interface Bundle {
  id: string;
  name: string;
  productIds: string[];
  description: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountLabel?: string;
}

export interface QuoteLineItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
  category?: string;
  isSelected: boolean; // For toggling in UI
}

export interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'checkbox';
  required: boolean;
  visible: boolean;
  applicableTo?: 'Residential' | 'Commercial' | 'Both';
  scope?: 'Address' | 'Contact';
}

export interface Member {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface Goal {
  id: string;
  memberId: string;
  target: number;
  current: number;
  type: 'quotes' | 'sales' | 'knocks';
  period: 'daily' | 'weekly' | 'monthly';
}

export type PropertyStage = 'prospect' | 'lead' | 'opportunity' | 'customer';

export interface StageLabels {
  prospect: string;
  lead: string;
  opportunity: string;
  customer: string;
}

export interface AppLabels {
  leads: string;
  quotes: string;
  sales: string;
  catalog: string;
  bundles: string;
  discounts: string;
  team: string;
  goals: string;
  stages: StageLabels;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

export interface BusinessInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
}

export interface Settings {
  tags: string[];
  contactFields: CustomField[];
  discounts: Discount[];
  labels: AppLabels;
  businessInfo: BusinessInfo;
  operationalTargets?: {
    weeklyKnocks: number;
    monthlyConverted: number;
    collectionGoal: number;
  };
}

export interface Quote {
  id: string;
  lineItems: QuoteLineItem[];
  discounts: Discount[];
  subtotal: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  createdAt: number;
  notes?: string;
}

export interface Sale {
  id: string;
  amount: number;
  product: string;
  quoteId?: string;
  createdAt: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quoteId?: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  total: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  createdAt: number;
  dueDate: number;
  notes?: string;
}

export interface Interaction {
  id: string;
  type: 'Note' | 'Call' | 'Text' | 'Meeting';
  content: string;
  createdAt: number;
  authorId: string;
}

export interface Appointment {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  memberId: string;
  notes?: string;
  googleEventId?: string;
}

export interface ProspectRoute {
  id: string;
  name: string;
  propertyIds: string[];
  assignedMemberId?: string;
  status: 'Draft' | 'Assigned' | 'In Progress' | 'Completed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface PropertyContact {
  id: string;
  address: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  role?: string;
  isDecisionMaker?: boolean;
  lat: number;
  lng: number;
  status: PropertyStatus;
  type: PropertyType;
  businessName?: string;
  notes: string; // This will now act as "Next Action" or "Static Notes"
  tags: string[];
  contacts: Contact[];
  quotes: Quote[];
  sales: Sale[];
  interactions: Interaction[];
  appointments: Appointment[];
  invoices?: Invoice[];
  customData?: Record<string, any>;
  stage: PropertyStage;
  updatedAt: number;
  createdAt: number;
}

export const STATUS_COLORS: Record<PropertyStatus, string> = {
  'Not Visited': '#94a3b8', // Gray
  'Knocked': '#3b82f6',     // Blue
  'No Answer': '#ef4444',    // Red
  'Interested': '#22c55e',   // Green
  'Follow-Up Needed': '#eab308' // Yellow
};

export const DEFAULT_TAGS = [
  'Pool', 'Nice Yard', 'Older Home', 'Solar', 'Dog'
];

export interface AppState {
  properties: PropertyContact[];
  currentRoute: string[];
  catalog: {
    products: Product[];
    bundles: Bundle[];
  };
  settings: Settings;
  team: Member[];
  goals: Goal[];
}
