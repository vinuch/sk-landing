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

let menuCache: any = null;
let lastFetch = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query;
    console.log(id, 'no id', req.query)

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

    // ✅ If ID is provided → fetch single product
    if (id) {

      const productResponse = await odooRPC("object", "execute_kw", [
        DB,
        uid,
        PASSWORD,
        "product.product",
        "read",
        [[Number(id)]],
        {
          fields: [
            "id",
            "name",
            "list_price",
            "default_code",
            "product_tmpl_id",
          ],
        },
      ]);

      const product = productResponse.result?.[0];
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Fetch category info from template
      const templateId = product.product_tmpl_id?.[0];
      let category_id = null;
      let category_name = null;

      if (templateId) {
        const templateResponse = await odooRPC("object", "execute_kw", [
          DB,
          uid,
          PASSWORD,
          "product.template",
          "read",
          [[templateId]],
          { fields: ["id", "categ_id"] },
        ]);

        const template = templateResponse.result?.[0];
        if (template?.categ_id) {
          [category_id, category_name] = template.categ_id;
        }
      }

      const productWithCategory = {
        ...product,
        category_id,
        category_name,
      };

      return res.status(200).json(productWithCategory);
    }

    const now = Date.now();

    // Serve cached menu if fresh
    if (menuCache && now - lastFetch < CACHE_TTL) {
      return res.status(200).json(menuCache);
    }

    // ✅ Otherwise → fetch all available POS products
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

    const templateIds = [
      ...new Set(products.result.map((p: any) => p.product_tmpl_id[0])),
    ];

    const templates = await odooRPC("object", "execute_kw", [
      DB,
      uid,
      PASSWORD,
      "product.template",
      "read",
      [templateIds],
      { fields: ["id", "categ_id"] },
    ]);

    const categoryMap = Object.fromEntries(
      templates.result.map((t: any) => [
        t.id,
        t.categ_id || [null, null],
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

    menuCache = productsWithCategory;
    lastFetch = Date.now();

    return res.status(200).json(productsWithCategory);
  } catch (err: any) {
    console.error("Error fetching products:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}