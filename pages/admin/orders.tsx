'use client';

import Layout from '@/components/layout';
import { leagueSpartan } from '../restaurant-menu';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type DeliveryStatus = 'preparing' | 'packaging' | 'with_rider' | 'delivered';

type OrderRow = {
    id: number;
    created_at: string;
    user_id?: string | null;
    total_amount?: number | null;
    payment_status?: boolean | null;
    payment_method?: string | null;
    payment_reference?: string | null;
    delivery_status?: DeliveryStatus | null;
    delivery_address?: string | null;
    delivery_instructions?: string | null;
    vendor_instructions?: string | null;
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

const statuses: DeliveryStatus[] = ['preparing', 'packaging', 'with_rider', 'delivered'];

const statusLabel: Record<DeliveryStatus, string> = {
    preparing: 'Still preparing',
    packaging: 'Packaging',
    with_rider: 'With rider',
    delivered: 'Delivered',
};

function formatCurrency(value?: number | null) {
    if (value === null || value === undefined) return 'N/A';
    return `₦${Number(value).toLocaleString()}`;
}

export default function AdminOrdersPage() {
    const [adminKey, setAdminKey] = useState('');
    const [authed, setAuthed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
    const [profiles, setProfiles] = useState<ProfileRow[]>([]);
    const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

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

    const fetchOrders = async (keyOverride?: string) => {
        const key = keyOverride || adminKey;
        if (!key) return;

        setLoading(true);
        const res = await fetch('/api/admin/list-orders', {
            method: 'GET',
            headers: {
                'x-admin-key': key,
            },
        });

        const text = await res.text();
        let json: any = {};
        try {
            json = text ? JSON.parse(text) : {};
        } catch {
            json = { error: 'Invalid response from server' };
        }

        setLoading(false);

        if (!res.ok || !json?.success) {
            toast.error(json?.error || 'Could not load admin orders');
            return false;
        }

        setOrders(json.orders || []);
        setOrderItems(json.orderItems || []);
        setProfiles(json.profiles || []);
        return true;
    };

    const handleAdminLogin = async () => {
        const ok = await fetchOrders(adminKey);
        if (!ok) return;
        sessionStorage.setItem('sk_admin_key', adminKey);
        setAuthed(true);
        toast.success('Admin access granted');
    };

    const updateStatus = async (orderId: number, action: 'next' | 'set', status?: DeliveryStatus) => {
        if (!adminKey) return;
        setUpdatingOrderId(orderId);

        const res = await fetch('/api/admin/update-order-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey,
            },
            body: JSON.stringify({
                orderId,
                action,
                status,
            }),
        });

        const text = await res.text();
        let json: any = {};
        try {
            json = text ? JSON.parse(text) : {};
        } catch {
            json = { error: 'Invalid response from server' };
        }

        setUpdatingOrderId(null);

        if (!res.ok || !json?.success) {
            toast.error(json?.error || 'Could not update status');
            return;
        }

        setOrders((prev) =>
            prev.map((order) =>
                order.id === orderId
                    ? { ...order, delivery_status: json.deliveryStatus as DeliveryStatus }
                    : order
            )
        );
        toast.success(`Order #${orderId} updated`);
    };

    return (
        <Layout>
            <div className={`bg-primary min-h-screen p-6 md:p-12 ${leagueSpartan.className}`}>
                <div className="absolute bg-white/60 h-full w-screen top -mt-12 z-10 left-0"></div>
                <div className="relative z-20 max-w-5xl mx-auto bg-white rounded-2xl shadow-md p-6 md:p-10">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <h2 className="text-black text-3xl md:text-4xl">Admin Orders</h2>
                        {authed ? (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white hover:bg-gray-100"
                                    onClick={() => fetchOrders()}
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
                            <p className="text-sm text-gray-700">Enter `ORDER_ADMIN_KEY` to access admin order controls.</p>
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
                    ) : orders.length === 0 ? (
                        <p className="text-gray-700">No orders found.</p>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => {
                                const profile = order.user_id ? profilesById[order.user_id] : null;
                                const orderStatus = (order.delivery_status || 'preparing') as DeliveryStatus;
                                const items = itemsByOrder[order.id] || [];

                                return (
                                    <div key={order.id} className="border rounded-xl p-4 md:p-5 bg-gray-50">
                                        <div className="flex flex-wrap justify-between gap-2 items-center">
                                            <p className="text-black font-semibold">Order #{order.id}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${order.payment_status ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {order.payment_status ? 'Paid' : 'Pending'}
                                                </span>
                                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                                    {statusLabel[orderStatus]}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
                                            <p><span className="font-medium text-black">Date:</span> {new Date(order.created_at).toLocaleString()}</p>
                                            <p><span className="font-medium text-black">Amount:</span> {formatCurrency(order.total_amount)}</p>
                                            <p><span className="font-medium text-black">Payment:</span> {order.payment_method || 'N/A'}</p>
                                            <p><span className="font-medium text-black">Reference:</span> {order.payment_reference || 'N/A'}</p>
                                            <p><span className="font-medium text-black">Customer:</span> {profile?.full_name || order.user_id || 'N/A'}</p>
                                            <p><span className="font-medium text-black">Phone:</span> {profile?.phone || 'N/A'}</p>
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
                                            {items.length === 0 ? (
                                                <p className="text-sm text-gray-600">No item lines found.</p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {items.map((item) => (
                                                        <div key={item.id} className="text-sm text-gray-700 flex justify-between gap-3">
                                                            <span>{item.quantity || 1}x {item.item_name || 'Item'}</span>
                                                            <span>{formatCurrency(item.line_total)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-900 bg-white hover:bg-gray-100"
                                                disabled={updatingOrderId === order.id}
                                                onClick={() => updateStatus(order.id, 'next')}
                                            >
                                                Move To Next Status
                                            </button>
                                            {statuses.map((status) => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    className={`px-3 py-2 text-sm rounded-md border ${orderStatus === status
                                                        ? 'bg-primary text-white border-primary'
                                                        : 'border-gray-300 text-gray-900 bg-white hover:bg-gray-100'
                                                        }`}
                                                    disabled={updatingOrderId === order.id}
                                                    onClick={() => updateStatus(order.id, 'set', status)}
                                                >
                                                    {statusLabel[status]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
