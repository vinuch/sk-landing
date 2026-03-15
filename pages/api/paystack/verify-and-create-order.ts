import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { TablesInsert } from "@/types_db";

type VerifyAndCreateBody = {
    reference?: string;
};

type VerifiedTransactionData = {
    status?: string;
    amount?: number;
    currency?: string;
};

type VerifiedResponse = {
    status?: boolean;
    data?: VerifiedTransactionData;
};

type OrderInsertResult = {
    id: number;
};

type SnapshotItem = {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
};

function isSnapshotItem(value: unknown): value is SnapshotItem {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.quantity === "number" &&
        typeof candidate.unitPrice === "number" &&
        typeof candidate.lineTotal === "number"
    );
}

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
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!reference) {
        return res.status(400).json({ error: "Missing transaction reference" });
    }

    if (!bearerToken) {
        return res.status(401).json({ error: "Missing auth token" });
    }

    try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken);
        const resolvedUserId = authData?.user?.id;
        if (authError || !resolvedUserId) {
            return res.status(401).json({ error: "Invalid auth token" });
        }

        const checkoutSessionResponse = await supabaseAdmin
            .from("checkout_sessions")
            .select("id, user_id, status, amount_kobo, currency, payment_method, delivery_address, delivery_fee, delivery_instructions, items_subtotal, vendor_instructions, cart_snapshot, order_id, expires_at")
            .eq("reference", reference)
            .maybeSingle();

        if (checkoutSessionResponse.error || !checkoutSessionResponse.data) {
            return res.status(404).json({
                error: "Checkout session not found",
                details: checkoutSessionResponse.error?.message,
            });
        }

        const checkoutSession = checkoutSessionResponse.data;
        if (checkoutSession.user_id !== resolvedUserId) {
            return res.status(403).json({ error: "Checkout session does not belong to user" });
        }

        if (checkoutSession.status === "paid" && checkoutSession.order_id) {
            return res.status(200).json({
                success: true,
                orderId: checkoutSession.order_id,
                reference,
                idempotent: true,
            });
        }

        if (checkoutSession.status !== "pending") {
            return res.status(409).json({ error: `Checkout session is ${checkoutSession.status}` });
        }

        if (checkoutSession.expires_at && Date.parse(checkoutSession.expires_at) < Date.now()) {
            await supabaseAdmin
                .from("checkout_sessions")
                .update({ status: "expired" })
                .eq("id", checkoutSession.id)
                .eq("status", "pending");
            return res.status(410).json({ error: "Checkout session expired" });
        }

        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            headers: {
                Authorization: `Bearer ${paystackSecret}`,
                "Content-Type": "application/json",
            },
        });

        const verifyJson = (await verifyRes.json()) as VerifiedResponse;
        const verifiedData = verifyJson?.data;
        const verifiedStatus = verifiedData?.status;
        const paidAmountKobo = Number(verifiedData?.amount || 0);
        const expectedAmountKobo = Number(checkoutSession.amount_kobo || 0);

        if (!verifyRes.ok || !verifyJson?.status || verifiedStatus !== "success") {
            return res.status(400).json({ error: "Payment verification failed" });
        }

        if (verifiedData?.currency && checkoutSession.currency && verifiedData.currency !== checkoutSession.currency) {
            return res.status(400).json({ error: "Payment currency mismatch" });
        }

        if (paidAmountKobo !== expectedAmountKobo) {
            return res.status(400).json({ error: "Paid amount mismatch" });
        }

        const existingOrder = await supabaseAdmin
            .from("Orders")
            .select("id")
            .eq("payment_reference", reference)
            .maybeSingle();

        if (existingOrder.data?.id) {
            await supabaseAdmin
                .from("checkout_sessions")
                .update({
                    status: "paid",
                    paid_at: new Date().toISOString(),
                    order_id: existingOrder.data.id,
                })
                .eq("id", checkoutSession.id);

            return res.status(200).json({
                success: true,
                orderId: existingOrder.data.id,
                reference,
                idempotent: true,
            });
        }

        const safeItems = Array.isArray(checkoutSession.cart_snapshot)
            ? checkoutSession.cart_snapshot.filter(isSnapshotItem)
            : [];

        if (safeItems.length === 0) {
            return res.status(500).json({ error: "Checkout cart snapshot is empty" });
        }

        const fallbackItemsSubtotal = safeItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
        const itemsSubtotal = Number(checkoutSession.items_subtotal ?? fallbackItemsSubtotal);
        const deliveryFee = Number(checkoutSession.delivery_fee ?? Math.max(0, expectedAmountKobo / 100 - itemsSubtotal));
        const totalAmount = expectedAmountKobo / 100;
        const baseOrderPayload: TablesInsert<"Orders"> = {
            payment_method: checkoutSession.payment_method || "pay_online",
            payment_status: true,
            delivery_fee: deliveryFee,
            total_amount: totalAmount,
            items_subtotal: itemsSubtotal,
            delivery_status: "preparing",
        };

        const enrichedPayload: TablesInsert<"Orders"> = {
            ...baseOrderPayload,
            payment_reference: reference,
            user_id: resolvedUserId,
            delivery_address: checkoutSession.delivery_address ?? null,
            delivery_instructions: checkoutSession.delivery_instructions ?? null,
            vendor_instructions: checkoutSession.vendor_instructions ?? null,
            order_notes: {
                items: safeItems,
            },
        };

        let insertedOrder: OrderInsertResult | null = null;

        // Try enriched insert first (for upgraded Orders schema).
        const enrichedInsert = await supabaseAdmin
            .from("Orders")
            .insert(enrichedPayload)
            .select("id")
            .single();

        if (enrichedInsert.error) {
            // Race-safe idempotency: if another request inserted same payment_reference first,
            // return the existing order instead of surfacing a 500.
            if (enrichedInsert.error.code === "23505") {
                const duplicateOrder = await supabaseAdmin
                    .from("Orders")
                    .select("id")
                    .eq("payment_reference", reference)
                    .maybeSingle();

                if (duplicateOrder.data?.id) {
                    await supabaseAdmin
                        .from("checkout_sessions")
                        .update({
                            status: "paid",
                            paid_at: new Date().toISOString(),
                            order_id: duplicateOrder.data.id,
                        })
                        .eq("id", checkoutSession.id);

                    return res.status(200).json({
                        success: true,
                        orderId: duplicateOrder.data.id,
                        reference,
                        idempotent: true,
                    });
                }
            }

            return res.status(500).json({
                error: "Could not create order with user data",
                details: enrichedInsert.error.message,
                hint: "Ensure Orders table has user_id, payment_reference, delivery_* and order_notes columns.",
            });
        } else {
            insertedOrder = enrichedInsert.data;
        }

        const orderId = insertedOrder?.id;

        if (orderId && safeItems.length > 0) {
            const orderItemsPayload = safeItems.map((item) => ({
                order_id: orderId,
                item_name: item.name,
                quantity: item.quantity || 1,
                unit_price: Number(item.unitPrice || 0),
                line_total: Number(item.lineTotal || 0),
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

        await supabaseAdmin
            .from("checkout_sessions")
            .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                order_id: orderId,
            })
            .eq("id", checkoutSession.id)
            .eq("status", "pending");

        return res.status(200).json({
            success: true,
            orderId,
            reference,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            error: "Server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
