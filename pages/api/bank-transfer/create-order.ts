import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
    buildTrustedCheckout,
    makeServerReference,
    sanitizeRequestedItems,
} from "@/lib/paystackCheckout";

type InitiateBankTransferBody = {
    paymentMethod?: string;
    deliveryAddress?: string;
    deliveryInstructions?: string;
    vendorInstructions?: string;
    deliveryFee?: number;
    items?: unknown;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return res.status(500).json({
            error: "Missing Supabase server config (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
        });
    }

    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!bearerToken) {
        return res.status(401).json({ error: "Missing auth token" });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken);
    const userId = authData?.user?.id;
    if (authError || !userId) {
        return res.status(401).json({ error: "Invalid auth token" });
    }

    const body = req.body as InitiateBankTransferBody;
    const requestedItems = sanitizeRequestedItems(body.items);

    if (requestedItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty or invalid" });
    }

    try {
        const { trustedItems, amountKobo } = await buildTrustedCheckout(requestedItems);
        if (amountKobo <= 0) {
            return res.status(400).json({ error: "Invalid checkout amount" });
        }

        const reference = makeServerReference();
        const itemsTotal = amountKobo / 100;
        const deliveryFee = body.deliveryFee ?? 0;
        const grandTotal = itemsTotal + deliveryFee;

        // Create order directly for bank transfer (no checkout session needed)
        const orderPayload = {
            user_id: userId,
            payment_method: "bank_transfer",
            payment_status: false, // Pending admin confirmation
            payment_reference: reference,
            total_amount: grandTotal, // Grand total including delivery
            delivery_address: body.deliveryAddress?.trim() || null,
            delivery_instructions: body.deliveryInstructions?.trim() || null,
            vendor_instructions: body.vendorInstructions?.trim() || null,
            delivery_fee: deliveryFee,
            delivery_status: "preparing" as const,
            order_notes: {
                items: trustedItems,
            },
        };

        const orderInsert = await supabaseAdmin
            .from("Orders")
            .insert(orderPayload)
            .select("id, total_amount, created_at")
            .single();

        if (orderInsert.error || !orderInsert.data) {
            return res.status(500).json({
                error: "Could not create order",
                details: orderInsert.error?.message,
            });
        }

        const orderId = orderInsert.data.id;

        // Insert order items
        if (trustedItems.length > 0) {
            const orderItemsPayload = trustedItems.map((item) => ({
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
                // Log but don't fail - order is created
                console.error("Failed to insert order items:", orderItemsInsert.error);
            }
        }

        return res.status(200).json({
            success: true,
            orderId,
            reference,
            amount: grandTotal,
            currency: "NGN",
        });
    } catch (error: unknown) {
        return res.status(500).json({
            error: "Could not create bank transfer order",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
