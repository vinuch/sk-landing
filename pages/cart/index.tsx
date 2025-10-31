'use client';

import Layout from '@/components/layout';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';
import { leagueSpartan } from '../restaurant-menu';
import { Selections } from '../restaurant-menu/[id]';
import { useEffect, useState } from 'react';
import { useMenuStore } from '@/store/menuStore';
import { useHasHydrated } from '@/hooks/useHasHydrated';


export default function CartPage() {
    const { items, removeItem, addItem, clearCart } = useCartStore();

    const totalPrice = items.reduce(
        (acc, item) => acc + (item.list_price ?? item.list_price) * item.quantity,
        0
    );

    function formatSelectionsDescription(selections: Selections): string {
        const parts: string[] = [];

        // Format main protein selections
        if (selections.protein && selections.protein.length > 0) {
            const proteinList = selections.protein
                .map(item => `${item.qty}x ${item.name}`)
                .join(', ');
            parts.push(proteinList);
        }

        // Format main swallow selections
        if (selections.swallow && selections.swallow.length > 0) {
            const swallowList = selections.swallow
                .map(item => `${item.qty}x ${item.name}`)
                .join(', ');
            parts.push(`with ${swallowList}`);
        }

        // Format extra items (protein and swallow together)
        const extraItems: string[] = [];

        if (selections.extraProtein && selections.extraProtein.length > 0) {
            selections.extraProtein.forEach(item => {
                extraItems.push(`${item.qty}x ${item.name}`);
            });
        }

        if (selections.extraSwallow && selections.extraSwallow.length > 0) {
            selections.extraSwallow.forEach(item => {
                extraItems.push(`${item.qty}x ${item.name}`);
            });
        }

        if (extraItems.length > 0) {
            parts.push(`+ Extra: ${extraItems.join(', ')}`);
        }

        return parts.join(' ') || 'No selections';
    }

    // useEffect(() => {
    //     useMenuStore.persist.onFinishHydration(() => {
    //         console.log("✅ Menu store rehydrated", useMenuStore.getState());
    //     });
    //     useCartStore.persist.onFinishHydration(() => {
    //         console.log("✅ Cart store rehydrated", useCartStore.getState());
    //     });
    // }, []);



    if (items.length === 0) {
        return (
            <Layout>

                <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-6">
                    <div className="absolute bg-white/60 h-full w-screen top  z-10 left-0"></div>

                    <div className="relative z-20 text-center">

                        <h1 className="text-2xl font-semibold text-gray-700 mb-4">
                            Your cart is empty 🛍️ {JSON.stringify(items)}
                        </h1>
                        <Link
                            href="/restaurant-menu"
                            className="text-green-600 hover:underline font-medium"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className={`bg-primary min-h-screen bg-primary p-6 md:p-12 ${leagueSpartan.className}`}>
                <div className="absolute bg-white/60 h-full w-screen top -mt-12 z-10 left-0"></div>
                <div className="relative z-20">
                    <h2 className="text-black text-center text-4xl md:text-5xl mb-3">
                        Your cart
                    </h2>
                    <div className="max-w-3xl mx-auto bg-white shadow-md rounded-2xl p-6 md:p-10 ">
                        {/* <h1 className="text-2xl font-semibold mb-6 text-black">Your Cart</h1> */}

                        <div className="divide-y">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex justify-between items-center py-4"
                                >
                                    {/* 🥣 Left: Item Info */}
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={`/${item.name?.split(' ')[0].toLowerCase()}.png`}
                                            alt={item.name}
                                            className="w-16 h-16 rounded-lg object-cover shadow-sm"
                                        />
                                        <div>
                                            <p className="font-medium text-black">{item.name}</p>
                                            <p className="font-medium text-black w-64">{formatSelectionsDescription(item.selections)}</p>
                                            <p className="text-gray-500 text-sm">
                                                ₦{(item.list_price ?? item.list_price).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* ⚙️ Right: Quantity Controls */}
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() =>
                                                addItem({ ...item, quantity: -1 }) // reuses same logic to subtract
                                            }
                                            disabled={item.quantity <= 1}
                                            className="w-8 h-8 flex items-center justify-center border rounded-full hover:bg-gray-100 disabled:opacity-40"
                                        >
                                            −
                                        </button>
                                        <span className="w-5 text-center text-gray-800">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => addItem({ ...item, quantity: 1 })}
                                            className="w-8 h-8 flex items-center justify-center border rounded-full hover:bg-gray-100"
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="ml-3 text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 🧾 Total */}
                        <div className="flex justify-between items-center mt-6 pt-6 border-t">
                            <span className="text-lg font-semibold text-black">Total</span>
                            <span className="text-lg font-semibold text-green-600">
                                ₦{totalPrice.toLocaleString()}
                            </span>
                        </div>

                        {/* 🧹 Actions */}
                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                            <Link
                                href="/restaurant-menu"
                                className="flex-1 text-center border border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50"
                            >
                                Continue Shopping
                            </Link>
                            <button
                                onClick={clearCart}
                                className="flex-1 text-center bg-red-500 text-white py-3 rounded-xl hover:bg-red-600"
                            >
                                Clear Cart
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </Layout>
    );
}




