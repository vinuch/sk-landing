import { Selections } from "@/pages/restaurant-menu/[id]";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type CartItem = {
    id: string;
    productRef?: string;
    name: string;
    list_price: number;
    subTotal: number;
    category_name: string;
    quantity: number;
    selections: Selections;
};

type CartState = {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
};

function buildCartItemId(item: CartItem) {
    const baseId = String(item.productRef || item.id);
    return JSON.stringify({
        baseId,
        subTotal: item.subTotal,
        selections: item.selections,
    });
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (item) => {
                const normalizedItem: CartItem = {
                    ...item,
                    id: buildCartItemId(item),
                    productRef: String(item.productRef || item.id),
                };
                const existing = get().items.find((i) => i.id === normalizedItem.id);
                if (existing) {
                    set({
                        items: get().items.map((i) =>
                            i.id === normalizedItem.id ? { ...i, quantity: i.quantity + normalizedItem.quantity } : i
                        ),
                    });
                } else {
                    set({ items: [...get().items, normalizedItem] });
                }
            },

            removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

            clearCart: () => set({ items: [] }),
        }),
        {
            name: "sk-cart-storage",
            storage: createJSONStorage(() => localStorage),
            // Only persist the items array; totals will be computed on the fly
            partialize: (state) => ({ items: state.items }),
        }
    )
);

// Derived selectors (compute totals on the fly)
export const useCartTotals = () => {
    const items = useCartStore((state) => state.items);
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = items.reduce((acc, item) => acc + item.subTotal * item.quantity, 0);
    return { totalItems, totalPrice };
};
