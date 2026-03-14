'use client';

import Layout from '@/components/layout';
import { leagueSpartan } from '../restaurant-menu';
import Script from 'next/script';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { STORE_COORDINATES, type Coordinates } from '@/lib/distance';

type DeliveryStatus = 
    | 'pending' 
    | 'awaiting_confirmation' 
    | 'confirmed' 
    | 'preparing' 
    | 'ready' 
    | 'rider_arrived' 
    | 'rider_left' 
    | 'delivered';

type OrderRow = {
    id: number;
    created_at: string;
    user_id?: string | null;
    total_amount?: number | null;
    payment_status?: boolean | null;
    payment_method?: string | null;
    payment_reference?: string | null;
    delivery_status?: DeliveryStatus | null;
    delivery_tracking?: DeliveryStatus | null;
    delivery_address?: string | null;
    delivery_fee?: number | null;
    delivery_instructions?: string | null;
    vendor_instructions?: string | null;
    bank_receipt_url?: string | null;
    paid_at?: string | null;
    confirmed_at?: string | null;
    confirmed_by?: string | null;
    order_notes?: unknown;
    delivery_id?: string | null;
    rider_name?: string | null;
    rider_phone?: string | null;
    tracking_url?: string | null;
};

type OrderItemRow = {
    id: number;
    order_id: number;
    item_name?: string | null;
    quantity?: number | null;
    line_total?: number | null;
};

type ProfileRow = {
    id: string;
    full_name?: string | null;
    phone?: string | null;
};

type OrdersResponse = {
    success?: boolean;
    error?: string;
    orders?: OrderRow[];
    orderItems?: OrderItemRow[];
    profiles?: ProfileRow[];
};

type GeocoderStatusLike = {
    OK: string;
};

type GeocoderResultLike = {
    geometry: {
        location: {
            lat: () => number;
            lng: () => number;
        };
    };
};

type GeocoderLike = {
    geocode: (
        request: { address: string; region?: string },
        callback: (results: GeocoderResultLike[] | null, status: string) => void
    ) => void;
};

type GoogleMapsLike = {
    maps?: {
        Geocoder: new () => GeocoderLike;
        GeocoderStatus: GeocoderStatusLike;
    };
};

const STATUS_FLOW: DeliveryStatus[] = [
    'pending',
    'awaiting_confirmation',
    'confirmed',
    'preparing',
    'ready',
    'rider_arrived',
    'rider_left',
    'delivered'
];

// Store address for pickup
const STORE_PICKUP_ADDRESS = 'F725+8X6, Satellite Town, Lagos, Nigeria';

const STATUS_LABELS: Record<DeliveryStatus, string> = {
    pending: 'Pending',
    awaiting_confirmation: 'Awaiting Confirmation',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    rider_arrived: 'Rider Arrived',
    rider_left: 'Rider Left',
    delivered: 'Delivered'
};

const STATUS_COLORS: Record<DeliveryStatus, { bg: string; text: string; border: string }> = {
    pending: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    awaiting_confirmation: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    preparing: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    ready: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    rider_arrived: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    rider_left: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
    delivered: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' }
};

