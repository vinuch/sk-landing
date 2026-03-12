'use client';

import Layout from '@/components/layout';
import { leagueSpartan } from '../restaurant-menu';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type OrderRow = {
    id: number;
    created_at: string;
    user_id?: string | null;
    total_amount?: number | null;
    payment_status?: boolean | null;
    payment_method?: string | null;
    payment_reference?: string | null;
    delivery_status?: string | null;
    delivery_address?: string | null;
    delivery_instructions?: string | null;
    vendor_instructions?: string | null;
    bank_receipt_url?: string | null;
    paid_at?: string | null;
    order_notes?: unknown;
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

type PendingOrdersResponse = {
    success?: boolean;
    error?: string;
    orders?: OrderRow[];
    orderItems?: OrderItemRow[];
    profiles?: ProfileRow[];
};

function parseJsonResponse<T>(raw: string, fallback: T): T {
    try {
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        return typeof parsed === "object" && parsed !== null ? (parsed as T) : fallback;
    } catch {
        return fallback;
    }
}

function formatCurrency(value?: number | null) {
    if (value === null || value === undefined) return 'N/A';
    return `₦${Number(value).toLocaleString()}`;
}

export default function VerifyOrdersPage() {
    const [adminKey, setAdminKey] = useState('');
    const [authed, setAuthed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
    const [profiles, setProfiles] = useState<ProfileRow[]>([]);
    const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        const savedKey = sessionStorage.getItem('sk_admin_key');
        if (savedKey) {
            setAdminKey(savedKey);
            setAuthed(true);
        }
    }, []);

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

    const fetchPendingOrders = async (keyOverride?: string) => {
        const key = keyOverride || adminKey;
        if (!key) return;

        setLoading(true);
        const res = await fetch('/api/admin/pending-orders', {
            method: 'GET',
            headers: {
                'x-admin-key': key,
            },
        });

        const text = await res.text();
        const json = parseJsonResponse<PendingOrdersResponse>(text, { error: "Invalid response from server" });

        setLoading(false);

        if (!res.ok || !json?.success) {
            toast.error(json?.error || 'Could not load pending orders');
            return false;
        }

        setOrders(json.orders || []);
        setOrderItems(json.orderItems || []);
        setProfiles(json.profiles || []);
        return true;
    };

    const handleAdminLogin = async () => {
        const ok = await fetchPendingOrders(adminKey);
        if (!ok) return;
        sessionStorage.setItem('sk_admin_key', adminKey);
        setAuthed(true);
        toast.success('Admin access granted');
    };

    const handleVerify = async (orderId: number, action: 'confirm' | 'reject') => {
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

        // Remove the order from the list
        setOrders((prev) => prev.filter((order) => order.id !== orderId));
        toast.success(json.message || `Order #${orderId} ${action}ed successfully`);
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

    return (
        <Layout>
            <div className={`bg-primary min-h-screen ${leagueSpartan.className}`}>
                <div className="bg-white/60 p-6 md:p-12">
                    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-md p-6 md:p-10">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <h2 className="text-black text-3xl md:text-4xl">Verify Bank Transfers</h2>
                        {authed ? (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white hover:bg-gray-100"
                                    onClick={() => fetchPendingOrders()}
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
                                    Logout Admin
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {!authed ? (
                        <div className="max-w-md space-y-3">
                            <p className="text-sm text-gray-700">Enter admin key to access bank transfer verification.</p>
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
                        <p className="text-gray-600">Loading pending orders...</p>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-700 text-lg">No pending bank transfers to verify.</p>
                            <p className="text-gray-500 text-sm mt-2">All caught up! 🎉</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => {
                                const profile = order.user_id ? profilesById[order.user_id] : null;
                                const items = itemsByOrder[order.id] || [];
                                const noteItems = formatOrderNotes(order.order_notes);

                                return (
                                    <div key={order.id} className="border rounded-xl p-4 md:p-5 bg-orange-50 border-orange-200">
                                        <div className="flex flex-wrap justify-between gap-2 items-center">
                                            <p className="text-black font-semibold text-lg">Order #{order.id}</p>
                                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                                                Awaiting Verification
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
                                            <p><span className="font-medium text-black">Date:</span> {new Date(order.created_at).toLocaleString()}</p>
                                            <p><span className="font-medium text-black">Amount:</span> {formatCurrency(order.total_amount)}</p>
                                            <p><span className="font-medium text-black">Payment Method:</span> {order.payment_method || 'N/A'}</p>
                                            <p><span className="font-medium text-black">Reference:</span> {order.payment_reference || 'N/A'}</p>
                                            <p><span className="font-medium text-black">Customer:</span> {profile?.full_name || order.user_id || 'N/A'}</p>
                                            <p><span className="font-medium text-black">Phone:</span> {profile?.phone || 'N/A'}</p>
                                            {order.paid_at && (
                                                <p><span className="font-medium text-black">Paid At:</span> {new Date(order.paid_at).toLocaleString()}</p>
                                            )}
                                        </div>

                                        {order.delivery_address ? (
                                            <p className="mt-2 text-sm text-gray-700">
                                                <span className="font-medium text-black">Address:</span> {order.delivery_address}
                                            </p>
                                        ) : null}

                                        {order.delivery_instructions ? (
                                            <p className="mt-1 text-sm text-gray-700">
                                                <span className="font-medium text-black">Delivery Instructions:</span> {order.delivery_instructions}
                                            </p>
                                        ) : null}

                                        {order.vendor_instructions ? (
                                            <p className="mt-1 text-sm text-gray-700">
                                                <span className="font-medium text-black">Vendor Instructions:</span> {order.vendor_instructions}
                                            </p>
                                        ) : null}

                                        <div className="mt-3">
                                            <p className="text-sm font-medium text-black mb-2">Items</p>
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

                                        {/* Receipt Image */}
                                        {order.bank_receipt_url && (
                                            <div className="mt-4">
                                                <p className="text-sm font-medium text-black mb-2">Payment Receipt</p>
                                                <div 
                                                    className="relative w-48 h-48 border rounded-lg overflow-hidden cursor-pointer hover:opacity-90"
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

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                                disabled={processingOrderId === order.id}
                                                onClick={() => handleVerify(order.id, 'confirm')}
                                            >
                                                {processingOrderId === order.id ? 'Processing...' : '✓ Confirm Payment'}
                                            </button>
                                            <button
                                                type="button"
                                                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                                disabled={processingOrderId === order.id}
                                                onClick={() => handleVerify(order.id, 'reject')}
                                            >
                                                {processingOrderId === order.id ? 'Processing...' : '✗ Reject Payment'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
