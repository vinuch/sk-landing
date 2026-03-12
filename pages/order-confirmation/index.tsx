'use client';

import Layout from '@/components/layout';
import { leagueSpartan } from '../restaurant-menu';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function OrderConfirmationPage() {
    const router = useRouter();
    const { status } = router.query;
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (status !== 'pending') return;
        
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push('/my-orders');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [status, router]);

    const isPending = status === 'pending';

    return (
        <Layout>
            <div className={`bg-primary min-h-screen p-6 md:p-12 ${leagueSpartan.className}`}>
                <div className="absolute bg-white/60 h-full w-screen top -mt-12 z-10 left-0"></div>
                <div className="relative z-20">
                    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-8 md:p-12 text-center">
                        {isPending ? (
                            <>
                                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-3xl md:text-4xl text-black mb-4">Payment Received!</h2>
                                <p className="text-gray-700 mb-6">
                                    Your payment receipt has been submitted and is awaiting verification by our team.
                                </p>
                                <p className="text-gray-600 mb-8">
                                    We will review your payment and update your order status shortly. You will be able to track your order in &quot;My Orders&quot;.
                                </p>
                                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-gray-600">
                                        Redirecting to My Orders in <span className="font-semibold text-primary">{countdown}</span> seconds...
                                    </p>
                                </div>
                                <Link 
                                    href="/my-orders" 
                                    className="inline-block bg-primary text-white px-8 py-3 rounded-xl hover:opacity-90"
                                >
                                    View My Orders
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-3xl md:text-4xl text-black mb-4">Order Confirmed!</h2>
                                <p className="text-gray-700 mb-8">
                                    Thank you for your order. Your payment has been verified and we&apos;re preparing your delicious meal.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link 
                                        href="/my-orders" 
                                        className="inline-block bg-primary text-white px-8 py-3 rounded-xl hover:opacity-90"
                                    >
                                        View My Orders
                                    </Link>
                                    <Link 
                                        href="/restaurant-menu" 
                                        className="inline-block border border-gray-300 text-gray-700 px-8 py-3 rounded-xl hover:bg-gray-50"
                                    >
                                        Continue Shopping
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
