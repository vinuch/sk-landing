import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type MenuState = {
    data: any | null;
    setData: (data: any) => void;
}

export const useMenuStore = create(
    persist<MenuState>(
        (set) => ({
            data: null,
            setData: (data) => set({ data })
        }),
        {
            name: "sk-menu-store", // localStorage key name
            storage: createJSONStorage(() => localStorage)
        }
    )
)
