import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Verify cron secret if set
    if (CRON_SECRET) {
        const authHeader = req.headers.authorization || "";
        const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (bearerToken !== CRON_SECRET) {
            return res.status(401).json({ error: "Unauthorized" });
        }
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return res.status(500).json({
            error: "Missing Supabase server config",
        });
    }

    try {
        // Calculate cutoff time (2 hours ago)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        // Find orders that:
        // 1. Are bank transfer orders
        // 2. Have not been marked as paid (payment_status != true)
        // 3. Were created more than 2 hours ago
        // 4. Have no receipt uploaded (bank_receipt_url is null)
        const { data: pendingOrders, error: fetchError } = await supabaseAdmin
            .from("Orders")
            .select("id, created_at, payment_method, payment_status, bank_receipt_url")
            .eq("payment_method", "bank_transfer")
            .or("payment_status.is.null,payment_status.eq.false")
            .is("bank_receipt_url", null)
            .lt("created_at", twoHoursAgo);

        if (fetchError) {
            return res.status(500).json({
                error: "Could not fetch pending orders",
                details: fetchError.message,
            });
        }

        const ordersToCancel = pendingOrders || [];

        if (ordersToCancel.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No orders to cancel",
                cancelledCount: 0,
            });
        }

        // Cancel the orders by updating their status
        const orderIds = ordersToCancel.map((order) => order.id);

        // Add a cancelled note to the order_notes JSON field
        const cancelledNote = {
            cancelled_at: new Date().toISOString(),
            cancel_reason: "Auto-cancelled: No payment receipt submitted within 2 hours",
        };

        // Update orders - set a special flag in order_notes to indicate cancellation
        const updates = orderIds.map(async (orderId) => {
            // First get current order_notes
            const { data: order } = await supabaseAdmin
                .from("Orders")
                .select("order_notes")
                .eq("id", orderId)
                .single();

            const currentNotes = (order?.order_notes as Record<string, unknown>) || {};
            const updatedNotes = {
                ...currentNotes,
                ...cancelledNote,
            };

            return supabaseAdmin
                .from("Orders")
                .update({ order_notes: updatedNotes })
                .eq("id", orderId);
        });

        await Promise.all(updates);

        return res.status(200).json({
            success: true,
            message: `Cancelled ${ordersToCancel.length} pending order(s)`,
            cancelledCount: ordersToCancel.length,
            cancelledOrderIds: orderIds,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            error: "Server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
