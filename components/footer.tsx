import React from 'react'
import { Button } from "@/components/ui/button"
import { FaPhoneAlt, FaWhatsapp } from "react-icons/fa";
import Link from 'next/link';

export default function Footer() {
    return (
        <div className="py-20 p-8 bg-background text-white">
            <div className="flex flex-wrap justify-between gap-2 gap-y-12">
                <div className="w-full md:w-4/12 leading leading-relaxed">
                    <h3 className="font-bold mb-4 text-xl capitalize">SATELLITE KITCHEN</h3>
                    <p className="my-2 font-medium">Proud to serve</p>
                    <p className="my-2">contact@satellitekitchen.ng</p>
                    <p className="my-2 flex items-center gap-2"> <FaPhoneAlt /> <span>+234 08034746311</span></p>
                    <a href={`https://api.whatsapp.com/send?phone=2347032189083&text=Hello%2C%20I%20would%20like%20to%20make%20an%20order`} target="_blank" rel="noopener noreferrer"> <Button className="bg-green px-8 py-6 text-base my-3"><FaWhatsapp size={25} className="mx-2" /> Order on Whatsapp</Button></a>
                </div>
                <div className="w-full md:w-3/12">
                    <ul>
                        <li className="mb-4 text-xl font-bold">Pages</li>
                        <li className="mb-2 cursor-pointer hover:underline hover:text-primary"><Link href="/">HOME</Link></li>
                        <li className="mb-2 cursor-pointer hover:underline hover:text-primary"><Link href="/restaurant-menu">MENU</Link></li>
                        {/* <li className="mb-2">ABOUT US</li> */}
                        <li className="mb-2 cursor-pointer hover:underline hover:text-primary"><Link href="/find-us">FIND US</Link></li>
                    </ul>
                </div>
                <div className="w-full md:w-3/12">
                    <ul>
                        <li className="mb-4 text-xl font-bold">Address</li>
                        <li className="mb-2">Nitel Road, Satellite town lagos.</li>
                        <li className="mb-4 text-xl font-bold">Hours</li>
                        <li className="mb-2">Monday  - Saturday 9:00 AM - 10:00 PM</li>
                        <li className="mb-2">Sunday: 6:00 AM - 10:00 PM</li>
                    </ul></div>
            </div>
            <p className="text-center text-sm mt-8 md:mt-4">© 2024 <span className='text-primary underline'>SATELLITE KITCHEN</span>, rights reserved</p>
        </div>
    )
}
