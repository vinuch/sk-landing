import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Database } from "@/types_db";

// Use the database enum type directly
type DeliveryStatus = Database["public"]["Enums"]["Delivery_status"];

const STATUS_FLOW: DeliveryStatus[] = [
    "pending",
    "awaiting_confirmation", 
    "confirmed",
    "preparing",
    "ready",
    "rider_arrived",
    "rider_left",
    "delivered"
];

type UpdateOrderStatusBody = {
    orderId?: number | string;
    action?: "next" | "set" | "previous";
    status?: DeliveryStatus;
};

function getNextStatus(current: DeliveryStatus): DeliveryStatus {
    const index = STATUS_FLOW.indexOf(current);
    if (index < 0 || index === STATUS_FLOW.length - 1) return "delivered";
    return STATUS_FLOW[index + 1];
}

function getPreviousStatus(current: DeliveryStatus): DeliveryStatus {
    const index = STATUS_FLOW.indexOf(current);
    if (index <= 0) return "pending";
    return STATUS_FLOW[index - 1];
}

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

    const body = req.body as UpdateOrderStatusBody;
    const orderId = Number(body.orderId);

    if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ error: "Valid orderId is required" });
    }

    const action = body.action || "next";

    if (action !== "next" && action !== "set" && action !== "previous") {
        return res.status(400).json({ error: "action must be 'next', 'previous', or 'set'" });
    }

    try {
        const { data: order, error: orderError } = await supabaseAdmin
            .from("Orders")
            .select("id, delivery_status, delivery_tracking, payment_status, payment_method, bank_receipt_url")
            .eq("id", orderId)
            .single();

        if (orderError || !order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Use the delivery_tracking column (text-based, more flexible)
        const currentStatus = (order as any).delivery_tracking || order.delivery_status || "pending";
        let newStatus: string;

        if (action === "set") {
            const requested = body.status;
            if (!requested || !STATUS_FLOW.includes(requested)) {
                return res.status(400).json({
                    error: "status must be one of: " + STATUS_FLOW.join(", "),
                });
            }
            newStatus = requested;
        } else if (action === "previous") {
            newStatus = getPreviousStatus(currentStatus as DeliveryStatus);
        } else {
            newStatus = getNextStatus(currentStatus as DeliveryStatus);
        }

        const { error: updateError } = await supabaseAdmin
            .from("Orders")
            .update({ 
                delivery_tracking: newStatus
            })
            .eq("id", orderId);

        if (updateError) {
            return res.status(500).json({
                error: "Could not update delivery status",
                details: updateError.message,
            });
        }

        return res.status(200).json({
            success: true,
            orderId,
            previousStatus: currentStatus,
            deliveryStatus: newStatus,
            deliveryTracking: newStatus,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            error: "Server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
