import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type VerifyBody = {
    orderId?: number;
    action?: "confirm" | "reject";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const adminKey = process.env.ORDER_ADMIN_KEY;
    const incomingAdminKey = (req.headers["x-admin-key"] as string) || "";

    if (!adminKey) {
        return res.status(500).json({ error: "Missing ORDER_ADMIN_KEY" });
    }

    if (!incomingAdminKey || incomingAdminKey !== adminKey) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return res.status(500).json({
            error: "Missing Supabase server config (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
        });
    }

    const body = req.body as VerifyBody;
    const orderId = Number(body.orderId);
    const action = body.action;

    if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Valid orderId is required" });
    }

    if (!action || (action !== "confirm" && action !== "reject")) {
        return res.status(400).json({ error: "action must be 'confirm' or 'reject'" });
    }

    try {
        // Get order details
        const { data: order, error: orderError } = await supabaseAdmin
            .from("Orders")
            .select("id, payment_status, bank_receipt_url, paid_at")
            .eq("id", orderId)
            .single();

        if (orderError || !order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.payment_status === true) {
            return res.status(409).json({ error: "Order is already confirmed as paid" });
        }

        if (!order.bank_receipt_url || !order.paid_at) {
            return res.status(400).json({ error: "Order has no pending transfer to verify" });
        }

        if (action === "confirm") {
            // Confirm the payment
            const { error: updateError } = await supabaseAdmin
                .from("Orders")
                .update({
                    payment_status: true,
                    confirmed_at: new Date().toISOString(),
                    confirmed_by: incomingAdminKey.slice(0, 16), // Store partial key for audit
                })
                .eq("id", orderId);

            if (updateError) {
                return res.status(500).json({
                    error: "Could not confirm payment",
                    details: updateError.message,
                });
            }

            return res.status(200).json({
                success: true,
                orderId,
                action: "confirmed",
                message: "Payment confirmed successfully",
            });
        } else {
            // Reject - clear the receipt and paid_at, allowing user to try again
            const { error: updateError } = await supabaseAdmin
                .from("Orders")
                .update({
                    bank_receipt_url: null,
                    paid_at: null,
                    payment_reference: null,
                })
                .eq("id", orderId);

            if (updateError) {
                return res.status(500).json({
                    error: "Could not reject payment",
                    details: updateError.message,
                });
            }

            return res.status(200).json({
                success: true,
                orderId,
                action: "rejected",
                message: "Payment rejected. User can submit again.",
            });
        }
    } catch (error: unknown) {
        return res.status(500).json({
            error: "Server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
