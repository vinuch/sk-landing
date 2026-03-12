import Layout from "@/components/layout";
import { leagueSpartan, MenuItemsRow } from "..";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { FaCartPlus } from "react-icons/fa";
import { useMenuStore } from "@/store/menuStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner"

export type SelectionItem = {
    name: string
    qty: number
    price: number;
}

export type Selections = {
    swallow: SelectionItem[]
    protein: SelectionItem[]
    extraSwallow: SelectionItem[]
    extraProtein: SelectionItem[]
}

type ProductOption = {
    category_name: string
    name: string
    list_price: number
}

type CategoryOption = {
    name: string
    price: number
}

type CategoryConfig = {
    title: string;
    required: boolean;
    max: number;
    options: CategoryOption[];
}





// export default function MenuItem() {
//     const [menuItem, setMenuItem] = useState<MenuItemsRow>();
//     const [open, setOpen] = useState<string | null>(null);
//     const [quantities, setQuantities] = useState<Record<string, number>>({});

//     const router = useRouter();
//     const { id } = router.query;

//     const addItem = useCartStore((state) => state.addItem);

//     useEffect(() => {
//         if (!id) return;
//         const fetchMenuItem = async () => {

//             const res = await fetch(`/api/pos-products?id=${id}`);
//             if (!res.ok) {
//                 console.error("Odoo request failed:", res.status, res.statusText);
//                 return [];
//             }
//             const dt = await res.json();

//             setMenuItem(dt)

//         };

//         fetchMenuItem();


//     }, [id]);

//     const toggleAccordion = (title: string) =>
//         setOpen(open === title ? null : title);

//     const adjustQty = (option: string, delta: number) => {
//         setQuantities((prev) => ({
//             ...prev,
//             [option]: Math.max(0, (prev[option] || 0) + delta),
//         }));
//     };


//     function formatSelections(quantities: Record<string, number>) {
//         const selections: Selections = {
//             swallow: [],
//             protein: [],
//             extraSwallow: [],
//             extraProtein: []
//         }

//         for (const [name, qty] of Object.entries(quantities)) {
//             // categorize items
//             if (["Garri", "Fufu", "Semo"].includes(name)) {
//                 selections.swallow.push({ name, qty })
//             } else if (["Beef", "Goat Meat", "shaki", "round about"].includes(name)) {
//                 selections.protein.push({ name, qty })
//             } else {
//                 // if you ever get an unknown item
//                 selections.extraProtein.push({ name, qty })
//             }
//         }

//         return selections
//     }

//     return (
//         <Layout>
//             <div className={`bg-primary ${leagueSpartan.className}`}>
//                 <div className=" bg-white/60 p-12 md:p-24 h-screen overflow-y-scroll">

//                     {/* <div>
//                         Menu item page {id} {JSON.stringify(menuItem)}
//                     </div> */}
//                     <nav className="text-gray-600 text-sm mb-4" aria-label="breadcrumb">
//                         <ol className="flex items-center space-x-2">
//                             {/* Menu link */}
//                             <li>
//                                 <Link
//                                     href="/restaurant-menu"
//                                     className="hover:text-gray-800 font-medium"
//                                 >
//                                     Menu
//                                 </Link>
//                             </li>

//                             {/* Separator */}
//                             <li>
//                                 <span className="text-gray-400">/</span>
//                             </li>

//                             {/* Current page */}
//                             <li className="text-gray-800 font-semibold">
//                                 {menuItem?.name}
//                             </li>
//                         </ol>
//                     </nav>

//                     <div className="flex flex-col md:flex-row gap-8 md:p-6  mx-auto">
//                         {/* 🖼 Left: Product Image */}
//                         <div className="md:w-1/2 flex justify-center">
//                             <img
//                                 src={`/${menuItem?.name
//                                     ?.split(" ")[0]
//                                     .toLowerCase()}.png`}
//                                 alt={menuItem?.name}
//                                 className="rounded-2xl shadow-md w-full max-w-md h-[500px] object-cover"
//                             />
//                         </div>

//                         {/* 📦 Right: Product Options */}
//                         <div className="md:w-1/2 flex flex-col gap-4">
//                             <h1 className="text-2xl font-semibold mb-2 text-black">{menuItem?.name} {JSON.stringify(quantities)}</h1>
//                             <p className="text-gray-600 mb-4">
//                                 Customize your order by selecting your preferred proteins and swallows.
//                             </p>

