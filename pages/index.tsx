// import Image from "next/image";
// import localFont from "next/font/local";
import Layout from "@/components/layout";
import { League_Spartan } from 'next/font/google'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import * as React from "react"
import Autoplay from "embla-carousel-autoplay"

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CiUser } from "react-icons/ci";


const leagueSpartan = League_Spartan({
  weight: '700', // if single weight, otherwise you use array like [400, 500, 700],
  style: 'normal', // if single style, otherwise you use array like ['normal', 'italic']
  subsets: ['latin'],
})
// const geistSans = localFont({
//   src: "./fonts/GeistVF.woff",
//   variable: "--font-geist-sans",
//   weight: "100 900",
// });
// const geistMono = localFont({
//   src: "./fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });
// const leagueSpartan = localFont({
//   src: "./fonts/LeagueSpartan-Bold.ttf",
//   variable: "--font-league-spartan",
//   weight: "700",
// });

type HomeProps = {
  preview: boolean;
}

export default function Home({ preview }: HomeProps) {

  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: true })
  )

//   const [menu, setMenu] = React.useState([
//     {
//         id: 1,
//         name: 'Egusi soup',
//         img: 'egusi.jpeg',
//         price: 2500,
//         link: 'https://wa.me/p/8453684341344190/2347032189083'
//     },
//     {
//         id: 5,
//         name: 'Rice & Ofe Akwu (Banga stew)',
//         img: 'rice&banga.jpeg',
//         price: 2500,
//         link: 'https://wa.me/p/8421416651269514/2347032189083'
//     },
//     {
//         id: 2,
//         name: 'Okra soup',
//         img: 'okra.jpeg',
//         price: 2500,
//         link: 'https://wa.me/p/8843015549063708/2347032189083'
//     },
//     {
//         id: 3,
//         name: 'Vegetable soup',
//         img: 'vegetable.jpeg',
//         price: 2500,
//         link: 'https://wa.me/p/8869638753068621/2347032189083'
//     },
//     {
//         id: 4,
//         name: 'Nsala soup',
//         img: 'nsala.jpeg',
//         price: 2500,
//         link: 'https://wa.me/c/2347032189083'

//     },

// ]);

