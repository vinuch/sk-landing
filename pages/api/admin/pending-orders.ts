import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function isUnauthorized(adminKey?: string, incomingKey?: string) {
    return !adminKey || !incomingKey || incomingKey !== adminKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const adminKey = process.env.ORDER_ADMIN_KEY;
    const incomingAdminKey = (req.headers["x-admin-key"] as string) || "";
    if (isUnauthorized(adminKey, incomingAdminKey)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return res.status(500).json({
            error: "Missing Supabase server config (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
        });
    }

    try {
        // Get orders that have bank_receipt_url but payment_status is false/null
        // These are orders awaiting admin verification
        const { data: orders, error: ordersError } = await supabaseAdmin
            .from("Orders")
            .select(
                "id, created_at, user_id, items_subtotal, delivery_fee, total_amount, payment_status, payment_method, payment_reference, delivery_status, delivery_address, delivery_instructions, vendor_instructions, bank_receipt_url, paid_at, order_notes"
            )
            .not("bank_receipt_url", "is", null)
            .or("payment_status.is.null,payment_status.eq.false")
            .order("paid_at", { ascending: false })
            .limit(100);

        if (ordersError) {
            return res.status(500).json({
                error: "Could not fetch pending orders",
                details: ordersError.message,
            });
        }

        const orderList = orders || [];
        const orderIds = orderList.map((order) => order.id);
        const userIds = [
            ...new Set(
                orderList
                    .map((order) => order.user_id)
                    .filter((value): value is string => typeof value === "string" && value.length > 0)
            ),
        ];

        // Fetch order items
        let orderItems: { id: number; order_id: number | null; item_name: string | null; quantity: number | null; unit_price: number | null; line_total: number | null; product_ref: string | null; }[] = [];
        if (orderIds.length > 0) {
            const itemsResponse = await supabaseAdmin
                .from("OrderItems")
                .select("id, order_id, item_name, quantity, unit_price, line_total, product_ref")
                .in("order_id", orderIds)
                .order("id", { ascending: true });

            if (!itemsResponse.error && itemsResponse.data) {
                orderItems = itemsResponse.data;
            }
        }

        // Fetch user profiles
        let profiles: { id: string; full_name: string | null; phone: string | null }[] = [];
        if (userIds.length > 0) {
            const profilesResponse = await supabaseAdmin
                .from("profiles")
                .select("id, full_name, phone")
                .in("id", userIds);

            if (!profilesResponse.error && profilesResponse.data) {
                profiles = profilesResponse.data;
            }
        }

        return res.status(200).json({
            success: true,
            orders: orderList,
            orderItems,
            profiles,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            error: "Server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
