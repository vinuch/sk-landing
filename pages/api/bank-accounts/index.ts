import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Hardcoded bank account for Satellite Kitchen
    const bankAccount = {
        id: 1,
        account_name: "Satellite Kitchen Restaurant & Bar",
        account_number: "0069251514",
        bank_name: "Access Bank",
    };

    return res.status(200).json({
        success: true,
        bankAccount,
    });
}