//                             <div className="space-y-3">
//                                 {categories.map((cat) => (
//                                     <div
//                                         key={cat.title}
//                                         className="border rounded-xl overflow-hidden shadow-sm"
//                                     >
//                                         {/* Accordion Header */}
//                                         <button
//                                             onClick={() => toggleAccordion(cat.title)}
//                                             className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100"
//                                         >
//                                             <span className="font-medium text-black">{cat.title}</span>
//                                             {open === cat.title ? (
//                                                 <ChevronUp className="w-5 h-5" />
//                                             ) : (
//                                                 <ChevronDown className="w-5 h-5" />
//                                             )}
//                                         </button>

//                                         {/* Accordion Content */}
//                                         {open === cat.title && (
//                                             <div className="bg-white divide-y">
//                                                 {cat.options.map((option) => (
//                                                     <div
//                                                         key={option}
//                                                         className="flex justify-between items-center px-4 py-3"
//                                                     >
//                                                         <span className="text-gray-700">{option}</span>

//                                                         <div className="flex items-center gap-3">
//                                                             <button
//                                                                 onClick={() => adjustQty(option, -1)}
//                                                                 className="w-8 h-8 flex items-center justify-center border rounded-full hover:bg-gray-100"
//                                                             >
//                                                                 <Minus className="w-4 h-4" />
//                                                             </button>
//                                                             <span className="w-5 text-center text-gray-800">
//                                                                 {quantities[option] || 0}
//                                                             </span>
//                                                             <button
//                                                                 onClick={() => adjustQty(option, +1)}
//                                                                 className="w-8 h-8 flex items-center justify-center border rounded-full hover:bg-gray-100"
//                                                             >
//                                                                 <Plus className="w-4 h-4" />
//                                                             </button>
//                                                         </div>
//                                                     </div>
//                                                 ))}
//                                             </div>
//                                         )}
//                                     </div>
//                                 ))}
//                             </div>

//                             <button className="mt-6 w-full bg-green-600 bg-white text-black py-3 rounded-xl font-medium hover:bg-green-700" onClick={() => {
//                                 menuItem?.id && addItem({ ...menuItem, quantity: 1, selections: { ...quantities } })
//                                 console.log(menuItem)
//                             }}>
//                                 Add to Cart
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </Layout>
//     )
// }




