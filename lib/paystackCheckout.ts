import crypto from "crypto";

export type RequestedCheckoutItem = {
    id: string;
    quantity: number;
};

export type TrustedCheckoutItem = {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
};

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USER = process.env.ODOO_USER;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD;

async function odooRPC(service: string, method: string, args: unknown[]) {
    if (!ODOO_URL) {
        throw new Error("Missing ODOO_URL");
    }

    const response = await fetch(ODOO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: { service, method, args },
            id: Math.floor(Math.random() * 100000),
        }),
    });

    if (!response.ok) {
        throw new Error(`Odoo request failed (${response.status})`);
    }

    return response.json();
}

function assertOdooConfig() {
    if (!ODOO_DB || !ODOO_USER || !ODOO_PASSWORD) {
        throw new Error("Missing Odoo env config (ODOO_DB, ODOO_USER, ODOO_PASSWORD)");
    }
}

export function makeServerReference() {
    return `sk_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export function sanitizeRequestedItems(items: unknown): RequestedCheckoutItem[] {
    if (!Array.isArray(items)) return [];

    const deduped = new Map<string, number>();

    for (const raw of items) {
        if (!raw || typeof raw !== "object") continue;

        const id = String((raw as Record<string, unknown>).id ?? "").trim();
        const quantity = Number((raw as Record<string, unknown>).quantity ?? 0);

        if (!id) continue;
        if (!Number.isFinite(quantity) || quantity <= 0) continue;

        const safeQty = Math.min(Math.floor(quantity), 50);
        deduped.set(id, (deduped.get(id) || 0) + safeQty);
    }

    return Array.from(deduped.entries()).map(([id, quantity]) => ({
        id,
        quantity: Math.min(quantity, 50),
    }));
}

type OdooProductRow = {
    id: number;
    name: string;
    list_price: number;
};

async function fetchOdooProductsByIds(productIds: number[]): Promise<OdooProductRow[]> {
    assertOdooConfig();

    const auth = await odooRPC("common", "authenticate", [
        ODOO_DB,
        ODOO_USER,
        ODOO_PASSWORD,
        {},
    ]);
    const uid = auth?.result;

    if (!uid) {
        throw new Error("Odoo authentication failed");
    }

    const productResponse = await odooRPC("object", "execute_kw", [
        ODOO_DB,
        uid,
        ODOO_PASSWORD,
        "product.product",
        "read",
        [productIds],
        {
            fields: ["id", "name", "list_price"],
        },
    ]);

    return Array.isArray(productResponse?.result) ? (productResponse.result as OdooProductRow[]) : [];
}

export async function buildTrustedCheckout(items: RequestedCheckoutItem[]) {
    if (items.length === 0) {
        return { trustedItems: [] as TrustedCheckoutItem[], amountKobo: 0 };
    }

    const numericIds = items.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0);
    if (numericIds.length !== items.length) {
        throw new Error("Invalid item id(s)");
    }

    const products = await fetchOdooProductsByIds(numericIds);
    const productsById = new Map<number, OdooProductRow>(products.map((product) => [product.id, product]));

    const trustedItems: TrustedCheckoutItem[] = items.map((item) => {
        const productId = Number(item.id);
        const product = productsById.get(productId);
        if (!product) {
            throw new Error(`Unknown product id: ${item.id}`);
        }

        const unitPrice = Number(product.list_price || 0);
        const quantity = Math.max(1, Math.min(50, Math.floor(item.quantity)));
        const lineTotal = unitPrice * quantity;

        return {
            id: String(product.id),
            name: product.name,
            quantity,
            unitPrice,
            lineTotal,
        };
    });

    const total = trustedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    return {
        trustedItems,
        amountKobo: Math.round(total * 100),
    };
}
