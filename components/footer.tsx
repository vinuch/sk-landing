import React from 'react'
import { Button } from "@/components/ui/button"
import { FaPhoneAlt, FaWhatsapp } from "react-icons/fa";

export default function Footer() {
    return (
        <div className="p-8 bg-background text-white">
            <div className="flex flex-wrap justify-between gap-2 gap-y-12">
                <div className="w-full md:w-4/12 leading leading-relaxed">
                    <h3 className="font-bold mb-4 text-xl capitalize">SATELLITE KITCHEN</h3>
                    <p className="my-2 font-medium">Proud to serve</p>
                    <p className="my-2">contact@satellitekitchen.ng</p>
                    <p className="my-2 flex items-center gap-2"> <FaPhoneAlt /> <span>+234 08034746311</span></p>
                    <Button className="bg-green px-8 py-6 text-base my-3"><FaWhatsapp size={25} className="mx-2" /> Order on Whatsapp</Button>
                </div>
                <div className="w-full md:w-3/12">
                    <ul>
                        <li className="mb-4 text-xl font-bold">Pages</li>
                        <li className="mb-2">HOME</li>
                        <li className="mb-2">MENU</li>
                        <li className="mb-2">ABOUT US</li>
                        <li className="mb-2">FIND US</li>
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
