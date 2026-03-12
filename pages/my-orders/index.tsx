'use client';

import Layout from '@/components/layout';
import useAuth from '@/hooks/useAuth';
import { leagueSpartan } from '../restaurant-menu';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type OrderRow = {
    id: number;
    created_at: string;
    payment_method: string | null;
    payment_status: boolean | null;
    total_amount: number | null;
    payment_reference?: string | null;
    delivery_address?: string | null;
    delivery_status?: "preparing" | "packaging" | "with_rider" | "delivered" | null;
    delivery_tracking?: string | null;
    bank_receipt_url?: string | null;
    paid_at?: string | null;
};

type OrderItemRow = {
    id: number;
    order_id: number;
    item_name: string | null;
    quantity: number | null;
    unit_price: number | null;
    line_total: number | null;
};

function formatCurrency(value: number | null) {
    if (value === null || value === undefined) return 'N/A';
    return `₦${value.toLocaleString()}`;
}

function formatDate(value: string) {
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

export default function MyOrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [orderItemsByOrderId, setOrderItemsByOrderId] = useState<Record<number, OrderItemRow[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchMyOrders = async () => {
            if (authLoading) return;
            if (!user?.id) {
                setOrders([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            const { data, error } = await supabase
                .from('Orders')
                .select('id, created_at, payment_method, payment_status, total_amount, payment_reference, delivery_address, delivery_status, delivery_tracking, bank_receipt_url, paid_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                setError(error.message || 'Could not fetch your orders');
                setOrders([]);
                setLoading(false);
                return;
            }

            const ordersList = (data as unknown as OrderRow[]) || [];
            setOrders(ordersList);

            const orderIds = ordersList.map((order) => order.id);
            if (orderIds.length > 0) {
                const { data: orderItems, error: orderItemsError } = await supabase
                    .from('OrderItems')
                    .select('id, order_id, item_name, quantity, unit_price, line_total')
                    .in('order_id', orderIds)
                    .order('id', { ascending: true });

                if (!orderItemsError && orderItems) {
                    const grouped = (orderItems as unknown as OrderItemRow[]).reduce<Record<number, OrderItemRow[]>>(
                        (acc, item) => {
                            if (!acc[item.order_id]) acc[item.order_id] = [];
                            acc[item.order_id].push(item);
                            return acc;
                        },
                        {}
                    );
                    setOrderItemsByOrderId(grouped);
                } else {
                    setOrderItemsByOrderId({});
                }
            } else {
                setOrderItemsByOrderId({});
            }
            setLoading(false);
        };

        fetchMyOrders();
    }, [authLoading, user?.id]);

    const paidOrdersCount = useMemo(
        () => orders.filter((order) => order.payment_status === true).length,
        [orders]
    );

    const getPaymentStatusDisplay = (order: OrderRow) => {
        if (order.payment_status === true) {
            return { label: 'Paid', className: 'bg-green-100 text-green-700' };
        }
        // Has receipt but not confirmed yet
        if (order.bank_receipt_url && order.paid_at) {
            return { label: 'Awaiting Verification', className: 'bg-orange-100 text-orange-700' };
        }
        return { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' };
    };

    const statusLabelMap: Record<string, string> = {
        pending: 'Order received',
        awaiting_confirmation: 'Awaiting payment confirmation',
        confirmed: 'Payment confirmed',
        preparing: 'Still preparing',
        ready: 'Ready for pickup',
        rider_arrived: 'Rider has arrived',
        rider_left: 'Rider on the way',
        delivered: 'Delivered',
        packaging: 'Packaging',
        with_rider: 'With rider, on the way to you',
    };

    const statusBadgeClassMap: Record<string, string> = {
        pending: 'bg-gray-100 text-gray-700',
        awaiting_confirmation: 'bg-orange-100 text-orange-700',
        confirmed: 'bg-blue-100 text-blue-700',
        preparing: 'bg-yellow-100 text-yellow-700',
        ready: 'bg-purple-100 text-purple-700',
        rider_arrived: 'bg-indigo-100 text-indigo-700',
        rider_left: 'bg-cyan-100 text-cyan-700',
        delivered: 'bg-green-100 text-green-700',
        packaging: 'bg-orange-100 text-orange-700',
        with_rider: 'bg-blue-100 text-blue-700',
    };

    if (!authLoading && !user) {
        return (
            <Layout>
                <div className={`bg-primary min-h-screen p-6 md:p-12 ${leagueSpartan.className}`}>
                    <div className="absolute bg-white/60 h-full w-screen top -mt-12 z-10 left-0"></div>
                    <div className="relative z-20 max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-8 text-center">
                        <h2 className="text-3xl md:text-4xl text-black mb-3">My Orders</h2>
                        <p className="text-gray-700 mb-6">Please login to view your order history.</p>
                        <Link href="/restaurant-menu" className="inline-block bg-primary text-white px-6 py-3 rounded-xl hover:opacity-90">
                            Browse Menu
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className={`bg-primary min-h-screen ${leagueSpartan.className}`}>
                <div className="min-h-screen bg-white/60 p-6 md:p-12">
                    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6 md:p-10">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <h2 className="text-black text-3xl md:text-4xl">My Orders</h2>
                            <div className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg">
                                Total: {orders.length} | Paid: {paidOrdersCount}
                            </div>
                        </div>

                        {loading ? (
                            <p className="text-gray-600">Loading your orders...</p>
                        ) : error ? (
                            <p className="text-red-600">{error}</p>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-gray-700 mb-4">You have no orders yet.</p>
                                <Link href="/restaurant-menu" className="inline-block bg-primary text-white px-5 py-2 rounded-lg hover:opacity-90">
                                    Start Ordering
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => (
                                    <div key={order.id} className="border rounded-xl p-4 md:p-5 bg-gray-50">
                                        <div className="flex flex-wrap justify-between gap-3 items-center">
                                            <p className="text-black font-semibold">Order #{order.id}</p>
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const status = getPaymentStatusDisplay(order);
                                                    return (
                                                        <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                                                            {status.label}
                                                        </span>
                                                    );
                                                })()}
                                                <span
                                                    className={`text-xs px-2 py-1 rounded-full ${statusBadgeClassMap[order.delivery_tracking || order.delivery_status || 'pending'] || 'bg-gray-100 text-gray-700'
                                                        }`}
                                                >
                                                    {statusLabelMap[order.delivery_tracking || order.delivery_status || 'pending'] || 'Order received'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm text-gray-700">
                                            <p><span className="font-medium text-black">Date:</span> {formatDate(order.created_at)}</p>
                                            <p><span className="font-medium text-black">Amount:</span> {formatCurrency(order.total_amount)}</p>
                                            <p><span className="font-medium text-black">Payment:</span> {order.payment_method || 'N/A'}</p>
                                            <p><span className="font-medium text-black">Reference:</span> {order.payment_reference || 'N/A'}</p>
                                        </div>

                                        {order.delivery_address ? (
                                            <p className="mt-2 text-sm text-gray-700">
                                                <span className="font-medium text-black">Delivery Address:</span> {order.delivery_address}
                                            </p>
                                        ) : null}

                                        <div className="mt-3">
                                            <p className="text-sm font-medium text-black mb-2">Items</p>
                                            {(orderItemsByOrderId[order.id] || []).length === 0 ? (
                                                <p className="text-sm text-gray-600">No item lines found.</p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {(orderItemsByOrderId[order.id] || []).map((item) => (
                                                        <div key={item.id} className="text-sm text-gray-700 flex justify-between gap-3">
                                                            <span>
                                                                {(item.quantity || 1)}x {item.item_name || 'Item'}
                                                            </span>
                                                            <span>{formatCurrency(item.line_total)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