export default function MenuItem() {
    const [menuItem, setMenuItem] = useState<MenuItemsRow>();
    const [open, setOpen] = useState<string | null>(null);
    const [subTotal, setSubtotal] = useState<number>(0)
    const [selections, setSelections] = useState<Selections>({
        swallow: [],
        protein: [],
        extraSwallow: [],
        extraProtein: [],
    });
    // Store quantities with composite key: "categoryTitle:optionName"
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    const router = useRouter();
    const { id } = router.query;

    const addItem = useCartStore((state) => state.addItem);
    const data = useMenuStore((state) => state.data)
    const setData = useMenuStore((state) => state.setData)


    const categoryMap: Record<string, CategoryOption[]> = {}

    data?.forEach((item: ProductOption) => {
        const cat = item.category_name
        if (!categoryMap[cat]) categoryMap[cat] = []
        categoryMap[cat].push({ name: item.name.trim(), price: item.list_price })
    })

    const categories: CategoryConfig[] = [
        {
            title: "Main Protein",
            required: true,
            max: 2,
            options: categoryMap.Proteins || [],
        },
        {
            title: "Main Swallow",
            required: true,
            max: 1,
            options: categoryMap.swallows || [],
        },
        {
            title: "Extra Protein",
            required: false,
            max: 10,
            options: categoryMap.Proteins || [],
        },
        {
            title: "Extra Swallow",
            required: false,
            max: 10,
            options: categoryMap.swallows || [],
        },
    ];

    useEffect(() => {
        if (!id) return;
        const fetchMenuItem = async () => {
            const res = await fetch(`/api/pos-products?id=${id}`);
            if (!res.ok) {
                console.error("Odoo request failed:", res.status, res.statusText);
                return;
            }
            const dt = await res.json();
            setMenuItem(dt);
            setSubtotal(dt.list_price)
        };

        fetchMenuItem();
    }, [id]);


    useEffect(() => {
        const fetchMenuItems = async () => {
            const res = await fetch("/api/pos-products");
            if (!res.ok) {
                console.error("Odoo request failed:", res.status, res.statusText);
                return [];
            }
            const dt = await res.json();

            setData(dt)


        };

        fetchMenuItems();


    }, []);

    const toggleAccordion = (title: string) =>
        setOpen(open === title ? null : title);

    // Create unique key for each category-option combination
    const getKey = (categoryTitle: string, option: string) =>
        `${categoryTitle}:${option}`;

    // Calculate total for a category
    const getCategoryTotal = (categoryTitle: string) => {
        const category = categories.find(cat => cat.title === categoryTitle);
        if (!category) return 0;

        return category.options.reduce((sum, option) => {
            const key = getKey(categoryTitle, option.name);
            return sum + (quantities[key] || 0);
        }, 0);
    };

    // Check if category has reached max
    const isCategoryMaxed = (categoryTitle: string) => {
        const category = categories.find(cat => cat.title === categoryTitle);
        if (!category?.max) return false;

        return getCategoryTotal(categoryTitle) >= category.max;
    };

    function formatSelections(quantities: Record<string, number>) {
        const selections: Selections = {
            swallow: [],
            protein: [],
            extraSwallow: [],
            extraProtein: []
        };

        for (const [key, qty] of Object.entries(quantities)) {
            if (qty === 0) continue;

            // Parse the composite key
            const [categoryTitle, name] = key.split(':');

            const category = categories.find(cat => cat.title === categoryTitle);
            const item = category?.options.find(i => i.name === name);
            const price = item?.price ?? 0;



            // Categorize based on category title
            if (categoryTitle === "Main Swallow") {
                selections.swallow.push({ name, qty, price });
            } else if (categoryTitle === "Main Protein") {
                selections.protein.push({ name, qty, price });
            } else if (categoryTitle === "Extra Swallow") {
                selections.extraSwallow.push({ name, qty, price });
            } else if (categoryTitle === "Extra Protein") {
                selections.extraProtein.push({ name, qty, price });
            }
        }



        setSelections(selections)
        // return selections;
    }

    const adjustQty = (option: string, delta: number, categoryTitle: string) => {
        const category = categories.find(cat => cat.title === categoryTitle);
        const currentTotal = getCategoryTotal(categoryTitle);
        const key = getKey(categoryTitle, option);
        const currentQty = quantities[key] || 0;

        // Prevent increment if at max (unless decrementing)
        if (delta > 0 && category?.max && currentTotal >= category.max) {
            return;
        }


        setQuantities((prev) => ({
            ...prev,
            [key]: Math.max(0, currentQty + delta),
        }));


    };

    useEffect(() => {
        formatSelections(quantities);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quantities])
    useEffect(() => {
        calculateSubtotal(menuItem?.list_price || 0, selections)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selections])



    function calculateSubtotal(
        basePrice: number,
        selections: Selections
    ) {
        const subtotal = basePrice;

        // Flatten all selection groups into a single array
        const allSelections = [
            // ...selections.swallow,
            // ...selections.protein,
            ...selections.extraSwallow,
            ...selections.extraProtein
        ];

        let extrasTotal = 0
        for (const item of allSelections) {
            extrasTotal += item.price * item.qty;
        }

        // subtotal = subtotal + extrasTotal
        const sub = subtotal + extrasTotal;
        setSubtotal(sub);
    }

    const clearSelections = () => {
        setQuantities({}); // reset all quantities to zero
        setSubtotal(menuItem?.list_price || 0);
    };

    function areRequiredSelectionsComplete(
        quantities: Record<string, number>,
        categories: CategoryConfig[]
    ): boolean {
        for (const category of categories) {
            if (!category.required) continue; // skip non-required ones

            // Sum up all quantities in this category
            const totalQty = Object.entries(quantities)
                .filter(([key]) => key.startsWith(category.title + ":"))
                .reduce((sum, [, qty]) => sum + qty, 0);

            // Required categories must have total equal to max
            if (totalQty < category.max) {
                return false;
            }
        }

        return true;
    }

    const canAddToCart = areRequiredSelectionsComplete(quantities, categories);
    const isOrderableBaseItem = menuItem?.category_name === "Soups";

    if (menuItem && !isOrderableBaseItem) {
        return (
            <Layout>
                <div className={`bg-primary ${leagueSpartan.className}`}>
                    <div className="bg-white/60 p-12 md:p-24 min-h-screen">
                        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-8 text-center">
                            <h2 className="text-2xl md:text-3xl text-black mb-3">Not sold standalone</h2>
                            <p className="text-gray-700 mb-6">
                                This item is an add-on option. Please choose a soup first, then select your swallow and protein inside customization.
                            </p>
                            <Link
                                href="/restaurant-menu"
                                className="inline-block bg-primary text-white px-6 py-3 rounded-xl hover:opacity-90"
                            >
                                Back to Menu
                            </Link>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className={`bg-primary ${leagueSpartan.className}`}>
                <div className="bg-white/60 p-12 md:p-24 h-screen overflow-y-scroll">
                    <nav className="text-gray-600 text-sm mb-4" aria-label="breadcrumb">
                        <ol className="flex items-center space-x-2">
                            <li>
                                <Link
                                    href="/restaurant-menu"
                                    className="hover:text-gray-800 font-medium"
                                >
                                    Menu
                                </Link>
                            </li>
                            <li>
                                <span className="text-gray-400">/</span>
                            </li>
                            <li className="text-gray-800 font-semibold">
                                {menuItem?.name}
                            </li>
                        </ol>
                    </nav>

                    <div className="flex flex-col md:flex-row gap-8 md:p-6 mx-auto">
                        {/* Product Image */}
                        <div className="md:w-1/2 flex justify-center">
                            <Image
                                src={`/${menuItem?.name
                                    ?.split(" ")[0]
                                    .toLowerCase()}.png`}
                                alt={menuItem?.name || 'Menu item'}
                                width={448}
                                height={500}
                                className="rounded-2xl shadow-md w-full max-w-md h-[500px] object-cover"
                            />
                        </div>

                        {/* Product Options */}
                        <div className="md:w-1/2 flex flex-col gap-4">
                            <h1 className="text-2xl font-semibold mb-2 text-black">
                                {menuItem?.name}
                            </h1>
                            <p className="text-gray-600 mb-4">
                                Customize your order by selecting your preferred proteins and swallows.
                            </p>

                            <div className="space-y-3">
                                {categories.map((cat) => {
                                    const isMaxed = isCategoryMaxed(cat.title);
                                    const total = getCategoryTotal(cat.title);

                                    return (
                                        <div
                                            key={cat.title}
                                            className={`border rounded-xl overflow-hidden shadow-sm ${isMaxed ? 'opacity-75' : ''
                                                }`}
                                        >
                                            {/* Accordion Header */}
                                            <button
                                                onClick={() => toggleAccordion(cat.title)}
                                                className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-black">
                                                        {cat.title} <span className="text-red-700 text-xl">{cat.required ? '*' : null}</span>
                                                    </span>
                                                    {cat.max && (
                                                        <span className={`text-sm ${isMaxed ? 'text-red-600 font-semibold' : 'text-gray-500'
                                                            }`}>
                                                            ({total}/{cat.max})
                                                        </span>
                                                    )}
                                                </div>
                                                {open === cat.title ? (
                                                    <ChevronUp className="w-5 h-5" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5" />
                                                )}
                                            </button>

                                            {/* Accordion Content */}
                                            {open === cat.title && (
                                                <div className="bg-white divide-y">
                                                    {cat.options.map((option) => {
                                                        const key = getKey(cat.title, option.name);
                                                        const currentQty = quantities[key] || 0;
                                                        const canIncrement = !isMaxed || currentQty > 0;

                                                        return (
                                                            <div
                                                                key={option.name}
                                                                className="flex justify-between items-center px-4 py-3"
                                                            >
                                                                <span className="text-gray-700">
                                                                    {option.name}
                                                                </span>

                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => adjustQty(option.name, -1, cat.title)}
                                                                        disabled={currentQty === 0}
                                                                        className="w-8 h-8 flex items-center justify-center border rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    >
                                                                        <Minus className="w-4 h-4" />
                                                                    </button>
                                                                    <span className="w-5 text-center text-gray-800">
                                                                        {currentQty}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => adjustQty(option.name, +1, cat.title)}
                                                                        disabled={!canIncrement && currentQty === 0}
                                                                        className="w-8 h-8 flex items-center justify-center border rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    >
                                                                        <Plus className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* <button
                                className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700"

                            >
                                Add to Cart
                            </button> */}


                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className={!canAddToCart ? "cursor-not-allowed" : ""}>
                                            <Button
                                                disabled={!canAddToCart}
                                                onClick={() => {
                                                    if (menuItem?.id) {
                                                        addItem({
                                                            ...menuItem,
                                                            id: `${menuItem.id}-${Date.now()}`,
                                                            productRef: String(menuItem.id),
                                                            quantity: 1,
                                                            subTotal: subTotal,
                                                            selections: selections
                                                        });
                                                        toast.success("Added to Cart")


                                                        // Clear selections
                                                        clearSelections();
                                                    }
                                                }}
                                                className="bg-primary-green px-4 py-6 text-base my-3 w-full"
                                            >
                                                <FaCartPlus size={25} className="mx-2" /> Add to Cart {subTotal}
                                            </Button>
                                        </span>
                                    </TooltipTrigger>

                                    {!canAddToCart && (
                                        <TooltipContent>
                                            Please select required fields (Main Protein & Main Swallow)
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>

                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}


