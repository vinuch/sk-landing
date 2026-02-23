// app/api/pos-products/route.ts
import { NextApiRequest, NextApiResponse } from "next";

const ODOO_URL = process.env.ODOO_URL!;
const DB = process.env.ODOO_DB!;
const USERNAME = process.env.ODOO_USER!;
const PASSWORD = process.env.ODOO_PASSWORD!;

type OdooRPCResponse<T> = {
  result: T;
};

type OdooProduct = {
  id: number;
  name: string;
  list_price: number;
  default_code?: string | null;
  product_tmpl_id?: [number, string] | null;
};

type OdooTemplate = {
  id: number;
  categ_id?: [number, string] | null;
};

type ProductWithCategory = OdooProduct & {
  category_id: number | null;
  category_name: string | null;
};

function isOdooProduct(value: unknown): value is OdooProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Record<string, unknown>;
  return (
    typeof product.id === "number" &&
    typeof product.name === "string" &&
    typeof product.list_price === "number"
  );
}

function isOdooTemplate(value: unknown): value is OdooTemplate {
  if (!value || typeof value !== "object") return false;
  const template = value as Record<string, unknown>;
  return typeof template.id === "number";
}

// Helper function for JSON-RPC calls
async function odooRPC<T>(service: string, method: string, args: unknown[]) {
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
  return (await response.json()) as OdooRPCResponse<T>;
}

let menuCache: ProductWithCategory[] | null = null;
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
    const auth = await odooRPC<number | null>("common", "authenticate", [
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

      const productResponse = await odooRPC<unknown[]>("object", "execute_kw", [
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

      const product = productResponse.result.find(isOdooProduct);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Fetch category info from template
      const templateId = product.product_tmpl_id?.[0];
      let category_id = null;
      let category_name = null;

      if (templateId) {
        const templateResponse = await odooRPC<unknown[]>("object", "execute_kw", [
          DB,
          uid,
          PASSWORD,
          "product.template",
          "read",
          [[templateId]],
          { fields: ["id", "categ_id"] },
        ]);

        const template = templateResponse.result.find(isOdooTemplate);
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
    const products = await odooRPC<unknown[]>("object", "execute_kw", [
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

    const productRows = products.result.filter(isOdooProduct);
    const templateIds = [
      ...new Set(
        productRows
          .map((product) => product.product_tmpl_id?.[0])
          .filter((templateId): templateId is number => typeof templateId === "number")
      ),
    ];

    const templates = await odooRPC<unknown[]>("object", "execute_kw", [
      DB,
      uid,
      PASSWORD,
      "product.template",
      "read",
      [templateIds],
      { fields: ["id", "categ_id"] },
    ]);

    const templateRows = templates.result.filter(isOdooTemplate);
    const categoryMap = Object.fromEntries(
      templateRows.map((template) => [
        template.id,
        template.categ_id || [null, null],
      ])
    ) as Record<number, [number | null, string | null]>;

    const productsWithCategory = productRows.map((product) => {
      const templateId = product.product_tmpl_id?.[0];
      const [catId, catName] = (typeof templateId === "number" ? categoryMap[templateId] : null) || [
        null,
        null,
      ];
      return {
        ...product,
        category_id: catId,
        category_name: catName,
      };
    });

    menuCache = productsWithCategory;
    lastFetch = Date.now();

    return res.status(200).json(productsWithCategory);
  } catch (error: unknown) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
