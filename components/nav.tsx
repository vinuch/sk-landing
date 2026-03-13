import { FaWhatsapp } from "react-icons/fa";
import { Button } from "./ui/button";
import { IoIosClose, IoIosMenu } from "react-icons/io";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { League_Spartan } from "next/font/google";
import { useCartStore } from "@/store/cartStore";
import SignupForm from "./signupForm";
import useAuth from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import useUserProfile from "@/hooks/useUserProfile";
import { FaUserCircle } from "react-icons/fa";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import AddressAutocomplete from "./addressAutocomplete";
import { toast } from "sonner";

const leagueSpartan = League_Spartan({
    weight: '700',
    style: 'normal',
    subsets: ['latin'],
})
export default function Nav() {
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [savingAddress, setSavingAddress] = useState(false);
    const { user, loading } = useAuth();
    const { profile, addresses, defaultAddressLine, saveDefaultAddress, loading: profileLoading } = useUserProfile();
    const hasOnboarded = Boolean(profile?.onboarded) && Boolean(profile?.full_name) && Boolean(profile?.phone) && addresses.length > 0;

    const items = useCartStore((state) => state.items);
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    const userDisplayName = profile?.full_name || user?.email || user?.phone;

    const handleAddressSelect = async (address: string) => {
        setSavingAddress(true);
        const result = await saveDefaultAddress(address);
        setSavingAddress(false);

        if (result.error) {
            toast.error(result.error);
            return false;
        }

        toast.success("Delivery location updated");
        return true;
    };

    const locationDisplay = defaultAddressLine || "Set delivery location";

    const LocationPicker = ({ compact = false }: { compact?: boolean }) => {
        const [open, setOpen] = useState(false);

        const onSelectAddress = async (address: string) => {
            const success = await handleAddressSelect(address);

            if (success) {
                setOpen(false);
            }
        };

        return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={`justify-start text-left ${compact ? "w-full" : "w-72"} h-auto py-2`}
                >
                    <div className="min-w-0">
                        <p className="text-[11px] text-gray-500">Delivery Location</p>
                        <p className="text-sm text-gray-900 truncate">{locationDisplay}</p>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" portalled={!compact} className={`${compact ? "w-[22rem] max-w-[90vw]" : "w-80"} z-50`}>
                <p className="text-sm font-medium mb-2">Choose delivery location</p>
                <AddressAutocomplete
                    value={defaultAddressLine}
                    disabled={profileLoading || savingAddress}
                    onAddressSelect={onSelectAddress}
                />
            </PopoverContent>
        </Popover>
        );
    };

    const UserMenu = () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 px-3 py-2 text-sm">
                    <FaUserCircle size={18} />
                    <span className="max-w-36 truncate">{userDisplayName}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
                <Link href="/my-orders" className="block w-full text-left text-sm px-2 py-2 rounded hover:bg-gray-100">
                    My Orders
                </Link>
                <button
                    type="button"
                    className="w-full text-left text-sm px-2 py-2 rounded text-gray-500 cursor-not-allowed"
                    disabled
                >
                    Profile (coming soon)
                </button>
                <Button className="w-full mt-2" variant="outline" onClick={() => supabase.auth.signOut()}>
                    Logout
                </Button>
            </PopoverContent>
        </Popover>
    );

    return (
        <div className={`${leagueSpartan.className} sticky text-black top-0 flex items-center justify-between gap-3 p-4 z-50 transition-all ${!['/'].includes(router.pathname) || isScrolled || menuOpen ? "bg-white shadow-lg" : "bg-transparent"}`}>
            <h3 className="min-w-0 flex-1 font-bold text-lg sm:text-xl lg:flex-none lg:w-4/12">
                <Link href='/'><div className="flex items-center gap-3 min-w-0">
                    <Image src={'/logo.png'} alt="logo" width={50} height={50} />
                    <span className="truncate text-base leading-tight sm:text-lg lg:text-xl">SATELLITE KITCHEN</span>
                </div>
                </Link>
            </h3>

            <ul className="items-center gap-7 hidden lg:flex text-nowrap">
                <li className={`hover:underline  cursor-pointer ${!['/'].includes(router.pathname) || isScrolled || menuOpen ? "hover:text-primary" : "hover:text-white"}`}><Link href="/restaurant-menu">Restaurant Menu</Link></li>
                {/* <li>About Us</li> */}
                <li className={`hover:underline  cursor-pointer ${!['/'].includes(router.pathname) || isScrolled || menuOpen ? "hover:text-primary" : "hover:text-white"}`}><Link href="/find-us">Find Us</Link></li>
                <li className={`hover:underline relative  cursor-pointer ${!['/'].includes(router.pathname) || isScrolled || menuOpen ? "hover:text-primary" : "hover:text-white"}`}><Link href="/cart">
                    Cart
                    {totalItems > 0 && (
                        <span className="absolute -top-4 -right-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {totalItems}
                        </span>
                    )}
                </Link></li>
                <li>
                    {loading ? null : user && hasOnboarded ? (
                        <div className="flex items-center gap-3">
                            <UserMenu />
                        </div>
                    ) : (
                        <SignupForm />
                    )}
                </li>
            </ul>

            <div className="hidden md:block">
                <LocationPicker />
            </div>

            <Button className="lg:hidden" variant="ghost" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? (<IoIosClose size={25} />) : (<IoIosMenu size={25} />)}</Button>

            {
                menuOpen ? (
                    <div className="fixed top-16 left-0 lg:hidden h-[calc(100vh-4rem)] w-screen bg-white z-30 text-black flex justify-center overflow-y-auto pb-32">
                        <ul className="flex-co gap-6 text-center mt-12 px-4">
                            <li className="my-8">
                                <LocationPicker compact />
                            </li>
                            <li className="my-8 hover:underline hover:text-primary cursor-pointer" onClick={() => setMenuOpen(false)}><Link href="/">Home</Link></li>
                            <li className="my-8 hover:underline hover:text-primary cursor-pointer" onClick={() => setMenuOpen(false)}><Link href="/restaurant-menu">Restaurant Menu</Link></li>
                            <li className="my-8 hover:underline hover:text-primary cursor-pointer" onClick={() => setMenuOpen(false)}><Link href="/find-us">Find Us</Link></li>
                            <li className="my-8 hover:underline hover:text-primary cursor-pointer" onClick={() => setMenuOpen(false)}>
                                <Link href="/cart">
                                    Cart
                                    {totalItems > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                            {totalItems}
                                        </span>
                                    )}
                                </Link>
                            </li>
                            <li className="my-8 hover:underline hover:text-primary cursor-pointer" onClick={() => setMenuOpen(false)}><Link href="/my-orders">My Orders</Link></li>
                            <li className="my-8" onClick={() => setMenuOpen(false)}><a href={`https://api.whatsapp.com/send?phone=2347032189083&text=Hello%2C%20I%20would%20like%20to%20make%20an%20order`} target="_blank" rel="noopener noreferrer"><Button className="bg-primary-green px-4 py-6 text-base my-3"><FaWhatsapp size={25} className="mx-2" /> Order on Whatsapp</Button></a></li>
                            {!loading && (
                                <li className="my-8">
                                    {user ? (
                                        hasOnboarded ? (
                                            <div className="space-y-2">
                                                <div className="flex justify-center">
                                                    <UserMenu />
                                                </div>
                                            </div>
                                        ) : (
                                            <SignupForm />
                                        )
                                    ) : (
                                        <SignupForm />
                                    )}
                                </li>
                            )}
                        </ul>
                    </div>
                ) : null
            }

        </div>
    )
}
