import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
    buildTrustedCheckout,
    makeServerReference,
    sanitizeRequestedItems,
} from "@/lib/paystackCheckout";

type InitiateCheckoutBody = {
    paymentMethod?: string;
    deliveryAddress?: string;
    deliveryInstructions?: string;
    vendorInstructions?: string;
    items?: unknown;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!paystackPublicKey) {
        return res.status(500).json({ error: "Missing NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY" });
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

    const body = req.body as InitiateCheckoutBody;
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
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

        const insertPayload = {
            user_id: userId,
            reference,
            status: "pending",
            amount_kobo: amountKobo,
            currency: "NGN",
            payment_method: body.paymentMethod || "pay_online",
            delivery_address: body.deliveryAddress?.trim() || null,
            delivery_instructions: body.deliveryInstructions?.trim() || null,
            vendor_instructions: body.vendorInstructions?.trim() || null,
            cart_snapshot: trustedItems,
            expires_at: expiresAt,
        };

        const checkoutInsert = await supabaseAdmin
            .from("checkout_sessions")
            .insert(insertPayload)
            .select("id, reference, amount_kobo, currency, expires_at")
            .single();

        if (checkoutInsert.error || !checkoutInsert.data) {
            return res.status(500).json({
                error: "Could not create checkout session",
                details: checkoutInsert.error?.message,
                hint: "Ensure checkout_sessions table exists with expected columns and unique reference index.",
            });
        }

        return res.status(200).json({
            success: true,
            checkoutSessionId: checkoutInsert.data.id,
            reference: checkoutInsert.data.reference,
            amountKobo: checkoutInsert.data.amount_kobo,
            currency: checkoutInsert.data.currency || "NGN",
            expiresAt: checkoutInsert.data.expires_at,
            paystackPublicKey,
        });
    } catch (error: any) {
        return res.status(500).json({
            error: "Could not prepare checkout",
            details: error?.message || "Unknown error",
        });
    }
}