const handleMenuItemClick = () => {
  // @ts-expect-error: untyped external dependency
    if (window.fbq) {
  // @ts-expect-error: untyped external dependency
        window.fbq('track', 'PageView');
        console.log('PageView tracked');
    } else {
        console.warn('fbq is not defined');
    }
}
  return (
    <Layout preview={preview}>
      <div className={`${leagueSpartan.className}`}>
        {/* Banner */}

        <div className="bg-primary h-screen flex justify-between w-full -my-28 mb-1 pt-28 p-4">
          <div></div>
          <div className="w-full md:w-8/12  h- absolute left-0 px-2 text-center md:text-left " style={{ top: '18%' }}>
            <h2 className={`${leagueSpartan.className} text-6xl md:text-8xl lg:text-8xl 2xl:text-9xl  text-milk font-bold leading-tight lg:leading-snug`}><span className="bg-black/50 inline p-3">The place for home-made delicacies</span>  <br />
              <span className="bg-black/50">Just like Mama <br /> makes them</span>   </h2>
          </div>
          <div className="w-full md:w-8/12 h-full flex gap-4">
            <div className="bg-white/60 h-full w-4/12 md:w-6/12 bg-cover bg-center " style={{ backgroundImage: `url('/buffet3.jpg')` }}><div className="w-full h-full bg-black/40"></div></div>
            <div className="bg-white/60 h-full w-8/12 md:w-6/12 md:-mr-4 bg-cover bg-center" style={{ backgroundImage: `url('/buffet2.jpg')` }}><div className="w-full h-full bg-black/40"></div></div>
          </div>

        </div>

        {/* Menu */}

        <div className="bg-white flex gap-6 p-8 py-20 md:p-20" >
          <div className="w-3/12 hidden md:block">
            <div className={`w-full rounded-lg overflow-hidden relative group cursor-pointer hover:rotate-3 transition-all ease-in-out  bg-white/50 bg-cover bg-no-repeat `} style={{ backgroundImage: `url(/egusi.jpeg)`, minHeight: '300px' }}>
              <div className="flex  absolute top-0 items-end w-full p-4 hover:pb-8 transition-all bg-black/10 hover:bg-black/40 text-lg h-full">
              <a href="https://wa.me/p/8453684341344190/2347032189083" target="_blank" rel="noopener noreferrer" onClick={handleMenuItemClick}>
              <p className="absolute text-center hover:underline top-32 -translate-x-80 group-hover:translate-x-0 transition-all">View & Order on Whatsapp</p>
              </a>
                <div className="flex  justify-between w-full"><span>egusi</span>

                  <span>Soup</span>
                </div>
              </div>
            </div>
            {/* <div className="w-full bg-cover flex justify-center items-center h-1/2 hover:rotate-3 transition-all ease-in-out"><Image src={`/egusi.jpeg`} alt="egusi soup" width={350} height={300} /></div> */}
            {/* <div className="w-full bg-cover flex justify-center items-center h-1/2 hover:rotate-3 transition-all ease-in-out"><Image src={`/vegetable.jpeg`} alt="vegetable soup" width={350} height={300} /></div> */}
            <div className={`w-full mt-4 rounded-lg overflow-hidden relative group cursor-pointer hover:rotate-3 transition-all ease-in-out  bg-white/50 bg-cover bg-no-repeat `} style={{ backgroundImage: `url(/vegetable.jpeg)`, minHeight: '300px'  }}>
              <div className="flex  absolute top-0 items-end w-full p-4 hover:pb-8 transition-all bg-black/10 hover:bg-black/40 text-lg h-full">
              <a href="https://wa.me/p/8869638753068621/2347032189083" target="_blank" rel="noopener noreferrer" onClick={handleMenuItemClick}>
              <p className="absolute text-center hover:underline top-32 -translate-x-80 group-hover:translate-x-0 transition-all">View & Order on Whatsapp</p>
              </a>
                <div className="flex justify-between w-full"><span>vegetable</span>

                  <span>Soup</span>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-6/12 ">
            <div className="md:h-2/5 text-center">
              <h3 className="text-center text-4xl md:text-7xl text-black">ENJOY OUR MENU <br />SPECIALS!</h3>
              <Link href="/restaurant-menu">
                <Button variant="outline" className="text-black my-4 border-primary text-xl p-5 hover:text-white hover:bg-primary" >Check Menu</Button>  </Link>
            </div>
            <div className="flex w-full flex-wrap md:flex-nowrap gap-6">
            <div className={`w-full md:w-6/12 rounded-lg overflow-hidden relative group cursor-pointer hover:rotate-3 transition-all ease-in-out  bg-white/50 bg-cover bg-no-repeat `} style={{ backgroundImage: `url(/rice&banga.jpeg)`, minHeight: '300px'  }}>
              <div className="flex  absolute top-0 items-end w-full p-4 hover:pb-8 transition-all bg-black/10 hover:bg-black/40 text-lg h-full">
              <a href="https://wa.me/p/8421416651269514/2347032189083" target="_blank" rel="noopener noreferrer" onClick={handleMenuItemClick}>
              <p className="absolute text-center hover:underline top-32 -translate-x-80 group-hover:translate-x-0 transition-all">View & Order on Whatsapp</p>
              </a>
                <div className="flex justify-between w-full"><span>Rice & Banga</span>

                  <span>Rice</span>
                </div>
              </div>
            </div>
              {/* <div className="w-6/12 bg-cover hover:rotate-3 transition-all ease-in-out"><Image src={`/rice&banga.jpeg`} alt="rice & banga" width={500} height={500} /></div> */}
              {/* <div className="w-6/12 bg-cover hover:rotate-3 transition-all ease-in-out"><Image src={`/okra.jpeg`} alt="okra soup" width={500} height={500} /></div> */}
              <div className={`w-full md:w-6/12 rounded-lg overflow-hidden relative group cursor-pointer hover:rotate-3 transition-all ease-in-out  bg-white/50 bg-cover bg-no-repeat `} style={{ backgroundImage: `url(/okra.jpeg)`, minHeight: '300px'  }}>
              <div className="flex  absolute top-0 items-end w-full p-4 hover:pb-8 transition-all bg-black/10 hover:bg-black/40 text-lg h-full">
              <a href="https://wa.me/p/8843015549063708/2347032189083" target="_blank" rel="noopener noreferrer" onClick={handleMenuItemClick}>
              <p className="absolute text-center hover:underline top-32 -translate-x-80 group-hover:translate-x-0 transition-all">View & Order on Whatsapp</p>
              </a>
                <div className="flex justify-between w-full"><span>Okra</span>

                  <span>Soup</span>
                </div>
              </div>
            </div>
            </div>
          </div>
          <div className="w-3/12 hidden md:block">
            {/* <div className="w-full bg-cover flex justify-center items-center h-1/2 hover:rotate-3 transition-all ease-in-out"><Image src={`/nsala.jpeg`} alt="nsala" width={350} height={300} /></div>
            <div className="w-full bg-cover flex justify-center items-center h-1/2 hover:rotate-3 transition-all ease-in-out"><Image src={`/rice&banga.jpeg`} alt="rice & banga" width={350} height={300} /></div> */}
            <div className={`w-full rounded-lg overflow-hidden relative group cursor-pointer hover:rotate-3 transition-all ease-in-out  bg-white/50 bg-cover bg-no-repeat `} style={{ backgroundImage: `url(/nsala.jpeg)`, minHeight: '300px'  }}>
              <div className="flex  absolute top-0 items-end w-full p-4 hover:pb-8 transition-all bg-black/10 hover:bg-black/40 text-lg h-full">
              <a href="https://wa.me/c/2347032189083" target="_blank" rel="noopener noreferrer" onClick={handleMenuItemClick}>
              <p className="absolute text-center hover:underline top-32 -translate-x-80 group-hover:translate-x-0 transition-all">View & Order on Whatsapp</p>
              </a>
                <div className="flex justify-between w-full"><span>Nsala</span>

                  <span>Soup</span>
                </div>
              </div>
            </div>
            {/* <div className="w-full bg-cover flex justify-center items-center h-1/2 hover:rotate-3 transition-all ease-in-out"><Image src={`/egusi.jpeg`} alt="egusi soup" width={350} height={300} /></div> */}
            {/* <div className="w-full bg-cover flex justify-center items-center h-1/2 hover:rotate-3 transition-all ease-in-out"><Image src={`/vegetable.jpeg`} alt="vegetable soup" width={350} height={300} /></div> */}
            <div className={`w-full mt-4 rounded-lg overflow-hidden relative group cursor-pointer hover:rotate-3 transition-all ease-in-out  bg-white/50 bg-cover bg-no-repeat `} style={{ backgroundImage: `url(/rice&banga.jpeg)`, minHeight: '300px'  }}>
              <div className="flex  absolute top-0 items-end w-full p-4 hover:pb-8 transition-all bg-black/10 hover:bg-black/40 text-lg h-full">
              <a href="https://wa.me/p/8421416651269514/2347032189083" target="_blank" rel="noopener noreferrer" onClick={handleMenuItemClick}>
              <p className="absolute text-center hover:underline top-32 -translate-x-80 group-hover:translate-x-0 transition-all">View & Order on Whatsapp</p>
              </a>
                <div className="flex justify-between w-full"><span>Rice</span>

                  <span>rice</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* FAQ */}

        <div className="bg-white/95 text-black md:p-12 md:px-20 py-40 md:pr-0 flex flex-wrap md:flex-nowrap gap-12 ">
          <div className="w-full md:w-5/12 px-12 md:p-0">
            <h3 className="text-4xl md:text-8xl">
              Be Our Guest at  <br /> The Satellite Kitchen
            </h3>

            <div >
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-xl my-4">Do you offer catering services?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It adheres to the WAI-ARIA design pattern.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-xl my-4">Do you make home deliveries?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It adheres to the WAI-ARIA design pattern.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-xl my-4">Do you have parking?</AccordionTrigger>
                  <AccordionContent>
                    Yes. It adheres to the WAI-ARIA design pattern.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <p className="mt-8 text-xl">Still have any questions? <span className="text-primary hover:underline"><Link href="/">contact@satellitekitchen.ng</Link></span></p>
            </div>

          </div>
          <div className="w-full md:w-7/12 flex flex-wrap md:flex-nowrap gap-4 ">
            <div className="bg-primary h-72 md:h-full w-full md:w-6/12 bg-cover bg-center" style={{ backgroundImage: `url('/entrance.png')` }}></div>
            <div className="bg-primary h-72 md:h-full w-full md:w-6/12 bg-cover bg-center" style={{ backgroundImage: `url('/entrance2.png')` }}></div></div>
        </div>


        {/* Reviews */}
        <div className="bg-white p-12 md:p-20">
          <h3 className="text-black text-3xl md:text-4xl text-center my-8">Our Customers are Saying</h3>

          <div className="flex justify-center text-black">
            <Carousel
              plugins={[plugin.current]}
              className="w-full"
              style={{ maxWidth: '40rem' }}
              onMouseEnter={plugin.current.stop}
              onMouseLeave={plugin.current.reset}
            >
              <CarouselContent>
                {['Ogbuefi', 'FMC', 'Elili agwu agwu'].map((name, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <Card className="shadow-none border-none">
                        <CardContent className="flex aspect-square items-center justify-center p-6">
                          <div className="text-center">
                            <div className="rounded-full h-24 w-24 border border-primary mx-auto mb-8 flex items-center justify-center bg-gray-50"><CiUser size={40} /></div>
                            <p className="my-4 text-2xl">{name}</p>
                            <p>
                              The sophisticated ambiance, impeccable service. Every dish is a masterpiece,
                              beautifully presented and bursting with flavor. Highly recommend for those
                              seeking a taste of culinary perfection in an opulent setting.
                            </p>

                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>


        </div>
        {/* inquiry */}

        <div className="bg-white/80 p-12 md:p-24 text-center text-black">
          <h3 className="text-black text-4xl text-center my-8">Send an Inquiry</h3>

          <div className="flex flex-wrap justify-between md:mx-auto gap-4 w-full md:w-7/12 mb-6">
            <input type="text" name="name" id="name__contact" className="p-4 rounded-md border border-primary w-full md:w-48p" placeholder="Name" />
            <input type="text" name="name" id="phone__contact" className="p-4 rounded-md border border-primary w-full md:w-48p" placeholder="Phone" />
            <textarea rows={8} name="message" id="message__contact" className="p-4 rounded-md border border-primary w-full" placeholder="Enter message here" />
          </div>

          <Button className="text-black my-4 border-primary text-xl px-20 py-6 hover:text-white hover:bg-primary">Send</Button>

        </div>



        {/* <div
          className={`${geistSans.variable} ${geistMono.variable} grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]`}
        >
          <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
            <Image
              className="dark:invert"
              src="https://nextjs.org/icons/next.svg"
              alt="Next.js logo"
              width={180}
              height={38}
              priority
            />
            <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
              <li className="mb-2">
                Get started by editing{" "}
                <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-semibold">
                  pages/index.tsx
                </code>
                .
              </li>
              <li>Save and see your changes instantly.</li>
            </ol>

            <div className="flex gap-4 items-center flex-col sm:flex-row">
              <a
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                href="https://vercel.com/new?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  className="dark:invert"
                  src="https://nextjs.org/icons/vercel.svg"
                  alt="Vercel logomark"
                  width={20}
                  height={20}
                />
                Deploy now
              </a>
              <a
                className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
                href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read our docs
              </a>
            </div>
          </main>
          <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="https://nextjs.org/icons/file.svg"
                alt="File icon"
                width={16}
                height={16}
              />
              Learn
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="https://nextjs.org/icons/window.svg"
                alt="Window icon"
                width={16}
                height={16}
              />
              Examples
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://nextjs.org?utm_source=create-next-app&utm_medium=default-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="https://nextjs.org/icons/globe.svg"
                alt="Globe icon"
                width={16}
                height={16}
              />
              Go to nextjs.org →
            </a>
          </footer>
        </div> */}
      </div>
    </Layout>

  );
}
