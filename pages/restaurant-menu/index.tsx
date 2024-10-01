import Layout from "@/components/layout";
import { League_Spartan } from "next/font/google";
import { useState } from "react";
type RestaurantMenuProps = {
    preview: boolean
}
const leagueSpartan = League_Spartan({
    weight: '700', // if single weight, otherwise you use array like [400, 500, 700],
    style: 'normal', // if single style, otherwise you use array like ['normal', 'italic']
    subsets: ['latin'],
})
export default function RestaurantMenu({ preview }: RestaurantMenuProps) {
    const [menu] = useState([
        {
            id: 1,
            name: 'Egusi soup',
            img: 'egusi.jpeg',
            price: 2500
        },
        {
            id: 5,
            name: 'Rice & Ofe Akwu (Banga stew)',
            img: 'rice&banga.jpeg',
            price: 2500
        },
        {
            id: 2,
            name: 'Okra soup',
            img: 'okra.jpeg',
            price: 2500
        },
        {
            id: 3,
            name: 'Vegetable soup',
            img: 'vegetable.jpeg',
            price: 2500
        },
        {
            id: 4,
            name: 'Nsala soup',
            img: 'nsala.jpeg',
            price: 2500
        },

    ])
    return (
        <Layout preview={preview}>
            <div className={`bg-primary ${leagueSpartan.className}`}>
                <div className=" bg-white/60 p-12 md:p-24">
                    <h2 className="text-black text-center text-4xl md:text-5xl">Satellite Kitchen Menu</h2>

                    <div className="flex gap-10 my-12 flex-wrap justify-center w-full md:w-10/12 mx-auto text-white">
                        {
                            menu.map(item => (<div key={item.id} className={`w-full md:w-3/12 h-72 md:h-96 rounded-lg overflow-hidden relative cursor-pointer hover:rotate-3 transition-all ease-in-out  bg-white/50 bg-cover bg-no-repeat `} style={{ backgroundImage: `url(/${item.img})` }}>
                                <div className="flex  absolute top-0 items-end w-full p-4 hover:pb-8 transition-all bg-black/10 hover:bg-black/40 text-lg h-full">
                                    
                                    <div className="flex justify-between w-full"><span>{item.name}</span>

                                    <span>Soup</span>
                                        </div>
                                </div>
                            </div>))
                        }
                    </div>
                </div>
            </div>


        </Layout>
    )
}
