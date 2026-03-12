import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

function makeServerReference() {
    return `sk_bank_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

type ConfirmTransferBody = {
    receiptUrl?: string;
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

    const body = req.body as ConfirmTransferBody & { orderId?: number };
    const orderId = Number(body.orderId);
    const receiptUrl = body.receiptUrl?.trim();

    if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Valid orderId is required" });
    }

    if (!receiptUrl) {
        return res.status(400).json({ error: "Receipt URL is required" });
    }

    try {
        // Verify order exists and belongs to user
        const { data: order, error: orderError } = await supabaseAdmin
            .from("Orders")
            .select("id, user_id, payment_status")
            .eq("id", orderId)
            .single();

        if (orderError || !order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.user_id !== userId) {
            return res.status(403).json({ error: "Order does not belong to user" });
        }

        if (order.payment_status === true) {
            return res.status(409).json({ error: "Order is already paid" });
        }

        // Update order with receipt and mark as paid (pending admin confirmation)
        const { error: updateError } = await supabaseAdmin
            .from("Orders")
            .update({
                bank_receipt_url: receiptUrl,
                paid_at: new Date().toISOString(),
                payment_reference: makeServerReference(),
            })
            .eq("id", orderId);

        if (updateError) {
            return res.status(500).json({
                error: "Could not update order",
                details: updateError.message,
            });
        }

        return res.status(200).json({
            success: true,
            orderId,
            message: "Payment receipt submitted. Awaiting admin verification.",
        });
    } catch (error: unknown) {
        return res.status(500).json({
            error: "Server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
