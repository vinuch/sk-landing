// app/api/pos-products/route.ts
import { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";

const ODOO_URL = process.env.ODOO_URL!;
const DB = process.env.ODOO_DB!;
const USERNAME = process.env.ODOO_USER!;
const PASSWORD = process.env.ODOO_PASSWORD!;

// Helper function for JSON-RPC calls
async function odooRPC(service: string, method: string, args: any[]) {
  const response = await fetch(ODOO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: Math.floor(Math.random() * 1000),
    }),
  });
  return response.json();
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 1️⃣ Authenticate API user
    const auth = await odooRPC("common", "authenticate", [
      DB,
      USERNAME,
      PASSWORD,
      {},
    ]);
    const uid = auth.result;

    if (!uid) {
      return res.status(401).json({ error: "Authentication failed" });
    }

    // 2️⃣ Fetch POS products
    const products = await odooRPC("object", "execute_kw", [
      DB,
      uid,
      PASSWORD,
      "product.product",
      "search_read",
      [[["available_in_pos", "=", true]]],
      {
        fields: ["id", "name", "list_price", "default_code", "product_tmpl_id"],
        limit: 50,
      },
    ]);

    // 2️⃣ Extract template IDs
    const templateIds = [
      ...new Set(products.result.map((p: any) => p.product_tmpl_id[0])),
    ];

    // 3️⃣ Fetch templates with product category
    const templates = await odooRPC("object", "execute_kw", [
      DB,
      uid,
      PASSWORD,
      "product.template",
      "read",
      [templateIds],
      { fields: ["id", "categ_id"] },
    ]);

    // 4️⃣ Map category to products
    const categoryMap = Object.fromEntries(
      templates.result.map((t: any) => [
        t.id,
        t.categ_id || [null, null], // store the whole [id, name] tuple
      ])
    );

    const productsWithCategory = products.result.map((p: any) => {
      const [catId, catName] = categoryMap[p.product_tmpl_id[0]] || [
        null,
        null,
      ];
      return {
        ...p,
        category_id: catId,
        category_name: catName,
      };
    });

    console.log(productsWithCategory, "hello");

    return res.status(200).json(productsWithCategory);
  } catch (err: any) {
    console.error("Error fetching POS products:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
