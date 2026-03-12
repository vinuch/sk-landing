"use client"
import Layout from "@/components/layout";
import { LocateIcon } from "lucide-react";
import { League_Spartan } from "next/font/google";
import { FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";


type FindUsProps = {
  preview: boolean;
}
const leagueSpartan = League_Spartan({
  weight: '700', // if single weight, otherwise you use array like [400, 500, 700],
  style: 'normal', // if single style, otherwise you use array like ['normal', 'italic']
  subsets: ['latin'],
})

export default function FindUs({ preview }: FindUsProps) {
  const mapQuery = "F725+8X6 Satellite Town, Nigeria";
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
  const mapOpenUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <Layout preview={preview}>
      <div className={`h-screen relative ${leagueSpartan.className}`}>
        <div className=" h-full relative text-black md:p-24 flex bg-top" style={{ filter: 'blur(8px)', backgroundImage: `url('/buffet.jpg')`, backgroundSize: 'cover' }}>
        </div>

        <div className=" z-20 absolute top-0 h-full md:p-40 w-full" >
          <div className="bg- text-black px-8 py-12 md:p-24 backdrop-opacity-20  flex flex-wrap md:flex-nowrap gap-12">
            <div className="w-full md:w-6/12" style={{ color: "#ffedbf" }}>
              <h3 className="text-4xl md:text-6xl">Where we Located</h3>
              <hr />
              <h3 className="text-3xl md:text-4xl my-6">Our Address</h3>
              <p className="text-xl text-white">
                Along Nitel Road, Satellite Town, Lagos <span className="text-sm">(Maps code: {mapQuery})</span>
              </p>

              <h3 className="text-3xl md:text-4xl my-6">Working Hours</h3>
              <p className="text-xl text-white">
                Monday - Saturday 9:00 AM - 10:00 PM
              </p>
              <p className="text-xl text-white">
                Sunday: 6:00 AM - 10:00 PM
              </p>

              <div className="text-xl my-6 flex items-center gap-12"><span> Connect with us on -{'>'} </span>
                <div className="flex gap-4 text-white">
                  <a href="https://www.instagram.com/satellitekitchen.ng/" target="_blank" rel="noopener noreferrer"><FaInstagram size={30} className="hover:text-primary" /></a>
                  <a href="https://www.tiktok.com/@satellitekitchen" target="_blank" rel="noopener noreferrer"><FaTiktok size={30} className="hover:text-primary" /></a>
                  <a href={`https://api.whatsapp.com/send?phone=2347032189083&text=Hello%2C%20I%20would%20like%20to%20make%20an%20order`} target="_blank" rel="noopener noreferrer"><FaWhatsapp size={30} className="hover:text-primary" /></a>

                </div>
              </div>
            </div>
            <div className="w-full md:w-6/12">
              <div className="w-full rounded-lg overflow-hidden border border-white/40 bg-white/10 backdrop-blur-sm">
                <iframe
                  src={mapEmbedUrl}
                  title="Satellite Kitchen Location"
                  className="w-full h-80 md:h-96"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="p-4 text-right">
                  <a
                    href={mapOpenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white hover:text-primary hover:underline"
                  >
                    Open in Google Maps <LocateIcon className="inline" />
                  </a>
                </div>
              </div>

              {/* <Image src='/map.png' alt="map image" width={808} height={506} /> */}
            </div>

          </div>

        </div>
      </div>


    </Layout >
  )
}
