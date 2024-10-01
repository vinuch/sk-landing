import Layout from "@/components/layout";
import { League_Spartan } from "next/font/google";
import Image from "next/image";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";


type FindUsProps = {
  preview: boolean;
}
const leagueSpartan = League_Spartan({
  weight: '700', // if single weight, otherwise you use array like [400, 500, 700],
  style: 'normal', // if single style, otherwise you use array like ['normal', 'italic']
  subsets: ['latin'],
})

export default function FindUs({ preview }: FindUsProps) {

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
              <p className="text-xl text-white">Nitel Road, Satellite town, Lagos</p>

              <h3 className="text-3xl md:text-4xl my-6">Working Hours</h3>
              <p className="text-xl text-white">
                Monday - Saturday 9:00 AM - 10:00 PM
              </p>
              <p className="text-xl text-white">
                Sunday: 6:00 AM - 10:00 PM
              </p>

              <p className="text-xl my-6 flex items-center gap-12"><span> Connect with us on -{'>'} </span>
                <div className="flex gap-4 text-white">
                  <FaInstagram size={30} className="hover:text-primary" />
                  <FaWhatsapp size={30} className="hover:text-primary" />
                </div>
              </p>
            </div>
            <div className="w-full md:w-6/12">
              <Image src='/map.png' alt="map image" width={808} height={506} />
            </div>

          </div>

        </div>
      </div>


    </Layout >
  )
}
