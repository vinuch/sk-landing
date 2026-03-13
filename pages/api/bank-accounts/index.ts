import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        return res.status(500).json({
            error: "Missing Supabase server config (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
        });
    }

    try {
        const { data: bankAccount, error } = await supabaseAdmin
            .from("bank_accounts")
            .select("id, account_name, account_number, bank_name")
            .eq("is_active", true)
            .single();

        if (error) {
            return res.status(500).json({
                error: "Could not fetch bank account",
                details: error.message,
            });
        }

        if (!bankAccount) {
            return res.status(404).json({
                error: "No active bank account found",
            });
        }

        return res.status(200).json({
            success: true,
            bankAccount,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            error: "Server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
