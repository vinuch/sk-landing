import { FaWhatsapp } from "react-icons/fa";
import { Button } from "./ui/button";
import { IoIosMenu } from "react-icons/io";

export default function Nav() {
    return (
        <div className="sticky top-0 flex items-center justify-between p-4">
            <h3 className="font-bold text-xl w-6/12 md:w-4/12">SATELLITE KITCHEN</h3>

            <ul className="items-center gap-7 hidden md:flex text-nowrap">
                <li>Restaurant Menu</li>
                <li>About Us</li>
                <li>Find Us</li>
                <li><Button className="bg-green px-4 py-6 text-base my-3"><FaWhatsapp size={25} className="mx-2" /> Order on Whatsapp</Button></li>
            </ul>
            <Button className="md:hidden" variant="ghost"><IoIosMenu size={25} /></Button>
        </div>
    )
}
