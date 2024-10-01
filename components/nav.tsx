import { FaWhatsapp } from "react-icons/fa";
import { Button } from "./ui/button";
import { IoIosClose, IoIosMenu } from "react-icons/io";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { League_Spartan } from "next/font/google";

const leagueSpartan = League_Spartan({
    weight: '700', // if single weight, otherwise you use array like [400, 500, 700],
    style: 'normal', // if single style, otherwise you use array like ['normal', 'italic']
    subsets: ['latin'],
})
export default function Nav() {
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

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
    return (
        <div className={`${leagueSpartan.className} sticky text-black top-0 flex items-center justify-between p-4 z-50 transition-all   ${!['/'].includes(router.pathname) || isScrolled || menuOpen ? "bg-white shadow-lg" : "bg-transparent"}`}>
            <h3 className="font-bold text-xl w-7/12 md:w-4/12  ">
                <Link href='/'><div className="flex items-center gap-4">
                    <Image src={'/logo.png'} alt="logo" width={50} height={50} />
                    <span>SATELLITE KITCHEN</span>
                </div>
                </Link>
            </h3>

            <ul className="items-center gap-7 hidden md:flex text-nowrap">
                <li className={`hover:underline  cursor-pointer ${!['/'].includes(router.pathname) || isScrolled || menuOpen ? "hover:text-primary" : "hover:text-white"}`}><Link href="/restaurant-menu">Restaurant Menu</Link></li>
                {/* <li>About Us</li> */}
                <li className={`hover:underline  cursor-pointer ${!['/'].includes(router.pathname) || isScrolled || menuOpen ? "hover:text-primary" : "hover:text-white"}`}><Link href="/find-us">Find Us</Link></li>
                <li>
                    <a href={`https://api.whatsapp.com/send?phone=2347032189083&text=Hello%2C%20I%20would%20like%20to%20make%20an%20order`} target="_blank" rel="noopener noreferrer"><Button className="bg-green px-4 py-6 text-base my-3"><FaWhatsapp size={25} className="mx-2" /> Order on Whatsapp</Button></a>
                </li>
            </ul>
            <Button className="md:hidden" variant="ghost" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? (<IoIosClose size={25} />) : (<IoIosMenu size={25} />)}</Button>

            {
                menuOpen ? (
                    <div className="fixed top-16 left-0 md:hidden h-screen w-screen bg-white z-40 text-black flex justify-center">
                        <ul className="flex-co gap-6 text-center mt-12">
                            <li className="my-8 hover:underline hover:text-primary cursor-pointer" onClick={() => setMenuOpen(false)}><Link href="/">Home</Link></li>
                            <li className="my-8 hover:underline hover:text-primary cursor-pointer" onClick={() => setMenuOpen(false)}><Link href="/restaurant-menu">Restaurant Menu</Link></li>
                            {/* <li className="my-8">About Us</li> */}
                            <li className="my-8 hover:underline hover:text-primary cursor-pointer" onClick={() => setMenuOpen(false)}><Link href="/find-us">Find Us</Link></li>
                            <li className="my-8" onClick={() => setMenuOpen(false)}><a href={`https://api.whatsapp.com/send?phone=2347032189083&text=Hello%2C%20I%20would%20like%20to%20make%20an%20order`} target="_blank" rel="noopener noreferrer"><Button className="bg-green px-4 py-6 text-base my-3"><FaWhatsapp size={25} className="mx-2" /> Order on Whatsapp</Button></a></li>
                        </ul>
                    </div>
                ) : null
            }

        </div>
    )
}
