/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { 
  APIProvider, 
  Map as GoogleMap, 
  AdvancedMarker, 
  Pin,
  useMap,
  useMapsLibrary,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { 
  MapContainer, 
  TileLayer, 
  Marker as LeafletMarker, 
  Circle as LeafletCircle,
  useMap as useLeafletMap,
  useMapEvents as useLeafletMapEvents,
  Polyline as LeafletPolyline
} from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map as MapIcon, 
  Layers, 
  Navigation, 
  X, 
  ChevronDown, 
  CheckCircle2, 
  History, 
  MoreVertical,
  MessageCircle,
  Calendar,
  Bell,
  Search,
  Target,
  Tag,
  ShoppingBag,
  ShoppingCart,
  MousePointer2,
  UserPlus, 
  Building2, 
  Home, 
  User, 
  Mail, 
  Phone, 
  ShieldCheck,
  Trash2,
  Edit3,
  DollarSign,
  MapPin,
  FileText,
  Send,
  Check,
  XCircle,
  Zap,
  PlusCircle,
  MinusCircle,
  Ticket,
  Package,
  Box,
  Tags,
  LayoutGrid,
  MessageSquare,
  Plus,
  Settings as SettingsIcon,
  HardHat,
  Eye,
  ArrowRight,
  Info,
  Trophy,
  Users,
  Lock,
  Layout,
  Hash,
  CheckCircle,
  Clock,
  ExternalLink,
  Save,
  Clock3,
  Filter,
  RefreshCw,
  LogOut,
  HelpCircle,
  Menu,
  ChevronLeft,
  Circle as CircleIcon,
  Grid,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';

import { v4 as uuidv4 } from 'uuid';
import { cn } from './lib/utils';
import HomeDashboard from './components/HomeDashboard';
import OverdueInvoicesOverlay from './components/OverdueInvoicesOverlay';
import { appUrl, doorstepDb, hasSupabaseConfig, supabase } from './lib/supabase';
import { 
  PropertyContact, 
  PropertyStatus, 
  PropertyType,
  PropertyStage,
  ProspectRoute,
  Contact,
  Product,
  Bundle,
  QuoteLineItem,
  Discount,
  Quote,
  Sale,
  CustomField,
  Interaction,
  Settings as AppSettings,
  STATUS_COLORS, 
  DEFAULT_TAGS,
  AppState,
  Member,
  Goal,
  Appointment
} from './types';
// @ts-ignore
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Global styles fix for ResizeObserver error
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .resize-observer-fix { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; }
  `;
  document.head.appendChild(style);

  // Suppress ResizeObserver error
  const origError = window.console.error;
  window.console.error = (...args) => {
    if (args[0]?.includes?.('ResizeObserver loop completed with undelivered notifications')) return;
    origError.apply(window.console, args);
  };
}

const normalizeAddress = (addr: string) => {
  if (!addr) return '';
  return addr.toLowerCase()
    .replace(/ street/g, ' st')
    .replace(/ road/g, ' rd')
    .replace(/ avenue/g, ' ave')
    .replace(/ drive/g, ' dr')
    .replace(/ lane/g, ' ln')
    .replace(/ court/g, ' ct')
    .replace(/ boulevard/g, ' blvd')
    .replace(/ suite/g, ' ste')
    .replace(/ apartment/g, ' apt')
    .replace(/ unit/g, ' #')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const ADDRESS_CLICK_HIT_RADIUS_METERS = 8;
const ROUTE_SELECTION_HIT_RADIUS_METERS = 12;

const distanceMeters = (a: [number, number], b: [number, number]) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const findClosestAddressRecord = (properties: PropertyContact[], lat: number, lng: number) => {
  let existing: PropertyContact | null = null;
  let minDistanceMeters = Infinity;

  for (const property of properties) {
    const distance = distanceMeters([property.lat, property.lng], [lat, lng]);
    if (distance < minDistanceMeters) {
      minDistanceMeters = distance;
      existing = property;
    }
  }

  return { existing, minDistanceMeters };
};

const STAGE_ORDER: PropertyStage[] = ['prospect', 'lead', 'opportunity', 'customer'];

type WorkspaceContext = {
  workspaceId: string | null;
  workspaceName: string;
  userId: string | null;
  userEmail: string | null;
  onSignOut: () => void;
};

type WorkspaceMembership = {
  workspace_id: string;
  workspaces?: { name?: string | null } | { name?: string | null }[] | null;
};

type WorkspaceAppStateKey = 'catalog' | 'settings' | 'team' | 'goals' | 'routes';
type LiveEventType = 'knock' | 'call' | 'completed_cleaning' | 'record_event';
type KnockResult = 'answer' | 'no_answer';
type AnswerOutcome = 'quote_requested' | 'follow_up_needed' | 'referral_given' | 'not_interested';
type CallDirection = 'outbound' | 'inbound';

type LiveEventPayload = {
  eventType: LiveEventType;
  knockResult?: KnockResult;
  answerOutcome?: AnswerOutcome;
  callDirection?: CallDirection;
  note?: string;
  referralType?: string;
  referralRepName?: string;
};

type AddressRecordSectionKey =
  | 'addressHeader'
  | 'stageControls'
  | 'liveEventLogger'
  | 'activityFeed'
  | 'addressDetails'
  | 'propertyHistory'
  | 'contactsAtAddress'
  | 'scheduleCTA'
  | 'createQuoteCTA'
  | 'recordTransactionCTA';

type AddressRecordSectionPermission = {
  visible: boolean;
  editable: boolean;
};

const DEFAULT_ADDRESS_RECORD_PERMISSIONS: Record<AddressRecordSectionKey, AddressRecordSectionPermission> = {
  addressHeader: { visible: true, editable: true },
  stageControls: { visible: true, editable: true },
  liveEventLogger: { visible: true, editable: true },
  activityFeed: { visible: true, editable: false },
  addressDetails: { visible: true, editable: true },
  propertyHistory: { visible: true, editable: false },
  contactsAtAddress: { visible: true, editable: true },
  scheduleCTA: { visible: true, editable: true },
  createQuoteCTA: { visible: true, editable: true },
  recordTransactionCTA: { visible: true, editable: true },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  knock: 'Knock',
  call: 'Call',
  completed_cleaning: 'Completed Cleaning',
  record_event: 'Record Event',
  answer: 'Answer',
  no_answer: 'No Answer',
  quote_requested: 'Estimate / Quote Requested',
  follow_up_needed: 'Follow-Up Needed',
  referral_given: 'Referral Given',
  not_interested: 'Not Interested',
  outbound: 'Outbound Call',
  inbound: 'Inbound Call',
};

const statusToDb: Record<PropertyStatus, string> = {
  'Not Visited': 'not_visited',
  'Knocked': 'knocked',
  'No Answer': 'no_answer',
  'Interested': 'interested',
  'Follow-Up Needed': 'follow_up_needed',
};

const statusFromDb: Record<string, PropertyStatus> = {
  not_visited: 'Not Visited',
  knocked: 'Knocked',
  no_answer: 'No Answer',
  interested: 'Interested',
  follow_up_needed: 'Follow-Up Needed',
};

const propertyToAddressRow = (property: PropertyContact, workspaceId: string, userId: string | null) => ({
  id: property.id,
  workspace_id: workspaceId,
  display_address: property.address,
  normalized_address: normalizeAddress(property.address),
  lat: property.lat,
  lng: property.lng,
  type: property.type === 'Commercial' ? 'commercial' : 'residential',
  stage: property.stage,
  status: statusToDb[property.status] || 'not_visited',
  business_name: property.businessName || null,
  notes: property.notes || '',
  custom_data: {
    firstName: property.firstName || '',
    lastName: property.lastName || '',
    phone: property.phone || '',
    email: property.email || '',
    role: property.role || '',
    isDecisionMaker: Boolean(property.isDecisionMaker),
    tags: property.tags || [],
    contacts: property.contacts || [],
    quotes: property.quotes || [],
    sales: property.sales || [],
    appointments: property.appointments || [],
    invoices: property.invoices || [],
  },
  created_by: userId,
  updated_by: userId,
});

const addressRowToProperty = (row: any): PropertyContact => {
  const customData = row.custom_data || {};
  return {
    id: row.id,
    address: row.display_address || '',
    firstName: customData.firstName || '',
    lastName: customData.lastName || '',
    phone: customData.phone || '',
    email: customData.email || '',
    role: customData.role || '',
    isDecisionMaker: Boolean(customData.isDecisionMaker),
    lat: Number(row.lat || 0),
    lng: Number(row.lng || 0),
    status: statusFromDb[row.status] || 'Not Visited',
    type: row.type === 'commercial' ? 'Commercial' : 'Residential',
    businessName: row.business_name || '',
    notes: row.notes || '',
    tags: Array.isArray(customData.tags) ? customData.tags : [],
    contacts: Array.isArray(customData.contacts) ? customData.contacts : [],
    quotes: Array.isArray(customData.quotes) ? customData.quotes : [],
    sales: Array.isArray(customData.sales) ? customData.sales : [],
    interactions: Array.isArray(customData.interactions) ? customData.interactions : [],
    appointments: Array.isArray(customData.appointments) ? customData.appointments : [],
    invoices: Array.isArray(customData.invoices) ? customData.invoices : [],
    customData,
    stage: row.stage || 'prospect',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
};

const activityRowToInteraction = (row: any): Interaction => {
  const metadata = row.metadata || {};
  const eventType = metadata.event_type || row.type;
  const outcome = metadata.outcome || metadata.knock_result || metadata.call_direction;
  const typeLabel = EVENT_TYPE_LABELS[outcome] || EVENT_TYPE_LABELS[eventType] || row.title || row.type;

  return {
    id: row.id,
    type: typeLabel as Interaction['type'],
    content: row.body || row.title || `${typeLabel} logged`,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    authorId: row.actor_user_id || '',
    authorName: metadata.actor_email || metadata.actor_name || '',
    metadata,
  };
};

const buildEventTitle = (payload: LiveEventPayload) => {
  if (payload.eventType === 'knock' && payload.knockResult === 'answer' && payload.answerOutcome) {
    return `Knock - ${EVENT_TYPE_LABELS[payload.answerOutcome]}`;
  }
  if (payload.eventType === 'knock' && payload.knockResult === 'no_answer') {
    return 'Knock - No Answer';
  }
  if (payload.eventType === 'call' && payload.callDirection) {
    return EVENT_TYPE_LABELS[payload.callDirection];
  }
  return EVENT_TYPE_LABELS[payload.eventType] || 'Record Event';
};

const getActivityDbType = (payload: LiveEventPayload) => {
  if (payload.eventType === 'knock') return 'knock';
  if (payload.eventType === 'call') return 'call';
  if (payload.eventType === 'completed_cleaning') return 'appointment_event';
  return 'note';
};

const getStageForEvent = (payload: LiveEventPayload, currentStage: PropertyStage): PropertyStage => {
  const currentWeight = STAGE_ORDER.indexOf(currentStage);
  const promoteTo = (stage: PropertyStage) => {
    const nextWeight = STAGE_ORDER.indexOf(stage);
    return currentWeight < nextWeight ? stage : currentStage;
  };

  if (payload.eventType === 'completed_cleaning') return promoteTo('customer');
  if (payload.answerOutcome === 'quote_requested') return promoteTo('opportunity');
  if (payload.eventType === 'knock' && payload.knockResult === 'answer') return promoteTo('lead');
  return currentStage;
};

const getStatusForEvent = (payload: LiveEventPayload, currentStatus: PropertyStatus): PropertyStatus => {
  if (payload.eventType === 'knock' && payload.knockResult === 'no_answer') return 'No Answer';
  if (payload.eventType === 'knock' && payload.knockResult === 'answer') {
    if (payload.answerOutcome === 'follow_up_needed') return 'Follow-Up Needed';
    if (payload.answerOutcome === 'quote_requested' || payload.answerOutcome === 'referral_given') return 'Interested';
    return 'Knocked';
  }
  if (payload.eventType === 'completed_cleaning') return 'Interested';
  return currentStatus;
};

type AppHeaderNavProps = {
  workspaceId: string | null;
  workspaceName: string;
  userEmail: string | null;
  dataStatus: 'local' | 'loading' | 'synced' | 'error';
  dataError: string | null;
  currentView: string;
  isProspectsOpen: boolean;
  isCatalogOpen: boolean;
  isSettingsOpen: boolean;
  isOverdueInvoicesOpen: boolean;
  onOpenDashboard: () => void;
  onOpenContacts: () => void;
  onOpenMap: () => void;
  onOpenAppointments: () => void;
  onOpenRoutes: () => void;
  onOpenCatalog: () => void;
  onOpenInvoices: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

function AppHeaderNav({
  workspaceId,
  workspaceName,
  userEmail,
  dataStatus,
  dataError,
  currentView,
  isProspectsOpen,
  isCatalogOpen,
  isSettingsOpen,
  isOverdueInvoicesOpen,
  onOpenDashboard,
  onOpenContacts,
  onOpenMap,
  onOpenAppointments,
  onOpenRoutes,
  onOpenCatalog,
  onOpenInvoices,
  onOpenSettings,
  onSignOut,
}: AppHeaderNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const runAndClose = (action: () => void) => {
    action();
    setIsOpen(false);
  };
  const navItems = [
    { label: 'Home', icon: <Home className="w-4 h-4" />, onClick: onOpenDashboard, active: currentView === 'dashboard' },
    { label: 'Contacts', icon: <Users className="w-4 h-4" />, onClick: onOpenContacts, active: currentView === 'contacts' },
    { label: 'Map', icon: <MapIcon className="w-4 h-4" />, onClick: onOpenMap, active: currentView === 'map' },
    { label: 'Schedule', icon: <Calendar className="w-4 h-4" />, onClick: onOpenAppointments, active: currentView === 'appointments' },
    { label: 'Routes', icon: <Navigation className="w-4 h-4" />, onClick: onOpenRoutes, active: isProspectsOpen },
    { label: 'Catalog', icon: <Package className="w-4 h-4" />, onClick: onOpenCatalog, active: isCatalogOpen },
    { label: 'Invoices', icon: <DollarSign className="w-4 h-4" />, onClick: onOpenInvoices, active: isOverdueInvoicesOpen },
    { label: 'Settings', icon: <SettingsIcon className="w-4 h-4" />, onClick: onOpenSettings, active: isSettingsOpen },
  ];

  return (
    <div className="absolute top-3 right-3 z-[1400]">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="h-11 w-11 rounded-2xl bg-white/95 border border-slate-200 shadow-lg text-slate-700 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
        title="Open navigation"
        aria-label="Open navigation"
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[1390]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-14 right-0 z-[1410] w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/50 overflow-hidden p-2"
            >
              <div className="px-3 py-3 border-b border-slate-100 mb-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{workspaceName}</p>
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {userEmail || (workspaceId ? 'Supabase workspace' : 'Local demo')}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'h-2.5 w-2.5 rounded-full shrink-0',
                      dataStatus === 'error' ? 'bg-red-500' : dataStatus === 'loading' ? 'bg-yellow-400' : workspaceId ? 'bg-green-500' : 'bg-slate-300'
                    )}
                    title={dataError || (workspaceId ? `Data ${dataStatus}` : 'Local demo mode')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1">
                {navItems.map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => runAndClose(item.onClick)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider transition-all",
                      item.active ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>

              {workspaceId && (
                <button
                  type="button"
                  onClick={() => runAndClose(onSignOut)}
                  className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-700 px-3 py-2 text-[11px] font-black uppercase tracking-wider hover:bg-slate-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const createDefaultCatalog = (): { products: Product[], bundles: Bundle[] } => ({
  products: [
    { id: 'p1', name: 'Standard Solar Panel', price: 500, description: 'Single efficiency panel', category: 'Solar' },
    { id: 'p2', name: 'Inverter System', price: 1200, description: 'Power conversion unit', category: 'Electrical' },
    { id: 'p3', name: 'Roof Inspection', price: 150, description: 'Full safety audit', category: 'Service' },
    { id: 'p4', name: 'Mounting Hardware', price: 300, description: 'Steel rack system', category: 'Solar' },
    { id: 'p5', name: 'Backup Battery', price: 4500, description: '10kWh storage capacity', category: 'Energy' }
  ],
  bundles: [
    {
      id: 'b1',
      name: 'Silver Solar Bundle',
      productIds: ['p1', 'p2', 'p4'],
      description: 'Essential setup for small homes',
      discountType: 'percentage',
      discountValue: 10,
      discountLabel: 'Package Savings'
    },
    {
      id: 'b2',
      name: 'Energy Independence Bundle',
      productIds: ['p1', 'p2', 'p4', 'p5'],
      description: 'Full setup with storage',
      discountType: 'percentage',
      discountValue: 20,
      discountLabel: 'Independence Incentive'
    }
  ]
});

const createDefaultSettings = (): AppSettings => ({
  tags: DEFAULT_TAGS,
  contactFields: [
    { id: 'role', label: 'Role', type: 'text', required: false, visible: true },
    { id: 'email', label: 'Email', type: 'email', required: false, visible: true },
    { id: 'phone', label: 'Phone', type: 'tel', required: false, visible: true },
    { id: 'isDecisionMaker', label: 'Decision Maker', type: 'checkbox', required: false, visible: true }
  ],
  discounts: [
    { id: 'd1', name: 'Early Bird', type: 'percentage', value: 10 },
    { id: 'd2', name: 'Referral', type: 'fixed', value: 50 }
  ],
  labels: {
    leads: 'Records',
    quotes: 'Quotes',
    sales: 'Sales',
    catalog: 'Catalog',
    bundles: 'Bundles',
    discounts: 'Discounts',
    team: 'Team',
    goals: 'Goals',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    email: 'Email',
    stages: {
      prospect: 'Prospect',
      lead: 'Lead',
      opportunity: 'Opportunity',
      customer: 'Customer'
    }
  },
  businessInfo: {
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: ''
  },
  operationalTargets: {
    weeklyKnocks: 40,
    monthlyConverted: 15,
    collectionGoal: 3000
  }
});

function getWorkspaceName(membership: WorkspaceMembership | null) {
  const workspace = Array.isArray(membership?.workspaces) ? membership?.workspaces[0] : membership?.workspaces;
  return workspace?.name || 'DoorStep Workspace';
}

// --- Helper Components ---

const MapController = ({ center, zoom }: { center: [number, number] | null, zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      const target = { lat: center[0], lng: center[1] };
      const targetZoom = zoom || 17;
      map.setCenter(target);
      map.setZoom(targetZoom);
    }
  }, [center, zoom, map]);
  return null;
};

const MapEvents = ({ onClick, onDoubleClick }: { 
  onClick?: (e: google.maps.MapMouseEvent) => void,
  onDoubleClick?: (e: google.maps.MapMouseEvent) => void 
}) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      onClick?.(e);
    });
    const dblClickListener = map.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
      onDoubleClick?.(e);
    });
    return () => {
      clickListener.remove();
      dblClickListener.remove();
    };
  }, [map, onClick, onDoubleClick]);
  return null;
};

const LocationMarker = ({ userLocation }: { userLocation: [number, number] | null }) => {
  if (!userLocation) return null;
  return (
    <AdvancedMarker position={{ lat: userLocation[0], lng: userLocation[1] }}>
      <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
    </AdvancedMarker>
  );
};

const OptimizedRoute = ({ propertyIds, properties, isActive }: { 
  propertyIds: string[], 
  properties: PropertyContact[], 
  isActive: boolean 
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!map || !routesLib || !isActive || propertyIds.length < 2) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      return;
    }

    const waypoints = propertyIds.map(id => {
      const p = properties.find(prop => prop.id === id);
      return p ? { location: { lat: p.lat, lng: p.lng }, stopover: true } : null;
    }).filter(Boolean) as google.maps.DirectionsWaypoint[];

    if (waypoints.length < 2) return;

    const origin = waypoints[0].location as google.maps.LatLngLiteral;
    const destination = waypoints[waypoints.length - 1].location as google.maps.LatLngLiteral;
    const midpoints = waypoints.slice(1, -1);

    const directionsService = new routesLib.DirectionsService();
    
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new routesLib.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2563EB',
          strokeOpacity: 0.8,
          strokeWeight: 6
        }
      });
    }

    directionsService.route({
      origin,
      destination,
      waypoints: midpoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.WALKING
    }, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result && directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(result);
      } else {
        console.error('Directions Request Failed:', status);
      }
    });

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
    };
  }, [map, routesLib, isActive, propertyIds, properties]);

  return null;
};

const LeafletMapController = ({ center, zoom }: { center: [number, number] | null, zoom?: number }) => {
  const map = useLeafletMap();
  useEffect(() => {
    if (center && map) {
      const currentCenter = map.getCenter();
      const dist = Math.sqrt(Math.pow(currentCenter.lat - center[0], 2) + Math.pow(currentCenter.lng - center[1], 2));
      if (dist > 0.0001) {
        const targetZoom = zoom || 17;
        map.flyTo(center, targetZoom, { animate: true, duration: 1.5 });
      }
    }
  }, [center, zoom, map]);
  return null;
};

const LeafletMapEvents = ({ 
  onClick, 
  onMoveEnd 
}: { 
  onClick?: (e: L.LeafletMouseEvent) => void,
  onMoveEnd?: (center: [number, number], zoom: number) => void
}) => {
  const map = useLeafletMapEvents({
    click(e) {
      onClick?.(e);
    },
    moveend() {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onMoveEnd?.([center.lat, center.lng], zoom);
    }
  });
  return null;
};

function createLeafletMarkerIcon(stage: PropertyStage, isSelected?: boolean, sequenceNumber?: number) {
  const color = isSelected ? '#2563EB' : (STAGE_COLORS[stage] || STAGE_COLORS.prospect);
  const size = isSelected ? 48 : 40;
  const innerSize = isSelected ? 40 : 32;
  const circleSize = isSelected ? 12 : 10;
  
  return L.divIcon({
    className: 'custom-property-marker-leaflet',
    html: `
      <div class="relative flex items-center justify-center p-0 m-0" style="width: ${size}px; height: ${size}px;">
        ${isSelected ? '<div class="absolute w-12 h-12 rounded-full bg-blue-100/50 animate-pulse"></div>' : ''}
        <div class="flex items-center justify-center shadow-lg transition-transform duration-300" 
             style="background-color: ${color}; color: #ffffff; border: 2px solid #ffffff; width: ${innerSize}px; height: ${innerSize}px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg);">
          <div style="transform: rotate(45deg);" class="flex items-center justify-center font-bold text-[11px]">
            ${sequenceNumber ? sequenceNumber : `<div class="rounded-full bg-white" style="width: ${circleSize}px; height: ${circleSize}px;"></div>`}
          </div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  });
}

const StatusBadge = ({ status, className }: { status: PropertyStatus, className?: string }) => (
  <span 
    className={cn(
      "px-2 py-0.5 rounded-full text-xs font-semibold text-white",
      className
    )}
    style={{ backgroundColor: STATUS_COLORS[status] }}
  >
    {status}
  </span>
);