const TAB_STATUSES: { key: DeliveryStatus | 'all' | 'bank_pending'; label: string }[] = [
    { key: 'all', label: 'All Orders' },
    { key: 'bank_pending', label: 'Bank Transfer (Pending)' },
    { key: 'pending', label: 'Pending' },
    { key: 'awaiting_confirmation', label: 'Awaiting Confirmation' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready', label: 'Ready' },
    { key: 'rider_arrived', label: 'Rider Arrived' },
    { key: 'rider_left', label: 'Rider Left' },
    { key: 'delivered', label: 'Delivered' },
];

function parseJsonResponse<T>(raw: string, fallback: T): T {
    try {
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        return typeof parsed === 'object' && parsed !== null ? (parsed as T) : fallback;
    } catch {
        return fallback;
    }
}

function formatCurrency(value?: number | null) {
    if (value === null || value === undefined) return 'N/A';
    return `₦${Number(value).toLocaleString()}`;
}

function getStatusProgress(status: DeliveryStatus): number {
    const index = STATUS_FLOW.indexOf(status);
    if (index < 0) return 0;
    return ((index + 1) / STATUS_FLOW.length) * 100;
}

function calculateSubtotalFromOrderItems(items: OrderItemRow[]) {
    return items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
}

function calculateSubtotalFromNotes(items: Array<{ name: string; quantity: number; lineTotal?: number }>) {
    return items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
}

export default function VerifyOrdersPage() {
    const googleMaps =
        typeof window !== 'undefined' ? (window.google as GoogleMapsLike | undefined) : undefined;
    const [adminKey, setAdminKey] = useState('');
    const [authed, setAuthed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
    const [profiles, setProfiles] = useState<ProfileRow[]>([]);
    const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<DeliveryStatus | 'all' | 'bank_pending'>('all');
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
    const [bookingOrderId, setBookingOrderId] = useState<number | null>(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [mapsReady, setMapsReady] = useState(false);
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        const savedKey = sessionStorage.getItem('sk_admin_key');
        if (savedKey) {
            setAdminKey(savedKey);
            setAuthed(true);
            fetchAllOrders(savedKey);
        }
    }, []);

    const geocodeAddressInBrowser = async (address: string): Promise<Coordinates | null> => {
        if (!googleMaps?.maps?.Geocoder) {
            return null;
        }

        const geocoder = new googleMaps.maps.Geocoder();

        return new Promise((resolve) => {
            geocoder.geocode({ address, region: 'ng' }, (results, status) => {
                if (status !== googleMaps?.maps?.GeocoderStatus.OK || !results?.length) {
                    resolve(null);
                    return;
                }

                const location = results[0].geometry.location;
                resolve({
                    lat: location.lat(),
                    lng: location.lng(),
                });
            });
        });
    };

    const itemsByOrder = useMemo(() => {
        return orderItems.reduce<Record<number, OrderItemRow[]>>((acc, item) => {
            if (!acc[item.order_id]) acc[item.order_id] = [];
            acc[item.order_id].push(item);
            return acc;
        }, {});
    }, [orderItems]);

    const profilesById = useMemo(() => {
        return profiles.reduce<Record<string, ProfileRow>>((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});
    }, [profiles]);

    const getOrderStatus = (order: OrderRow): DeliveryStatus => {
        return order.delivery_tracking || order.delivery_status || 'pending';
    };

    const filteredOrders = useMemo(() => {
        if (activeTab === 'all') return orders;
        if (activeTab === 'bank_pending') {
            return orders.filter(order => 
                order.bank_receipt_url && 
                (!order.payment_status || order.payment_status === null)
            );
        }
        return orders.filter(order => getOrderStatus(order) === activeTab);
    }, [orders, activeTab]);

    const fetchAllOrders = async (keyOverride?: string) => {
        const key = keyOverride || adminKey;
        if (!key) return;

        setLoading(true);
        const res = await fetch('/api/admin/all-orders', {
            method: 'GET',
            headers: {
                'x-admin-key': key,
            },
        });

        const text = await res.text();
        const json = parseJsonResponse<OrdersResponse>(text, { error: "Invalid response from server" });

        setLoading(false);

        if (!res.ok || !json?.success) {
            toast.error(json?.error || 'Could not load orders');
            return false;
        }

        setOrders(json.orders || []);
        setOrderItems(json.orderItems || []);
        setProfiles(json.profiles || []);
        return true;
    };

    const handleAdminLogin = async () => {
        const ok = await fetchAllOrders(adminKey);
        if (!ok) return;
        sessionStorage.setItem('sk_admin_key', adminKey);
        setAuthed(true);
        toast.success('Admin access granted');
    };

    const handleVerifyTransfer = async (orderId: number, action: 'confirm' | 'reject') => {
        if (!adminKey) return;
        setProcessingOrderId(orderId);

        const res = await fetch('/api/admin/verify-transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey,
            },
            body: JSON.stringify({
                orderId,
                action,
            }),
        });

        const text = await res.text();
        const json = parseJsonResponse<{ success?: boolean; error?: string; message?: string }>(text, { error: "Invalid response" });

        setProcessingOrderId(null);

        if (!res.ok || !json?.success) {
            toast.error(json?.error || 'Could not process verification');
            return;
        }

        // Update the order in the list
        setOrders((prev) => prev.map((order) => 
            order.id === orderId 
                ? {
                    ...order,
                    payment_status: action === 'confirm',
                    delivery_tracking: action === 'confirm' ? 'awaiting_confirmation' : 'pending',
                  }
                : order
        ));
        toast.success(json.message || `Order #${orderId} ${action}ed successfully`);
    };

    const handleStatusUpdate = async (orderId: number, action: 'next' | 'previous' | 'set', status?: DeliveryStatus) => {
        if (!adminKey) return;
        setProcessingOrderId(orderId);

        const body: { orderId: number; action: 'next' | 'previous' | 'set'; status?: DeliveryStatus } = {
            orderId,
            action,
        };
        if (action === 'set' && status) {
            body.status = status;
        }

        const res = await fetch('/api/admin/update-order-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey,
            },
            body: JSON.stringify(body),
        });

        const text = await res.text();
        const json = parseJsonResponse<{ success?: boolean; error?: string; deliveryStatus?: DeliveryStatus }>(text, { error: "Invalid response" });

        setProcessingOrderId(null);

        if (!res.ok || !json?.success) {
            toast.error(json?.error || 'Could not update status');
            return;
        }

        // Update the order in the list
        setOrders((prev) => prev.map((order) => 
            order.id === orderId 
                ? { ...order, delivery_tracking: json.deliveryStatus }
                : order
        ));
        toast.success(`Order #${orderId} updated to ${STATUS_LABELS[json.deliveryStatus || 'pending']}`);
    };

    const handleBookRider = async (order: OrderRow) => {
        if (!adminKey || !order.delivery_address) return;
        if (!mapsReady) {
            toast.error('Maps is still loading. Please try again in a moment.');
            return;
        }
        
        setBookingLoading(true);
        setBookingOrderId(order.id);

        // Extract items from order_notes
        const noteItems = formatOrderNotes(order.order_notes);
        const items = noteItems.length > 0 
            ? noteItems.map(item => ({ name: item.name, quantity: item.quantity, price: item.lineTotal || 0 }))
            : [{ name: 'Food order', quantity: 1, price: order.total_amount || 0 }];

        // Get customer phone from profile
        const profile = order.user_id ? profilesById[order.user_id] : null;
        const customerPhone = profile?.phone || '0000000000';
        const deliveryCoordinates = await geocodeAddressInBrowser(order.delivery_address);

        if (!deliveryCoordinates) {
            setBookingLoading(false);
            setBookingOrderId(null);
            toast.error('Could not get map coordinates for this delivery address');
            return;
        }

        const res = await fetch('/api/delivery/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey,
            },
            body: JSON.stringify({
                order_id: order.id,
                pickup_address: STORE_PICKUP_ADDRESS,
                delivery_address: order.delivery_address,
                pickup_coordinates: STORE_COORDINATES,
                delivery_coordinates: deliveryCoordinates,
                items: items,
                customer_phone: customerPhone,
            }),
        });

        const text = await res.text();
        const json = parseJsonResponse<{ 
            success?: boolean; 
            error?: string; 
            delivery_id?: string;
            rider_name?: string;
            rider_phone?: string;
            tracking_url?: string;
        }>(text, { error: "Invalid response" });

        setBookingLoading(false);
        setBookingOrderId(null);

        if (!res.ok || !json?.success) {
            toast.error(json?.error || 'Could not book rider');
            return;
        }

        // Update the order in the list with rider details
        setOrders((prev) => prev.map((o) => 
            o.id === order.id 
                ? { 
                    ...o, 
                    delivery_id: json.delivery_id || null,
                    rider_name: json.rider_name || null,
                    rider_phone: json.rider_phone || null,
                    tracking_url: json.tracking_url || null,
                    delivery_tracking: 'ready' as const,
                }
                : o
        ));
        toast.success(`Rider booked for Order #${order.id}`);
    };

    const formatOrderNotes = (notes: unknown): Array<{ name: string; quantity: number; lineTotal?: number }> => {
        if (!notes || typeof notes !== 'object') return [];
        const n = notes as Record<string, unknown>;
        const items = n.items;
        if (!Array.isArray(items)) return [];
        return items.map((item: unknown) => {
            if (!item || typeof item !== 'object') return { name: 'Unknown', quantity: 1 };
            const i = item as Record<string, unknown>;
            return {
                name: String(i.name || 'Unknown'),
                quantity: Number(i.quantity || 1),
                lineTotal: i.lineTotal !== undefined ? Number(i.lineTotal) : undefined,
            };
        });
    };

    const getNextStatus = (current: DeliveryStatus | null | undefined): DeliveryStatus | null => {
        if (!current) return 'awaiting_confirmation';
        const index = STATUS_FLOW.indexOf(current);
        if (index < 0 || index === STATUS_FLOW.length - 1) return null;
        return STATUS_FLOW[index + 1];
    };

    const getPreviousStatus = (current: DeliveryStatus | null | undefined): DeliveryStatus | null => {
        if (!current) return null;
        const index = STATUS_FLOW.indexOf(current);
        if (index <= 0) return null;
        return STATUS_FLOW[index - 1];
    };

    const StatusBadge = ({ status }: { status: DeliveryStatus | null | undefined }) => {
        const effectiveStatus = status || 'pending';
        const colors = STATUS_COLORS[effectiveStatus];
        return (
            <span className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                {STATUS_LABELS[effectiveStatus]}
            </span>
        );
    };

    const StatusProgressBar = ({ status }: { status: DeliveryStatus | null | undefined }) => {
        const effectiveStatus = status || 'pending';
        const progress = getStatusProgress(effectiveStatus);
        const colors = STATUS_COLORS[effectiveStatus];
        
        return (
            <div className="w-full mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full transition-all duration-300 ${colors.bg.replace('bg-', 'bg-').replace('100', '500')}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Pending</span>
                    <span>Delivered</span>
                </div>
            </div>
        );
    };

    const OrderCard = ({ order }: { order: OrderRow }) => {
        const profile = order.user_id ? profilesById[order.user_id] : null;
        const items = itemsByOrder[order.id] || [];
        const noteItems = formatOrderNotes(order.order_notes);
        const isExpanded = expandedOrderId === order.id;
        const isBankTransferPending = order.bank_receipt_url && (!order.payment_status || order.payment_status === null);
        const currentStatus = getOrderStatus(order);
        const nextStatus = getNextStatus(currentStatus);
        const prevStatus = getPreviousStatus(currentStatus);
        const canBookRider = order.payment_status && !order.delivery_id && currentStatus !== 'rider_arrived' && currentStatus !== 'rider_left' && currentStatus !== 'delivered';
        const subtotal = items.length > 0
            ? calculateSubtotalFromOrderItems(items)
            : calculateSubtotalFromNotes(noteItems);
        const total = Number(order.total_amount || 0);
        const deliveryFee = Math.max(0, total - subtotal);

        return (
            <div className={`border rounded-xl p-4 bg-white shadow-sm ${isBankTransferPending ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'}`}>
                {/* Header */}
                <div className="flex flex-wrap justify-between gap-2 items-start">
                    <div>
                        <p className="text-black font-semibold text-lg">Order #{order.id}</p>
                        <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={getOrderStatus(order)} />
                        {order.payment_method && (
                            <span className="text-xs text-gray-500">
                                {order.payment_method === 'bank_transfer' ? '💳 Bank Transfer' : '💳 Card'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="font-medium text-black ml-1">{formatCurrency(order.total_amount)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Customer:</span>
                        <span className="font-medium text-black ml-1">{profile?.full_name || 'N/A'}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <StatusProgressBar status={getOrderStatus(order)} />

                {/* Expand/Collapse */}
                <button
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="w-full mt-3 text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-1 py-2 border-t border-gray-100"
                >
                    {isExpanded ? '▼ Hide Details' : '▶ Show Details'}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        {/* Customer Info */}
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-black mb-2">Customer Information</p>
                            <div className="text-sm text-gray-700 space-y-1">
                                <p><span className="text-gray-500">Name:</span> {profile?.full_name || 'N/A'}</p>
                                <p><span className="text-gray-500">Phone:</span> {profile?.phone || 'N/A'}</p>
                                <p><span className="text-gray-500">User ID:</span> {order.user_id || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Delivery Info */}
                        {order.delivery_address && (
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm font-medium text-black mb-2">Delivery Address</p>
                                <p className="text-sm text-gray-700">{order.delivery_address}</p>
                                {order.delivery_instructions && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        <span className="text-gray-500">Instructions:</span> {order.delivery_instructions}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Order Items */}
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-black mb-2">Order Items</p>
                            {noteItems.length > 0 ? (
                                <div className="space-y-1">
                                    {noteItems.map((item, idx) => (
                                        <div key={idx} className="text-sm text-gray-700 flex justify-between gap-3">
                                            <span>{item.quantity}x {item.name}</span>
                                            {item.lineTotal !== undefined && <span>{formatCurrency(item.lineTotal)}</span>}
                                        </div>
                                    ))}
                                </div>
                            ) : items.length > 0 ? (
                                <div className="space-y-1">
                                    {items.map((item) => (
                                        <div key={item.id} className="text-sm text-gray-700 flex justify-between gap-3">
                                            <span>{item.quantity || 1}x {item.item_name || 'Item'}</span>
                                            <span>{formatCurrency(item.line_total)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">No item lines found.</p>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-black mb-2">Amount Breakdown</p>
                            <div className="space-y-1 text-sm text-gray-700">
                                <div className="flex justify-between gap-3">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span>Delivery Fee</span>
                                    <span>{formatCurrency(deliveryFee)}</span>
                                </div>
                                <div className="flex justify-between gap-3 font-medium text-black">
                                    <span>Total</span>
                                    <span>{formatCurrency(order.total_amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-black mb-2">Payment Information</p>
                            <div className="text-sm text-gray-700 space-y-1">
                                <p><span className="text-gray-500">Method:</span> {order.payment_method || 'N/A'}</p>
                                <p><span className="text-gray-500">Reference:</span> {order.payment_reference || 'N/A'}</p>
                                <p><span className="text-gray-500">Status:</span> {order.payment_status ? '✅ Paid' : '⏳ Pending'}</p>
                                {order.delivery_fee !== null && order.delivery_fee !== undefined && (
                                    <p><span className="text-gray-500">Delivery Fee:</span> {formatCurrency(order.delivery_fee)}</p>
                                )}
                                {order.paid_at && <p><span className="text-gray-500">Paid At:</span> {new Date(order.paid_at).toLocaleString()}</p>}
                                {order.confirmed_at && <p><span className="text-gray-500">Confirmed At:</span> {new Date(order.confirmed_at).toLocaleString()}</p>}
                            </div>
                        </div>

                        {/* Receipt Image */}
                        {order.bank_receipt_url && (
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm font-medium text-black mb-2">Payment Receipt</p>
                                <div 
                                    className="relative w-32 h-32 border rounded-lg overflow-hidden cursor-pointer hover:opacity-90"
                                    onClick={() => setSelectedImage(order.bank_receipt_url || null)}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={order.bank_receipt_url} 
                                        alt="Payment receipt" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Click image to enlarge</p>
                            </div>
                        )}

                        {/* Vendor Instructions */}
                        {order.vendor_instructions && (
                            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                <p className="text-sm font-medium text-orange-800 mb-1">Vendor Instructions</p>
                                <p className="text-sm text-orange-700">{order.vendor_instructions}</p>
                            </div>
                        )}

                        {/* Rider Details */}
                        {order.delivery_id && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-green-800 mb-2">🚚 Rider Assigned</p>
                                <div className="text-sm text-green-700 space-y-1">
                                    <p><span className="text-green-600">Delivery ID:</span> {order.delivery_id}</p>
                                    {order.rider_name && <p><span className="text-green-600">Rider Name:</span> {order.rider_name}</p>}
                                    {order.rider_phone && <p><span className="text-green-600">Rider Phone:</span> {order.rider_phone}</p>}
                                    {order.tracking_url && (
                                        <p>
                                            <span className="text-green-600">Tracking:</span>{' '}
                                            <a 
                                                href={order.tracking_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                Track Delivery
                                            </a>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3 pt-2">
                            {/* Bank Transfer Verification */}
                            {isBankTransferPending && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ Bank Transfer Verification Required</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                            disabled={processingOrderId === order.id}
                                            onClick={() => handleVerifyTransfer(order.id, 'confirm')}
                                        >
                                            {processingOrderId === order.id ? 'Processing...' : '✓ Confirm Payment'}
                                        </button>
                                        <button
                                            type="button"
                                            className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                            disabled={processingOrderId === order.id}
                                            onClick={() => handleVerifyTransfer(order.id, 'reject')}
                                        >
                                            {processingOrderId === order.id ? 'Processing...' : '✗ Reject Payment'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Book Rider Button */}
                            {canBookRider && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm font-medium text-blue-800 mb-2">🛵 Delivery Booking</p>
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                        disabled={bookingLoading && bookingOrderId === order.id}
                                        onClick={() => handleBookRider(order)}
                                    >
                                        {bookingLoading && bookingOrderId === order.id ? 'Booking...' : '📦 Book Rider'}
                                    </button>
                                </div>
                            )}

                            {/* Status Update Buttons */}
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm font-medium text-black mb-2">Update Order Status</p>
                                <div className="flex flex-wrap gap-2">
                                    {prevStatus && (
                                        <button
                                            type="button"
                                            className="px-3 py-2 text-sm rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                                            disabled={processingOrderId === order.id}
                                            onClick={() => handleStatusUpdate(order.id, 'previous')}
                                        >
                                            ← {STATUS_LABELS[prevStatus]}
                                        </button>
                                    )}
                                    {nextStatus && (
                                        <button
                                            type="button"
                                            className="px-3 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                                            disabled={processingOrderId === order.id}
                                            onClick={() => handleStatusUpdate(order.id, 'next')}
                                        >
                                            {STATUS_LABELS[nextStatus]} →
                                        </button>
                                    )}
                                </div>
                                
                                {/* Quick Status Jump */}
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 mb-2">Jump to status:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {STATUS_FLOW.map((status) => (
                                            <button
                                                key={status}
                                                type="button"
                                                className={`px-2 py-1 text-xs rounded ${
                                                    currentStatus === status 
                                                        ? 'bg-primary text-white' 
                                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                } disabled:opacity-50`}
                                                disabled={processingOrderId === order.id || currentStatus === status}
                                                onClick={() => handleStatusUpdate(order.id, 'set', status)}
                                            >
                                                {STATUS_LABELS[status]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Layout>
            {googleMapsApiKey ? (
                <Script
                    src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
                    strategy="afterInteractive"
                    onLoad={() => setMapsReady(true)}
                />
            ) : null}
            <div className={`bg-primary min-h-screen ${leagueSpartan.className}`}>
                <div className="min-h-screen bg-white/60 p-4 md:p-6 lg:p-12">
                    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-4 md:p-6 lg:p-10">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                            <h2 className="text-black text-2xl md:text-3xl lg:text-4xl">Order Management</h2>
                            {authed ? (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white hover:bg-gray-100"
                                        onClick={() => fetchAllOrders()}
                                    >
                                        Refresh
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-2 border border-red-300 rounded-md text-sm text-red-700 bg-red-50 hover:bg-red-100"
                                        onClick={() => {
                                            sessionStorage.removeItem('sk_admin_key');
                                            setAuthed(false);
                                            setOrders([]);
                                            setOrderItems([]);
                                            setProfiles([]);
                                        }}
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {!authed ? (
                            <div className="max-w-md space-y-3">
                                <p className="text-sm text-gray-700">Enter admin key to access order management.</p>
                                <input
                                    type="password"
                                    value={adminKey}
                                    onChange={(e) => setAdminKey(e.target.value)}
                                    className="w-full border rounded-md p-2 text-gray-900"
                                    placeholder="Admin key"
                                />
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-md bg-primary text-white"
                                    onClick={handleAdminLogin}
                                >
                                    Access Admin
                                </button>
                            </div>
                        ) : loading ? (
                            <p className="text-gray-600">Loading orders...</p>
                        ) : (
                            <>
                                {/* Stats Summary */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-6">
                                    {TAB_STATUSES.map((tab) => {
                                        const count = tab.key === 'all' 
                                            ? orders.length 
                                            : tab.key === 'bank_pending'
                                                ? orders.filter(o => o.bank_receipt_url && !o.payment_status).length
                                                : orders.filter(o => getOrderStatus(o) === tab.key).length;
                                        return (
                                            <button
                                                key={tab.key}
                                                onClick={() => setActiveTab(tab.key)}
                                                className={`p-3 rounded-lg text-left transition-colors ${
                                                    activeTab === tab.key 
                                                        ? 'bg-primary text-white' 
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                <p className="text-2xl font-bold">{count}</p>
                                                <p className="text-xs opacity-90">{tab.label}</p>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Orders List */}
                                {filteredOrders.length === 0 ? (
                                    <div className="text-center py-10 bg-gray-50 rounded-xl">
                                        <p className="text-gray-700 text-lg">No orders found.</p>
                                        <p className="text-gray-500 text-sm mt-2">Select a different tab to view other orders.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredOrders.map((order) => (
                                            <OrderCard key={order.id} order={order} />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={selectedImage} 
                            alt="Payment receipt full size" 
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        />
                        <button
                            className="absolute top-2 right-2 bg-white rounded-full p-2 text-black hover:bg-gray-200"
                            onClick={() => setSelectedImage(null)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </Layout>
    );
}
