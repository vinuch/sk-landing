import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type VerifyAndCreateBody = {
    reference?: string;
    totalAmount?: number;
    paymentMethod?: string;
    deliveryAddress?: string;
    deliveryInstructions?: string;
    vendorInstructions?: string;
    userId?: string | null;
    items?: Array<{
        id: string;
        name: string;
        quantity: number;
        subTotal?: number;
        list_price?: number;
    }>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
        return res.status(500).json({ error: "Missing PAYSTACK_SECRET_KEY" });
    }
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return res.status(500).json({ error: "Missing Supabase server config (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)" });
    }

    const body = req.body as VerifyAndCreateBody;
    const reference = body.reference?.trim();
    const totalAmount = Number(body.totalAmount || 0);
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!reference) {
        return res.status(400).json({ error: "Missing transaction reference" });
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        return res.status(400).json({ error: "Invalid total amount" });
    }

    try {
        let resolvedUserId: string | null = body.userId ?? null;

        if (bearerToken) {
            const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken);
            if (authError || !authData?.user?.id) {
                return res.status(401).json({ error: "Invalid auth token" });
            }
            resolvedUserId = authData.user.id;
        }

        if (!resolvedUserId) {
            return res.status(401).json({ error: "Authenticated user is required to create an order" });
        }

        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            headers: {
                Authorization: `Bearer ${paystackSecret}`,
                "Content-Type": "application/json",
            },
        });

        const verifyJson = await verifyRes.json();
        const verifiedData = verifyJson?.data;
        const verifiedStatus = verifiedData?.status;
        const paidAmountKobo = Number(verifiedData?.amount || 0);
        const expectedAmountKobo = Math.round(totalAmount * 100);

        if (!verifyRes.ok || !verifyJson?.status || verifiedStatus !== "success") {
            return res.status(400).json({ error: "Payment verification failed" });
        }

        if (paidAmountKobo !== expectedAmountKobo) {
            return res.status(400).json({ error: "Paid amount mismatch" });
        }

        const baseOrderPayload: Record<string, any> = {
            payment_method: body.paymentMethod || "pay_online",
            payment_status: true,
            total_amount: totalAmount,
            delivery_status: "preparing",
        };

        const enrichedPayload: Record<string, any> = {
            ...baseOrderPayload,
            payment_reference: reference,
            user_id: resolvedUserId,
            delivery_address: body.deliveryAddress ?? null,
            delivery_instructions: body.deliveryInstructions ?? null,
            vendor_instructions: body.vendorInstructions ?? null,
            order_notes: {
                items: body.items ?? [],
            },
        };

        let insertedOrder: any = null;

        // Try enriched insert first (for upgraded Orders schema).
        const enrichedInsert = await supabaseAdmin
            .from("Orders")
            .insert(enrichedPayload)
            .select("id")
            .single();

        if (enrichedInsert.error) {
            return res.status(500).json({
                error: "Could not create order with user data",
                details: enrichedInsert.error.message,
                hint: "Ensure Orders table has user_id, payment_reference, delivery_* and order_notes columns.",
            });
        } else {
            insertedOrder = enrichedInsert.data;
        }

        const orderId = insertedOrder?.id;
        const safeItems = Array.isArray(body.items) ? body.items : [];

        if (orderId && safeItems.length > 0) {
            const orderItemsPayload = safeItems.map((item) => ({
                order_id: orderId,
                item_name: item.name,
                quantity: item.quantity || 1,
                unit_price: Number(item.list_price || 0),
                line_total: Number(item.subTotal || 0),
                product_ref: item.id,
            }));

            const orderItemsInsert = await supabaseAdmin
                .from("OrderItems")
                .insert(orderItemsPayload);

            if (orderItemsInsert.error) {
                return res.status(500).json({
                    error: "Order created but saving order items failed",
                    details: orderItemsInsert.error.message,
                    hint: "Ensure OrderItems has order_id, item_name, quantity, unit_price, line_total, product_ref columns.",
                });
            }
        }

        return res.status(200).json({
            success: true,
            orderId,
            reference,
        });
    } catch (error: any) {
        return res.status(500).json({
            error: "Server error",
            details: error?.message || "Unknown error",
        });
    }
}
