"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Layout from "@/components/layout";
import { League_Spartan } from "next/font/google";
import { useEffect, useState } from "react";
import SkeletonCard from "@/components/SkeletonCard";
import { useMenuStore } from "@/store/menuStore";
import MenuItemCard from "@/components/menu-item-card";

type RestaurantMenuProps = {
  preview: boolean;
};

export type MenuItemsRow = {
  list_price: number;
  category_name: string;
  id: string;
  name: string;
};

const NON_ORDERABLE_CATEGORIES = new Set(["swallows", "Proteins"]);

export const leagueSpartan = League_Spartan({
  weight: "700",
  style: "normal",
  subsets: ["latin"],
});

export default function RestaurantMenu({ preview }: RestaurantMenuProps) {
  const [menuItems, setMenuItems] = useState<MenuItemsRow[]>([]);
  const [selectedType, setSelectedType] = useState("all");
  const [loading, setLoading] = useState(true);
  const setData = useMenuStore((state) => state.setData);

  const filteredItems =
    selectedType === "all"
      ? menuItems.sort((a, b) => {
          const nameA = a.category_name ?? "";
          const nameB = b.category_name ?? "";
          return nameB.localeCompare(nameA);
        })
      : menuItems.filter((item) => item.category_name === selectedType);

  useEffect(() => {
    const fetchMenuItems = async () => {
      const res = await fetch("/api/pos-products");
      if (!res.ok) {
        console.error("Odoo request failed:", res.status, res.statusText);
        return [];
      }
      const dt = await res.json();
      setMenuItems(dt);
      setLoading(false);
      setData(dt);
    };

    fetchMenuItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout preview={preview}>
      <div className={`bg-primary ${leagueSpartan.className}`}>
        <div className=" bg-white/60 p-12 md:p-24 h-screen overflow-y-scroll">
          <div className="sticky top-0">
            <h2 className="text-black text-center text-4xl md:text-5xl">
              Satellite Kitchen Menu
            </h2>
            <Tabs defaultValue="all">
              <TabsList className="flex gap-4 bg-transparent justify-center mb-6">
                <TabsTrigger className="bg-white" value="all" onClick={() => setSelectedType("all")}>
                  All
                </TabsTrigger>
                <TabsTrigger className="bg-white" value="Soups" onClick={() => setSelectedType("Soups")}>
                  Soup
                </TabsTrigger>
                <TabsTrigger className="bg-white" value="swallows" onClick={() => setSelectedType("swallows")}>
                  Swallow
                </TabsTrigger>
                <TabsTrigger className="bg-white" value="Proteins" onClick={() => setSelectedType("Proteins")}>
                  Protein
                </TabsTrigger>
              </TabsList>
              <TabsContent value={selectedType}>
                <div className="flex gap-10 my-12 flex-wrap justify-center">
                  {loading
                    ? Array(6)
                        .fill(0)
                        .map((_, idx) => <SkeletonCard key={idx} />)
                    : filteredItems.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          pixelEvent="Lead"
                          disabled={NON_ORDERABLE_CATEGORIES.has(item.category_name)}
                          disabledLabel="Choose from soup options"
                        />
                      ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}