function PromptModal({ 
  config, 
  onClose,
  mapCenter
}: { 
  config: { 
    title: string, 
    message?: string, 
    defaultValue?: string, 
    placeholder?: string, 
    type?: 'text' | 'select' | 'form', 
    fields?: { key: string, label: string, placeholder?: string, type?: string }[],
    options?: { label: string, value: string }[],
    onConfirm: (val: string) => void 
  }, 
  onClose: () => void,
  mapCenter?: [number, number]
}) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    if (config.type === 'form' && config.fields) {
      const initial: Record<string, string> = {};
      config.fields.forEach(f => { initial[f.key] = ''; });
      if (config.defaultValue && initial.hasOwnProperty('address')) {
        initial['address'] = config.defaultValue;
      }
      return initial;
    }
    return { value: config.defaultValue || '' };
  });
  
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(!!config.defaultValue && config.type === 'form');

  useEffect(() => {
    const addressField = config.fields?.find(f => f.key === 'address');
    if (!addressField || isAddressConfirmed) return;

    const query = formData.address;
    if (!query || query.trim().length <= 2) {
      setAddressSuggestions([]);
      setIsSearchingAddress(false);
      return;
    }

    const abortController = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&limit=15&addressdetails=1&accept-language=en-US`;
        
        // Add a timeout to the fetch via AbortController
        const timeoutId = setTimeout(() => abortController.abort(), 8000);

        const res = await fetch(url, {
          headers: { 'User-Agent': 'SalesOptimizer_D2D_US_Search_v2.1' },
          signal: abortController.signal
        });
        
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        
        const seen = new Set<string>();
        const suggestions = (Array.isArray(data) ? data : [])
          .map((s: any) => {
            const addr = s.address || {};
            const house = addr.house_number || '';
            const road = addr.road || '';
            const city = addr.city || addr.town || addr.village || '';
            const state = addr.state || '';
            
            let main = '';
            if (house && road) {
              main = `${house} ${road}`;
            } else if (road) {
              main = road;
            } else {
              main = s.display_name?.split(',')[0] || '';
            }

            const subParts = [city, state, addr.postcode, 'USA'].filter(Boolean);
            const sub = subParts.join(', ');

            let score = 0;
            if (house && road) score += 100;
            if (state.toLowerCase().includes('arizona')) score += 50;
            if (mapCenter) {
              const lat = parseFloat(s.lat);
              const lon = parseFloat(s.lon);
              const latDiff = Math.abs(lat - mapCenter[0]);
              const lonDiff = Math.abs(lon - mapCenter[1]);
              if (latDiff < 0.1 && lonDiff < 0.1) score += 30;
            }

            const lat = parseFloat(s.lat);
            const lon = parseFloat(s.lon);

            return {
              display_name: s.display_name,
              mainText: main,
              subText: sub,
              lat,
              lon,
              score,
              hashKey: normalizeAddress(`${main} ${sub}`),
              coordKey: `${lat.toFixed(4)},${lon.toFixed(4)}`
            };
          })
          .filter(s => {
            if (!s.display_name.toLowerCase().includes('usa') && !s.display_name.toLowerCase().includes('united states')) return false;
            if (seen.has(s.hashKey) || seen.has(s.coordKey)) return false;
            seen.add(s.hashKey);
            seen.add(s.coordKey);
            return true;
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);
        
        setAddressSuggestions(suggestions);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Address search failed', e);
          setAddressSuggestions([]);
        }
      } finally {
        setIsSearchingAddress(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [formData.address, isAddressConfirmed, mapCenter]);

  const value = formData.value || '';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-8"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[40px] p-10 max-w-5xl w-full shadow-2xl border border-white/20 overflow-y-auto max-h-[90vh]"
      >
        <h3 className={`text-2xl font-black text-[#1E293B] leading-tight uppercase tracking-tight ${config.message ? 'mb-3' : 'mb-12'}`}>{config.title}</h3>
        {config.message && <p className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest leading-relaxed">{config.message}</p>}
        
        <div className={cn(
          "mb-12 relative",
          config.type === 'form' && config.fields && config.fields.length > 2 
            ? "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" 
            : "space-y-4"
        )}>
          {config.type === 'form' && config.fields ? (
            config.fields.map(field => (
              <div 
                key={field.key} 
                className={cn(
                  "relative",
                  (field.key === 'address' || field.key === 'notes' || field.key === 'comment') && "md:col-span-2"
                )}
              >
                {field.key === 'address' ? (
                  <div className="relative group">
                    {isAddressConfirmed ? (
                      <div className="w-full h-[56px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl px-5 py-3.5 flex justify-between items-center transition-all hover:bg-slate-100">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="text-sm font-black text-slate-700 truncate tracking-tight">{formData[field.key]}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            setIsAddressConfirmed(false);
                            setAddressSuggestions([]);
                          }}
                          className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-3 py-1.5 bg-blue-50/50 hover:bg-blue-100 rounded-lg transition-all shrink-0 ml-2"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          className="w-full h-[56px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-12 pr-10 text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                          placeholder="Search for address..."
                          autoFocus
                          value={formData[field.key] || ''}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, [field.key]: e.target.value }));
                          }}
                        />
                        {isSearchingAddress && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {addressSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-[10001] bg-white mt-2 rounded-2xl shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-black/5 max-h-[220px] overflow-y-auto">
                            {addressSuggestions.map((s, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    [field.key]: s.display_name,
                                    lat: parseFloat(s.lat),
                                    lng: parseFloat(s.lon)
                                  }));
                                  setIsAddressConfirmed(true);
                                  setAddressSuggestions([]);
                                }}
                                className="w-full px-5 py-4 text-left hover:bg-blue-50 border-b border-slate-50 last:border-0 flex items-center gap-4 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-black text-slate-700 truncate tracking-tight">{s.mainText}</div>
                                  <div className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest shrink-0">{s.subText}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : field.type === 'textarea' ? (
                  <textarea
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder={field.placeholder || field.label}
                    rows={2}
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    className="w-full h-[56px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none"
                    type={field.type || 'text'}
                    placeholder={field.placeholder || field.label}
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))
          ) : config.type === 'select' ? (
            <select 
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              value={value}
              onChange={(e) => setFormData({ value: e.target.value })}
            >
              {config.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input 
              autoFocus
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={config.placeholder}
              value={value}
              onChange={(e) => setFormData({ value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  config.onConfirm(value);
                  onClose();
                }
              }}
            />
          )}
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-50 text-gray-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              if (config.type === 'form') {
                config.onConfirm(JSON.stringify(formData));
              } else {
                config.onConfirm(value);
              }
              onClose();
            }}
            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Main App ---

export default function App() {
  if (!hasSupabaseConfig) {
    return <SupabaseConfigRequiredScreen />;
  }

  return <SupabaseShell />;
}

function SupabaseConfigRequiredScreen() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5">
          <Lock className="w-6 h-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Supabase Required</p>
        <h1 className="text-2xl font-black tracking-tight mb-3">DoorStep CRM needs runtime config</h1>
        <p className="text-sm font-semibold text-slate-500 leading-relaxed">
          Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before launching the app. Browser local storage is no longer used as a CRM data source.
        </p>
      </div>
    </div>
  );
}

function SupabaseShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('DoorStep Workspace');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      setSession(nextSession);
      setWorkspaceId(null);
      setError(null);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    let isMounted = true;

    const loadWorkspace = async () => {
      setIsLoading(true);
      setError(null);

      const membershipQuery = () => doorstepDb
        .from('workspace_members')
        .select('workspace_id, workspaces(name)')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      let { data: membership, error: membershipError } = await membershipQuery();

      if (membershipError) {
        if (!isMounted) return;
        setError(membershipError.message);
        setIsLoading(false);
        return;
      }

      if (!membership) {
        const { error: createError } = await doorstepDb.rpc('create_workspace', {
          workspace_name: 'DoorStep Workspace',
          workspace_slug: `doorstep-${session.user.id.slice(0, 8)}`,
        });

        if (createError) {
          if (!isMounted) return;
          setError(createError.message);
          setIsLoading(false);
          return;
        }

        const retry = await membershipQuery();
        membership = retry.data;
        membershipError = retry.error;
      }

      if (!isMounted) return;

      if (membershipError) {
        setError(membershipError.message);
      } else if (membership) {
        setWorkspaceId(membership.workspace_id);
        setWorkspaceName(getWorkspaceName(membership as WorkspaceMembership));
      } else {
        setError('Workspace creation finished, but no active membership was found.');
      }

      setIsLoading(false);
    };

    loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [session]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Loading DoorStep</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (isPasswordRecovery) {
    return <UpdatePasswordScreen onComplete={() => setIsPasswordRecovery(false)} />;
  }

  if (error || !workspaceId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-2">Supabase Setup Needed</p>
          <h1 className="text-2xl font-black mb-3">Workspace could not load</h1>
          <p className="text-sm text-slate-600 mb-6">{error || 'No workspace was found for this user.'}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest"
            >
              Retry
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CrmApp
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      userId={session.user.id}
      userEmail={session.user.email || null}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'reset'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === 'reset') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: appUrl,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage('Password reset email sent. Open the link in that email to set a new password.');
      }

      setIsSubmitting(false);
      return;
    }

    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      : await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              username: normalizedEmail,
              full_name: fullName.trim(),
            },
          },
        });

    if (result.error) {
      setError(result.error.message);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-white text-slate-900 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <MapIcon size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">DoorStep CRM</p>
            <h1 className="text-2xl font-black">
              {mode === 'sign-in' ? 'Sign In' : mode === 'sign-up' ? 'Create Account' : 'Reset Password'}
            </h1>
          </div>
        </div>

        <div className="space-y-3">
          {mode === 'sign-up' && (
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {mode !== 'reset' && (
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              minLength={6}
              className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm font-bold text-red-600 bg-red-50 rounded-xl p-3">{error}</p>
        )}

        {message && (
          <p className="mt-4 text-sm font-bold text-green-700 bg-green-50 rounded-xl p-3">{message}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-60"
        >
          {isSubmitting ? 'Working...' : mode === 'sign-in' ? 'Sign In' : mode === 'sign-up' ? 'Create Account' : 'Send Reset Email'}
        </button>

        <div className="mt-4 flex flex-col gap-3 text-sm font-bold text-slate-500">
          {mode === 'sign-in' && (
            <button
              type="button"
              onClick={() => {
                setMode('reset');
                setError(null);
                setMessage(null);
              }}
            >
              Forgot password?
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up');
              setError(null);
              setMessage(null);
            }}
          >
            {mode === 'sign-up' ? 'Already have an account? Sign in' : 'Need an account? Create one'}
          </button>
          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => {
                setMode('sign-in');
                setError(null);
                setMessage(null);
              }}
            >
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function UpdatePasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-white text-slate-900 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <Lock size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">DoorStep CRM</p>
            <h1 className="text-2xl font-black">Set New Password</h1>
          </div>
        </div>

        <div className="space-y-3">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            type="password"
            minLength={6}
            className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            type="password"
            minLength={6}
            className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {error && (
          <p className="mt-4 text-sm font-bold text-red-600 bg-red-50 rounded-xl p-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save Password'}
        </button>
      </form>
    </div>
  );
}

function CrmApp({ workspaceId, workspaceName, userId, userEmail, onSignOut }: WorkspaceContext) {
  // State
  const [properties, setProperties] = useState<PropertyContact[]>([]);
  const [catalog, setCatalog] = useState<{ products: Product[], bundles: Bundle[] }>(createDefaultCatalog);
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings);
  const [team, setTeam] = useState<Member[]>([
    { id: 'm1', name: 'Mike (Owner)', role: 'Admin', color: '#2563EB' }
  ]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isProspectsOpen, setIsProspectsOpen] = useState(false);
  const [isLeadsOpen, setIsLeadsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'map'>('dashboard');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isOverdueInvoicesOpen, setIsOverdueInvoicesOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'business' | 'general' | 'targets' | 'contact' | 'catalog' | 'labels' | 'team'>('business');
  const [routes, setRoutes] = useState<ProspectRoute[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [workingRouteId, setWorkingRouteId] = useState<string | null>(null);
  const [selectingStartForRouteId, setSelectingStartForRouteId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(13);

  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBuildingRoute, setIsBuildingRoute] = useState(false);
  const [newRoute, setNewRoute] = useState<{id?: string, name: string, selectedIds: string[]}>({ name: '', selectedIds: [] });
  
  // Advanced Quoting State
  const [activeTab, setActiveTab] = useState<'details' | 'quotes' | 'sales'>('details');
  const [isAddingQuote, setIsAddingQuote] = useState(false);
  const [isAddingSale, setIsAddingSale] = useState(false);
  
  // Advanced Quoting State
  const [quoteItems, setQuoteItems] = useState<QuoteLineItem[]>([]);
  const [quoteDiscounts, setQuoteDiscounts] = useState<Discount[]>([]);
  const [quoteNotes, setQuoteNotes] = useState('');

  const [newSale, setNewSale] = useState({ amount: '', product: '' });

  // Contact Form State
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    firstName: '',
    lastName: '',
    role: '',
    phone: '',
    isDecisionMaker: false
  });

  // Track if we've done the initial startup "fly-to"
  const [hasInitializedLocation, setHasInitializedLocation] = useState(false);

  const [promptConfig, setPromptConfig] = useState<{
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    type?: 'text' | 'select' | 'form';
    fields?: { key: string, label: string, placeholder?: string, type?: string }[];
    options?: { label: string, value: string }[];
    onConfirm: (val: string) => void;
  } | null>(null);
  const [dataStatus, setDataStatus] = useState<'local' | 'loading' | 'synced' | 'error'>(workspaceId ? 'loading' : 'local');
  const [dataError, setDataError] = useState<string | null>(null);
  const hasLoadedRemoteAddresses = useRef(!workspaceId);
  const hasLoadedRemoteAppState = useRef(!workspaceId);

  useEffect(() => {
    if (!workspaceId) return;

    let isMounted = true;

    const loadAddresses = async () => {
      setDataStatus('loading');
      setDataError(null);
      hasLoadedRemoteAddresses.current = false;

      const { data, error } = await doorstepDb
        .from('addresses')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (!isMounted) return;

      if (error) {
        setDataStatus('error');
        setDataError(error.message);
        hasLoadedRemoteAddresses.current = true;
        return;
      }

      const loadedProperties = (data || []).map(addressRowToProperty);
      const addressIds = loadedProperties.map(property => property.id);

      if (addressIds.length > 0) {
        const { data: activities, error: activitiesError } = await doorstepDb
          .from('activities')
          .select('*')
          .in('address_id', addressIds)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (activitiesError) {
          setDataStatus('error');
          setDataError(activitiesError.message);
          hasLoadedRemoteAddresses.current = true;
          return;
        }

        const activitiesByAddress = new Map<string, Interaction[]>();
        (activities || []).forEach((activity: any) => {
          if (!activity.address_id) return;
          const list = activitiesByAddress.get(activity.address_id) || [];
          list.push(activityRowToInteraction(activity));
          activitiesByAddress.set(activity.address_id, list);
        });

        setProperties(loadedProperties.map(property => {
          const remoteInteractions = activitiesByAddress.get(property.id) || [];
          const legacyInteractions = property.interactions || [];
          const uniqueInteractions = new Map<string, Interaction>();
          [...remoteInteractions, ...legacyInteractions].forEach(interaction => uniqueInteractions.set(interaction.id, interaction));

          return {
            ...property,
            interactions: Array.from(uniqueInteractions.values()).sort((a, b) => b.createdAt - a.createdAt)
          };
        }));
      } else {
        setProperties(loadedProperties);
      }

      hasLoadedRemoteAddresses.current = true;
      setDataStatus('synced');
    };

    loadAddresses();

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !hasLoadedRemoteAddresses.current) return;

    const syncAddresses = async () => {
      setDataError(null);

      if (properties.length === 0) {
        setDataStatus('synced');
        return;
      }

      const rows = properties.map(property => propertyToAddressRow(property, workspaceId, userId));
      const { error } = await doorstepDb
        .from('addresses')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        setDataStatus('error');
        setDataError(error.message);
      } else {
        setDataStatus('synced');
      }
    };

    const timeout = window.setTimeout(syncAddresses, 700);
    return () => window.clearTimeout(timeout);
  }, [properties, userId, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;

    let isMounted = true;
    hasLoadedRemoteAppState.current = false;

    const loadWorkspaceAppState = async () => {
      const { data, error } = await doorstepDb
        .from('workspace_app_state')
        .select('key,value')
        .in('key', ['catalog', 'settings', 'team', 'goals', 'routes']);

      if (!isMounted) return;

      if (error) {
        setDataStatus('error');
        setDataError(error.message);
        hasLoadedRemoteAppState.current = true;
        return;
      }

      const stateByKey = new Map<WorkspaceAppStateKey, any>(
        (data || []).map((row: any) => [row.key as WorkspaceAppStateKey, row.value])
      );

      if (stateByKey.has('catalog')) setCatalog(stateByKey.get('catalog'));
      if (stateByKey.has('settings')) setSettings(stateByKey.get('settings'));
      if (stateByKey.has('team')) setTeam(stateByKey.get('team'));
      if (stateByKey.has('goals')) setGoals(stateByKey.get('goals'));
      if (stateByKey.has('routes')) setRoutes(stateByKey.get('routes'));

      hasLoadedRemoteAppState.current = true;
    };

    loadWorkspaceAppState();

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !hasLoadedRemoteAppState.current) return;

    const syncWorkspaceAppState = async () => {
      const rows = [
        { workspace_id: workspaceId, key: 'catalog', value: catalog, updated_by: userId },
        { workspace_id: workspaceId, key: 'settings', value: settings, updated_by: userId },
        { workspace_id: workspaceId, key: 'team', value: team, updated_by: userId },
        { workspace_id: workspaceId, key: 'goals', value: goals, updated_by: userId },
        { workspace_id: workspaceId, key: 'routes', value: routes, updated_by: userId },
      ];

      const { error } = await doorstepDb
        .from('workspace_app_state')
        .upsert(rows, { onConflict: 'workspace_id,key' });

      if (error) {
        setDataStatus('error');
        setDataError(error.message);
      }
    };

    const timeout = window.setTimeout(syncWorkspaceAppState, 700);
    return () => window.clearTimeout(timeout);
  }, [catalog, goals, routes, settings, team, userId, workspaceId]);

  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const q = searchQuery.trim();
      if (q.length > 2) {
        setIsSearching(true);
        if (hasValidKey && placesLib) {
          try {
            const service = new placesLib.AutocompleteService();
            const { predictions } = await service.getPlacePredictions({
              input: q,
              componentRestrictions: { country: 'us' },
              locationBias: mapCenter ? { center: { lat: mapCenter[0], lng: mapCenter[1] }, radius: 5000 } : undefined
            });

            const suggestions = await Promise.all((predictions || []).map(async (p) => {
              return {
                display_name: p.description,
                mainText: p.structured_formatting.main_text,
                subText: p.structured_formatting.secondary_text,
                placeId: p.place_id,
              };
            }));
            
            setSearchSuggestions(suggestions.slice(0, 6));
          } catch (err: any) {
            console.error('Search failed', err);
            setSearchSuggestions([]);
          } finally {
            setIsSearching(false);
          }
        } else {
          // OpenStreetMap Nominatim Search Fallback
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=us&limit=10&addressdetails=1&accept-language=en-US`, {
              headers: { 'User-Agent': 'SalesOptimizer_App_Search_v2.1' }
            });
            if (res.ok) {
              const data = await res.json();
              const suggestions = (Array.isArray(data) ? data : []).map((s: any) => {
                const addr = s.address || {};
                const house = addr.house_number || '';
                const road = addr.road || '';
                const city = addr.city || addr.town || addr.village || '';
                const state = addr.state || '';
                
                let main = '';
                if (house && road) {
                  main = `${house} ${road}`;
                } else if (road) {
                  main = road;
                } else {
                  main = s.display_name?.split(',')[0] || '';
                }

                const subParts = [city, state, addr.postcode, 'USA'].filter(Boolean);
                const sub = subParts.join(', ');

                return {
                  display_name: s.display_name,
                  mainText: main,
                  subText: sub,
                  lat: parseFloat(s.lat),
                  lon: parseFloat(s.lon),
                  isNominatim: true
                };
              });
              setSearchSuggestions(suggestions.slice(0, 6));
            } else {
              setSearchSuggestions([]);
            }
          } catch (err: any) {
            console.error('Nominatim search failed', err);
            setSearchSuggestions([]);
          } finally {
            setIsSearching(false);
          }
        }
      } else {
        setSearchSuggestions([]);
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, mapCenter, placesLib]);

  // Initial Location Logic - One-time setup
  useEffect(() => {
    if (hasInitializedLocation) return;

    const initializeMap = async () => {
      // 1. If we have Supabase-loaded properties, center on the first record.
      if (properties.length > 0) {
        const p = properties[0];
        setMapCenter([p.lat, p.lng]);
        setMapZoom(17);
        setHasInitializedLocation(true);
        return;
      }

      // 2. Try business city position from settings.
      const city = settings.businessInfo.city;
      if (city) {
        try {
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=1`);
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            const f = data.features[0];
            const pos: [number, number] = [f.geometry.coordinates[1], f.geometry.coordinates[0]];
            setMapCenter(pos);
            setMapZoom(12); // Contextual city zoom
            setHasInitializedLocation(true);
            return;
          }
        } catch (e) {
          console.error("Failed to fetch business city pos", e);
        }
      }

      // 3. Fallback to geolocation only if map is totally fresh.
      if (navigator.geolocation && !mapCenter) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserLocation(loc);
            setMapCenter(loc);
            setMapZoom(17);
            setHasInitializedLocation(true);
          },
          () => {
            // Default fallback if everything fails
            const defaultLoc: [number, number] = [39.8283, -98.5795]; // Center of USA
            setMapCenter(defaultLoc);
            setMapZoom(4);
            setHasInitializedLocation(true);
          }
        );
      } else {
        setHasInitializedLocation(true);
      }
    };

    initializeMap();
  }, [hasInitializedLocation, settings.businessInfo.city, properties.length]);

  const handleDeleteProperty = useCallback((id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    if (workspaceId) {
      doorstepDb
        .from('addresses')
        .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            setDataStatus('error');
            setDataError(error.message);
          }
        });
    }
    setRoutes(prev => prev.map(r => ({
      ...r,
      propertyIds: r.propertyIds.filter(pid => pid !== id)
    })));
    if (selectedPropertyId === id) {
      setSelectedPropertyId(null);
      setIsDrawerOpen(false);
    }
  }, [selectedPropertyId, userId, workspaceId]);

  const handleSuggestionSelect = async (suggestion: any) => {
    let lat: number;
    let lng: number;

    if (suggestion.isNominatim) {
      lat = suggestion.lat;
      lng = suggestion.lon;
    } else {
      if (!placesLib || !suggestion.placeId) return;
      try {
        const geocoder = new google.maps.Geocoder();
        const { results } = await geocoder.geocode({ placeId: suggestion.placeId });
        if (!results?.[0]) return;
        const loc = results[0].geometry.location;
        lat = loc.lat();
        lng = loc.lng();
      } catch (err) {
        console.error('Geocoding failed', err);
        return;
      }
    }

    const existing = properties.find(p => 
      Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001
    );

    if (existing) {
      setSelectedPropertyId(existing.id);
      setMapCenter([lat, lng]);
      setIsDrawerOpen(true);
    } else {
      setPromptConfig({
        title: 'Add New Lead',
        type: 'form',
        defaultValue: suggestion.display_name,
        fields: [
          { key: 'address', label: 'Home Address' },
          { key: 'firstName', label: 'First Name' },
          { key: 'lastName', label: 'Last Name' },
          { key: 'phone', label: 'Phone', type: 'tel' },
          { key: 'email', label: 'Email', type: 'email' },
        ],
        onConfirm: (dataStr) => {
          const data = JSON.parse(dataStr);
          const newProperty: PropertyContact = {
            id: uuidv4(),
            address: data.address || suggestion.display_name,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            email: data.email || '',
            role: '',
            isDecisionMaker: false,
            lat,
            lng,
            status: 'Not Visited',
            type: 'Residential',
            notes: '',
            tags: [],
            contacts: [],
            quotes: [],
            sales: [],
            interactions: [],
            appointments: [],
            stage: 'prospect',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          setProperties(prev => [newProperty, ...prev]);
          setSelectedPropertyId(newProperty.id);
          setMapCenter([lat, lng]);
          setIsDrawerOpen(true);
        }
      });
      setMapCenter([lat, lng]);
    }
    
    setSearchQuery('');
    setSearchSuggestions([]);
    setIsDrawerOpen(true);
  };

  // Address persistence is handled by the Supabase sync effect above.

  const selectedProperty = useMemo(() => 
    properties.find(p => p.id === selectedPropertyId), 
  [properties, selectedPropertyId]);

  // Helpers
  const addProductToQuote = (product: Product) => {
    const newItem: QuoteLineItem = {
      id: uuidv4(),
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      description: product.description,
      category: product.category,
      isSelected: true
    };
    setQuoteItems(prev => [...prev, newItem]);
  };

  const addBundleToQuote = (bundle: Bundle) => {
    const bundleItems = bundle.productIds.map(pid => {
      const p = catalog.products.find(prod => prod.id === pid);
      if (!p) return null;
      return {
        id: uuidv4(),
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: 1,
        description: p.description,
        category: p.category,
        isSelected: true
      };
    }).filter(Boolean) as QuoteLineItem[];
    setQuoteItems(prev => [...prev, ...bundleItems]);

    if (bundle.discountType && bundle.discountValue) {
      setQuoteDiscounts(prev => [...prev, {
        id: uuidv4(),
        name: bundle.discountLabel || `${bundle.name} Savings`,
        type: bundle.discountType!,
        value: bundle.discountValue!
      }]);
    }
  };

  const quoteTotals = useMemo(() => {
    const subtotal = quoteItems.reduce((acc, item) => acc + (item.isSelected ? item.price * item.quantity : 0), 0);
    let total = subtotal;
    const allDiscounts = [...quoteDiscounts, ...settings.discounts.filter(d => quoteDiscounts.find(qd => qd.id === d.id))];
    // Deduplicate and apply
    const uniqueDiscounts = Array.from(new Map(quoteDiscounts.map(d => [d.id, d])).values());

    uniqueDiscounts.forEach((d: Discount) => {
      if (d.type === 'percentage') total -= (subtotal * d.value / 100);
      else total -= d.value;
    });
    return { subtotal, total: Math.max(0, total) };
  }, [quoteItems, quoteDiscounts, settings.discounts]);

  const stopMapControlEvent = (event: React.SyntheticEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const stopMapPointerEvent = (event: React.SyntheticEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const enterRouteBuilderFromMap = () => {
    setIsBuildingRoute(true);
    setIsSelectionMode(true);
    setIsRouteActive(true);
    setIsLegendExpanded(false);
    setMapMode('satellite');
  };

  const exitRouteBuilderFromMap = () => {
    setIsBuildingRoute(false);
    setIsSelectionMode(false);
    setSelectingStartForRouteId(null);
    setIsRouteActive(false);
  };

  const toggleRouteBuilderFromMap = () => {
    if (isBuildingRoute || isSelectionMode) {
      exitRouteBuilderFromMap();
      return;
    }

    enterRouteBuilderFromMap();
  };

  // Handlers
  const handleMapClick = async (lat: number, lng: number) => {
    const { existing, minDistanceMeters } = findClosestAddressRecord(properties, lat, lng);
    const hitRadius = isSelectionMode ? ROUTE_SELECTION_HIT_RADIUS_METERS : ADDRESS_CLICK_HIT_RADIUS_METERS;
    
    if (existing && minDistanceMeters <= hitRadius) {
      if (isSelectionMode) {
        setNewRoute(prev => ({
          ...prev,
          selectedIds: prev.selectedIds.includes(existing.id) 
            ? prev.selectedIds.filter(id => id !== existing.id)
            : [...prev.selectedIds, existing.id]
        }));
        return;
      }
      
      // Logic for ascension: if we click non-selection mode (knocking) and it's a prospect, upgrade to lead
      if (!isSelectionMode && existing.stage === 'prospect') {
        updateProperty(existing.id, { stage: 'lead' });
      }
      
      if (!isSelectionMode) {
        setSelectedPropertyId(existing.id);
        setIsDrawerOpen(true);
      }
      return;
    }

    if (isSelectionMode) {
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SalesOptimizer/1.0' }
      });
      if (!res.ok) throw new Error('Reverse geocode failed');
      const data = await res.json();
      
      if (!data.address) throw new Error('No address found at this location');
      
      const addr = data.address;
      
      const houseNumber = addr.house_number || '';
      const street = addr.road || '';
      const city = addr.city || addr.town || addr.village || '';
      const state = addr.state || '';
      const postcode = addr.postcode || '';

      if (houseNumber && street) {
        const fullAddrPrefix = `${houseNumber} ${street}`;
        const existingByAddr = properties.find(p => p.address.toLowerCase().startsWith(fullAddrPrefix.toLowerCase()));
        if (existingByAddr) {
          const existingAddressDistance = distanceMeters([existingByAddr.lat, existingByAddr.lng], [lat, lng]);
          if (existingAddressDistance <= ADDRESS_CLICK_HIT_RADIUS_METERS) {
            setSelectedPropertyId(existingByAddr.id);
            setIsDrawerOpen(true);
            return;
          }
        }
      }

      const addressParts = [
        houseNumber && street ? `${houseNumber} ${street}` : (addr.pedestrian || addr.construction || ''),
        city,
        state,
        postcode
      ].filter(Boolean);

      let address = addressParts.join(', ');
      if (!address) {
        address = data.display_name || `Point at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }

      const addLeadAction = () => {
        const newProperty: PropertyContact = {
          id: uuidv4(),
          address: address.trim().replace(/, ,/g, ','),
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          role: '',
          isDecisionMaker: false,
          lat,
          lng,
          status: 'Not Visited',
          type: 'Residential',
          notes: '',
          tags: [],
          contacts: [],
          quotes: [],
          sales: [],
          interactions: [],
          appointments: [],
          stage: isSelectionMode ? 'prospect' : 'lead',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        setProperties(prev => [newProperty, ...prev]);
        
        if (isSelectionMode) {
          setNewRoute(prev => ({
            ...prev,
            selectedIds: [...prev.selectedIds, newProperty.id]
          }));
        } else {
          setSelectedPropertyId(newProperty.id);
          setIsDrawerOpen(true);
        }
      };

      if (!isSelectionMode) {
        setPromptConfig({
          title: 'Add New Lead',
          type: 'form',
          defaultValue: address.trim().replace(/, ,/g, ','),
          fields: [
            { key: 'address', label: 'Home Address' },
            { key: 'firstName', label: 'First Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'phone', label: 'Phone', type: 'tel' },
            { key: 'email', label: 'Email', type: 'email' },
          ],
          onConfirm: (dataStr) => {
            const data = JSON.parse(dataStr);
            const newProperty: PropertyContact = {
              id: uuidv4(),
              address: data.address || address.trim().replace(/, ,/g, ','),
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              phone: data.phone || '',
              email: data.email || '',
              role: '',
              isDecisionMaker: false,
              lat,
              lng,
              status: 'Not Visited',
              type: 'Residential',
              notes: '',
              tags: [],
              contacts: [],
              quotes: [],
              sales: [],
              interactions: [],
              appointments: [],
              stage: 'lead',
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            setProperties(prev => [newProperty, ...prev]);
            setSelectedPropertyId(newProperty.id);
            setIsDrawerOpen(true);
          }
        });
      } else {
        addLeadAction();
      }
    } catch (err) {
      console.error("Reverse geocoding failed", err);
    }
  };

  const updateProperty = (id: string, updates: Partial<PropertyContact>) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p));
  };

  const logAddressEvent = async (propertyId: string, payload: LiveEventPayload) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property || !workspaceId || !userId) {
      throw new Error('Workspace session is not ready. Please refresh and try again.');
    }

    const title = buildEventTitle(payload);
    const note = payload.note?.trim() || '';
    const body = note || `${title} logged`;
    let sourceNoteId: string | null = null;

    if (note) {
      const { data: noteRow, error: noteError } = await doorstepDb
        .from('notes')
        .insert({
          workspace_id: workspaceId,
          address_id: propertyId,
          body: note,
          note_type: payload.eventType === 'record_event' ? 'record_event' : 'event_note',
          metadata: {
            event_type: payload.eventType,
            outcome: payload.answerOutcome || payload.knockResult || payload.callDirection || null,
          },
          created_by: userId,
          updated_by: userId,
        })
        .select('id')
        .single();

      if (noteError) {
        throw new Error(noteError.message);
      }

      sourceNoteId = noteRow?.id || null;
    }

    const metadata = {
      event_type: payload.eventType,
      knock_result: payload.knockResult || null,
      outcome: payload.answerOutcome || null,
      call_direction: payload.callDirection || null,
      referral_type: payload.referralType || null,
      referral_rep_name: payload.referralRepName || null,
      note_id: sourceNoteId,
      actor_email: userEmail || null,
    };

    const { data, error } = await doorstepDb
      .from('activities')
      .insert({
        workspace_id: workspaceId,
        address_id: propertyId,
        actor_user_id: userId,
        type: getActivityDbType(payload),
        title,
        body,
        metadata,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (sourceNoteId) {
      const { error: noteLinkError } = await doorstepDb
        .from('notes')
        .update({
          source_activity_id: data.id,
          updated_by: userId,
        })
        .eq('id', sourceNoteId);

      if (noteLinkError) {
        throw new Error(noteLinkError.message);
      }
    }

    const interaction = activityRowToInteraction(data);
    const nextStage = getStageForEvent(payload, property.stage);
    const nextStatus = getStatusForEvent(payload, property.status);

    updateProperty(propertyId, {
      stage: nextStage,
      status: nextStatus,
      interactions: [interaction, ...(property.interactions || [])],
    });

    return interaction;
  };

  const stats = useMemo(() => {
    const todayStart = new Date().setHours(0,0,0,0);
    return {
      knockedToday: properties.filter(p => p.updatedAt >= todayStart && p.status === 'Knocked').length,
      pendingFollowUps: properties.filter(p => p.status === 'Follow-Up Needed').length,
      interested: properties.filter(p => p.status === 'Interested').length,
      b2bSites: properties.filter(p => p.type === 'Commercial').length
    };
  }, [properties]);

  // --- Sub-components for better readability ---

  const [clickPulse, setClickPulse] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (clickPulse) {
      const t = setTimeout(() => setClickPulse(null), 1000);
      return () => clearTimeout(t);
    }
  }, [clickPulse]);

  const dedupedProperties = useMemo(() => {
    const unique = new Map<string, PropertyContact>();
    properties.forEach(p => {
      const key = normalizeAddress(p.address);
      const existing = unique.get(key);
      if (!existing || STAGE_ORDER.indexOf(p.stage) > STAGE_ORDER.indexOf(existing.stage)) {
        unique.set(key, p);
      }
    });
    return Array.from(unique.values());
  }, [properties]);

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Google Calendar Integration State
  const [googleTokens, setGoogleTokens] = useState<Record<string, string>>({});

  const connectGoogle = async (memberId: string) => {
    // This is a placeholder for real OAuth flow since set_up_oauth tool is not available 
    // and we are in a client-side SPA. OAuth tokens must be stored server-side.
    setGoogleTokens(prev => ({ ...prev, [memberId]: 'connected_this_session' }));
    alert(`Google Account marked connected for this session only.`);
  };

  const scheduleAppointment = async (propertyId: string, memberId: string, details: any) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    const newAppointment: Appointment = {
      id: uuidv4(),
      title: `${details.title} - ${property.address.split(',')[0]}`,
      startTime: details.startTime,
      endTime: details.endTime,
      memberId: memberId,
      notes: details.notes
    };

    updateProperty(propertyId, {
      appointments: [...(property.appointments || []), newAppointment]
    });

    // In a real app, we would push to Google Calendar here using the token
    if (googleTokens[memberId]) {
      console.log('Pushing to Google Calendar for', memberId, newAppointment);
    }
  };

  const smartSortPropertyIds = useCallback((ids: string[]) => {
    if (ids.length <= 1) return ids;
    const props = properties.filter(p => ids.includes(p.id));
    
    // Helper to parse address
    const parseAddress = (addr: string) => {
      const match = addr.match(/^(\d+)\s+(.+?)(?:,|$)/i);
      if (!match) return { number: 0, street: addr.toLowerCase().trim(), parity: 0 };
      
      const number = parseInt(match[1], 10);
      let street = match[2].toLowerCase()
        .replace(/\b(east|west|north|south|e|w|n|s)\b/gi, '') 
        .replace(/\b(drive|dr|street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|court|ct)\.?\b/gi, '') 
        .replace(/\s+/g, ' ')
        .trim();
        
      return { number, street, parity: number % 2 };
    };

    const propsWithParsed = props.map(p => ({
      ...p,
      parsed: parseAddress(p.address)
    }));

    const sorted: string[] = [];
    let remaining = [...propsWithParsed];
    let currentPos: [number, number] = userLocation || [33.3039, -111.6664];

    while (remaining.length > 0) {
      // 1. Sort remaining to find the absolute closest point to current position
      remaining.sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a.lat - currentPos[0], 2) + Math.pow(a.lng - currentPos[1], 2));
        const distB = Math.sqrt(Math.pow(b.lat - currentPos[0], 2) + Math.pow(b.lng - currentPos[1], 2));
        return distA - distB;
      });

      const nextStart = remaining[0];
      const targetStreet = nextStart.parsed.street;

      // 2. Group all properties on this street and split by parity (Side 1 vs Side 2)
      const streetProps = remaining.filter(p => p.parsed.street === targetStreet);
      const evenSide = streetProps.filter(p => p.parsed.parity === 0);
      const oddSide = streetProps.filter(p => p.parsed.parity === 1);

      const sortSide = (sideProps: typeof remaining) => {
        if (sideProps.length === 0) return [];
        const sortedAsc = [...sideProps].sort((a, b) => a.parsed.number - b.parsed.number);
        const d1 = Math.sqrt(Math.pow(sortedAsc[0].lat - currentPos[0], 2) + Math.pow(sortedAsc[0].lng - currentPos[1], 2));
        const dl = Math.sqrt(Math.pow(sortedAsc[sortedAsc.length-1].lat - currentPos[0], 2) + Math.pow(sortedAsc[sortedAsc.length-1].lng - currentPos[1], 2));
        return d1 <= dl ? sortedAsc : sortedAsc.reverse();
      };

      // Decide which side is closer to start with
      const dEven = evenSide.length > 0 ? Math.min(...evenSide.map(p => Math.sqrt(Math.pow(p.lat - currentPos[0], 2) + Math.pow(p.lng - currentPos[1], 2)))) : Infinity;
      const dOdd = oddSide.length > 0 ? Math.min(...oddSide.map(p => Math.sqrt(Math.pow(p.lat - currentPos[0], 2) + Math.pow(p.lng - currentPos[1], 2)))) : Infinity;

      const [firstSide, secondSide] = dEven <= dOdd ? [evenSide, oddSide] : [oddSide, evenSide];

      // Process first side
      const s1 = sortSide(firstSide);
      s1.forEach(p => {
        sorted.push(p.id);
        remaining = remaining.filter(r => r.id !== p.id);
      });
      if (s1.length > 0) {
        currentPos = [s1[s1.length - 1].lat, s1[s1.length - 1].lng];
      }

      // Process second side
      const s2 = sortSide(secondSide);
      s2.forEach(p => {
        sorted.push(p.id);
        remaining = remaining.filter(r => r.id !== p.id);
      });
      if (s2.length > 0) {
        currentPos = [s2[s2.length - 1].lat, s2[s2.length - 1].lng];
      }
    }

    return sorted;
  }, [properties, userLocation]);

  const activeRoute = useMemo(() => 
    workingRouteId ? routes.find(r => r.id === workingRouteId) : null
  , [workingRouteId, routes]);

  const closeAppOverlays = () => {
    setIsProspectsOpen(false);
    setIsLeadsOpen(false);
    setIsCatalogOpen(false);
    setIsSettingsOpen(false);
    setIsMoreMenuOpen(false);
  };

  const openAppView = (view: 'dashboard' | 'contacts' | 'map' | 'appointments') => {
    closeAppOverlays();
    setCurrentView(view as any);
  };

  const openAppRoutes = () => {
    closeAppOverlays();
    setIsProspectsOpen(true);
  };

  const openAppCatalog = () => {
    closeAppOverlays();
    setIsCatalogOpen(true);
  };

  const openAppSettings = () => {
    closeAppOverlays();
    setIsSettingsOpen(true);
  };

  const openAppOverdueInvoices = () => {
    setIsOverdueInvoicesOpen(true);
  };

  return (
    <div id="top-brand-main" className="flex flex-col h-screen bg-[#F1F5F9] relative overflow-hidden text-[#1E293B]">
      <AppHeaderNav
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        userEmail={userEmail}
        dataStatus={dataStatus}
        dataError={dataError}
        currentView={currentView}
        isProspectsOpen={isProspectsOpen}
        isCatalogOpen={isCatalogOpen}
        isSettingsOpen={isSettingsOpen}
        isOverdueInvoicesOpen={isOverdueInvoicesOpen}
        onOpenDashboard={() => openAppView('dashboard')}
        onOpenContacts={() => openAppView('contacts')}
        onOpenMap={() => openAppView('map')}
        onOpenAppointments={() => openAppView('appointments')}
        onOpenRoutes={openAppRoutes}
        onOpenCatalog={openAppCatalog}
        onOpenInvoices={openAppOverdueInvoices}
        onOpenSettings={openAppSettings}
        onSignOut={onSignOut}
      />

      {currentView !== 'map' ? (
        <HomeDashboard 
          properties={properties}
          updateProperty={updateProperty}
          team={team}
          catalog={catalog}
          settings={settings}
          onOpenOverdueInvoices={() => setIsOverdueInvoicesOpen(true)}
          onFocusProperty={(id) => {
            const p = properties.find(prop => prop.id === id);
            if (p) {
              setMapCenter([p.lat, p.lng]);
              setSelectedPropertyId(id);
              setIsDrawerOpen(true);
              setCurrentView('map');
            }
          }}
          onOpenMap={() => setCurrentView('map')}
          onOpenPropertyEditor={(id) => {
            setSelectedPropertyId(id);
            setIsDrawerOpen(true);
          }}
          activeTab={currentView === 'dashboard' ? 'dashboard' : currentView === 'contacts' ? 'contacts' : 'appointments'}
          setActiveTab={(tab) => {
            if (tab === 'map') {
              setCurrentView('map');
            } else {
              setCurrentView(tab as any);
            }
          }}
          onOpenCatalog={() => setIsCatalogOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onAddNewLead={() => handleAddNewLead(
            setPromptConfig, 
            setProperties, 
            setSelectedPropertyId, 
            setIsDrawerOpen,
            mapCenter?.[0],
            mapCenter?.[1]
          )}
        />
      ) : (
        <>
          {/* Header Stats */}
          <div className="absolute top-0 left-0 right-0 z-[1000] p-0 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm px-6 py-5 flex justify-center items-center pointer-events-auto min-h-[92px]">
          {isBuildingRoute || workingRouteId ? (
            <div className="flex flex-col items-center w-full max-w-lg animate-in fade-in slide-in-from-top-4 duration-500 relative">
              <input 
                className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] bg-transparent border-none outline-none focus:ring-0 p-0 h-auto text-center w-full placeholder-slate-300 mb-1"
                placeholder="[ROUTE NAME LISTED HERE]"
                value={isBuildingRoute ? newRoute.name : (activeRoute?.name || '')}
                onChange={e => {
                  if (isBuildingRoute) {
                    setNewRoute({...newRoute, name: e.target.value});
                  } else if (workingRouteId) {
                    setRoutes(prev => prev.map(r => r.id === workingRouteId ? { ...r, name: e.target.value } : r));
                  }
                }}
                disabled={!isBuildingRoute && !workingRouteId}
              />
              <div className="flex items-center gap-2.5">
                <span className="text-4xl font-black text-slate-900 leading-none">
                  {isBuildingRoute ? newRoute.selectedIds.length : (activeRoute?.propertyIds.length || 0)}
                </span>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mt-3">addresses</span>
              </div>

              {workingRouteId && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (workingRouteId) {
                        setRoutes(prev => prev.map(r => r.id === workingRouteId ? { 
                          ...r, 
                          status: 'Completed',
                          completedAt: Date.now()
                        } : r));
                        setWorkingRouteId(null);
                      }
                    }}
                    className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:scale-110 active:scale-95 transition-all border-2 border-white"
                    title="Complete Route"
                  >
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex justify-between items-center gap-4 pr-16 sm:pr-20">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Daily Progress</span>
                <div className="text-xl font-extrabold text-[#1E293B] flex items-baseline gap-1">
                  {stats.knockedToday} <span className="text-xs font-normal text-[#94A3B8]">knocks today</span>
                </div>
              </div>
              <div className="text-right min-w-0">
                <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Interested & B2B</span>
                <div className="text-sm font-bold text-[#2563EB]">{stats.interested} Leads • {stats.b2bSites} B2B</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Search - Collapsible */}
      <div className={cn(
        "absolute top-[108px] left-4 z-[1000] transition-all duration-300 ease-in-out",
        isSearchExpanded ? "right-4 max-w-xl mx-auto" : "w-12"
      )}>
        {isSearchExpanded ? (
          <div className="relative group animate-in fade-in slide-in-from-left-2 transition-all">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input 
              type="text" 
              placeholder="Search address..." 
              className="w-full bg-white border border-[#E2E8F0] rounded-xl py-3.5 pl-11 pr-11 shadow-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all font-medium text-sm placeholder-[#94A3B8]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button 
              onClick={() => {
                setIsSearchExpanded(false);
                setSearchQuery('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {isSearching && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={() => setIsSearchExpanded(true)}
            className="w-12 h-12 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#1E293B] shadow-xl hover:bg-gray-50 transition-all active:scale-95"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {isSearchExpanded && searchSuggestions.length > 0 && (
          <div className="mt-2 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-[300px] overflow-y-auto">
            {searchSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  handleSuggestionSelect(s);
                  setIsSearchExpanded(false);
                }}
                className="w-full px-5 py-4 text-left hover:bg-blue-50 border-b border-slate-50 last:border-0 flex items-center gap-4 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-700 truncate tracking-tight">{s.mainText}</div>
                  <div className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest shrink-0">{s.subText}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map View */}
      <div className="flex-1 z-0 relative">
        {/* Banner Overlays */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-2 pointer-events-none w-full max-w-[90%] items-center">
          {selectingStartForRouteId && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-md pointer-events-auto"
            >
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1">Route Ignition</span>
                <span className="text-sm font-bold leading-tight italic">Tap the house you want as #1</span>
              </div>
              <button 
                onClick={() => setSelectingStartForRouteId(null)}
                className="ml-2 p-2 hover:bg-white/10 rounded-xl transition-colors pointer-events-auto"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {isBuildingRoute && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-[#1E293B] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-md"
            >
              <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Plus className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1">Route Builder</span>
                <span className="text-sm font-bold leading-tight italic">Tap pins to add to route</span>
              </div>
            </motion.div>
          )}
        </div>

        {hasValidKey ? (
          <APIProvider apiKey={API_KEY}>
            <GoogleMap
              defaultCenter={mapCenter ? { lat: mapCenter[0], lng: mapCenter[1] } : { lat: 39.8283, lng: -98.5795 }}
              defaultZoom={mapZoom}
              mapId="e39d489ae42fed52"
              className="h-full w-full"
              disableDefaultUI={true}
              gestureHandling={'greedy'}
              onCenterChanged={(e) => {
                const center = e.detail.center;
                setMapCenter([center.lat, center.lng]);
              }}
              onZoomChanged={(e) => {
                setMapZoom(e.detail.zoom);
              }}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              <MapController center={mapCenter} zoom={mapZoom} />
              <MapEvents 
                onClick={(e) => {
                  if (e.latLng) {
                    setClickPulse([e.latLng.lat(), e.latLng.lng()]);
                    handleMapClick(e.latLng.lat(), e.latLng.lng());
                  }
                }}
                onDoubleClick={(e) => {
                  if (!e.latLng) return;
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  const closest = properties.find(p => 
                    Math.abs(p.lat - lat) < 0.002 && Math.abs(p.lng - lng) < 0.002
                  );
                  if (closest) {
                    setSelectedPropertyId(closest.id);
                    setIsDrawerOpen(true);
                  }
                }}
              />
              <LocationMarker userLocation={userLocation} />
              
              {clickPulse && (
                <AdvancedMarker position={{ lat: clickPulse[0], lng: clickPulse[1] }}>
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-full border-2 border-indigo-500 animate-ping" />
                </AdvancedMarker>
              )}
              
              {dedupedProperties.map(prop => {
                const isSelectedInRoute = newRoute.selectedIds.includes(prop.id) || (activeRoute?.propertyIds.includes(prop.id) ?? false);
                const sequence = isBuildingRoute 
                  ? (newRoute.selectedIds.indexOf(prop.id) + 1 || undefined) 
                  : (activeRoute?.propertyIds.indexOf(prop.id) !== -1 ? (activeRoute?.propertyIds.indexOf(prop.id)! + 1) : undefined);
                const color = STAGE_COLORS[prop.stage] || STAGE_COLORS.prospect;

                return (
                  <AdvancedMarker 
                    key={prop.id} 
                    position={{ lat: prop.lat, lng: prop.lng }}
                    onClick={() => {
                      if (selectingStartForRouteId) {
                        const route = routes.find(r => r.id === selectingStartForRouteId);
                        if (route && route.propertyIds.includes(prop.id)) {
                          const uncontactedIds = route.propertyIds.filter(id => {
                            const p = properties.find(prop => prop.id === id);
                            return p && (p.status === 'Not Visited' || p.status === 'No Answer' || p.stage === 'prospect');
                          });
                          
                          const remainingToVisit = route.propertyIds.filter(id => uncontactedIds.includes(id));
                          const contactedIds = route.propertyIds.filter(id => !uncontactedIds.includes(id));
                          
                          let currentSortPos: [number, number] = [prop.lat, prop.lng];
                          let pool = remainingToVisit.filter(id => id !== prop.id);
                          const sortedRemaining = [prop.id];
                          
                          while (pool.length > 0) {
                            pool.sort((a, b) => {
                              const pa = properties.find(p => p.id === a)!;
                              const pb = properties.find(p => p.id === b)!;
                              const da = Math.sqrt(Math.pow(pa.lat - currentSortPos[0], 2) + Math.pow(pa.lng - currentSortPos[1], 2));
                              const db = Math.sqrt(Math.pow(pb.lat - currentSortPos[0], 2) + Math.pow(pb.lng - currentSortPos[1], 2));
                              return da - db;
                            });
                            const next = pool.shift()!;
                            sortedRemaining.push(next);
                            const np = properties.find(p => p.id === next)!;
                            currentSortPos = [np.lat, np.lng];
                          }
                          
                          const newOrder = [...sortedRemaining, ...contactedIds];
                          
                          setRoutes(prev => prev.map(r => r.id === selectingStartForRouteId ? {
                            ...r,
                            status: 'In Progress',
                            propertyIds: newOrder,
                            startedAt: Date.now()
                          } : r));
                          
                          setWorkingRouteId(selectingStartForRouteId);
                          setSelectingStartForRouteId(null);
                        }
                        return;
                      }
                      
                      if (isSelectionMode) {
                        setNewRoute(prev => ({
                          ...prev,
                          selectedIds: prev.selectedIds.includes(prop.id) 
                            ? prev.selectedIds.filter(id => id !== prop.id)
                            : [...prev.selectedIds, prop.id]
                        }));
                      } else {
                        setSelectedPropertyId(prop.id);
                        setIsDrawerOpen(true);
                      }
                    }}
                  >
                    <div className="relative group cursor-pointer">
                      {isSelectedInRoute && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-blue-100/50 animate-pulse" />}
                      <Pin 
                        background={isSelectedInRoute ? '#2563eb' : color} 
                        borderColor="#ffffff" 
                        glyphColor="#ffffff" 
                        glyph={sequence ? String(sequence) : undefined}
                        scale={isSelectedInRoute ? 1.2 : 1.0}
                      />
                    </div>
                  </AdvancedMarker>
                );
              })}

              <OptimizedRoute 
                propertyIds={isBuildingRoute ? newRoute.selectedIds : (activeRoute?.propertyIds || [])} 
                properties={properties}
                isActive={isRouteActive || workingRouteId !== null || isBuildingRoute}
              />
            </GoogleMap>
          </APIProvider>
        ) : (
          <MapContainer
            center={mapCenter ? [mapCenter[0], mapCenter[1]] : [39.8283, -98.5795]}
            zoom={mapZoom}
            scrollWheelZoom={true}
            className="h-full w-full"
            doubleClickZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <LeafletMapController center={mapCenter} zoom={mapZoom} />
            <LeafletMapEvents 
              onClick={(e) => {
                setClickPulse([e.latlng.lat, e.latlng.lng]);
                handleMapClick(e.latlng.lat, e.latlng.lng);
              }}
              onMoveEnd={(center, zoom) => {
                setMapCenter(center);
                setMapZoom(zoom);
              }}
            />

            {userLocation && (
              <>
                <LeafletMarker 
                  position={userLocation} 
                  icon={L.divIcon({
                    className: 'custom-user-location-marker',
                    html: '<div class="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  })}
                />
                <LeafletCircle
                  center={userLocation}
                  radius={100}
                  interactive={false}
                  pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }}
                />
              </>
            )}

            {clickPulse && (
              <LeafletMarker 
                position={clickPulse}
                icon={L.divIcon({
                  className: 'custom-click-marker',
                  html: '<div class="w-10 h-10 bg-indigo-500/20 rounded-full border-2 border-indigo-500 animate-ping" />',
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
                })}
              />
            )}

            {dedupedProperties.map(prop => {
              const isSelectedInRoute = newRoute.selectedIds.includes(prop.id) || (activeRoute?.propertyIds.includes(prop.id) ?? false);
              const sequence = isBuildingRoute 
                ? (newRoute.selectedIds.indexOf(prop.id) + 1 || undefined) 
                : (activeRoute?.propertyIds.indexOf(prop.id) !== -1 ? (activeRoute?.propertyIds.indexOf(prop.id)! + 1) : undefined);

              return (
                <LeafletMarker 
                  key={prop.id}
                  position={[prop.lat, prop.lng]}
                  icon={createLeafletMarkerIcon(prop.stage, isSelectedInRoute, sequence)}
                  eventHandlers={{
                    click: () => {
                      if (selectingStartForRouteId) {
                        const route = routes.find(r => r.id === selectingStartForRouteId);
                        if (route && route.propertyIds.includes(prop.id)) {
                          const uncontactedIds = route.propertyIds.filter(id => {
                            const p = properties.find(prop => prop.id === id);
                            return p && (p.status === 'Not Visited' || p.status === 'No Answer' || p.stage === 'prospect');
                          });
                          
                          const remainingToVisit = route.propertyIds.filter(id => uncontactedIds.includes(id));
                          const contactedIds = route.propertyIds.filter(id => !uncontactedIds.includes(id));
                          
                          let currentSortPos: [number, number] = [prop.lat, prop.lng];
                          let pool = remainingToVisit.filter(id => id !== prop.id);
                          const sortedRemaining = [prop.id];
                          
                          while (pool.length > 0) {
                            pool.sort((a, b) => {
                              const pa = properties.find(p => p.id === a)!;
                              const pb = properties.find(p => p.id === b)!;
                              const da = Math.sqrt(Math.pow(pa.lat - currentSortPos[0], 2) + Math.pow(pa.lng - currentSortPos[1], 2));
                              const db = Math.sqrt(Math.pow(pb.lat - currentSortPos[0], 2) + Math.pow(pb.lng - currentSortPos[1], 2));
                              return da - db;
                            });
                            const next = pool.shift()!;
                            sortedRemaining.push(next);
                            const np = properties.find(p => p.id === next)!;
                            currentSortPos = [np.lat, np.lng];
                          }
                          
                          const newOrder = [...sortedRemaining, ...contactedIds];
                          
                          setRoutes(prev => prev.map(r => r.id === selectingStartForRouteId ? {
                            ...r,
                            status: 'In Progress',
                            propertyIds: newOrder,
                            startedAt: Date.now()
                          } : r));
                          
                          setWorkingRouteId(selectingStartForRouteId);
                          setSelectingStartForRouteId(null);
                        }
                        return;
                      }
                      
                      if (isSelectionMode) {
                        setNewRoute(prev => ({
                          ...prev,
                          selectedIds: prev.selectedIds.includes(prop.id) 
                            ? prev.selectedIds.filter(id => id !== prop.id)
                            : [...prev.selectedIds, prop.id]
                        }));
                      } else {
                        setSelectedPropertyId(prop.id);
                        setIsDrawerOpen(true);
                      }
                    }
                  }}
                />
              );
            })}

            {(isRouteActive || workingRouteId !== null || isBuildingRoute) && (() => {
              const routeIds = isBuildingRoute ? newRoute.selectedIds : (activeRoute?.propertyIds || []);
              const points = routeIds.map(id => {
                const p = properties.find(prop => prop.id === id);
                return p ? [p.lat, p.lng] as [number, number] : null;
              }).filter(Boolean) as [number, number][];
              
              if (points.length < 2) return null;
              return (
                <LeafletPolyline 
                  positions={points} 
                  pathOptions={{ color: '#2563EB', weight: 5, opacity: 0.8 }} 
                />
              );
            })()}
          </MapContainer>
        )}

        {/* Map Controls */}
        <div
          className="absolute bottom-4 right-4 flex flex-col gap-2 z-[1200] pointer-events-auto"
          onClick={stopMapControlEvent}
          onDoubleClick={stopMapControlEvent}
          onPointerDown={stopMapPointerEvent}
        >
          <button 
            onClick={(e) => {
              stopMapControlEvent(e);
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  setMapCenter([pos.coords.latitude, pos.coords.longitude]);
                  setMapZoom(18);
                }, (err) => {
                  console.error("Location error", err);
                  alert("Could not get your location. Please check permissions.");
                }, { enableHighAccuracy: true });
              }
            }}
            className="p-3 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-[#E2E8F0] text-[#1E293B] active:scale-95 transition-transform"
            title="Center on My Location"
            aria-label="Center on my location"
          >
            <Target className="w-6 h-6" />
          </button>
          <button 
            onClick={(e) => {
              stopMapControlEvent(e);
              setMapMode(mapMode === 'street' ? 'satellite' : 'street');
            }}
            className={cn(
              "p-3 rounded-full shadow-lg border active:scale-95 transition-all backdrop-blur-md",
              mapMode === 'satellite' ? "bg-indigo-600 text-white border-indigo-700" : "bg-white/95 text-[#1E293B] border-[#E2E8F0]"
            )}
            title="Toggle Map Mode"
            aria-label="Toggle map mode"
          >
            <Layers className="w-6 h-6" />
          </button>
          <button 
            onClick={(e) => {
              stopMapControlEvent(e);
              toggleRouteBuilderFromMap();
            }}
            className={cn(
              "p-3 rounded-full shadow-lg border active:scale-95 transition-all backdrop-blur-md",
              isBuildingRoute || isSelectionMode
                ? "bg-blue-600 text-white border-blue-700 shadow-blue-100"
                : "bg-white/95 text-[#1E293B] border-[#E2E8F0]"
            )}
            title={isBuildingRoute || isSelectionMode ? "Exit Route Builder" : "Build Route"}
            aria-label={isBuildingRoute || isSelectionMode ? "Exit route builder" : "Build route"}
            aria-pressed={isBuildingRoute || isSelectionMode}
          >
            <Navigation className="w-6 h-6" />
          </button>
        </div>

        <div
          className="absolute bottom-4 left-4 z-[1200] pointer-events-auto"
          onClick={stopMapControlEvent}
          onDoubleClick={stopMapControlEvent}
          onPointerDown={stopMapPointerEvent}
        >
          <div className="flex flex-col items-center gap-3">
            {(isBuildingRoute || workingRouteId) && (
              <motion.button 
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                onClick={(e) => {
                  stopMapControlEvent(e);
                  if (isBuildingRoute) {
                    if (newRoute.selectedIds.length === 0) return alert('Select at least one point');
                    
                    const idsToUse = newRoute.selectedIds;

                    if (newRoute.id) {
                      setRoutes(prev => prev.map(r => r.id === newRoute.id ? {
                        ...r,
                        name: newRoute.name || r.name,
                        propertyIds: idsToUse
                      } : r));
                    } else {
                      const dateStr = new Date().toISOString().split('T')[0];
                      const repName = team[0]?.name?.split(' ')[0] || 'Mike';
                      const r: ProspectRoute = {
                        id: uuidv4(),
                        name: newRoute.name || `${dateStr} - ${repName}`,
                        propertyIds: idsToUse,
                        status: 'Draft',
                        createdAt: Date.now()
                      };
                      setRoutes(prev => [...prev, r]);
                    }
                    
                    setIsBuildingRoute(false);
                    setIsSelectionMode(false);
                    setMapMode('street');
                    setNewRoute({ name: '', selectedIds: [] });
                  } else if (workingRouteId) {
                    setWorkingRouteId(null);
                  }
                }}
                className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all border border-white/20"
                title={isBuildingRoute ? "Save Route" : "Save Progress"}
              >
                <Save className="w-5 h-5" />
              </motion.button>
            )}

             <AnimatePresence>
               {isLegendExpanded && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9, y: 20, originX: 0, originY: 1 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.9, y: 20 }}
                   className="p-5 bg-white border border-[#E2E8F0] shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-3xl min-w-[200px]"
                 >
                   <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                         <div className="w-5 h-5 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                           <Layout className="w-3 h-3" />
                         </div>
                         <h3 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Map Legend</h3>
                      </div>
                      <button onClick={(e) => {
                        stopMapControlEvent(e);
                        setIsLegendExpanded(false);
                      }} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="w-4 h-4 text-gray-300" />
                      </button>
                   </div>
                   
                   <div className="space-y-2.5">
                      {Object.entries(STAGE_COLORS).map(([stage, color]) => (
                        <div key={stage} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-3.5 h-3.5 rounded-lg shadow-sm" style={{ backgroundColor: color }} />
                            <span className="text-xs font-bold text-gray-600 capitalize">
                              {(settings.labels.stages as any)[stage] || stage}
                            </span>
                          </div>
                        </div>
                      ))}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             <button 
               onClick={(e) => {
                 stopMapControlEvent(e);
                 setIsLegendExpanded(!isLegendExpanded);
               }}
               className={cn(
                 "w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border transition-all active:scale-95",
                 isLegendExpanded 
                   ? "bg-indigo-600 text-white border-indigo-700" 
                   : "bg-white text-[#1E293B] border-[#E2E8F0] hover:border-indigo-200"
               )}
               title="Map Controls"
             >
               {isLegendExpanded ? <X className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
             </button>
          </div>
        </div>

        {isSelectionMode && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-[108px] right-4 pointer-events-none z-[1100]"
          >
            <div className="bg-[#6366F1] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md min-h-[48px]">
              <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Rapid Mode</span>
            </div>
          </motion.div>
        )}
      </div>
        </>
      )}      {/* Bottom Navigation */}
      <div className="bg-white border-t border-[#E2E8F0] pb-8 pt-3 px-4 z-[1001]">
        <div className="max-w-2xl mx-auto flex justify-between items-center gap-1">
          {/* 1. Dashboard Home */}
          <button 
            onClick={() => {
              setCurrentView('dashboard');
              setIsProspectsOpen(false);
              setIsLeadsOpen(false);
              setIsCatalogOpen(false);
              setIsSettingsOpen(false);
            }} 
            className="flex flex-col items-center gap-1 transition-all flex-1 min-w-0"
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              currentView === 'dashboard' && !isProspectsOpen && !isLeadsOpen && !isCatalogOpen && !isSettingsOpen
                ? "bg-[#DBEAFE] text-[#2563EB]" 
                : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#2563EB]"
            )}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tight text-[#64748B] text-center w-full block truncate px-0.5">Home</span>
          </button>

          {/* 2. Contacts Directory */}
          <button 
            onClick={() => {
              setCurrentView('contacts');
              setIsProspectsOpen(false);
              setIsLeadsOpen(false);
              setIsCatalogOpen(false);
              setIsSettingsOpen(false);
            }} 
            className="flex flex-col items-center gap-1 transition-all flex-1 min-w-0"
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              currentView === 'contacts' && !isProspectsOpen && !isLeadsOpen && !isCatalogOpen && !isSettingsOpen
                ? "bg-[#DBEAFE] text-[#2563EB]" 
                : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]"
            )}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tight text-[#64748B] text-center w-full block truncate px-0.5">People</span>
          </button>

          {/* 3. Map View */}
          <button 
            onClick={() => {
              setCurrentView('map');
              setIsProspectsOpen(false);
              setIsLeadsOpen(false);
              setIsCatalogOpen(false);
              setIsSettingsOpen(false);
            }} 
            className="flex flex-col items-center gap-1 transition-all flex-1 min-w-0"
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              currentView === 'map' && !isProspectsOpen && !isLeadsOpen && !isCatalogOpen && !isSettingsOpen
                ? "bg-indigo-100 text-indigo-600" 
                : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]"
            )}>
              <MapIcon className="w-5 h-5" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tight text-[#64748B] text-center w-full block truncate px-0.5">Map</span>
          </button>

          {/* 4. Center Plus button */}
          <div className="relative -mt-10 mx-1 scale-100 shrink-0">
            <button 
              onClick={() => handleAddNewLead(
                setPromptConfig, 
                setProperties, 
                setSelectedPropertyId, 
                setIsDrawerOpen,
                mapCenter?.[0],
                mapCenter?.[1]
              )}
              className="w-14 h-14 bg-[#2563EB] rounded-[20px] flex items-center justify-center text-white shadow-2xl shadow-blue-200 border-4 border-white active:scale-95 transition-all"
              title="Add New Canvassing Lead"
            >
              <Plus className="w-8 h-8" />
            </button>
          </div>

          {/* 5. Schedule */}
          <button 
            onClick={() => {
              setCurrentView('appointments');
              setIsProspectsOpen(false);
              setIsLeadsOpen(false);
              setIsCatalogOpen(false);
              setIsSettingsOpen(false);
            }} 
            className="flex flex-col items-center gap-1 transition-all flex-1 min-w-0"
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              currentView === 'appointments' && !isProspectsOpen && !isLeadsOpen && !isCatalogOpen && !isSettingsOpen
                ? "bg-blue-100 text-blue-600" 
                : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]"
            )}>
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tight text-[#64748B] text-center w-full block truncate px-0.5">Appts</span>
          </button>

          {/* 6. Routes */}
          <button 
            onClick={() => {
              setIsProspectsOpen(true);
              setIsLeadsOpen(false);
              setIsCatalogOpen(false);
              setIsSettingsOpen(false);
            }} 
            className="flex flex-col items-center gap-1 transition-all flex-1 min-w-0"
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              isProspectsOpen ? "bg-amber-100 text-amber-600" : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]"
            )}>
              <Navigation className="w-5 h-5" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tight text-[#64748B] text-center w-full block truncate px-0.5">Routes</span>
          </button>

          {/* 7. More Button & Popover Menu */}
          <div className="relative flex-1 flex flex-col items-center">
            {/* Popover Menu */}
            <AnimatePresence>
              {isMoreMenuOpen && (
                <>
                  {/* Overlay background block to close popover */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsMoreMenuOpen(false)} 
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-14 right-2 z-50 w-64 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden p-2 flex flex-col gap-1 origin-bottom-right"
                  >
                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-450">System Utilities</p>
                    </div>

                    {/* 1. Accounts Receivable / Invoices */}
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsOverdueInvoicesOpen(true);
                      }}
                      className="flex items-center gap-3 px-3 py-2 w-full hover:bg-[#F8FAFC] transition-all rounded-xl text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#1E293B]">Overdue Invoices</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Accounts Receivable</p>
                      </div>
                    </button>

                    {/* 2. Target Checklist Planner */}
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setSettingsActiveTab('targets');
                        setIsSettingsOpen(true);
                      }}
                      className="flex items-center gap-3 px-3 py-2 w-full hover:bg-[#F8FAFC] transition-all rounded-xl text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#1E293B]">Operational Targets</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Set baseline quotas</p>
                      </div>
                    </button>

                    {/* 3. Product Offers Catalog */}
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsCatalogOpen(true);
                      }}
                      className="flex items-center gap-3 px-3 py-2 w-full hover:bg-[#F8FAFC] transition-all rounded-xl text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#1E293B]">Product Catalog</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Offer bundles & codes</p>
                      </div>
                    </button>

                    {/* 4. Active Team Hub */}
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsTeamOpen(true);
                      }}
                      className="flex items-center gap-3 px-3 py-2 w-full hover:bg-[#F8FAFC] transition-all rounded-xl text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#1E293B]">Frontline Field Team</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Team Board & quotas</p>
                      </div>
                    </button>

                    {/* 5. General Admin Config */}
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setSettingsActiveTab('business');
                        setIsSettingsOpen(true);
                      }}
                      className="flex items-center gap-3 px-3 py-2 w-full hover:bg-[#F8FAFC] transition-all rounded-xl text-left border-t border-slate-50 mt-1 pt-2"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                        <SettingsIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#1E293B]">Admin Console</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">General System Config</p>
                      </div>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <button 
              onClick={() => setIsMoreMenuOpen(prev => !prev)}
              className="flex flex-col items-center gap-1 transition-all w-full min-w-0"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                isMoreMenuOpen || isSettingsOpen || isCatalogOpen || isTeamOpen || isOverdueInvoicesOpen
                  ? "bg-slate-200 text-slate-800" 
                  : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]"
              )}>
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-tight text-[#64748B] text-center w-full block truncate px-0.5">More</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsOverlay 
            settings={settings} 
            setSettings={setSettings} 
            catalog={catalog}
            setCatalog={setCatalog}
            team={team}
            setTeam={setTeam}
            goals={goals}
            setGoals={setGoals}
            onClose={() => setIsSettingsOpen(false)} 
            properties={properties}
            setPromptConfig={setPromptConfig}
            initialTab={settingsActiveTab}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOverdueInvoicesOpen && (
          <OverdueInvoicesOverlay 
            properties={properties}
            updateProperty={updateProperty}
            onClose={() => setIsOverdueInvoicesOpen(false)}
            onFocusProperty={(id) => {
              const p = properties.find(prop => prop.id === id);
              if (p) {
                setMapCenter([p.lat, p.lng]);
                setSelectedPropertyId(id);
                setIsDrawerOpen(true);
                setCurrentView('map');
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTeamOpen && (
          <TeamOverlay 
            team={team}
            goals={goals}
            properties={properties}
            settings={settings}
            onClose={() => setIsTeamOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCatalogOpen && (
          <CatalogOverlay 
            catalog={catalog} 
            setCatalog={setCatalog} 
            onClose={() => setIsCatalogOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDrawerOpen && selectedProperty && (
          <PropertyDrawer 
            property={selectedProperty}
            updateProperty={updateProperty}
            settings={settings}
            onLogEvent={logAddressEvent}
            onClose={() => setIsDrawerOpen(false)}
            onSchedule={() => {
              setIsDrawerOpen(false);
              setIsCalendarOpen(true);
            }}
            onQuote={() => {
              setIsDrawerOpen(false);
              setIsAddingQuote(true);
            }}
            onSale={() => {
              setIsDrawerOpen(false);
              setIsAddingSale(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingSale && selectedProperty && (
          <SaleOverlay
            property={selectedProperty}
            onClose={() => setIsAddingSale(false)}
            onSave={(sale) => {
              updateProperty(selectedProperty.id, {
                sales: [...(selectedProperty.sales || []), sale],
                stage: 'customer'
              });
            }}
          />
        )}

        {isAddingQuote && selectedProperty && (
          <QuoteOverlay
            property={selectedProperty}
            catalog={catalog}
            onClose={() => setIsAddingQuote(false)}
            onSave={(quote) => {
              const currentWeight = STAGE_ORDER.indexOf(selectedProperty.stage);
              const opportunityWeight = STAGE_ORDER.indexOf('opportunity');
              updateProperty(selectedProperty.id, {
                quotes: [...(selectedProperty.quotes || []), quote],
                stage: currentWeight < opportunityWeight ? 'opportunity' : selectedProperty.stage
              });
            }}
          />
        )}

        {isLeadsOpen && (
          <LeadsOverlay 
            properties={properties}
            onDeleteProperty={handleDeleteProperty}
            settings={settings}
            onClose={() => setIsLeadsOpen(false)}
            onFocusProperty={(id) => {
              const p = properties.find(prop => prop.id === id);
              if (p) {
                setMapCenter([p.lat, p.lng]);
                setSelectedPropertyId(id);
                setIsDrawerOpen(true);
                setIsLeadsOpen(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProspectsOpen && (
          <ProspectsOverlay 
            properties={dedupedProperties}
            setProperties={setProperties}
            onDeleteProperty={handleDeleteProperty}
            routes={routes}
            setRoutes={setRoutes}
            team={team}
            onClose={() => setIsProspectsOpen(false)}
            onFocusProperty={(id) => {
              const p = properties.find(prop => prop.id === id);
              if (p) {
                setMapCenter([p.lat, p.lng]);
                setSelectedPropertyId(id);
                setIsDrawerOpen(true);
                setIsProspectsOpen(false);
              }
            }}
            selectedPropertyId={selectedPropertyId}
            setSelectedPropertyId={setSelectedPropertyId}
            setIsDrawerOpen={setIsDrawerOpen}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            newRoute={newRoute}
            setNewRoute={setNewRoute}
            isBuildingRoute={isBuildingRoute}
            setIsBuildingRoute={setIsBuildingRoute}
            setMapMode={setMapMode}
            setPromptConfig={setPromptConfig}
            workingRouteId={workingRouteId}
            setWorkingRouteId={setWorkingRouteId}
            setMapCenter={setMapCenter}
            setMapZoom={setMapZoom}
            smartSortPropertyIds={smartSortPropertyIds}
            setSelectingStartForRouteId={setSelectingStartForRouteId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCalendarOpen && selectedProperty && (
          <CalendarOverlay
            property={selectedProperty}
            team={team}
            googleTokens={googleTokens}
            onConnect={connectGoogle}
            onSchedule={(memberId, details) => {
              scheduleAppointment(selectedProperty.id, memberId, details);
              setIsCalendarOpen(false);
            }}
            onClose={() => setIsCalendarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {promptConfig && (
          <PromptModal 
            config={promptConfig}
            onClose={() => setPromptConfig(null)}
            mapCenter={mapCenter}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function handleAddNewLead(
  setPromptConfig: any, 
  setProperties: any, 
  setSelectedPropertyId: any, 
  setIsDrawerOpen: any,
  defaultLat?: number,
  defaultLng?: number
) {
  setPromptConfig({
    title: 'Add New Lead',
    type: 'form',
    fields: [
      { key: 'address', label: 'Home Address' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
    ],
    onConfirm: (dataStr: string) => {
      const data = JSON.parse(dataStr);
      // If we have a lat/lng in the data string (hidden or explicit), use it
      // For now, we'll use default or form data if we add it to the form
      const newProperty: PropertyContact = {
        id: uuidv4(),
        address: data.address || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        email: data.email || '',
        role: '',
        isDecisionMaker: false,
        lat: data.lat || defaultLat || 40.71,
        lng: data.lng || defaultLng || -74.00,
        status: 'Not Visited',
        type: 'Residential',
        notes: '',
        tags: [],
        contacts: [],
        quotes: [],
        sales: [],
        interactions: [],
        appointments: [],
        stage: 'lead',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setProperties((prev: any) => [newProperty, ...prev]);
      setSelectedPropertyId(newProperty.id);
      setIsDrawerOpen(true);
    }
  });
}

// --- Property Detail Drawer ---

function PropertyDrawer({ 
  property, 
  updateProperty, 
  settings,
  onLogEvent,
  onClose,
  onSchedule,
  onQuote,
  onSale
}: { 
  property: PropertyContact,
  updateProperty: (id: string, updates: Partial<PropertyContact>) => void,
  settings: AppSettings,
  onLogEvent: (propertyId: string, payload: LiveEventPayload) => Promise<Interaction>,
  onClose: () => void,
  onSchedule: () => void,
  onQuote: () => void,
  onSale: () => void
}) {
  const [notes, setNotes] = useState(property.notes || '');
  const [firstName, setFirstName] = useState(property.firstName || '');
  const [lastName, setLastName] = useState(property.lastName || '');
  const [phone, setPhone] = useState(property.phone || '');
  const [email, setEmail] = useState(property.email || '');
  const [role, setRole] = useState(property.role || '');
  const [isDecisionMaker, setIsDecisionMaker] = useState(property.isDecisionMaker || false);
  const [businessName, setBusinessName] = useState(property.businessName || '');
  const [selectedEventType, setSelectedEventType] = useState<LiveEventType | null>(null);
  const [knockResult, setKnockResult] = useState<KnockResult | null>(null);
  const [answerOutcome, setAnswerOutcome] = useState<AnswerOutcome | null>(null);
  const [callDirection, setCallDirection] = useState<CallDirection | null>(null);
  const [eventNote, setEventNote] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [referralType, setReferralType] = useState('');
  const [referralRepName, setReferralRepName] = useState('');
  const [eventError, setEventError] = useState('');
  const [isLoggingEvent, setIsLoggingEvent] = useState(false);
  const [eventLoggedLabel, setEventLoggedLabel] = useState('');
  const sectionPermissions = DEFAULT_ADDRESS_RECORD_PERMISSIONS;
  const lastSavedNotesRef = useRef(property.notes || '');

  const activityHistory = [...(property.interactions || [])].sort((a, b) => b.createdAt - a.createdAt);
  const latestActivity = activityHistory[0];

  useEffect(() => {
    const nextNotes = property.notes || '';
    setNotes(nextNotes);
    lastSavedNotesRef.current = nextNotes;
  }, [property.id, property.notes]);

  const saveAddressNotes = useCallback((nextNotes: string) => {
    if (nextNotes === lastSavedNotesRef.current) return;
    lastSavedNotesRef.current = nextNotes;
    updateProperty(property.id, { notes: nextNotes });
  }, [property.id, updateProperty]);

  useEffect(() => {
    if (notes === lastSavedNotesRef.current) return;
    const timer = window.setTimeout(() => {
      saveAddressNotes(notes);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [notes, saveAddressNotes]);

  const resetEventForm = () => {
    setSelectedEventType(null);
    setKnockResult(null);
    setAnswerOutcome(null);
    setCallDirection(null);
    setEventNote('');
    setIsNoteOpen(false);
    setReferralType('');
    setReferralRepName('');
    setEventError('');
  };

  const validateEvent = () => {
    if (!selectedEventType) return 'Choose an event type.';
    if (selectedEventType === 'knock') {
      if (!knockResult) return 'Choose Answer or No Answer.';
      if (knockResult === 'answer' && !answerOutcome) return 'Choose what happened after the answer.';
      if (answerOutcome === 'follow_up_needed' && !eventNote.trim()) return 'A note is required for Follow-Up Needed.';
      if (answerOutcome === 'referral_given') {
        if (!referralType.trim()) return 'Referral type is required.';
        if (!referralRepName.trim()) return 'Referring rep name is required.';
      }
    }
    if (selectedEventType === 'call' && !callDirection) return 'Choose inbound or outbound call.';
    if (selectedEventType === 'completed_cleaning' && !eventNote.trim()) return 'A note is required for Completed Cleaning.';
    if (selectedEventType === 'record_event' && !eventNote.trim()) return 'Describe the record event.';
    return '';
  };

  const handleLogEvent = async () => {
    const validationError = validateEvent();
    if (validationError) {
      setEventError(validationError);
      return;
    }

    const payload: LiveEventPayload = {
      eventType: selectedEventType!,
      knockResult: knockResult || undefined,
      answerOutcome: answerOutcome || undefined,
      callDirection: callDirection || undefined,
      note: eventNote,
      referralType,
      referralRepName,
    };

    setIsLoggingEvent(true);
    setEventError('');

    try {
      await onLogEvent(property.id, payload);
      const loggedLabel = buildEventTitle(payload);
      setEventLoggedLabel(loggedLabel);
      resetEventForm();

      if (payload.answerOutcome === 'quote_requested') {
        onQuote();
      }

      window.setTimeout(() => setEventLoggedLabel(''), 2000);
    } catch (error: any) {
      setEventError(error.message || 'Event could not be saved. Please try again.');
    } finally {
      setIsLoggingEvent(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 35, stiffness: 400 }}
      className="fixed top-0 right-0 bottom-0 z-[2000] bg-white shadow-2xl border-l border-gray-100 flex flex-col w-full md:w-[900px] h-full overflow-hidden"
    >
      <div className="px-8 pt-8 pb-4 flex justify-between items-start">
        <div className="flex-1 pr-4 min-w-0">
          <h3 className="text-xl font-black text-[#1E293B] leading-tight mb-1 truncate uppercase">
            {property.lastName ? `${property.lastName}, ${property.firstName}` : property.address.split(',')[0]}
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
            {property.lastName ? property.address : property.address.split(',').slice(1).join(', ')}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              if (!sectionPermissions.addressHeader.editable) return;
              const newType = property.type === 'Residential' ? 'Commercial' : 'Residential';
              updateProperty(property.id, { type: newType as PropertyType });
            }}
            disabled={!sectionPermissions.addressHeader.editable}
            className={cn(
              "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-1.5",
              property.type === 'Commercial' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700",
              !sectionPermissions.addressHeader.editable && "opacity-70 cursor-not-allowed"
            )}
          >
            {property.type === 'Commercial' ? <Building2 className="w-3.5 h-3.5" /> : <Home className="w-3.5 h-3.5" />}
            {property.type}
          </button>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-xl">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 pb-8">
        {/* Stage Selector */}
        {sectionPermissions.stageControls.visible && (
        <section>
          <div className="flex items-center justify-between mb-3">
             <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Active Stage</label>
             <div className="flex items-center gap-3">
               {(sectionPermissions.scheduleCTA.visible || sectionPermissions.createQuoteCTA.visible || sectionPermissions.recordTransactionCTA.visible) && (
                 <div className="flex items-center gap-1.5">
                   {sectionPermissions.scheduleCTA.visible && (
                     <button
                       type="button"
                       onClick={onSchedule}
                       disabled={!sectionPermissions.scheduleCTA.editable}
                       title="Schedule"
                       aria-label="Schedule"
                       className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <Calendar className="w-4 h-4" />
                     </button>
                   )}
                   {sectionPermissions.createQuoteCTA.visible && (
                     <button
                       type="button"
                       onClick={() => {
                         if (!sectionPermissions.createQuoteCTA.editable) return;
                         onClose();
                         onQuote();
                       }}
                       disabled={!sectionPermissions.createQuoteCTA.editable}
                       title="Create Quote"
                       aria-label="Create Quote"
                       className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <FileText className="w-4 h-4" />
                     </button>
                   )}
                   {sectionPermissions.recordTransactionCTA.visible && (
                     <button
                       type="button"
                       onClick={onSale}
                       disabled={!sectionPermissions.recordTransactionCTA.editable}
                       title="Record Transaction"
                       aria-label="Record Transaction"
                       className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <DollarSign className="w-4 h-4" />
                     </button>
                   )}
                 </div>
               )}
               <div className="flex gap-1">
                 {['prospect', 'lead', 'opportunity', 'customer'].map((s, idx) => (
                   <div key={s} className={cn("w-2 h-1 rounded-full transition-all", idx <= ['prospect', 'lead', 'opportunity', 'customer'].indexOf(property.stage) ? "bg-blue-600" : "bg-gray-100")} />
                 ))}
               </div>
             </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['prospect', 'lead', 'opportunity', 'customer'] as const).map(s => (
              <button
                key={s}
                onClick={() => {
                  if (!sectionPermissions.stageControls.editable) return;
                  updateProperty(property.id, { stage: s });
                }}
                disabled={!sectionPermissions.stageControls.editable}
                className={cn(
                  "py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2",
                  property.stage === s 
                    ? "text-white shadow-lg" 
                    : "bg-white border-gray-100 text-gray-400 hover:border-blue-200",
                  !sectionPermissions.stageControls.editable && "cursor-not-allowed opacity-70"
                )}
                style={{
                  backgroundColor: property.stage === s ? STAGE_COLORS[s] : undefined,
                  borderColor: property.stage === s ? STAGE_COLORS[s] : undefined,
                  boxShadow: property.stage === s ? `0 4px 12px ${STAGE_COLORS[s]}33` : undefined
                }}
              >
                {(settings.labels.stages as any)[s] || s}
              </button>
            ))}
          </div>
        </section>
        )}

        {/* Live Event Logger */}
        {(sectionPermissions.liveEventLogger.visible || sectionPermissions.activityFeed.visible) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                <History className="w-3.5 h-3.5" />
              </div>
              <label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest leading-none">Live Event Logger</label>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                {activityHistory.length} logged
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 block mt-1">
                Latest: {latestActivity ? latestActivity.type : 'None'}
              </span>
            </div>
          </div>

          {sectionPermissions.liveEventLogger.visible && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'knock', label: 'Knock', icon: <MousePointer2 className="w-3.5 h-3.5" /> },
                { id: 'call', label: 'Call', icon: <Phone className="w-3.5 h-3.5" /> },
                { id: 'completed_cleaning', label: 'Completed Cleaning', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                { id: 'record_event', label: 'Record Event', icon: <FileText className="w-3.5 h-3.5" /> },
              ] as { id: LiveEventType; label: string; icon: React.ReactNode }[]).map(event => (
                <button
                  key={event.id}
                  onClick={() => {
                    setSelectedEventType(event.id);
                    setKnockResult(null);
                    setAnswerOutcome(null);
                    setCallDirection(null);
                    setEventError('');
                    setEventLoggedLabel('');
                    setIsNoteOpen(event.id === 'completed_cleaning' || event.id === 'record_event');
                  }}
                  className={cn(
                    "py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 flex items-center gap-1.5",
                    selectedEventType === event.id
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                      : "bg-white border-slate-200 text-slate-400 hover:border-indigo-200"
                  )}
                >
                  {event.icon}
                  {event.label}
                </button>
              ))}
            </div>

            {selectedEventType === 'knock' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'answer', label: 'Answer' },
                    { id: 'no_answer', label: 'No Answer' },
                  ] as { id: KnockResult; label: string }[]).map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setKnockResult(option.id);
                        setAnswerOutcome(null);
                        setEventError('');
                      }}
                      className={cn(
                        "py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2",
                        knockResult === option.id
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                          : "bg-white border-slate-200 text-slate-400 hover:border-blue-200"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {knockResult === 'answer' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {([
                      { id: 'quote_requested', label: 'Estimate / Quote Requested' },
                      { id: 'follow_up_needed', label: 'Follow-Up Needed' },
                      { id: 'referral_given', label: 'Referral Given' },
                      { id: 'not_interested', label: 'Not Interested' },
                    ] as { id: AnswerOutcome; label: string }[]).map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setAnswerOutcome(option.id);
                          setEventError('');
                          setIsNoteOpen(option.id === 'follow_up_needed');
                        }}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 text-left",
                          answerOutcome === option.id
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100"
                            : "bg-white border-slate-200 text-slate-500 hover:border-emerald-200"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedEventType === 'call' && (
              <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                {([
                  { id: 'outbound', label: 'Outbound Call' },
                  { id: 'inbound', label: 'Inbound Call' },
                ] as { id: CallDirection; label: string }[]).map(option => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setCallDirection(option.id);
                      setEventError('');
                    }}
                    className={cn(
                      "py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2",
                      callDirection === option.id
                        ? "bg-pink-600 border-pink-600 text-white shadow-lg shadow-pink-100"
                        : "bg-white border-slate-200 text-slate-400 hover:border-pink-200"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {selectedEventType === 'knock' && answerOutcome === 'referral_given' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                <input
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500/10 outline-none"
                  placeholder="Referral type"
                  value={referralType}
                  onChange={e => setReferralType(e.target.value)}
                />
                <input
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500/10 outline-none"
                  placeholder="Referring rep name"
                  value={referralRepName}
                  onChange={e => setReferralRepName(e.target.value)}
                />
              </div>
            )}

            {selectedEventType && !isNoteOpen && (
              <button
                onClick={() => setIsNoteOpen(true)}
                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Note
              </button>
            )}

            {selectedEventType && isNoteOpen && (
              <textarea
                className="w-full bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3 text-xs font-bold min-h-[88px] focus:ring-2 focus:ring-indigo-500/10 outline-none resize-y"
                placeholder={
                  selectedEventType === 'completed_cleaning'
                    ? 'Cleaning completion note required...'
                    : selectedEventType === 'record_event'
                      ? 'Describe the event...'
                      : answerOutcome === 'follow_up_needed'
                        ? 'Follow-up note required...'
                        : 'Optional note...'
                }
                value={eventNote}
                onChange={e => setEventNote(e.target.value)}
              />
            )}

            {eventError && (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-xs font-black leading-relaxed">
                {eventError}
              </div>
            )}

            {eventLoggedLabel && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Check className="w-4 h-4" />
                Logged: {eventLoggedLabel}
              </div>
            )}

            <button
              onClick={handleLogEvent}
              disabled={!selectedEventType || isLoggingEvent || !sectionPermissions.liveEventLogger.editable}
              className="w-full bg-indigo-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingEvent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
              {isLoggingEvent ? 'Saving Event...' : 'Log Event'}
            </button>
          </div>
          )}

          {sectionPermissions.activityFeed.visible && (
          <div className="space-y-2">
            {activityHistory.length > 0 ? (
              activityHistory.map(item => (
                <div key={item.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                      item.type === 'Knock'
                        ? "bg-blue-50 text-blue-600"
                        : item.type === 'Conversation'
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-600"
                    )}>
                      {item.type}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {item.authorName && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Logged by {item.authorName}
                    </p>
                  )}
                  <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                </div>
              ))
            ) : (
              <div className="bg-white border border-dashed border-[#CBD5E1] rounded-2xl p-5 text-center">
                <p className="text-xs font-semibold text-slate-400 italic">No activity logged yet.</p>
              </div>
            )}
          </div>
          )}
        </section>
        )}

        {/* Address Level Details & Custom Fields */}
        {sectionPermissions.addressDetails.visible && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
               <MapPin className="w-3.5 h-3.5" />
             </div>
             <label className="text-[10px] font-black uppercase text-amber-600 tracking-widest leading-none">Address Details</label>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
             {/* Dynamic Address-Level Custom Fields */}
             {settings.contactFields
                .filter(f => f.scope === 'Address' && f.visible && (!f.applicableTo || f.applicableTo === 'Both' || f.applicableTo === property.type))
                .map(field => (
                  <div key={field.id} className="relative group/field">
                    {field.type === 'checkbox' ? (
                      <button 
                        onClick={() => {
                          if (!sectionPermissions.addressDetails.editable) return;
                          const current = property.customData?.[field.id] || false;
                          updateProperty(property.id, { customData: { ...(property.customData || {}), [field.id]: !current } });
                        }}
                        disabled={!sectionPermissions.addressDetails.editable}
                        className={cn(
                          "w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
                          property.customData?.[field.id] ? "bg-amber-50 text-amber-600 border-amber-100 shadow-sm" : "bg-white text-gray-400 border-[#E2E8F0]",
                          !sectionPermissions.addressDetails.editable && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        <CheckCircle2 className={cn("w-3.5 h-3.5", property.customData?.[field.id] ? "opacity-100" : "opacity-30")} />
                        {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </button>
                    ) : (
                      <div className="relative">
                        <input 
                          type={field.type}
                          className={cn(
                            "w-full bg-white border rounded-xl px-4 py-2 text-xs font-bold transition-all",
                            field.required && !property.customData?.[field.id] ? "border-amber-200 bg-amber-50/30" : "border-[#E2E8F0] focus:ring-2 focus:ring-blue-500/10"
                          )}
                          placeholder={`${field.label}${field.required ? '*' : ''}`}
                          value={property.customData?.[field.id] || ''}
                          disabled={!sectionPermissions.addressDetails.editable}
                          onChange={e => {
                            updateProperty(property.id, { customData: { ...(property.customData || {}), [field.id]: e.target.value } });
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}

             <div className="relative">
                <textarea 
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-4 py-3 text-xs font-bold min-h-[100px] focus:ring-2 focus:ring-blue-500/10"
                  placeholder="Gate-side notes, key info, next actions..."
                  value={notes}
                  disabled={!sectionPermissions.addressDetails.editable}
                  onChange={e => {
                    setNotes(e.target.value);
                  }}
                  onBlur={() => saveAddressNotes(notes)}
                />
             </div>
          </div>
        </section>
        )}

        {/* History Section: Quotes & Sales */}
        {sectionPermissions.propertyHistory.visible && (property.quotes?.length > 0 || property.sales?.length > 0) && (
          <section className="space-y-4 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                 <History className="w-3.5 h-3.5" />
               </div>
               <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest leading-none">Property History</label>
            </div>
            
            <div className="space-y-2">
              {[...(property.quotes || []).map(q => ({...q, type: 'quote'})), ...(property.sales || []).map(s => ({...s, type: 'sale'}))]
                .sort((a,b) => b.createdAt - a.createdAt)
                .map((item, idx) => (
                  <div key={idx} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        item.type === 'quote' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {item.type === 'quote' ? <Package className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-900 tracking-tight">
                          {item.type === 'quote' ? `Quote: #${item.id.slice(-4).toUpperCase()}` : `Transaction: #${item.id.slice(-4).toUpperCase()}`}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                          {new Date(item.createdAt).toLocaleDateString()} • {item.type === 'quote' ? (item as Quote).status : (item as Sale).product}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#1E293B]">
                        ${(item as any).total || (item as any).amount}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Note: Multi-contact support */}
        {sectionPermissions.contactsAtAddress.visible && (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                 <User className="w-3.5 h-3.5" />
               </div>
               <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest leading-none">Contacts at Address</label>
            </div>
            <button 
              onClick={() => {
                if (!sectionPermissions.contactsAtAddress.editable) return;
                const newContact: Contact = {
                  id: uuidv4(),
                  firstName: '',
                  lastName: '',
                  isDecisionMaker: false
                };
                updateProperty(property.id, { 
                  contacts: [...(property.contacts || []), newContact] 
                });
              }}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1"
              disabled={!sectionPermissions.contactsAtAddress.editable}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Contact
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Primary Fields (Preserved for compatibility) */}
            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl relative group">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-tighter">Primary Contact Card</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input 
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs font-bold"
                  placeholder={settings.labels.firstName || "First Name"}
                  value={firstName}
                  onChange={e => {
                    setFirstName(e.target.value);
                    if (sectionPermissions.contactsAtAddress.editable) {
                      updateProperty(property.id, { firstName: e.target.value });
                    }
                  }}
                  disabled={!sectionPermissions.contactsAtAddress.editable}
                />
                <input 
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs font-bold"
                  placeholder={settings.labels.lastName || "Last Name"}
                  value={lastName}
                  onChange={e => {
                    setLastName(e.target.value);
                    if (sectionPermissions.contactsAtAddress.editable) {
                      updateProperty(property.id, { lastName: e.target.value });
                    }
                  }}
                  disabled={!sectionPermissions.contactsAtAddress.editable}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-3 h-3 text-gray-300" />
                  <input 
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-8 pr-4 py-2 text-xs font-bold"
                    placeholder={settings.labels.phone || "Phone"}
                    value={phone}
                    onChange={e => {
                      setPhone(e.target.value);
                      if (sectionPermissions.contactsAtAddress.editable) {
                        updateProperty(property.id, { phone: e.target.value });
                      }
                    }}
                    disabled={!sectionPermissions.contactsAtAddress.editable}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-3 h-3 text-gray-300" />
                  <input 
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-8 pr-4 py-2 text-xs font-bold"
                    placeholder={settings.labels.email || "Email"}
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (sectionPermissions.contactsAtAddress.editable) {
                        updateProperty(property.id, { email: e.target.value });
                      }
                    }}
                    disabled={!sectionPermissions.contactsAtAddress.editable}
                  />
                </div>
              </div>
              
              {/* Dynamic Custom Fields integrated into Contact Card */}
              <div className="space-y-3 mb-3">
                {settings.contactFields
                  .filter(f => f.scope !== 'Address' && f.visible && (!f.applicableTo || f.applicableTo === 'Both' || f.applicableTo === property.type))
                  .map(field => (
                    <div key={field.id} className="relative group/field">
                      {field.type === 'checkbox' ? (
                        <button 
                          onClick={() => {
                            const current = property.customData?.[field.id] || false;
                            updateProperty(property.id, { customData: { ...(property.customData || {}), [field.id]: !current } });
                          }}
                          className={cn(
                            "w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
                            property.customData?.[field.id] ? "bg-blue-50 text-blue-600 border-blue-100 shadow-sm" : "bg-white text-gray-400 border-[#E2E8F0]"
                          )}
                        >
                          <CheckCircle2 className={cn("w-3.5 h-3.5", property.customData?.[field.id] ? "opacity-100" : "opacity-30")} />
                          {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </button>
                      ) : (
                        <div className="relative">
                           <input 
                            type={field.type}
                            className={cn(
                              "w-full bg-white border rounded-xl px-4 py-2 text-xs font-bold transition-all",
                              field.required && !property.customData?.[field.id] ? "border-amber-200 bg-amber-50/30" : "border-[#E2E8F0] focus:ring-2 focus:ring-blue-500/10"
                            )}
                            placeholder={`${field.label}${field.required ? '*' : ''}`}
                            value={property.customData?.[field.id] || ''}
                            disabled={!sectionPermissions.contactsAtAddress.editable}
                            onChange={e => {
                              if (sectionPermissions.contactsAtAddress.editable) {
                                updateProperty(property.id, { customData: { ...(property.customData || {}), [field.id]: e.target.value } });
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input 
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs font-bold"
                  placeholder="Role"
                  value={role}
                  onChange={e => {
                    setRole(e.target.value);
                    if (sectionPermissions.contactsAtAddress.editable) {
                      updateProperty(property.id, { role: e.target.value });
                    }
                  }}
                  disabled={!sectionPermissions.contactsAtAddress.editable}
                />
                <button 
                  onClick={() => {
                    if (!sectionPermissions.contactsAtAddress.editable) return;
                    const newVal = !isDecisionMaker;
                    setIsDecisionMaker(newVal);
                    updateProperty(property.id, { isDecisionMaker: newVal });
                  }}
                  disabled={!sectionPermissions.contactsAtAddress.editable}
                  className={cn(
                    "w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
                    isDecisionMaker ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-50" : "bg-white text-gray-400 border-[#E2E8F0]"
                  )}
                >
                  <ShieldCheck className={cn("w-3 h-3", isDecisionMaker ? "opacity-100" : "opacity-30")} />
                  Decision Maker
                </button>
              </div>
            </div>

            {/* Additional Contacts */}
            {property.contacts?.map((contact, idx) => (
              <div key={contact.id} className="p-4 bg-white border border-[#E2E8F0] rounded-2xl animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Contact #{idx + 2}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (!sectionPermissions.contactsAtAddress.editable) return;
                      const updated = property.contacts.filter(c => c.id !== contact.id);
                      updateProperty(property.id, { contacts: updated });
                    }}
                    disabled={!sectionPermissions.contactsAtAddress.editable}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs font-bold"
                      placeholder="First Name"
                      value={contact.firstName || ''}
                      onChange={e => {
                        const updated = property.contacts.map(c => c.id === contact.id ? { ...c, firstName: e.target.value } : c);
                        if (sectionPermissions.contactsAtAddress.editable) {
                          updateProperty(property.id, { contacts: updated });
                        }
                      }}
                      disabled={!sectionPermissions.contactsAtAddress.editable}
                    />
                    <input 
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs font-bold"
                      placeholder="Last Name"
                      value={contact.lastName || ''}
                      onChange={e => {
                        const updated = property.contacts.map(c => c.id === contact.id ? { ...c, lastName: e.target.value } : c);
                        if (sectionPermissions.contactsAtAddress.editable) {
                          updateProperty(property.id, { contacts: updated });
                        }
                      }}
                      disabled={!sectionPermissions.contactsAtAddress.editable}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-3 h-3 text-gray-300" />
                      <input 
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-4 py-2 text-xs font-bold"
                        placeholder="Phone"
                        value={contact.phone || ''}
                        onChange={e => {
                          const updated = property.contacts.map(c => c.id === contact.id ? { ...c, phone: e.target.value } : c);
                          if (sectionPermissions.contactsAtAddress.editable) {
                            updateProperty(property.id, { contacts: updated });
                          }
                        }}
                        disabled={!sectionPermissions.contactsAtAddress.editable}
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-3 h-3 text-gray-300" />
                      <input 
                        className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-4 py-2 text-xs font-bold"
                        placeholder="Email"
                        value={contact.email || ''}
                        onChange={e => {
                          const updated = property.contacts.map(c => c.id === contact.id ? { ...c, email: e.target.value } : c);
                          if (sectionPermissions.contactsAtAddress.editable) {
                            updateProperty(property.id, { contacts: updated });
                          }
                        }}
                        disabled={!sectionPermissions.contactsAtAddress.editable}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs font-bold"
                      placeholder="Role"
                      value={contact.role || ''}
                      onChange={e => {
                        const updated = property.contacts.map(c => c.id === contact.id ? { ...c, role: e.target.value } : c);
                        if (sectionPermissions.contactsAtAddress.editable) {
                          updateProperty(property.id, { contacts: updated });
                        }
                      }}
                      disabled={!sectionPermissions.contactsAtAddress.editable}
                    />
                    <button 
                      onClick={() => {
                        if (!sectionPermissions.contactsAtAddress.editable) return;
                        const updated = property.contacts.map(c => c.id === contact.id ? { ...c, isDecisionMaker: !c.isDecisionMaker } : c);
                        updateProperty(property.id, { contacts: updated });
                      }}
                      disabled={!sectionPermissions.contactsAtAddress.editable}
                      className={cn(
                        "w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
                        contact.isDecisionMaker ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-50" : "bg-[#F8FAFC] text-gray-400 border-[#E2E8F0]"
                      )}
                    >
                      <ShieldCheck className={cn("w-3 h-3", contact.isDecisionMaker ? "opacity-100" : "opacity-30")} />
                      Decision Maker
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {property.type === 'Commercial' && (
          <section className="animate-in slide-in-from-top-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Business Name</label>
            <input 
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. Acme Corp"
              value={businessName}
              onChange={e => {
                setBusinessName(e.target.value);
                updateProperty(property.id, { businessName: e.target.value });
              }}
            />
          </section>
        )}

      </div>
    </motion.div>
  );
}

function RouteDetailOverlay({ 
  route, 
  properties, 
  onClose, 
  onFocusProperty, 
  onUpdateStatus,
  onRemoveProperty,
  onEditRoute
}: { 
  route: ProspectRoute, 
  properties: PropertyContact[], 
  onClose: () => void, 
  onFocusProperty: (id: string) => void,
  onUpdateStatus: (status: ProspectRoute['status']) => void,
  onRemoveProperty: (id: string) => void,
  onEditRoute: () => void
}) {
  const routeProperties = useMemo(() => {
    return properties.filter(p => route.propertyIds.includes(p.id));
  }, [properties, route.propertyIds]);

  const stats = useMemo(() => {
    return {
      total: routeProperties.length,
      completed: routeProperties.filter(p => p.status !== 'Not Visited').length,
      pending: routeProperties.filter(p => p.status === 'Not Visited').length
    };
  }, [routeProperties]);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-[5000] bg-white flex flex-col"
    >
      <div className="px-6 py-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-[#1E293B]">
          <button onClick={onClose} className="p-2 border border-[#E2E8F0] rounded-xl bg-white mr-1 text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-black">{route.name}</h2>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{stats.completed} / {stats.total} CONTACTED</p>
          </div>
        </div>
        <div className="flex gap-2">
          {route.status === 'In Progress' ? (
            <button 
              onClick={() => onUpdateStatus('Completed')}
              className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Finish
            </button>
          ) : route.status === 'Completed' ? (
            <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
              Completed
            </div>
          ) : (
            <button 
              onClick={() => onUpdateStatus('In Progress')}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100"
            >
              Start
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        <button 
          onClick={onEditRoute}
          className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-2xl flex items-center justify-center gap-3 text-indigo-600 font-black text-xs uppercase tracking-widest hover:border-indigo-400 hover:bg-indigo-50 transition-all mb-4"
        >
          <Plus className="w-4 h-4" />
          Add more houses to territory
        </button>
        {routeProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
              <Navigation className="w-8 h-8" />
            </div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No properties yet</p>
            <p className="text-xs font-bold text-slate-300 mt-1 max-w-[200px]">Click the button above to start adding points on the map.</p>
          </div>
        ) : (
          routeProperties.map(p => (
          <div 
            key={p.id}
            className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm flex items-center justify-between group transition-all hover:border-blue-200"
          >
            <div className="flex items-center gap-4 min-w-0 cursor-pointer flex-1" onClick={() => onFocusProperty(p.id)}>
               <div className={cn(
                 "w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0",
                 p.status === 'Not Visited' ? "bg-slate-100 text-slate-400" : "bg-blue-600"
               )}>
                 <Home className="w-5 h-5" />
               </div>
               <div className="min-w-0">
                 <h4 className="text-sm font-black text-[#1E293B] truncate uppercase">
                    {p.lastName ? `${p.lastName}, ${p.firstName}` : p.address.split(',')[0]}
                 </h4>
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-50">{p.status}</span>
                 </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveProperty(p.id);
                }}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Remove from route"
              >
                <MinusCircle className="w-4 h-4" />
              </button>
              {p.status !== 'Not Visited' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <ArrowRight className="w-5 h-5 text-gray-200 cursor-pointer" onClick={() => onFocusProperty(p.id)} />
              )}
            </div>
          </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// --- Prospects & Routes Management ---

function ProspectsOverlay({ 
  properties, 
  onDeleteProperty,
  setProperties,
  routes, 
  setRoutes, 
  team, 
  onClose,
  onFocusProperty,
  selectedPropertyId,
  setSelectedPropertyId,
  setIsDrawerOpen,
  isSelectionMode,
  setIsSelectionMode,
  newRoute,
  setNewRoute,
  isBuildingRoute,
  setIsBuildingRoute,
  setMapMode,
  setPromptConfig,
  workingRouteId,
  setWorkingRouteId,
  setMapCenter,
  setMapZoom,
  smartSortPropertyIds,
  setSelectingStartForRouteId
}: { 
  properties: PropertyContact[],
  onDeleteProperty: (id: string) => void,
  setProperties: React.Dispatch<React.SetStateAction<PropertyContact[]>>,
  routes: ProspectRoute[],
  setRoutes: React.Dispatch<React.SetStateAction<ProspectRoute[]>>,
  team: Member[],
  onClose: () => void,
  onFocusProperty: (id: string) => void,
  selectedPropertyId: string | null,
  setSelectedPropertyId: (id: string | null) => void,
  setIsDrawerOpen: (open: boolean) => void,
  isSelectionMode: boolean,
  setIsSelectionMode: (val: boolean) => void,
  newRoute: { id?: string, name: string, selectedIds: string[] },
  setNewRoute: React.Dispatch<React.SetStateAction<{ id?: string, name: string, selectedIds: string[] }>>,
  isBuildingRoute: boolean,
  setIsBuildingRoute: (val: boolean) => void,
  setMapMode: (mode: 'street' | 'satellite') => void,
  setPromptConfig: any,
  workingRouteId: string | null,
  setWorkingRouteId: (id: string | null) => void,
  setMapCenter: (pos: [number, number]) => void,
  setMapZoom: (zoom: number) => void,
  smartSortPropertyIds: (ids: string[]) => string[],
  setSelectingStartForRouteId: (id: string | null) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const onRouteIds = useMemo(() => {
    return new Set(routes.flatMap(r => r.propertyIds));
  }, [routes]);

  const prospects = useMemo(() => {
    // Filter out customers AND anyone already on an active route
    let list = properties.filter(p => !['customer'].includes(p.stage) && !onRouteIds.has(p.id));
    
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(p => {
        const inAddress = p.address?.toLowerCase().includes(s) || false;
        const inName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(s);
        const inPhone = p.phone?.toLowerCase().includes(s) || false;
        const inEmail = p.email?.toLowerCase().includes(s) || false;
        
        const inCustom = p.customData ? Object.values(p.customData).some(val => 
          String(val || '').toLowerCase().includes(s)
        ) : false;

        const inContacts = p.contacts?.some(c => 
          (c.firstName || '').toLowerCase().includes(s) ||
          (c.lastName || '').toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.phone?.toLowerCase().includes(s) ||
          (c.customData && Object.values(c.customData).some(val => String(val || '').toLowerCase().includes(s)))
        ) || false;

        return inAddress || inName || inPhone || inEmail || inCustom || inContacts;
      });
    }
    
    const uniqueResult = new Map<string, PropertyContact>();
    list.forEach(p => {
      const key = normalizeAddress(p.address);
      const existing = uniqueResult.get(key);
      if (!existing || STAGE_ORDER.indexOf(p.stage) > STAGE_ORDER.indexOf(existing.stage)) {
        uniqueResult.set(key, p);
      }
    });
    return Array.from(uniqueResult.values());
  }, [properties, searchTerm, onRouteIds]);

  const [activeTab, setActiveTab] = useState<'prospects' | 'routes'>('prospects');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const createRoute = () => {
    if (newRoute.selectedIds.length === 0) return;
    
    if (newRoute.id) {
      setRoutes(prev => prev.map(r => r.id === newRoute.id ? {
        ...r,
        name: newRoute.name.trim() || r.name,
        propertyIds: newRoute.selectedIds
      } : r));
    } else {
      // Default name logic: (YYYY-MM-DD) - [Rep Name]
      let finalName = newRoute.name.trim();
      if (!finalName) {
        const dateStr = new Date().toISOString().split('T')[0];
        const repName = team?.find(m => m.id === 'm1')?.name?.split(' ')[0] || 'Team';
        finalName = `${dateStr} - ${repName}`;
      }
      
      const r: ProspectRoute = {
        id: uuidv4(),
        name: finalName,
        propertyIds: newRoute.selectedIds,
        status: 'Draft',
        createdAt: Date.now()
      };
      setRoutes(prev => [...prev, r]);
    }
    
    setIsBuildingRoute(false);
    setIsSelectionMode(false);
    setMapMode('street');
    setNewRoute({ name: '', selectedIds: [] });
  };
  const deleteRoute = (id: string) => {
    // Just delete the route object, keep the property records
    setRoutes(prev => prev.filter(r => r.id !== id));
  };

  if (selectedRouteId) {
    const route = routes.find(r => r.id === selectedRouteId);
    if (route) {
      return (
        <RouteDetailOverlay 
          route={route}
          properties={properties}
          onClose={() => setSelectedRouteId(null)}
          onFocusProperty={onFocusProperty}
          onUpdateStatus={(status) => {
            setRoutes(prev => prev.map(r => r.id === route.id ? { 
              ...r, 
              status, 
              startedAt: status === 'In Progress' ? Date.now() : r.startedAt,
              completedAt: status === 'Completed' ? Date.now() : r.completedAt
            } : r));
          }}
          onRemoveProperty={(pid) => {
            setRoutes(prev => prev.map(r => r.id === route.id ? {
              ...r,
              propertyIds: r.propertyIds.filter(id => id !== pid)
            } : r));
          }}
          onEditRoute={() => {
            setIsBuildingRoute(true);
            setIsSelectionMode(true);
            setMapMode('satellite');
            setNewRoute({ id: route.id, name: route.name, selectedIds: route.propertyIds });
            setSelectedRouteId(null);
            onClose();
          }}
        />
      );
    }
  }

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[4000] bg-white flex flex-col"
    >
      <div className="px-6 py-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-[#1E293B]">
          <button onClick={onClose} className="p-2 border border-[#E2E8F0] rounded-xl bg-white mr-1 text-gray-500 hover:text-blue-600 transition-colors" title="Back">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-black">Neighborhood Sourcing</h2>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-white border-b border-[#E2E8F0]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-400"
            placeholder="Search address or business..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex border-b border-[#E2E8F0]">
        <button 
          onClick={() => setActiveTab('prospects')}
          className={cn(
            "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2",
            activeTab === 'prospects' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400"
          )}
        >
          Untapped Prospects ({prospects.length})
        </button>
        <button 
          onClick={() => setActiveTab('routes')}
          className={cn(
            "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2",
            activeTab === 'routes' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400"
          )}
        >
          Active Routes ({routes.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
        {activeTab === 'prospects' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E2E8F0] p-6 rounded-[32px] shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1E293B]">Route Builder</h3>
                  <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase">Plan your next territory</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsBuildingRoute(true);
                  setIsSelectionMode(true);
                  setMapMode('satellite');
                  onClose();
                }}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                Build territory route
              </button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Prospects ({prospects.length})</p>
            </div>

            <div className="space-y-3">
              {prospects.map(p => (
                <div 
                  key={p.id} 
                  className="bg-white p-4 border border-[#E2E8F0] rounded-2xl shadow-sm flex items-center justify-between group cursor-pointer transition-all hover:border-blue-200"
                  onClick={() => onFocusProperty(p.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                         style={{ backgroundColor: STAGE_COLORS[p.stage] }}>
                      <Home className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-[#1E293B] truncate uppercase">
                          {p.lastName ? `${p.lastName}, ${p.firstName}` : p.address.split(',')[0]}
                        </h4>
                        {onRouteIds.has(p.id) && (
                          <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shrink-0 border border-blue-200">
                            On Route
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                        {p.lastName ? p.address : p.address.split(',').slice(1, 4).join(', ')}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(p.id);
                    }}
                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'routes' && (
          <div className="space-y-4">
            {routes.map(route => {
              const routeProperties = properties.filter(p => route.propertyIds.includes(p.id));
              const contactedCount = routeProperties.filter(p => p.status !== 'Not Visited').length;
              const apptsCount = routeProperties.reduce((acc, p) => acc + (p.appointments?.length || 0), 0);
              const quotesCount = routeProperties.reduce((acc, p) => acc + (p.quotes?.length || 0), 0);
              const salesTotal = routeProperties.reduce((acc, p) => acc + (p.sales?.reduce((sAcc, s) => sAcc + s.amount, 0) || 0), 0);
              const customerCount = routeProperties.filter(p => p.stage === 'customer').length;
              const assignedUser = route.assignedMemberId ? team.find(m => m.id === route.assignedMemberId) : null;

              return (
                <div key={route.id} className="bg-white border border-[#E2E8F0] rounded-[32px] overflow-hidden shadow-sm flex flex-col group transition-all hover:shadow-md">
                  <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative shrink-0">
                        <select 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          value={route.assignedMemberId || ''}
                          onChange={(e) => {
                            const updated = routes.map(r => r.id === route.id ? { ...r, assignedMemberId: e.target.value, status: e.target.value ? 'Assigned' as const : 'Draft' as const } : r);
                            setRoutes(updated);
                          }}
                        >
                          <option value="">Assign Rep</option>
                          {team.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-lg font-black text-slate-400 shadow-inner border border-slate-200/50 hover:bg-slate-200 transition-colors">
                          {assignedUser?.name?.[0] || '?'}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                          <Users className="w-2.5 h-2.5 text-slate-400" />
                        </div>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[17px] font-black text-[#1E293B] leading-tight truncate uppercase tracking-tight mb-1">
                          {route.name}
                        </h4>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-[#1E293B]">{route.propertyIds.length}</span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">prospects</span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-sm font-black text-emerald-600">${salesTotal.toLocaleString()}</span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">revenue</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid - 4 Column Layout */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Contacted</span>
                        <span className="text-lg font-black text-[#1E293B]">{contactedCount}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Appts</span>
                        <span className="text-lg font-black text-[#1E293B]">{apptsCount}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Quotes</span>
                        <span className="text-lg font-black text-[#1E293B]">{quotesCount}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Customer</span>
                        <span className="text-lg font-black text-[#1E293B]">{customerCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex border-t border-[#F1F5F9] min-h-[72px]">
                    <button 
                      onClick={() => {
                        if (route.status !== 'In Progress') {
                          setMapMode('street');
                          setSelectingStartForRouteId(route.id);
                          onClose();
                        } else {
                          setRoutes(prev => prev.map(r => r.id === route.id ? { 
                            ...r, 
                            status: 'Completed',
                            completedAt: Date.now()
                          } : r));
                          if (workingRouteId === route.id) setWorkingRouteId(null);
                        }
                      }}
                      className={cn(
                        "flex-1 text-[11px] font-black uppercase tracking-[0.1em] transition-all",
                        route.status === 'In Progress' ? "text-emerald-500 hover:bg-emerald-50 bg-emerald-50/20" : "text-indigo-600 hover:bg-indigo-50"
                      )}
                    >
                      {route.status === 'In Progress' ? 'Complete' : 'Start'}
                    </button>
                    <div className="w-[1px] bg-[#F1F5F9]" />
                    <button 
                      onClick={() => {
                        setIsBuildingRoute(true);
                        setIsSelectionMode(true);
                        setMapMode('satellite');
                        setNewRoute({ id: route.id, name: route.name, selectedIds: route.propertyIds });
                        onClose();
                      }}
                      className="flex-1 text-[11px] font-black uppercase tracking-[0.1em] text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      Add
                    </button>
                    <div className="w-[1px] bg-[#F1F5F9]" />
                    <button 
                      onClick={() => deleteRoute(route.id)}
                      className="flex-1 text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Catalog Management UI ---

function LeadsOverlay({ 
  properties, 
  onDeleteProperty,
  settings,
  onClose,
  onFocusProperty
}: { 
  properties: PropertyContact[],
  onDeleteProperty: (id: string) => void,
  settings: AppSettings,
  onClose: () => void,
  onFocusProperty: (id: string) => void
}) {
  const [filter, setFilter] = useState<PropertyStage | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProperties = useMemo(() => {
    let list: PropertyContact[] = [];
    if (filter === 'all') list = properties;
    else list = properties.filter(p => p.stage === filter);

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(p => {
        const inAddress = p.address?.toLowerCase().includes(s) || false;
        const inName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(s);
        const inPhone = p.phone?.toLowerCase().includes(s) || false;
        const inEmail = p.email?.toLowerCase().includes(s) || false;
        const inBusiness = p.businessName?.toLowerCase().includes(s) || false;
        
        const inCustom = p.customData ? Object.values(p.customData).some(val => 
          String(val || '').toLowerCase().includes(s)
        ) : false;

        const inContacts = p.contacts?.some(c => 
          (c.firstName || '').toLowerCase().includes(s) ||
          (c.lastName || '').toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.phone?.toLowerCase().includes(s) ||
          (c.customData && Object.values(c.customData).some(val => String(val || '').toLowerCase().includes(s)))
        ) || false;

        return inAddress || inName || inPhone || inEmail || inBusiness || inCustom || inContacts;
      });
    }

    const uniqueResult = new Map<string, PropertyContact>();
    list.forEach(p => {
      const key = normalizeAddress(p.address);
      const existing = uniqueResult.get(key);
      if (!existing || STAGE_ORDER.indexOf(p.stage) > STAGE_ORDER.indexOf(existing.stage)) {
        uniqueResult.set(key, p);
      }
    });
    return Array.from(uniqueResult.values());
  }, [properties, filter, searchTerm]);

  const handleDelete = (id: string) => {
    onDeleteProperty(id);
    setDeleteConfirmId(null);
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[4000] bg-white flex flex-col"
    >
      <div className="px-6 py-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-[#1E293B]">
          <button onClick={onClose} className="p-2 border border-[#E2E8F0] rounded-xl bg-white mr-1 text-gray-500 hover:text-blue-600 transition-colors" title="Back">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-black">Property Database</h2>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-white border-b border-[#E2E8F0]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/10 placeholder:text-gray-400"
            placeholder="Search by name, address, phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex border-b border-[#E2E8F0] p-1 bg-gray-50 overflow-x-auto no-scrollbar">
        {(['all', 'prospect', 'lead', 'opportunity', 'customer'] as const).map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg m-1 whitespace-nowrap",
              filter === f ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {f === 'all' ? 'All' : (settings.labels.stages as any)[f] || f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC]">
        <div className="space-y-3">
          {filteredProperties.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-400">No properties found in this view</p>
            </div>
          ) : (
            filteredProperties.map(p => (
              <div 
                key={p.id} 
                className="bg-white p-4 border border-[#E2E8F0] rounded-2xl shadow-sm flex items-center justify-between group animate-in slide-in-from-left-2 transition-all hover:border-indigo-200"
                onClick={() => onFocusProperty(p.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                       style={{ backgroundColor: STAGE_COLORS[p.stage] || '#cbd5e1' }}>
                    {p.type === 'Commercial' ? <Building2 className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-sm font-black text-[#1E293B] truncate uppercase">
                      {p.lastName ? `${p.lastName}, ${p.firstName}` : p.address.split(',')[0]}
                    </h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                       {p.lastName ? p.address : p.address.split(',').slice(0, 3).join(', ')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[9px] font-black uppercase tracking-tighter opacity-50 px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100">{p.status}</span>
                       <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: STAGE_COLORS[p.stage] }}>
                         {(settings.labels.stages as any)[p.stage] || p.stage}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(p.id);
                    }}
                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-gray-200" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="p-6 border-t border-[#E2E8F0] bg-white">
        <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">
          Showing {filteredProperties.length} of {properties.length} Total Records
        </p>
      </div>

      <AnimatePresence>
        {deleteConfirmId && (
          <ConfirmDeleteModal 
            onConfirm={() => handleDelete(deleteConfirmId)}
            onCancel={() => setDeleteConfirmId(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ConfirmDeleteModal({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[6000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Delete Record?</h3>
        <p className="text-sm font-bold text-gray-400 leading-relaxed mb-8 uppercase tracking-tight">This action is permanent and cannot be undone.</p>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95 transition-all"
          >
            Yes, Delete Permanently
          </button>
          <button 
            onClick={onCancel}
            className="w-full bg-gray-50 text-gray-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            Nevermind, Keep it
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Catalog Management UI ---

function CatalogOverlay({ 
  catalog, 
  setCatalog, 
  onClose 
}: { 
  catalog: AppState['catalog'], 
  setCatalog: React.Dispatch<React.SetStateAction<AppState['catalog']>>, 
  onClose: () => void 
}) {
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingBundle, setIsAddingBundle] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, description: '', category: '' });
  const [newBundle, setNewBundle] = useState<Partial<Bundle>>({ name: '', description: '', productIds: [], discountLabel: 'Package Savings' });

  const addProduct = () => {
    if (newProduct.name && newProduct.price !== undefined) {
      if (editingProductId) {
        setCatalog(prev => ({
          ...prev,
          products: prev.products.map(p => p.id === editingProductId ? { ...p, ...newProduct } as Product : p)
        }));
        setEditingProductId(null);
      } else {
        const p: Product = {
          id: uuidv4(),
          name: newProduct.name,
          price: newProduct.price,
          description: newProduct.description || '',
          category: newProduct.category || ''
        };
        setCatalog(prev => ({ ...prev, products: [...prev.products, p] }));
      }
      setIsAddingProduct(false);
      setNewProduct({ name: '', price: 0, description: '', category: '' });
    }
  };

  const addBundle = () => {
    if (newBundle.name && newBundle.productIds && newBundle.productIds.length > 0) {
      if (editingBundleId) {
        setCatalog(prev => ({
          ...prev,
          bundles: prev.bundles.map(b => b.id === editingBundleId ? { 
            ...b, 
            name: newBundle.name!,
            description: newBundle.description || '',
            productIds: newBundle.productIds!,
            discountType: newBundle.discountType,
            discountValue: newBundle.discountValue,
            discountLabel: newBundle.discountLabel
          } : b)
        }));
        setEditingBundleId(null);
      } else {
        const b: Bundle = {
          id: uuidv4(),
          name: newBundle.name,
          description: newBundle.description || '',
          productIds: newBundle.productIds,
          discountType: newBundle.discountType,
          discountValue: newBundle.discountValue,
          discountLabel: newBundle.discountLabel || 'Package Savings'
        };
        setCatalog(prev => ({ ...prev, bundles: [...prev.bundles, b] }));
      }
      setIsAddingBundle(false);
      setNewBundle({ name: '', description: '', productIds: [], discountLabel: 'Package Savings' });
    }
  };

  const getBundlePrices = (b: Partial<Bundle>) => {
    const productsInBundle = b.productIds?.map(pid => catalog.products.find(p => p.id === pid)).filter(Boolean) || [];
    const totalOriginal = productsInBundle.reduce((sum, p) => sum + (p?.price || 0), 0);
    let discounted = totalOriginal;
    if (b.discountType === 'percentage' && b.discountValue) {
      discounted = totalOriginal * (1 - b.discountValue / 100);
    } else if (b.discountType === 'fixed' && b.discountValue) {
      discounted = Math.max(0, totalOriginal - b.discountValue);
    }
    return { totalOriginal, discounted };
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[3000] bg-white flex flex-col shadow-2xl"
    >
      <div className="px-6 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3 text-[#1E293B]">
          <button onClick={onClose} className="p-2 border border-gray-100 rounded-xl bg-white mr-1 text-gray-500 hover:text-blue-600 transition-colors shadow-sm" title="Back">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-black">Catalog Design</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
        <div className="space-y-12">
          {/* Products Section */}
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-400" />
                <h3 className="text-[10px] font-black uppercase text-blue-900/40 tracking-widest leading-none">Standard Items</h3>
              </div>
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-100 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            {isAddingProduct && (
              <div className="bg-white border-2 border-blue-100 rounded-3xl p-6 shadow-xl animate-in zoom-in-95">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Product Name"
                      value={newProduct.name || ''}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    />
                    <input 
                      type="number"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Price"
                      value={newProduct.price || ''}
                      onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <input 
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Category"
                    value={newProduct.category || ''}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setIsAddingProduct(false); setEditingProductId(null); setNewProduct({name:'', price:0}); }} className="flex-1 py-3 text-xs font-bold text-gray-500">Cancel</button>
                    <button onClick={addProduct} className="flex-2 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100">{editingProductId ? 'Update' : 'Save'} Product</button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catalog.products.map(p => (
                <div key={p.id} className="bg-white p-4 border border-[#E2E8F0] rounded-2xl shadow-sm flex justify-between items-center group transition-all hover:border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#1E293B]">{p.name}</p>
                      <p className="text-[10px] font-bold text-gray-400">${p.price.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingProductId(p.id);
                        setNewProduct(p);
                        setIsAddingProduct(true);
                      }}
                      className="p-2 text-gray-300 hover:text-blue-500 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCatalog(prev => ({ ...prev, products: prev.products.filter(i => i.id !== p.id) }))}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Bundles Section */}
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-blue-400" />
                <h3 className="text-[10px] font-black uppercase text-blue-900/40 tracking-widest leading-none">Incentivized Bundles</h3>
              </div>
              <button 
                onClick={() => setIsAddingBundle(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-100 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Design Bundle
              </button>
            </div>

            {isAddingBundle && (
              <div className="bg-white border-2 border-blue-100 rounded-[32px] overflow-hidden shadow-2xl shadow-blue-100/50 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Details & Selection */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Bundle Identity</label>
                        <input 
                          className="w-full bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-2xl px-6 py-4 text-base font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                          placeholder="e.g. Premium Solar Package"
                          value={newBundle.name || ''}
                          onChange={e => setNewBundle({...newBundle, name: e.target.value})}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-end px-1">
                          <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Select Included Products</label>
                          <span className="text-[10px] font-bold text-gray-400">{(newBundle.productIds || []).length} SELECTED</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1 pr-2 scrollbar-thin scrollbar-thumb-blue-100">
                          {catalog.products.map(p => (
                            <div 
                              key={p.id}
                              onClick={() => {
                                const ids = newBundle.productIds || [];
                                const updated = ids.includes(p.id) ? ids.filter(i => i !== p.id) : [...ids, p.id];
                                setNewBundle({...newBundle, productIds: updated});
                              }}
                              className={cn(
                                "group p-4 rounded-2xl border-2 text-xs font-bold flex items-center justify-between cursor-pointer transition-all duration-200",
                                newBundle.productIds?.includes(p.id) 
                                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                                  : "bg-[#F8FAFC] border-gray-100 text-gray-500 hover:border-blue-200 hover:bg-white"
                              )}
                            >
                              <div className="flex flex-col">
                                <span>{p.name}</span>
                                <span className={cn(
                                  "text-[9px] mt-0.5",
                                  newBundle.productIds?.includes(p.id) ? "text-blue-100" : "text-gray-400"
                                )}>${p.price.toLocaleString()}</span>
                              </div>
                              {newBundle.productIds?.includes(p.id) 
                                ? <CheckCircle2 className="w-4 h-4" /> 
                                : <Plus className="w-4 h-4 opacity-30 group-hover:opacity-100" />
                              }
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Calculations & Discount */}
                    <div className="space-y-6">
                      <div className="p-6 bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-[28px] space-y-5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Tag className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Pricing & Incentive Item</span>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-1.5 text-right">
                            <label className="text-[9px] font-black uppercase text-blue-600/50 mr-1">Discount Label (Line Item)</label>
                            <input 
                              className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                              placeholder="e.g. Bundle Discount"
                              value={newBundle.discountLabel || ''}
                              onChange={e => setNewBundle({...newBundle, discountLabel: e.target.value})}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase text-blue-600/50 ml-1">Type</label>
                              <select 
                                className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                value={newBundle.discountType || ''}
                                onChange={e => setNewBundle({...newBundle, discountType: e.target.value as any})}
                              >
                                <option value="">No Discount</option>
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount ($)</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase text-blue-600/50 ml-1">Value</label>
                              <input 
                                type="number"
                                className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                placeholder="0"
                                value={newBundle.discountValue || ''}
                                onChange={e => setNewBundle({...newBundle, discountValue: parseFloat(e.target.value)})}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-2 border-t border-blue-100">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-blue-900/40 uppercase">Bundle Total</span>
                            <div className="text-right">
                              {newBundle.discountValue ? (
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-gray-400 line-through">${getBundlePrices(newBundle).totalOriginal.toFixed(2)}</span>
                                  <span className="text-2xl font-black text-blue-600 tracking-tight">${getBundlePrices(newBundle).discounted.toFixed(2)}</span>
                                </div>
                              ) : (
                                <span className="text-2xl font-black text-[#1E293B] tracking-tight">${getBundlePrices(newBundle).totalOriginal.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => { setIsAddingBundle(false); setEditingBundleId(null); setNewBundle({name:'', productIds:[], discountLabel: 'Package Savings'}); }} 
                      className="flex-1 py-4 text-sm font-black text-gray-500 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={addBundle} 
                      className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl text-base font-black shadow-xl shadow-blue-200 hover:scale-[1.03] active:scale-[0.97] transition-all"
                    >
                      {editingBundleId ? 'Update Package' : 'Create Package'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {catalog.bundles.map(b => {
              const { totalOriginal, discounted } = getBundlePrices(b);
              const savings = totalOriginal - discounted;
              
              return (
                <div key={b.id} className="bg-white border-2 border-[#E2E8F0] rounded-[32px] overflow-hidden shadow-sm group hover:border-blue-200 transition-all duration-300">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1 pr-4">
                        <h4 className="text-lg font-black text-[#1E293B] leading-tight mb-2 uppercase tracking-tight">{b.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                            {b.productIds.length} SERVICES
                          </span>
                          {savings > 0 && (
                            <div className="flex items-center gap-1.5 ml-1">
                              <span className="text-xs font-bold text-gray-300 line-through tracking-tighter">${totalOriginal.toLocaleString()}</span>
                              <span className="text-sm font-black text-emerald-600 tracking-tight bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">
                                ${discounted.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {savings <= 0 && (
                            <span className="text-sm font-black text-[#1E293B] tracking-tight">${totalOriginal.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Package className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {b.productIds.map(pid => {
                        const p = catalog.products.find(prod => prod.id === pid);
                        return (
                          <span key={pid} className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl text-[10px] font-bold text-[#64748B] flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            {p?.name}
                          </span>
                        );
                      })}
                    </div>

                    {b.discountLabel && savings > 0 && (
                      <div className="mb-6 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100/50 rounded-xl">
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">{b.discountLabel} Applied</span>
                      </div>
                    )}

                    <div className="flex border-t border-[#F1F5F9] -mx-6 -mb-6 mt-4">
                      <button 
                        onClick={() => {
                          setNewBundle(b);
                          setEditingBundleId(b.id);
                          setIsAddingBundle(true);
                        }}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#64748B] hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 border-r border-[#F1F5F9]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Configure
                      </button>
                      <button 
                        onClick={() => setCatalog(prev => ({ ...prev, bundles: prev.bundles.filter(i => i.id !== b.id) }))}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

// --- Helper Components & Functions ---

function TabButton({ active, onClick, label, icon: Icon }: { active: boolean, onClick: () => void, label: string, icon: any }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center gap-1.5 py-4 border-b-2 transition-all",
        active ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#94A3B8]"
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-extrabold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function StatCard({ label, value, color }: { label: string, value: number, color: 'blue' | 'green' | 'yellow' }) {
  const colors = {
    blue: 'bg-blue-600 shadow-blue-200',
    green: 'bg-emerald-600 shadow-emerald-200',
    yellow: 'bg-amber-600 shadow-amber-200'
  };
  return (
    <div className={cn("flex-1 p-3 rounded-2xl shadow-lg text-white pointer-events-auto", colors[color])}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function NavButton({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className={cn(
      "flex flex-col items-center gap-1 transition-all",
      active ? "text-[#2563EB]" : "text-[#64748B]"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
        active ? "bg-[#DBEAFE]" : "bg-transparent border-2 border-[#CBD5E1]"
      )}>
        {active ? (
          <div className="w-2.5 h-2.5 bg-[#2563EB] rounded-full" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>
      <span className="text-[10px] font-extrabold uppercase tracking-tight">{label}</span>
    </button>
  );
}

function ActionButton({ icon: Icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <button className="flex flex-col items-center gap-2">
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors",
        `border-gray-100 bg-gray-50 text-gray-500`
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] font-bold uppercase text-gray-400">{label}</span>
    </button>
  );
}

function SettingsOverlay({ 
  settings, 
  setSettings, 
  catalog, 
  setCatalog, 
  team, 
  setTeam, 
  goals, 
  setGoals, 
  onClose, 
  properties, 
  setPromptConfig,
  initialTab = 'business'
}: { 
  settings: AppSettings, 
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
  catalog: AppState['catalog'],
  setCatalog: React.Dispatch<React.SetStateAction<AppState['catalog']>>,
  team: Member[],
  setTeam: React.Dispatch<React.SetStateAction<Member[]>>,
  goals: Goal[],
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>,
  onClose: () => void,
  properties: PropertyContact[],
  setPromptConfig: any,
  initialTab?: 'business' | 'general' | 'targets' | 'contact' | 'catalog' | 'labels' | 'team'
}) {
  const [activeConfig, setActiveConfig] = useState<'business' | 'general' | 'targets' | 'contact' | 'catalog' | 'labels' | 'team'>(initialTab);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[4000] bg-white flex flex-col"
    >
      <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-[#1E293B]">
          <button onClick={onClose} className="p-2 border border-[#E2E8F0] rounded-xl bg-white mr-1 text-gray-500 hover:text-blue-600 transition-colors shadow-sm" title="Back">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-lg font-black">Dashboard Settings</h2>
          </div>
        </div>
      </div>

      <div className="flex border-b border-[#E2E8F0] overflow-x-auto no-scrollbar">
        {['business', 'general', 'targets', 'contact', 'catalog', 'labels', 'team'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveConfig(tab as any)}
            className={cn(
              "px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap",
              activeConfig === tab ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-gray-400"
            )}
          >
            {tab === 'catalog' ? settings.labels.catalog : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
        {activeConfig === 'business' && (
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Business Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Company Name</label>
                <input 
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={settings.businessInfo.name}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, 
                    businessInfo: { ...prev.businessInfo, name: e.target.value }
                  }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Street Address</label>
                <input 
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={settings.businessInfo.address}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, 
                    businessInfo: { ...prev.businessInfo, address: e.target.value }
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">City</label>
                <input 
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={settings.businessInfo.city}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, 
                    businessInfo: { ...prev.businessInfo, city: e.target.value }
                  }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">State</label>
                  <input 
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    value={settings.businessInfo.state}
                    onChange={(e) => setSettings(prev => ({
                      ...prev, 
                      businessInfo: { ...prev.businessInfo, state: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Zip</label>
                  <input 
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    value={settings.businessInfo.zip}
                    onChange={(e) => setSettings(prev => ({
                      ...prev, 
                      businessInfo: { ...prev.businessInfo, zip: e.target.value }
                    }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Phone</label>
                <input 
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={settings.businessInfo.phone}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, 
                    businessInfo: { ...prev.businessInfo, phone: e.target.value }
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email</label>
                <input 
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  value={settings.businessInfo.email}
                  onChange={(e) => setSettings(prev => ({
                    ...prev, 
                    businessInfo: { ...prev.businessInfo, email: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>
        )}

        {activeConfig === 'targets' && (
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#1E293B]">Operational Targets</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Configure the baseline values tracked on your Live Operational Systems dashboard.
            </p>
            <div className="space-y-5 bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Weekly Territory Knocks Target</label>
                <input 
                  type="number"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                  value={settings.operationalTargets?.weeklyKnocks ?? 40}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSettings(prev => ({
                      ...prev,
                      operationalTargets: {
                        ...(prev.operationalTargets || { weeklyKnocks: 40, monthlyConverted: 15, collectionGoal: 3000 }),
                        weeklyKnocks: val
                      }
                    }));
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Monthly Converted Clients Target</label>
                <input 
                  type="number"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                  value={settings.operationalTargets?.monthlyConverted ?? 15}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSettings(prev => ({
                      ...prev,
                      operationalTargets: {
                        ...(prev.operationalTargets || { weeklyKnocks: 40, monthlyConverted: 15, collectionGoal: 3000 }),
                        monthlyConverted: val
                      }
                    }));
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Weekly Collection Target ($)</label>
                <input 
                  type="number"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                  value={settings.operationalTargets?.collectionGoal ?? 3000}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSettings(prev => ({
                      ...prev,
                      operationalTargets: {
                        ...(prev.operationalTargets || { weeklyKnocks: 40, monthlyConverted: 15, collectionGoal: 3000 }),
                        collectionGoal: val
                      }
                    }));
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ... existing configs ... */}
        {activeConfig === 'general' && (
          <div className="space-y-8">
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Observable Tags</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {settings.tags.map(tag => (
                  <div key={tag} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E2E8F0] rounded-full text-xs font-bold text-[#1E293B]">
                    {tag}
                    <button onClick={() => setSettings(prev => ({...prev, tags: prev.tags.filter(t => t !== tag)}))}>
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  id="new-tag-input"
                  className="flex-1 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs font-bold"
                  placeholder="Add new tag (e.g. Solar Ready)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (val && !settings.tags.includes(val)) {
                        setSettings(prev => ({...prev, tags: [...prev.tags, val]}));
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
            </section>
          </div>
        )}

        {activeConfig === 'contact' && (
          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Standard Contact Fields</h3>
              <div className="space-y-2">
                {[
                  { id: 'firstName', key: 'firstName', label: settings.labels.firstName || 'First Name', type: 'text' },
                  { id: 'lastName', key: 'lastName', label: settings.labels.lastName || 'Last Name', type: 'text' },
                  { id: 'phone', key: 'phone', label: settings.labels.phone || 'Phone', type: 'tel' },
                  { id: 'email', key: 'email', label: settings.labels.email || 'Email', type: 'email' }
                ].map(field => (
                  <div key={field.id} className="p-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <Lock className="w-3 h-3 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#1E293B]">{field.label}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">System Required • {field.type}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setPromptConfig({
                          title: 'Rename Field',
                          message: `What should we call "${field.label}"?`,
                          defaultValue: field.label,
                          onConfirm: (newLabel) => {
                            if (newLabel) {
                              setSettings(prev => ({
                                ...prev,
                                labels: { ...prev.labels, [field.key]: newLabel }
                              }));
                            }
                          }
                        });
                      }}
                      className="p-2 text-gray-300 hover:text-blue-500"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Custom Lead Fields</h3>
              <div className="space-y-3">
                {settings.contactFields.map(field => (
                  <div key={field.id} className="p-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setSettings(prev => ({
                          ...prev, 
                          contactFields: prev.contactFields.map(f => f.id === field.id ? { ...f, visible: !f.visible } : f)
                        }))}
                        className={cn(
                          "w-10 h-6 rounded-full transition-colors relative",
                          field.visible ? "bg-green-500" : "bg-gray-200"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-white absolute top-1 transition-all",
                          field.visible ? "left-5" : "left-1"
                        )} />
                      </button>
                      <div>
                        <p className={cn("text-sm font-black transition-opacity", field.visible ? "text-[#1E293B]" : "text-gray-300 line-through")}>{field.label}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                          {field.type} • {field.required ? 'Required' : 'Optional'} • {field.applicableTo || 'Both'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setPromptConfig({
                            title: 'Field Options',
                            message: `Configure "${field.label}"`,
                            type: 'select',
                            options: [
                             { label: 'Rename Field', value: 'rename' },
                             { label: 'Toggle Required', value: 'toggle_required' },
                             { label: 'Set Applicability', value: 'applicability' },
                             { label: 'Set Scope (Address/Contact)', value: 'scope' },
                             { label: 'Delete Field', value: 'delete' }
                           ],
                           onConfirm: (action) => {
                              if (action === 'rename') {
                                setPromptConfig({
                                  title: 'Rename Field',
                                  defaultValue: field.label,
                                  onConfirm: (label) => {
                                    if (label) setSettings(prev => ({...prev, contactFields: prev.contactFields.map(f => f.id === field.id ? {...f, label} : f)}));
                                  }
                                });
                              } else if (action === 'toggle_required') {
                                setSettings(prev => ({
                                  ...prev,
                                  contactFields: prev.contactFields.map(f => f.id === field.id ? { ...f, required: !f.required } : f)
                                }));
                              } else if (action === 'applicability') {
                                setPromptConfig({
                                  title: 'Applicability',
                                  message: 'Where should this field show up?',
                                  type: 'select',
                                  options: [
                                    { label: 'Both', value: 'Both' },
                                    { label: 'Residential Only', value: 'Residential' },
                                    { label: 'Commercial Only', value: 'Commercial' }
                                  ],
                                  defaultValue: field.applicableTo || 'Both',
                                  onConfirm: (val) => {
                                    setSettings(prev => ({
                                      ...prev,
                                      contactFields: prev.contactFields.map(f => f.id === field.id ? { ...f, applicableTo: val as any } : f)
                                    }));
                                  }
                                });
                              } else if (action === 'scope') {
                                setPromptConfig({
                                  title: 'Field Scope',
                                  message: 'Where should this field be attached?',
                                  type: 'select',
                                  options: [
                                    { label: 'Contact (Default)', value: 'Contact' },
                                    { label: 'Address (e.g. Gate Code)', value: 'Address' }
                                  ],
                                  defaultValue: field.scope || 'Contact',
                                  onConfirm: (val) => {
                                    setSettings(prev => ({
                                      ...prev,
                                      contactFields: prev.contactFields.map(f => f.id === field.id ? { ...f, scope: val as any } : f)
                                    }));
                                  }
                                });
                              } else if (action === 'delete') {
                                setSettings(prev => ({...prev, contactFields: prev.contactFields.filter(f => f.id !== field.id)}));
                              }
                            }
                          });
                        }}
                        className="p-2 text-gray-300 hover:text-blue-500"
                      >
                        <SettingsIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => {
                  setPromptConfig({
                    title: 'New Custom Field',
                    message: 'Enter the label for this field',
                    placeholder: 'e.g. Roof Type',
                    onConfirm: (label) => {
                      if (label) {
                        setPromptConfig({
                          title: 'Field Type',
                          message: `What type of data is "${label}"?`,
                          type: 'select',
                          options: [
                            { label: 'Short Text', value: 'text' },
                            { label: 'Email Address', value: 'email' },
                            { label: 'Phone Number', value: 'tel' },
                            { label: 'Checkbox', value: 'checkbox' }
                          ],
                          defaultValue: 'text',
                          onConfirm: (type) => {
                            setPromptConfig({
                              title: 'Applicability',
                              message: 'Where should this field show up?',
                              type: 'select',
                              options: [
                                { label: 'Both', value: 'Both' },
                                { label: 'Residential Only', value: 'Residential' },
                                { label: 'Commercial Only', value: 'Commercial' }
                              ],
                              defaultValue: 'Both',
                              onConfirm: (applicableTo) => {
                                setPromptConfig({
                                  title: 'Field Scope',
                                  message: 'Where should this field be attached?',
                                  type: 'select',
                                  options: [
                                    { label: 'Contact (Default)', value: 'Contact' },
                                    { label: 'Address (e.g. Gate Code)', value: 'Address' }
                                  ],
                                  defaultValue: 'Contact',
                                  onConfirm: (scope) => {
                                    const newField: AppSettings['contactFields'][0] = { 
                                      id: uuidv4(), 
                                      label, 
                                      type: type as any, 
                                      required: false, 
                                      visible: true,
                                      applicableTo: applicableTo as any,
                                      scope: scope as any
                                    };
                                    setSettings(prev => ({...prev, contactFields: [...prev.contactFields, newField]}));
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    }
                  });
                }}
                className="w-full py-3 border-2 border-dashed border-[#CBD5E1] rounded-2xl text-xs font-bold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all mt-3"
              >
                + Add Custom Field
              </button>
            </section>
          </div>
        )}

        {activeConfig === 'catalog' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
               <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{settings.labels.catalog} Management</h3>
             </div>
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{settings.labels.discounts}</span>
                </div>
                <div className="space-y-2">
                  {settings.discounts.map(d => (
                    <div key={d.id} className="p-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center justify-between shadow-sm">
                       <div>
                        <p className="text-sm font-black text-[#1E293B]">{d.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{d.type === 'percentage' ? `${d.value}% Off` : `$${d.value} Off`}</p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setPromptConfig({
                              title: 'Rename Discount',
                              defaultValue: d.name,
                              onConfirm: (name) => {
                                if (name) {
                                  setPromptConfig({
                                    title: 'Update Value',
                                    defaultValue: d.value.toString(),
                                    onConfirm: (valStr) => {
                                      const value = parseFloat(valStr || '0');
                                      if (!isNaN(value)) {
                                        setSettings(prev => ({...prev, discounts: prev.discounts.map(item => item.id === d.id ? {...item, name, value} : item)}));
                                      }
                                    }
                                  });
                                }
                              }
                            });
                          }}
                          className="p-2 text-gray-300 hover:text-blue-500"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setSettings(prev => ({...prev, discounts: prev.discounts.filter(i => i.id !== d.id)}))}
                          className="p-2 text-gray-300 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => {
                    setPromptConfig({
                      title: 'New Discount',
                      message: 'Enter the name of the discount',
                      placeholder: 'e.g. Early Bird',
                      onConfirm: (name) => {
                        if (name) {
                          setPromptConfig({
                            title: 'Discount Value',
                            message: `How much is "${name}"?`,
                            placeholder: 'e.g. 10',
                            onConfirm: (valStr) => {
                              const value = parseFloat(valStr || '0');
                              if (!isNaN(value)) {
                                setPromptConfig({
                                  title: 'Discount Type',
                                  message: 'Is this a percentage or fixed amount?',
                                  type: 'select',
                                  options: [
                                    { label: 'Percentage (%)', value: 'percentage' },
                                    { label: 'Fixed Amount ($)', value: 'fixed' }
                                  ],
                                  defaultValue: 'percentage',
                                  onConfirm: (type) => {
                                    const newD: Discount = { id: uuidv4(), name, value, type: type as any };
                                    setSettings(prev => ({...prev, discounts: [...prev.discounts, newD]}));
                                  }
                                });
                              }
                            }
                          });
                        }
                      }
                    });
                  }}
                  className="w-full py-3 border-2 border-dashed border-[#CBD5E1] rounded-2xl text-xs font-bold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all"
                >
                  + Add global discount
                </button>
             </div>
          </div>
        )}

        {activeConfig === 'labels' && (
          <div className="space-y-8">
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Lifecycle Stages</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(settings.labels.stages).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-blue-600/50 ml-1">{key}</label>
                    <input 
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all capitalize"
                      value={value}
                      onChange={(e) => setSettings(prev => ({
                        ...prev, 
                        labels: { 
                          ...prev.labels, 
                          stages: { ...prev.labels.stages, [key]: e.target.value }
                        }
                      }))}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">General Terms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(settings.labels).filter(([key]) => key !== 'stages').map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{key}</label>
                    <input 
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      value={value as string}
                      onChange={(e) => setSettings(prev => ({
                        ...prev, 
                        labels: { ...prev.labels, [key]: e.target.value }
                      }))}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeConfig === 'team' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Team Members</h3>
              <button 
                onClick={() => {
                  setPromptConfig({
                    title: 'Add Team Member',
                    message: "Enter the member's full name",
                    placeholder: 'e.g. Sarah Smith',
                    onConfirm: (name) => {
                      if (name) {
                        setTeam(prev => [...prev, { id: uuidv4(), name, role: 'Closer', color: '#'+Math.floor(Math.random()*16777215).toString(16) }]);
                      }
                    }
                  });
                }}
                className="text-[10px] font-black uppercase text-blue-600"
              >
                + Add Member
              </button>
            </div>
            <div className="space-y-3">
              {team.map(member => (
                <div key={member.id} className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: member.color }} />
                    <div>
                      <p className="text-sm font-black text-[#1E293B]">{member.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{member.role}</p>
                    </div>
                  </div>
                  <button onClick={() => setTeam(prev => prev.filter(m => m.id !== member.id))} className="p-2 text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-[#E2E8F0]">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Performance Goals</h3>
              <div className="space-y-3">
                {goals.map(goal => {
                  const member = team.find(m => m.id === goal.memberId);
                  return (
                    <div key={goal.id} className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-[#1E293B]">{member?.name}'s {goal.type}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{goal.period}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-500" 
                          style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }} 
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] font-bold text-gray-400">{goal.current} / {goal.target} {goal.type}</span>
                        <button onClick={() => setGoals(prev => prev.filter(g => g.id !== goal.id))} className="text-[10px] text-red-400 uppercase font-bold">Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button 
                onClick={() => {
                  const memberId = team[0]?.id; // Default to first
                  if (!memberId) return alert('Add team members first');
                  
                  setPromptConfig({
                    title: 'New Goal',
                    message: 'Enter target amount',
                    placeholder: 'e.g. 50',
                    onConfirm: (targetStr) => {
                      const target = parseInt(targetStr || '0');
                      if (target) {
                        setPromptConfig({
                          title: 'Goal Type',
                          message: 'What are we measuring?',
                          type: 'select',
                          options: [
                            { label: 'Knocks', value: 'knocks' },
                            { label: 'Quotes Created', value: 'quotes' },
                            { label: 'Sales Closed', value: 'sales' }
                          ],
                          defaultValue: 'knocks',
                          onConfirm: (type) => {
                            setGoals(prev => [...prev, { id: uuidv4(), memberId, target, current: 0, type: type as any, period: 'weekly' }]);
                          }
                        });
                      }
                    }
                  });
                }}
                className="w-full py-3 border-2 border-dashed border-[#CBD5E1] rounded-2xl text-xs font-bold text-gray-400 mt-4"
              >
                + Set Performance Goal
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TeamOverlay({ team, goals, properties, settings, onClose }: {
  team: Member[],
  goals: Goal[],
  properties: PropertyContact[],
  settings: AppSettings,
  onClose: () => void
}) {
  const stats = useMemo(() => {
    // In a real app we'd have multiple users syncing.
    // For this local demo, we'll simulate performance by spreading real app data across members or just using the current user's data as "Team Performance"
    const totalKnocks = properties.filter(p => p.status !== 'Not Visited').length;
    const totalQuotes = properties.reduce((acc, p) => acc + (p.quotes?.length || 0), 0);
    const totalSales = properties.reduce((acc, p) => acc + (p.sales?.length || 0), 0);
    const totalVolume = properties.reduce((acc, p) => acc + (p.sales?.reduce((sAcc, s) => sAcc + s.amount, 0) || 0), 0);

    return { totalKnocks, totalQuotes, totalSales, totalVolume };
  }, [properties]);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[4000] bg-white flex flex-col"
    >
      <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-[#1E293B]">
          <button onClick={onClose} className="p-2 border border-[#E2E8F0] rounded-xl bg-white mr-1 text-gray-500 hover:text-blue-600 transition-colors shadow-sm" title="Back">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-black">{settings.labels.team} Dashboard</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#F8FAFC]">
        {/* Global Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total {settings.labels.sales}</p>
            <p className="text-2xl font-black text-[#1E293B]">${stats.totalVolume.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Closed Units</p>
            <p className="text-2xl font-black text-[#1E293B]">{stats.totalSales}</p>
          </div>
        </div>

        {/* Leaderboard Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Neighborhood Leaders</h3>
            <span className="text-[10px] font-bold text-gray-400 italic">Syncing with Google Calendar</span>
          </div>
          <div className="space-y-3">
            {team.map((member, i) => (
              <div key={member.id} className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white" style={{ backgroundColor: member.color }}>
                  {member.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-[#1E293B]">{member.name}</p>
                      <p className="text-[10px] text-[#64748B]">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue-600">
                        {Math.floor(stats.totalVolume / team.length * (1 - (i*0.2))).toLocaleString()}$
                      </p>
                      <button 
                        className="text-[9px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded mt-1 hover:bg-blue-100 transition-colors"
                        onClick={() => alert(`Connecting Google Account for ${member.name}...`)}
                      >
                        Connect Google
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Individual Goals Progress */}
        <section>
           <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">{settings.labels.goals} Progress</h3>
           <div className="space-y-4">
             {goals.map(goal => {
               const member = team.find(m => m.id === goal.memberId);
               // Mocking progress for other team members
               const progress = member?.id === 'm1' ? (stats as any)[`total${goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}`] || 0 : Math.floor(goal.target * 0.4);
               return (
                 <div key={goal.id} className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
                   <div className="flex justify-between items-center mb-3">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: member?.color }} />
                        <span className="text-xs font-black text-[#1E293B]">{member?.name}</span>
                     </div>
                     <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-500 uppercase">{goal.period}</span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mb-2 uppercase">
                     <span>{goal.type}</span>
                     <span>{Math.round((progress / goal.target) * 100)}%</span>
                   </div>
                   <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-blue-600 transition-all duration-1000"
                       style={{ width: `${Math.min(100, (progress / goal.target) * 100)}%` }}
                     />
                   </div>
                 </div>
               );
             })}
             {goals.length === 0 && (
               <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl">
                 <p className="text-xs font-bold text-gray-400 uppercase">No goals set yet</p>
                 <p className="text-[10px] text-gray-300 mt-1 uppercase">Go to Settings &gt; {settings.labels.team} to create one</p>
               </div>
             )}
           </div>
        </section>
      </div>
    </motion.div>
  );
}


const STAGE_COLORS: Record<PropertyStage, string> = {
  prospect: '#94a3b8',    // Slate/Gray - Not worked yet
  lead: '#3b82f6',        // Blue - Contacted/Warm
  opportunity: '#f59e0b', // Amber - Hot/Quote Sent
  customer: '#10b981'     // Emerald - Closed/Customer
};

// --- Scheduling & Calendar UI ---

function SaleOverlay({
  property,
  onClose,
  onSave
}: {
  property: PropertyContact,
  onClose: () => void,
  onSave: (sale: Sale) => void
}) {
  const [amount, setAmount] = useState('');
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[5000] bg-black/40 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-5xl h-full shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 uppercase">Record Sale</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Sale Amount ($)</label>
              <input 
                type="number"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-lg font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Product/Service Sold</label>
              <input 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                placeholder="e.g. Solar Installation"
                value={product}
                onChange={e => setProduct(e.target.value)}
              />
            </div>
          </div>

          <button 
            onClick={() => {
              if (!amount || !product) return;
              onSave({
                id: uuidv4(),
                amount: parseFloat(amount),
                product,
                createdAt: Date.now()
              });
              onClose();
            }}
            className="w-full bg-emerald-600 text-white py-5 rounded-[20px] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Confirm Sale
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function QuoteOverlay({
  property,
  catalog,
  onClose,
  onSave
}: {
  property: PropertyContact,
  catalog: { products: Product[], bundles: Bundle[] },
  onClose: () => void,
  onSave: (quote: Quote) => void
}) {
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'build' | 'preview'>('build');

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + (item.price * item.quantity), 0), [items]);

  const addProduct = (p: Product) => {
    setItems(prev => {
      const existing = prev.find(item => item.productId === p.id);
      if (existing) {
        return prev.map(item => item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        id: uuidv4(),
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: 1,
        description: p.description,
        isSelected: true
      }];
    });
  };

  const addBundle = (b: Bundle) => {
    b.productIds.forEach(pid => {
      const p = catalog.products.find(prod => prod.id === pid);
      if (p) addProduct(p);
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const handleSave = () => {
    if (items.length === 0) return;
    const quote: Quote = {
      id: uuidv4(),
      lineItems: items,
      discounts: [],
      subtotal,
      total: subtotal,
      status: 'Draft',
      createdAt: Date.now(),
      notes
    };
    onSave(quote);
    onClose();
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-[5000] bg-white flex flex-col"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">
              {step === 'build' ? 'Build Quote' : 'Review Selection'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">{property.address.split(',')[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {step === 'preview' && (
            <button 
              onClick={() => setStep('build')}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest"
            >
              Back
            </button>
          )}
          <button onClick={onClose} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {step === 'build' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Catalog Section */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50">
              {/* Bundles */}
              {catalog.bundles.length > 0 && (
                <section>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 block">Recommended Bundles</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catalog.bundles.map(b => (
                      <button 
                        key={b.id}
                        onClick={() => addBundle(b)}
                        className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm transition-all hover:shadow-md hover:border-blue-400 text-left group flex flex-col justify-between h-full"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-1 bg-blue-600 text-white text-[8px] font-black uppercase rounded-lg tracking-widest">Bundle</span>
                            <PlusCircle className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <h4 className="text-sm font-black text-slate-900 mb-1">{b.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 leading-relaxed mb-4">{b.description}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-auto">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                            {b.productIds.length} Premium Items
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Individual Items */}
              <section>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 block">A La Carte Items</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catalog.products.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-300 transition-all text-left flex justify-between items-center group active:scale-[0.98]"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-800 line-clamp-1">{p.name}</p>
                        <p className="text-[10px] font-black text-blue-600 tracking-tighter mt-0.5">${p.price.toLocaleString()}</p>
                      </div>
                      <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Plus className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Floating Selection Bar (Mobile Optimized) */}
            <div className="p-4 md:p-8 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0">
               <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] leading-none mb-1">Subtotal</span>
                   <span className="text-2xl font-black text-slate-900">${subtotal.toLocaleString()}</span>
                 </div>
                 <button 
                   disabled={items.length === 0}
                   onClick={() => setStep('preview')}
                   className="flex-1 h-16 bg-blue-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                   Review Selection
                   <ArrowRight className="w-4 h-4" />
                 </button>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="flex-1 overflow-y-auto p-6 md:p-12">
              <div className="max-w-5xl mx-auto space-y-12">
                {/* Visual Summary */}
                <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 text-center">Quote Line Items</h3>
                  <div className="divide-y divide-slate-200/50">
                    {items.map(item => (
                      <div key={item.id} className="py-4 flex items-center gap-4 group">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 font-black text-xs">
                          {item.quantity}x
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-slate-200 rounded-lg"><MinusCircle className="w-4 h-4 text-slate-400" /></button>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-slate-200 rounded-lg"><PlusCircle className="w-4 h-4 text-slate-400" /></button>
                          <button onClick={() => removeItem(item.id)} className="p-2 hover:bg-red-50 rounded-lg ml-1"><Trash2 className="w-4 h-4 text-red-400" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Quote Description / Notes</label>
                  <textarea 
                    autoFocus
                    className="w-full bg-white border border-slate-200 rounded-3xl p-6 text-sm font-bold min-h-[150px] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                    placeholder="Include specific installation details or warranty information..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-6 md:p-10 border-t border-slate-100 bg-white shadow-2xl shrink-0">
              <div className="max-w-5xl mx-auto flex flex-col gap-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Commercial Estimate</span>
                  <span className="text-3xl font-black text-slate-900">${subtotal.toLocaleString()}</span>
                </div>
                <button 
                  onClick={handleSave}
                  className="w-full h-16 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-blue-200/50 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-4"
                >
                  <Send className="w-5 h-5" />
                  Save & Send Draft
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CalendarOverlay({ 
  property, 
  team, 
  googleTokens, 
  onConnect, 
  onSchedule, 
  onClose 
}: { 
  property: PropertyContact,
  team: Member[],
  googleTokens: Record<string, string>,
  onConnect: (id: string) => void,
  onSchedule: (id: string, details: any) => void,
  onClose: () => void 
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(team[0]?.id || '');
  const [useRoundRobin, setUseRoundRobin] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(30);

  const getRoundRobinMember = () => {
    // Round robin logic pick the member with fewest appointments overall
    return team[Math.floor(Math.random() * team.length)].id;
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[4000] bg-black/40 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
          <div>
            <h2 className="text-lg font-black text-[#1E293B]">Schedule Visit</h2>
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{property.address.split(',')[0]}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white border border-[#E2E8F0] rounded-xl">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="text-[10px] font-extrabold uppercase text-[#94A3B8] mb-3 block">Assign To</label>
            <div className="flex gap-2 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <button 
                onClick={() => setUseRoundRobin(true)}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                  useRoundRobin ? "bg-white shadow-sm border border-[#E2E8F0] text-[#2563EB]" : "text-[#64748B] opacity-60"
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                Round Robin
              </button>
              <button 
                onClick={() => setUseRoundRobin(false)}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                  !useRoundRobin ? "bg-white shadow-sm border border-[#E2E8F0] text-[#2563EB]" : "text-[#64748B] opacity-60"
                )}
              >
                <User className="w-3.5 h-3.5" />
                Specific Rep
              </button>
            </div>
          </div>

          {!useRoundRobin && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {team.map(member => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 border rounded-2xl transition-all",
                    selectedMemberId === member.id ? "bg-blue-50 border-blue-200" : "bg-white border-[#E2E8F0]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: member.color }}>
                      {member.name[0]}
                    </div>
                    <p className="text-xs font-bold">{member.name}</p>
                  </div>
                  {googleTokens[member.id] && <Check className="w-3 h-3 text-emerald-500" />}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-extrabold uppercase text-[#94A3B8] mb-2 block">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold" 
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold uppercase text-[#94A3B8] mb-2 block">Time</label>
              <input 
                type="time" 
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm font-bold" 
              />
            </div>
          </div>

          <button 
            onClick={() => {
              const start = new Date(`${date}T${time}`).getTime();
              onSchedule(useRoundRobin ? team[0].id : selectedMemberId, {
                title: 'Sales Visit',
                startTime: start,
                endTime: start + (duration * 60 * 1000),
                notes: 'Scheduled from mobile app'
              });
            }}
            className="w-full bg-[#2563EB] text-white h-14 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100"
          >
            <Calendar className="w-5 h-5" />
            Schedule Visit
          </button>
        </div>
      </div>
    </motion.div>
  );
}
