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
        const ordersResponse = await supabaseAdmin
            .from("Orders")
            .select(
                "id, created_at, user_id, total_amount, payment_status, payment_method, payment_reference, delivery_status, delivery_address, delivery_instructions, vendor_instructions"
            )
            .order("created_at", { ascending: false })
            .limit(200);

        if (ordersResponse.error) {
            // Fallback for projects with older/minimal Orders schema.
            const fallback = await supabaseAdmin
                .from("Orders")
                .select("id, created_at, total_amount, payment_status, payment_method")
                .order("created_at", { ascending: false })
                .limit(200);

            if (fallback.error) {
                return res.status(500).json({
                    error: "Could not fetch orders",
                    details: fallback.error.message,
                });
            }

            return res.status(200).json({
                success: true,
                orders: fallback.data || [],
                orderItems: [],
                profiles: [],
            });
        }

        const orders = ordersResponse.data || [];
        const orderIds = orders.map((order: any) => order.id);
        const userIds = [...new Set(orders.map((order: any) => order.user_id).filter(Boolean))];

        let orderItems: any[] = [];
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

        let profiles: any[] = [];
        if (userIds.length > 0) {
            const profilesResponse = await supabaseAdmin
                .from("profiles")
                .select("id, full_name, phone")
                .in("id", userIds as string[]);

            if (!profilesResponse.error && profilesResponse.data) {
                profiles = profilesResponse.data;
            }
        }

        return res.status(200).json({
            success: true,
            orders,
            orderItems,
            profiles,
        });
    } catch (error: any) {
        return res.status(500).json({
            error: "Server error",
            details: error?.message || "Unknown error",
        });
    }
}
