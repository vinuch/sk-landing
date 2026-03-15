import crypto from "crypto";
import type { Json } from "@/types_db";

export type RequestedCheckoutItem = {
    id: string;
    quantity: number;
    name?: string;
    unitPrice?: number;
    subTotal?: number;
    lineTotal?: number;
    selections?: Json;
    selectionSummary?: string;
    categoryName?: string;
};

export type TrustedCheckoutItem = {
    id: string;
    name: string;
    displayName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    baseUnitPrice: number;
    selections?: Json;
    selectionSummary?: string;
    categoryName?: string;
};

export const DELIVERY_FEE_NAIRA = 1000;

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

function normalizeProductId(rawId: unknown) {
    const value = String(rawId ?? "").trim();
    if (!value) return "";

    if (/^\d+$/.test(value)) return value;

    const leadingDigits = value.match(/^(\d+)/);
    return leadingDigits?.[1] || "";
}

function sanitizeOptionalString(value: unknown) {
    if (typeof value !== "string") return undefined;

    const trimmed = value.trim();
    return trimmed || undefined;
}

function sanitizeOptionalNumber(value: unknown) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : undefined;
}

function sanitizeOptionalJson(value: unknown): Json | undefined {
    if (value === null) return null;

    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return value;
    }

    if (Array.isArray(value)) {
        return value
            .map(sanitizeOptionalJson)
            .filter((entry): entry is Json => entry !== undefined);
    }

    if (!value || typeof value !== "object") {
        return undefined;
    }

    const entries = Object.entries(value as Record<string, unknown>)
        .map(([key, entryValue]) => [key, sanitizeOptionalJson(entryValue)] as const)
        .filter(([, entryValue]) => entryValue !== undefined);

    return Object.fromEntries(entries);
}

function buildDisplayName(name: string, selectionSummary?: string) {
    const trimmedSummary = sanitizeOptionalString(selectionSummary);
    return trimmedSummary && trimmedSummary !== "No selections" ? `${name} - ${trimmedSummary}` : name;
}

export function sanitizeRequestedItems(items: unknown): RequestedCheckoutItem[] {
    if (!Array.isArray(items)) return [];

    const sanitizedItems: RequestedCheckoutItem[] = [];

    for (const raw of items) {
        if (!raw || typeof raw !== "object") continue;

        const record = raw as Record<string, unknown>;
        const id = normalizeProductId(record.productRef ?? record.id);
        const quantity = Number(record.quantity ?? 0);

        if (!id) continue;
        if (!Number.isFinite(quantity) || quantity <= 0) continue;

        const safeQty = Math.min(Math.floor(quantity), 50);
        const trustedUnitPrice = sanitizeOptionalNumber(record.unitPrice ?? record.subTotal);
        const trustedLineTotal = sanitizeOptionalNumber(record.lineTotal);

        sanitizedItems.push({
            id,
            quantity: safeQty,
            name: sanitizeOptionalString(record.name),
            unitPrice: trustedUnitPrice,
            subTotal: trustedUnitPrice,
            lineTotal: trustedLineTotal,
            selections: sanitizeOptionalJson(record.selections),
            selectionSummary: sanitizeOptionalString(record.selectionSummary),
            categoryName: sanitizeOptionalString(record.categoryName ?? record.category_name),
        });
    }

    return sanitizedItems;
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
        return {
            trustedItems: [] as TrustedCheckoutItem[],
            subtotalNaira: 0,
            deliveryFeeNaira: DELIVERY_FEE_NAIRA,
            amountKobo: 0,
        };
    }

    const parsedIds = items.map((item) => Number(item.id));
    if (parsedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
        throw new Error("Invalid item id(s)");
    }
    const numericIds = Array.from(new Set(parsedIds));

    const products = await fetchOdooProductsByIds(numericIds);
    const productsById = new Map<number, OdooProductRow>(products.map((product) => [product.id, product]));

    const trustedItems: TrustedCheckoutItem[] = items.map((item) => {
        const productId = Number(item.id);
        const product = productsById.get(productId);
        if (!product) {
            throw new Error(`Unknown product id: ${item.id}`);
        }

        const baseUnitPrice = Number(product.list_price || 0);
        const quantity = Math.max(1, Math.min(50, Math.floor(item.quantity)));
        const requestedUnitPrice = sanitizeOptionalNumber(item.unitPrice ?? item.subTotal);
        const requestedLineTotal = sanitizeOptionalNumber(item.lineTotal);
        const unitPrice = requestedUnitPrice ?? (requestedLineTotal !== undefined ? requestedLineTotal / quantity : baseUnitPrice);
        const lineTotal = requestedLineTotal ?? unitPrice * quantity;
        const name = sanitizeOptionalString(item.name) || product.name;

        return {
            id: String(product.id),
            name,
            displayName: buildDisplayName(name, item.selectionSummary),
            quantity,
            unitPrice,
            lineTotal,
            baseUnitPrice,
            selections: item.selections,
            selectionSummary: item.selectionSummary,
            categoryName: item.categoryName,
        };
    });

    const subtotalNaira = trustedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalNaira = subtotalNaira + DELIVERY_FEE_NAIRA;
    return {
        trustedItems,
        subtotalNaira,
        deliveryFeeNaira: DELIVERY_FEE_NAIRA,
        amountKobo: Math.round(totalNaira * 100),
    };
}
