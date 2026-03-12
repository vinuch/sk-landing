import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ContactBody = {
    name?: string;
    phone?: string;
    message?: string;
    inquiryType?: string;
    inquiryOther?: string;
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

    const body = req.body as ContactBody;
    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    const message = (body.message || "").trim();
    const inquiryType = (body.inquiryType || "").trim();
    const inquiryOther = (body.inquiryOther || "").trim();

    if (!name || !phone || !message || !inquiryType) {
        return res.status(400).json({ error: "name, phone, inquiryType and message are required" });
    }

    if (inquiryType === "other" && !inquiryOther) {
        return res.status(400).json({ error: "Please provide your other reason" });
    }

    const payload = {
        name,
        phone,
        message,
        inquiry_type: inquiryType,
        inquiry_other: inquiryType === "other" ? inquiryOther : null,
    };

    const { error } = await supabaseAdmin.from("ContactInquiries").insert(payload);

    if (error) {
        return res.status(500).json({
            error: "Could not save inquiry",
            details: error.message,
            hint: "Ensure ContactInquiries table exists with name, phone, message, inquiry_type, inquiry_other columns.",
        });
    }

    return res.status(200).json({ success: true });
}
