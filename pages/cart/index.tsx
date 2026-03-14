'use client';

import Layout from '@/components/layout';
import AddressAutocomplete from '@/components/addressAutocomplete';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { leagueSpartan } from '../restaurant-menu';
import { Selections } from '../restaurant-menu/[id]';
import { useEffect, useState } from 'react';
import useUserProfile from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { checkDeliveryRadius, STORE_COORDINATES, type Coordinates } from '@/lib/distance';

// Store address for pickup
const STORE_PICKUP_ADDRESS = 'F725+8X6, Satellite Town, Lagos, Nigeria';

type BankAccount = {
    id: number;
    account_name: string;
    account_number: string;
    bank_name: string;
};

type BankTransferCreateResponse = {
    success?: boolean;
    error?: string;
    details?: string;
    orderId?: number;
    reference?: string;
    amount?: number;
};

type DeliveryQuote = {
    delivery_fee: number;
    estimated_time: string;
    available: boolean;
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

type PlacePrediction = {
    place_id: string;
    description: string;
};

type AutocompleteServiceLike = {
    getPlacePredictions: (
        request: { input: string; componentRestrictions?: { country: string } },
        callback: (predictions: PlacePrediction[] | null, status: string) => void
    ) => void;
};

type PlacesServiceStatusLike = {
    OK: string;
};

type GoogleMapsLike = {
    maps?: {
        Geocoder: new () => GeocoderLike;
        GeocoderStatus: GeocoderStatusLike;
        places: {
            AutocompleteService: new () => AutocompleteServiceLike;
            PlacesServiceStatus: PlacesServiceStatusLike;
        };
    };
};

declare global {
    interface Window {
        google?: GoogleMapsLike;
    }
}

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
    const [paymentMethod, setPaymentMethod] = useState<'bank_transfer'>('bank_transfer');
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

    // Distance check states
    const [distanceCheck, setDistanceCheck] = useState<{
        distance: number;
        isWithinRadius: boolean;
    } | null>(null);
    const [checkingDistance, setCheckingDistance] = useState(false);
    const [distanceError, setDistanceError] = useState<string | null>(null);
    const [mapsReady, setMapsReady] = useState(false);

    // Delivery quote states
    const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
    const [fetchingQuote, setFetchingQuote] = useState(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);

    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const totalPrice = items.reduce(
        (acc, item) => acc + (item.subTotal ?? item.subTotal) * item.quantity,
        0
    );
    
    // Use Chowdeck delivery fee if available, otherwise 0
    const deliveryFee = deliveryQuote?.available ? deliveryQuote.delivery_fee : 0;
    const grandTotal = totalPrice + deliveryFee;

    // Fetch bank account details when bank transfer is selected
    useEffect(() => {
        if (paymentMethod === 'bank_transfer' && !bankAccount) {
            fetchBankAccount();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentMethod]);

    useEffect(() => {
        if (window.google?.maps?.Geocoder) {
            setMapsReady(true);
        }
    }, []);

    // Fetch delivery quote when address changes
    useEffect(() => {
        if (defaultAddressLine && items.length > 0 && mapsReady) {
            fetchDeliveryQuote(defaultAddressLine);
        } else if (!defaultAddressLine || items.length === 0) {
            setDeliveryQuote(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultAddressLine, mapsReady, items.length]);

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

    const fetchDeliveryQuote = async (address: string) => {
        if (!address.trim() || items.length === 0) return;

        setFetchingQuote(true);
        setQuoteError(null);

        try {
            const deliveryCoordinates = mapsReady ? await geocodeAddressInBrowser(address.trim()) : null;

            if (!deliveryCoordinates) {
                setQuoteError('Could not get map coordinates for this address yet');
                setDeliveryQuote(null);
                return;
            }

            const cartItems = items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.list_price,
            }));

            const res = await fetch('/api/delivery/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pickup_address: STORE_PICKUP_ADDRESS,
                    delivery_address: address.trim(),
                    pickup_coordinates: STORE_COORDINATES,
                    delivery_coordinates: deliveryCoordinates,
                    items: cartItems,
                }),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                setQuoteError(json.error || 'Could not fetch delivery quote');
                setDeliveryQuote(null);
                return;
            }

            setDeliveryQuote({
                delivery_fee: json.delivery_fee,
                estimated_time: json.estimated_time,
                available: json.available,
            });

            if (!json.available) {
                toast.error('Sorry, we don\'t deliver to this location');
            }
        } catch {
            setQuoteError('Could not fetch delivery quote');
            setDeliveryQuote(null);
        } finally {
            setFetchingQuote(false);
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
        if (paymentMethod === 'bank_transfer') return 'Bank Transfer';
        return 'choose';
    };

    const paymentValue = getPaymentLabel();
    const addressValue = defaultAddressLine || 'choose';

    const handleAddressSelect = async (address: string) => {
        setSavingAddress(true);
        setDistanceError(null);
        setDistanceCheck(null);
        const result = await saveDefaultAddress(address);
        setSavingAddress(false);

        if (result.error) {
            toast.error(result.error);
            return;
        }

        toast.success('Delivery address updated');
        setEditingAddress(false);
    };

    const geocodeAddressInBrowser = async (address: string): Promise<Coordinates | null> => {
        if (!window.google?.maps?.Geocoder) {
            return null;
        }

        const geocoder = new window.google.maps.Geocoder();

        return new Promise((resolve) => {
            geocoder.geocode({ address, region: 'ng' }, (results, status) => {
                if (status !== window.google?.maps?.GeocoderStatus.OK || !results?.length) {
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

    const checkAddressDistance = async (address: string) => {
        if (!address.trim()) return;
        
        setCheckingDistance(true);
        setDistanceError(null);
        
        try {
            const browserCoordinates = mapsReady ? await geocodeAddressInBrowser(address.trim()) : null;

            if (browserCoordinates) {
                const { distance, isWithinRadius } = checkDeliveryRadius(browserCoordinates, 60);

                setDistanceCheck({ distance, isWithinRadius });

                if (!isWithinRadius) {
                    toast.error(`We don't deliver here yet. Coming soon! (${distance} km from store)`);
                }

                return;
            }

            const res = await fetch('/api/distance-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: address.trim() }),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                setDistanceError(json.error || 'Could not verify delivery location');
                setCheckingDistance(false);
                return;
            }

            setDistanceCheck({
                distance: json.distance,
                isWithinRadius: json.isWithinRadius,
            });

            if (!json.isWithinRadius) {
                toast.error(`We don't deliver here yet. Coming soon! (${json.distance} km from store)`);
            }
        } catch {
            setDistanceError('Could not verify delivery location');
        } finally {
            setCheckingDistance(false);
        }
    };

    // Check distance when default address is loaded
    useEffect(() => {
        if (!defaultAddressLine) {
            setDistanceCheck(null);
            setDistanceError(null);
            return;
        }

        checkAddressDistance(defaultAddressLine);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultAddressLine, mapsReady]);

    const missingLogin = !user?.id;
    const missingPayment = !paymentMethod;
    const missingAddress = !defaultAddressLine;
    const outsideDeliveryRadius = distanceCheck !== null && !distanceCheck.isWithinRadius;
    const deliveryNotAvailable = deliveryQuote !== null && !deliveryQuote.available;
    const canCheckout = !missingLogin && !missingPayment && !missingAddress && !outsideDeliveryRadius && !checkingDistance && !deliveryNotAvailable && !fetchingQuote;

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
                        deliveryFee: deliveryQuote?.available ? deliveryQuote.delivery_fee : 0,
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
    };



    if (items.length === 0 && !showBankDetails) {
        return (
            <Layout>
                {googleMapsApiKey ? (
                    <Script
                        src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
                        strategy="afterInteractive"
                        onLoad={() => setMapsReady(true)}
                    />
                ) : null}
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
            {googleMapsApiKey ? (
                <Script
                    src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
                    strategy="afterInteractive"
                    onLoad={() => setMapsReady(true)}
                />
            ) : null}
            <div className={`relative overflow-x-hidden bg-primary min-h-screen p-6 md:p-12 ${leagueSpartan.className}`}>
                <div className="absolute inset-0 z-10 bg-white/60"></div>
                <div className="relative z-20">
                    <h2 className="text-black text-center text-4xl md:text-5xl mb-3">
                        Your cart
                    </h2>
                    <div className="max-w-3xl mx-auto bg-white shadow-md rounded-2xl p-6 md:p-10 ">
                        
                        {/* Bank Transfer Details Modal */}
                        {showBankDetails && bankAccount && (
                            <div className="mb-6 border-2 border-primary rounded-xl p-6 bg-orange-50">
                                <h3 className="text-xl font-semibold text-black mb-4">Bank Transfer Payment</h3>
                                <p className="text-gray-700 mb-4">Please transfer <strong>₦{grandTotal.toLocaleString()}</strong> to the account below:</p>
                                
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
                                            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            {/* 🥣 Left: Item Info */}
                                            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                                                <Image
                                                    src={`/${item.name?.split(' ')[0].toLowerCase()}.png`}
                                                    alt={item.name || 'Menu item'}
                                                    width={64}
                                                    height={64}
                                                    className="h-16 w-16 shrink-0 rounded-lg object-cover shadow-sm sm:h-20 sm:w-20"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-base font-semibold leading-tight text-black sm:text-lg">{item.name}</p>
                                                    <p className="mt-1 break-words text-sm font-medium leading-6 text-black sm:max-w-md">{formatSelectionsDescription(item.selections)}</p>
                                                    <p className="mt-2 text-sm font-semibold text-gray-600">
                                                        ₦{(item.subTotal ?? item.subTotal).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* ⚙️ Right: Quantity Controls */}
                                            <div className="flex justify-end sm:justify-start">
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-sm font-semibold text-red-500 transition-colors hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 🧾 Total */}
                                <div className="flex justify-between items-center mt-6 pt-6 border-t">
                                    <span className="text-base font-medium text-black">Subtotal</span>
                                    <span className="text-base font-medium text-black">
                                        ₦{totalPrice.toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-base font-medium text-black">Delivery Fee</span>
                                    <span className="text-base font-medium text-black">
                                        {fetchingQuote ? (
                                            <span className="text-gray-400">Calculating...</span>
                                        ) : deliveryQuote?.available ? (
                                            `₦${deliveryQuote.delivery_fee.toLocaleString()}`
                                        ) : deliveryQuote?.available === false ? (
                                            <span className="text-red-600">Not available</span>
                                        ) : (
                                            <span className="text-gray-400">Enter address</span>
                                        )}
                                    </span>
                                </div>

                                {deliveryQuote?.available && deliveryQuote.estimated_time && (
                                    <p className="text-sm text-green-600 text-right">
                                        Estimated delivery: {deliveryQuote.estimated_time}
                                    </p>
                                )}

                                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                                    <span className="text-lg font-semibold text-black">Total</span>
                                    <span className="text-lg font-semibold text-green-600">
                                        ₦{grandTotal.toLocaleString()}
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


                                {/* Distance check status */}
                                {checkingDistance && (
                                    <p className="text-sm text-blue-600 mb-3">
                                        Checking delivery location...
                                    </p>
                                )}
                                {outsideDeliveryRadius && (
                                    <p className="text-sm text-red-600 mb-3">
                                        ❌ We don&apos;t deliver here yet. Coming soon! ({distanceCheck?.distance} km from store, max 60 km)
                                    </p>
                                )}
                                {distanceError && !outsideDeliveryRadius && (
                                    <p className="text-sm text-red-600 mb-3">
                                        {distanceError}
                                    </p>
                                )}

                                {/* Delivery quote status */}
                                {fetchingQuote && (
                                    <p className="text-sm text-blue-600 mb-3">
                                        Getting delivery quote...
                                    </p>
                                )}
                                {deliveryNotAvailable && (
                                    <p className="text-sm text-red-600 mb-3">
                                        ❌ Sorry, we don&apos;t deliver to this location
                                    </p>
                                )}
                                {quoteError && (
                                    <p className="text-sm text-red-600 mb-3">
                                        {quoteError}
                                    </p>
                                )}

                                {/* 🧹 Actions */}
                                {!canCheckout && (
                                    <p className="text-sm text-red-600 mb-3">
                                        {missingLogin && 'Login required. '}
                                        {missingPayment && 'Choose payment method. '}
                                        {missingAddress && 'Choose delivery address. '}
                                        {outsideDeliveryRadius && 'Address outside delivery radius. '}
                                        {deliveryNotAvailable && 'Delivery not available to this location. '}
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
