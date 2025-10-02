"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Layout from "@/components/layout";
import { Database } from "@/types_db";
import { supabase } from "@/utils/supabase/client";
import { League_Spartan } from "next/font/google";
import { useEffect, useState } from "react";
type RestaurantMenuProps = {
  preview: boolean;
};
type MenuItemsRow = {
  category_name: string;
  id: number;
  name: string;

}
const leagueSpartan = League_Spartan({
  weight: "700", // if single weight, otherwise you use array like [400, 500, 700],
  style: "normal", // if single style, otherwise you use array like ['normal', 'italic']
  subsets: ["latin"],
});
export default function RestaurantMenu({ preview }: RestaurantMenuProps) {
  const [menuItems, setMenuItems] = useState<MenuItemsRow[]>([]);
  const [selectedType, setSelectedType] = useState("all");

  // const filteredItems = selectedType === "all"
  //   // @ts-expect-error i dont know how to fix yet
  //   ? menuItems.sort((a, b) => b.category_name &&  b.category_name.localeCompare(a.category_name))
  //   // @ts-expect-error  i dont know how to fix yet
  //   : menuItems.filter((item) => item.category_name === selectedType);

  const filteredItems = selectedType === "all"
    ? menuItems.sort((a, b) => {
      const nameA = a.category_name ?? ""; // fallback to empty string if null
      const nameB = b.category_name ?? "";
      return nameB.localeCompare(nameA); // sort descending
    })
    : menuItems.filter((item) => item.category_name === selectedType);

  useEffect(() => {
    const fetchMenuItems = async () => {
      // const { data, error } = await supabase
      //   .from("MenuItems") // replace 'menu' with your table name
      //   .select("*");

      // if (error) {
      //   // setError(error);
      // } else {
      //   console.log(data);
      //   setMenuItems(data);
      // }

      const res = await fetch("/api/pos-products");
      if (!res.ok) {
        console.error("Odoo request failed:", res.status, res.statusText);
        return [];
      }
      const dt = await res.json();

      setMenuItems(dt)

    };

    fetchMenuItems();


  }, []);

  //   const [menu] = useState([
  //     {
  //       id: 1,
  //       name: "Egusi soup",
  //       img: "egusi.jpeg",
  //       price: 2500,
  //       link: "https://wa.me/p/8453684341344190/2347032189083",
  //     },
  //     {
  //       id: 5,
  //       name: "Rice & Ofe Akwu (Banga stew)",
  //       img: "rice&banga.jpeg",
  //       price: 2500,
  //       link: "https://wa.me/p/8421416651269514/2347032189083",
  //     },
  //     {
  //       id: 2,
  //       name: "Okra soup",
  //       img: "okra.jpeg",
  //       price: 2500,
  //       link: "https://wa.me/p/8843015549063708/2347032189083",
  //     },
  //     {
  //       id: 3,
  //       name: "Vegetable soup",
  //       img: "vegetable.jpeg",
  //       price: 2500,
  //       link: "https://wa.me/p/8869638753068621/2347032189083",
  //     },
  //     {
  //       id: 4,
  //       name: "Nsala soup",
  //       img: "nsala.jpeg",
  //       price: 2500,
  //       link: "https://wa.me/c/2347032189083",
  //     },
  //     {
  //       id: 5,
  //       name: "bitterleaf soup",
  //       img: "bitterleaf.png",
  //       price: 2500,
  //       link: "https://wa.me/c/2347032189083",
  //     },
  //   ]);
  const handleMenuItemClick = () => {
    // @ts-expect-error: untyped external dependency
    if (window.fbq) {
      // @ts-expect-error: untyped external dependency
      window.fbq("track", "Lead");
      console.log("Lead tracked");
    } else {
      console.warn("fbq is not defined");
    }
  };
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
              {/* {JSON.stringify(filteredItems)} */}
              <TabsContent value={selectedType}>
                <div className="flex gap-10 my-12 flex-wrap justify-center">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="w-full md:w-300px rounded-lg overflow-hidden relative group cursor-pointer hpver:text-white hover:rotate-3 transition-all ease-in-out bg-white/50 bg-cover bg-center bg-repeat"
                      style={{
                        backgroundImage: `url(/${item.name
                          ?.split(" ")[0]
                          .toLowerCase()}.png), url(/placeholder.png)`,
                        minHeight: "300px",
                      }}
                    >
                      <div className="flex absolute top-0 items-end w-full p-4 hover:pb-8 transition-all bg-black/10 hover:bg-black/40 hover:text-white text-lg h-full">
                        <a
                          href={`https://api.whatsapp.com/send?phone=2347032189083&text=Hello%2C%20I%20would%20like%20to%20order%20${item.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleMenuItemClick}
                        >
                          <p className="absolute text-center hover:underline top-32 -translate-x-80 group-hover:translate-x-0 transition-all">
                            View & Order on Whatsapp
                          </p>
                        </a>
                        <div className="flex justify-between w-full">
                          <span>{item.name}</span>
                          <span>{item.category_name}</span>
                        </div>
                      </div>
                    </div>
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
