'use client';

import Layout from '@/components/layout';
import AddressAutocomplete from '@/components/addressAutocomplete';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';
import Image from 'next/image';
import { leagueSpartan } from '../restaurant-menu';
import { Selections } from '../restaurant-menu/[id]';
import { useEffect, useState } from 'react';
import useUserProfile from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

type BankAccount = {
    id: number;
    account_name: string;
    account_number: string;
    bank_name: string;
};

type CheckoutInitResponse = {
    success?: boolean;
    error?: string;
    details?: string;
    reference?: string;
    amountKobo?: number;
    paystackPublicKey?: string;
};

type CheckoutVerifyResponse = {
    success?: boolean;
    error?: string;
    details?: string;
};

type BankTransferCreateResponse = {
    success?: boolean;
    error?: string;
    details?: string;
    orderId?: number;
    reference?: string;
    amount?: number;
};

function parseJsonResponse<T>(raw: string, fallback: T): T {
    try {
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        return typeof parsed === "object" && parsed !== null ? (parsed as T) : fallback;
    } catch {
        return fallback;
    }
}


export default function CartPage() {
    const router = useRouter();
    const { items, removeItem, clearCart } = useCartStore();
    const { defaultAddressLine, saveDefaultAddress, loading: profileLoading } = useUserProfile();
    const { user, session } = useAuth();
    const [paymentMethod, setPaymentMethod] = useState<'pay_online' | 'bank_transfer' | ''>('');
    const [editingPayment, setEditingPayment] = useState(false);
    const [editingAddress, setEditingAddress] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [deliveryInstructions, setDeliveryInstructions] = useState('');
    const [vendorInstructions, setVendorInstructions] = useState('');
    const [deliveryDraft, setDeliveryDraft] = useState('');
    const [vendorDraft, setVendorDraft] = useState('');
    const [editingDelivery, setEditingDelivery] = useState(false);
    const [editingVendor, setEditingVendor] = useState(false);
    
    // Bank transfer specific states
    const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptUploading, setReceiptUploading] = useState(false);
    const [bankTransferOrderId, setBankTransferOrderId] = useState<number | null>(null);
    const [showBankDetails, setShowBankDetails] = useState(false);

    const totalPrice = items.reduce(
        (acc, item) => acc + (item.subTotal ?? item.subTotal) * item.quantity,
        0
    );

    // Fetch bank account details when bank transfer is selected
    useEffect(() => {
        if (paymentMethod === 'bank_transfer' && !bankAccount) {
            fetchBankAccount();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentMethod]);

    const fetchBankAccount = async () => {
        try {
            const res = await fetch('/api/bank-accounts');
            const json = await res.json();
            if (res.ok && json.success) {
                setBankAccount(json.bankAccount);
            } else {
                toast.error('Could not load bank account details');
            }
        } catch {
            toast.error('Could not load bank account details');
        }
    };

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

    const getPaymentLabel = () => {
        if (paymentMethod === 'pay_online') return 'Pay online (Paystack)';
        if (paymentMethod === 'bank_transfer') return 'Bank Transfer';
        return 'choose';
    };

    const paymentValue = getPaymentLabel();
    const addressValue = defaultAddressLine || 'choose';

    const handleAddressSelect = async (address: string) => {
        setSavingAddress(true);
        const result = await saveDefaultAddress(address);
        setSavingAddress(false);

        if (result.error) {
            toast.error(result.error);
            return;
        }

        toast.success('Delivery address updated');
        setEditingAddress(false);
    };

    const missingLogin = !user?.id;
    const missingPayment = !paymentMethod;
    const missingAddress = !defaultAddressLine;
    const canCheckout = !missingLogin && !missingPayment && !missingAddress;

    const handleReceiptUpload = async (): Promise<string | null> => {
        if (!receiptFile) return null;
        
        setReceiptUploading(true);
        try {
            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `Bank-receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('Bank-receipts')
                .upload(filePath, receiptFile, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                toast.error('Failed to upload receipt: ' + uploadError.message);
                return null;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('Bank-receipts')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch {
            toast.error('Failed to upload receipt');
            return null;
        } finally {
            setReceiptUploading(false);
        }
    };

    const handleBankTransferSubmit = async () => {
        if (!receiptFile) {
            toast.error('Please upload a receipt image');
            return;
        }

        const receiptUrl = await handleReceiptUpload();
        if (!receiptUrl) return;

        const {
            data: { session: freshSession },
        } = await supabase.auth.getSession();
        const accessToken = freshSession?.access_token || session?.access_token;

        if (!accessToken) {
            toast.error('Your login session expired. Please login again.');
            return;
        }

        try {
            console.log('Submitting confirm-transfer with orderId:', bankTransferOrderId, 'receiptUrl:', receiptUrl);
            const res = await fetch('/api/orders/confirm-transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    orderId: bankTransferOrderId,
                    receiptUrl,
                }),
            });

            const raw = await res.text();
            const json = parseJsonResponse<{ success?: boolean; error?: string; message?: string }>(raw, { error: 'Invalid response' });

            if (!res.ok || !json?.success) {
                toast.error(json?.error || 'Could not submit payment confirmation');
                return;
            }

            clearCart();
            setPaymentMethod('');
            setReceiptFile(null);
            setBankTransferOrderId(null);
            setShowBankDetails(false);
            toast.success(json.message || 'Payment receipt submitted!');
            router.push('/order-confirmation?status=pending');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Could not submit payment confirmation');
        }
    };

    const handlePlaceOrder = async () => {
        if (!user?.id) {
            toast.error('Please login before placing an order');
            return;
        }

        if (!canCheckout) {
            toast.error('Set payment method and delivery address first');
            return;
        }

        // Handle bank transfer flow
        if (paymentMethod === 'bank_transfer') {
            setPlacingOrder(true);
            try {
                const {
                    data: { session: freshSession },
                } = await supabase.auth.getSession();
                const accessToken = freshSession?.access_token || session?.access_token;

                if (!accessToken) {
                    setPlacingOrder(false);
                    toast.error('Your login session expired. Please login again.');
                    return;
                }

                const res = await fetch('/api/bank-transfer/create-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        paymentMethod,
                        deliveryAddress: defaultAddressLine,
                        deliveryInstructions,
                        vendorInstructions,
                        items: items.map((item) => ({
                            id: item.productRef || item.id,
                            quantity: item.quantity,
                        })),
                    }),
                });

                const raw = await res.text();
                const json = parseJsonResponse<BankTransferCreateResponse>(raw, { error: 'Invalid response' });

                if (!res.ok || !json?.success) {
                    setPlacingOrder(false);
                    toast.error(json?.error || json?.details || 'Could not create order');
                    return;
                }

                console.log('Order created with ID:', json.orderId);
                setBankTransferOrderId(json.orderId || null);
                setShowBankDetails(true);
                setPlacingOrder(false);
            } catch (error: unknown) {
                setPlacingOrder(false);
                toast.error(error instanceof Error ? error.message : 'Could not create order');
            }
            return;
        }

        // Handle Paystack flow
        const payerEmail = user?.email || `guest-${(user?.id || Date.now().toString()).slice(0, 8)}@satellitekitchen.ng`;

        try {
            setPlacingOrder(true);
            const {
                data: { session: freshSession },
            } = await supabase.auth.getSession();
            const accessToken = freshSession?.access_token || session?.access_token;

            if (!accessToken) {
                setPlacingOrder(false);
                toast.error('Your login session expired. Please login again.');
                return;
            }

            const initRes = await fetch('/api/paystack/initiate-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    paymentMethod,
                    deliveryAddress: defaultAddressLine,
                    deliveryInstructions,
                    vendorInstructions,
                    items: items.map((item) => ({
                        id: item.productRef || item.id,
                        quantity: item.quantity,
                    })),
                }),
            });

            const initRaw = await initRes.text();
            const initJson = parseJsonResponse<CheckoutInitResponse>(initRaw, {
                error: "Invalid response from checkout init endpoint",
            });

            if (!initRes.ok || !initJson?.success) {
                setPlacingOrder(false);
                toast.error(initJson?.error || initJson?.details || 'Could not start checkout');
                return;
            }

            const reference = String(initJson.reference || '').trim();
            const amountKobo = Number(initJson.amountKobo || 0);
            const publicKey = String(initJson.paystackPublicKey || '').trim();

            if (!reference || !publicKey || !Number.isFinite(amountKobo) || amountKobo <= 0) {
                setPlacingOrder(false);
                toast.error('Invalid checkout session response');
                return;
            }

            const PaystackPop = (await import('@paystack/inline-js')).default;
            const popup = new PaystackPop();

            popup.newTransaction({
                key: publicKey,
                email: payerEmail,
                amount: amountKobo,
                currency: 'NGN',
                ref: reference,
                metadata: {
                    custom_fields: [
                        {
                            display_name: 'Delivery Address',
                            variable_name: 'delivery_address',
                            value: defaultAddressLine,
                        },
                    ],
                },
                onSuccess: async (transaction: { reference?: string }) => {
                    const {
                        data: { session: verifySession },
                    } = await supabase.auth.getSession();
                    const verifyAccessToken = verifySession?.access_token || session?.access_token;
                    if (!verifyAccessToken) {
                        setPlacingOrder(false);
                        toast.error('Your login session expired. Please login again.');
                        return;
                    }

                    const verifyRes = await fetch('/api/paystack/verify-and-create-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${verifyAccessToken}`,
                        },
                        body: JSON.stringify({
                            reference: transaction?.reference || reference,
                        }),
                    });

                    const raw = await verifyRes.text();
                    const verifyJson = parseJsonResponse<CheckoutVerifyResponse>(raw, {
                        error: 'Non-JSON response from order API',
                        details: raw?.slice(0, 300),
                    });
                    if (!raw) {
                        Object.assign(verifyJson, {
                            error: 'Non-JSON response from order API',
                            details: raw?.slice(0, 300),
                        });
                    }
                    setPlacingOrder(false);

                    if (!verifyRes.ok || !verifyJson?.success) {
                        toast.error(
                            verifyJson?.error ||
                            verifyJson?.details ||
                            `Payment verified but order creation failed (HTTP ${verifyRes.status})`
                        );
                        return;
                    }

                    clearCart();
                    setPaymentMethod('');
                    setDeliveryInstructions('');
                    setVendorInstructions('');
                    setDeliveryDraft('');
                    setVendorDraft('');
                    toast.success('Payment successful. Order created.');
                    router.push('/my-orders');
                },
                onCancel: () => {
                    setPlacingOrder(false);
                    toast.error('Payment cancelled');
                },
            });
        } catch (error: unknown) {
            setPlacingOrder(false);
            toast.error(error instanceof Error ? error.message : 'Could not start payment');
        }
    };



    if (items.length === 0 && !showBankDetails) {
        return (
            <Layout>

                <div className="min-h-screen flex flex-col items-center justify-center bg-primary p-6">
                    <div className="absolute bg-white/60 h-full w-screen top  z-10 left-0"></div>

                    <div className="relative z-20 text-center">

                        <h1 className="text-2xl font-semibold text-gray-700 mb-4">
                            Your cart is empty 🛍️
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
                        
                        {/* Bank Transfer Details Modal */}
                        {showBankDetails && bankAccount && (
                            <div className="mb-6 border-2 border-primary rounded-xl p-6 bg-orange-50">
                                <h3 className="text-xl font-semibold text-black mb-4">Bank Transfer Payment</h3>
                                <p className="text-gray-700 mb-4">Please transfer <strong>₦{totalPrice.toLocaleString()}</strong> to the account below:</p>
                                
                                <div className="bg-white rounded-lg p-4 mb-4 border">
                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Bank Name:</span>
                                            <span className="font-semibold text-black">{bankAccount.bank_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Account Name:</span>
                                            <span className="font-semibold text-black">{bankAccount.account_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Account Number:</span>
                                            <span className="font-semibold text-black text-lg">{bankAccount.account_number}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-black mb-2">
                                        Upload Payment Receipt <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                        className="w-full border rounded-md p-2 text-gray-900"
                                    />
                                    {receiptFile && (
                                        <p className="text-sm text-green-600 mt-1">Selected: {receiptFile.name}</p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowBankDetails(false);
                                            setBankTransferOrderId(null);
                                        }}
                                        className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBankTransferSubmit}
                                        disabled={!receiptFile || receiptUploading}
                                        className={`flex-1 py-3 rounded-xl text-white ${
                                            !receiptFile || receiptUploading
                                                ? 'bg-green-400 cursor-not-allowed'
                                                : 'bg-green-800 hover:bg-green-700'
                                        }`}
                                    >
                                        {receiptUploading ? 'Uploading...' : 'I Have Made Payment'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {!showBankDetails && (
                            <>
                                <div className="divide-y">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between items-center py-4"
                                        >
                                            {/* 🥣 Left: Item Info */}
                                            <div className="flex items-center gap-4">
                                                <Image
                                                    src={`/${item.name?.split(' ')[0].toLowerCase()}.png`}
                                                    alt={item.name || 'Menu item'}
                                                    width={64}
                                                    height={64}
                                                    className="w-16 h-16 rounded-lg object-cover shadow-sm"
                                                />
                                                <div>
                                                    <p className="font-medium text-black">{item.name}</p>
                                                    <p className="font-medium text-black w-64">{formatSelectionsDescription(item.selections)}</p>
                                                    <p className="text-gray-500 text-sm">
                                                        ₦{(item.subTotal ?? item.subTotal).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* ⚙️ Right: Quantity Controls */}
                                            <div className="flex items-center gap-4">
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


                                <hr className="my-6" />

                                <div className="text-black">
                                    <div className="flex justify-between items-start my-2 gap-3">
                                        <p>
                                            Payment Method <span className="text-red-600">*</span>
                                            {missingPayment && <span className="text-xs text-red-600 ml-2">required</span>}
                                        </p>
                                        <button
                                            type="button"
                                            className="text-red-500 hover:text-red-700 text-right"
                                            onClick={() => setEditingPayment((prev) => !prev)}
                                        >
                                            {paymentValue}
                                        </button>
                                    </div>
                                    {editingPayment && (
                                        <div className="mb-3 border rounded-md p-3 bg-gray-50 space-y-2">
                                            <button
                                                type="button"
                                                className={`w-full text-left px-3 py-2 rounded-md border ${paymentMethod === 'pay_online' ? 'border-primary text-primary bg-orange-50' : 'border-gray-300'
                                                    }`}
                                                onClick={() => {
                                                    setPaymentMethod('pay_online');
                                                    setEditingPayment(false);
                                                }}
                                            >
                                                Pay online (Paystack)
                                            </button>
                                            <button
                                                type="button"
                                                className={`w-full text-left px-3 py-2 rounded-md border ${paymentMethod === 'bank_transfer' ? 'border-primary text-primary bg-orange-50' : 'border-gray-300'
                                                    }`}
                                                onClick={() => {
                                                    setPaymentMethod('bank_transfer');
                                                    setEditingPayment(false);
                                                }}
                                            >
                                                Bank Transfer
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start my-2 gap-3">
                                        <p>
                                            Delivery Address <span className="text-red-600">*</span>
                                            {missingAddress && <span className="text-xs text-red-600 ml-2">required</span>}
                                        </p>
                                        <button
                                            type="button"
                                            className="text-red-500 hover:text-red-700 text-right max-w-56 break-words"
                                            onClick={() => setEditingAddress((prev) => !prev)}
                                        >
                                            {addressValue}
                                        </button>
                                    </div>
                                    {editingAddress && (
                                        <div className="mb-3">
                                            <AddressAutocomplete
                                                value={defaultAddressLine}
                                                disabled={profileLoading || savingAddress}
                                                onAddressSelect={handleAddressSelect}
                                            />
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start my-2 gap-3">
                                        <p>Delivery Instructions</p>
                                        <button
                                            type="button"
                                            className="text-red-500 hover:text-red-700 text-right max-w-56 break-words"
                                            onClick={() => {
                                                setDeliveryDraft(deliveryInstructions);
                                                setEditingDelivery((prev) => !prev);
                                            }}
                                        >
                                            {deliveryInstructions || 'choose'}
                                        </button>
                                    </div>
                                    {editingDelivery && (
                                        <div className="mb-3 border rounded-md p-3 bg-gray-50">
                                            <textarea
                                                rows={3}
                                                className="w-full border rounded-md p-2 text-gray-900 placeholder:text-gray-500"
                                                placeholder="Add delivery instructions"
                                                value={deliveryDraft}
                                                onChange={(e) => setDeliveryDraft(e.target.value)}
                                            />
                                            <div className="mt-2 flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 text-sm border rounded-md"
                                                    onClick={() => setEditingDelivery(false)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 text-sm bg-primary text-white rounded-md"
                                                    onClick={() => {
                                                        setDeliveryInstructions(deliveryDraft.trim());
                                                        setEditingDelivery(false);
                                                    }}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start my-2 gap-3">
                                        <p>Vendor Instructions</p>
                                        <button
                                            type="button"
                                            className="text-red-500 hover:text-red-700 text-right max-w-56 break-words"
                                            onClick={() => {
                                                setVendorDraft(vendorInstructions);
                                                setEditingVendor((prev) => !prev);
                                            }}
                                        >
                                            {vendorInstructions || 'choose'}
                                        </button>
                                    </div>
                                    {editingVendor && (
                                        <div className="mb-3 border rounded-md p-3 bg-gray-50">
                                            <textarea
                                                rows={3}
                                                className="w-full border rounded-md p-2 text-gray-900 placeholder:text-gray-500"
                                                placeholder="Add vendor instructions"
                                                value={vendorDraft}
                                                onChange={(e) => setVendorDraft(e.target.value)}
                                            />
                                            <div className="mt-2 flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 text-sm border rounded-md"
                                                    onClick={() => setEditingVendor(false)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 text-sm bg-primary text-white rounded-md"
                                                    onClick={() => {
                                                        setVendorInstructions(vendorDraft.trim());
                                                        setEditingVendor(false);
                                                    }}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                </div>


                                {/* 🧹 Actions */}
                                {!canCheckout && (
                                    <p className="text-sm text-red-600 mb-3">
                                        {missingLogin && 'Login required. '}
                                        {missingPayment && 'Choose payment method. '}
                                        {missingAddress && 'Choose delivery address.'}
                                    </p>
                                )}
                                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={clearCart}
                                        className="flex-1 text-center bg-red-500 text-white py-3 rounded-xl hover:bg-red-600"
                                    >
                                        Clear Cart
                                    </button>
                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={placingOrder || !canCheckout}
                                        className={`flex-1 text-center text-white py-3 rounded-xl ${placingOrder || !canCheckout
                                            ? 'bg-green-400 cursor-not-allowed opacity-70'
                                            : 'bg-green-800 hover:bg-green-700'
                                            }`}
                                    >
                                        {placingOrder ? 'Processing...' : 'Place Order'}
                                    </button>
                                </div>
                            </>
                        )}

                    </div>

                </div>

            </div>
        </Layout>
    );
}
