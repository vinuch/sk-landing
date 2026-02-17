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
import MenuItemCard from "@/components/menu-item-card";
import SkeletonCard from "@/components/SkeletonCard";


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

type FeaturedMenuItem = {
  id: string;
  name: string;
  list_price: number;
  category_name?: string;
};

export default function Home({ preview }: HomeProps) {

  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: true })
  )
  const specialsPlugin = React.useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })
  )
  const [contactName, setContactName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactMessage, setContactMessage] = React.useState("");
  const [inquiryType, setInquiryType] = React.useState("");
  const [inquiryOther, setInquiryOther] = React.useState("");
  const [submittingInquiry, setSubmittingInquiry] = React.useState(false);
  const [inquiryStatus, setInquiryStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const inquiryOptions = [
    { value: "general", label: "General Question" },
    { value: "order_support", label: "Order Support" },
    { value: "custom_order", label: "Custom Order" },
    { value: "catering", label: "Catering / Event" },
    { value: "partnership", label: "Partnership / Collaboration" },
    { value: "other", label: "Other" },
  ];

  const [menuItems, setMenuItems] = React.useState<FeaturedMenuItem[]>([]);
  const [loadingFeaturedMenu, setLoadingFeaturedMenu] = React.useState(true);

  React.useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const res = await fetch("/api/pos-products");
        if (!res.ok) {
          console.error("Odoo request failed:", res.status, res.statusText);
          return;
        }
        const dt = await res.json();
        setMenuItems(dt);
      } finally {
        setLoadingFeaturedMenu(false);
      }
    };

    fetchMenuItems();
  }, []);

  const featuredMenuItems = React.useMemo(() => {
    const featuredKeywords = ["egusi", "vegetable", "rice", "okra", "nsala", "bitterleaf"];
    const available = [...menuItems];
    const selected: FeaturedMenuItem[] = [];

    featuredKeywords.forEach((keyword) => {
      const index = available.findIndex((item) => item.name?.toLowerCase().includes(keyword));
      if (index !== -1) {
        selected.push(available[index]);
        available.splice(index, 1);
      }
    });

    const neededForLayout = 8;
    if (selected.length < neededForLayout) {
      selected.push(...available.slice(0, neededForLayout - selected.length));
    }

    return selected.slice(0, neededForLayout);
  }, [menuItems]);

  const leftFeaturedItems = featuredMenuItems.slice(0, 2);
  const centerFeaturedItems = featuredMenuItems.slice(2, 6);
  const rightFeaturedItems = featuredMenuItems.slice(6, 8);

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

  const handleInquirySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInquiryStatus(null);

    if (!contactName.trim() || !contactPhone.trim() || !contactMessage.trim() || !inquiryType) {
      setInquiryStatus({ type: "error", message: "Please fill all required fields." });
      return;
    }

    if (inquiryType === "other" && !inquiryOther.trim()) {
      setInquiryStatus({ type: "error", message: "Please tell us what you are reaching out for." });
      return;
    }

    try {
      setSubmittingInquiry(true);
      const response = await fetch("/api/contact-us", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName.trim(),
          phone: contactPhone.trim(),
          message: contactMessage.trim(),
          inquiryType,
          inquiryOther: inquiryType === "other" ? inquiryOther.trim() : "",
        }),
      });

      const raw = await response.text();
      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }

      if (!response.ok || !json?.success) {
        setInquiryStatus({
          type: "error",
          message: json?.error || "Could not submit your message. Please try again.",
        });
        return;
      }

      setContactName("");
      setContactPhone("");
      setContactMessage("");
      setInquiryType("");
      setInquiryOther("");
      setInquiryStatus({
        type: "success",
        message: "Your message has been recorded and we'll get back to you.",
      });
    } catch {
      setInquiryStatus({
        type: "error",
        message: "Could not submit your message. Please try again.",
      });
    } finally {
      setSubmittingInquiry(false);
    }
  };
  return (
    <Layout preview={preview}>
      <div className={`${leagueSpartan.className}`}>
        {/* Banner */}

        <div className="bg-primary h-screen flex justify-between w-full -my-28 mb-1 pt-28 p-4">
          <div></div>
          <div className="w-full lg:w-8/12 h- absolute left-0 px-2 md:px-4 text-center md:text-left " style={{ top: '18%' }}>
            <h2 className={`${leagueSpartan.className} text-6xl md:text-8xl lg:text-8xl 2xl:text-9xl text-milk font-bold leading-tight lg:leading-snug`}>
              <span className="inline-block bg-black/50 px-3 py-2">The place for home-made delicacies</span>
              <span className="block h-2 md:h-3" />
              <span className="inline-block bg-black/50 px-3 py-2">Just like Mama</span>
              <span className="block h-2 md:h-3" />
              <span className="inline-block bg-black/50 px-3 py-2">makes them</span>
            </h2>
          </div>
          <div className="w-full md:w-8/12 h-full flex gap-4">
            <div className="bg-white/60 h-full w-4/12 md:w-6/12 bg-cover bg-center " style={{ backgroundImage: `url('/buffet3.jpg')` }}><div className="w-full h-full bg-black/40"></div></div>
            <div className="bg-white/60 h-full w-8/12 md:w-6/12 md:-mr-4 bg-cover bg-center" style={{ backgroundImage: `url('/buffet2.jpg')` }}><div className="w-full h-full bg-black/40"></div></div>
          </div>

        </div>

        {/* Menu */}

        <div className="bg-white p-8 py-20 md:p-20">
          <div className="mx-auto max-w-[1400px] overflow-x-hidden">
            <div className="flex flex-col xl:flex-row gap-6 items-start">
            <div className="hidden xl:block xl:flex-1 min-w-0">
            {loadingFeaturedMenu
              ? [0, 1].map((idx) => (
                <div key={idx} className={idx > 0 ? "mt-4" : ""}>
                  <SkeletonCard />
                </div>
              ))
              : leftFeaturedItems.map((item, idx) => (
                <MenuItemCard key={item.id} item={item} className={`${idx > 0 ? "mt-4" : ""} w-full md:w-full`} />
              ))}
            </div>
            <div className="w-full min-w-0 xl:flex-[1.7]">
              <div className="md:h-2/5 text-center">
                <h3 className="text-center text-4xl md:text-7xl text-black">ENJOY OUR MENU <br />SPECIALS!</h3>
                <Link href="/restaurant-menu">
                  <Button variant="outline" className="text-black my-4 border-primary text-xl p-5 hover:text-white hover:bg-primary" >Check Menu</Button>  </Link>
              </div>
              <Carousel
                plugins={[specialsPlugin.current]}
                opts={{ align: "start", loop: true }}
                className="w-full"
                onMouseEnter={specialsPlugin.current.stop}
                onMouseLeave={specialsPlugin.current.reset}
              >
                <CarouselContent className="-ml-6">
                  {loadingFeaturedMenu
                    ? [0, 1, 2].map((idx) => (
                      <CarouselItem key={idx} className="pl-6 basis-[85%] md:basis-[52%]">
                        <SkeletonCard />
                      </CarouselItem>
                    ))
                    : centerFeaturedItems.map((item) => (
                      <CarouselItem key={item.id} className="pl-6 basis-[85%] md:basis-[52%]">
                        <MenuItemCard item={item} enableHoverTilt={false} className="w-full md:w-full" />
                      </CarouselItem>
                    ))}
                </CarouselContent>
              </Carousel>
            </div>
            <div className="hidden xl:block xl:flex-1 min-w-0">
              {loadingFeaturedMenu
                ? [0, 1].map((idx) => (
                  <div key={idx} className={idx > 0 ? "mt-4" : ""}>
                    <SkeletonCard />
                  </div>
                ))
                : rightFeaturedItems.map((item, idx) => (
                  <MenuItemCard key={item.id} item={item} className={`${idx > 0 ? "mt-4" : ""} w-full md:w-full`} />
                ))}
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
                    Yes. We offer catering services for private events, corporate functions, and special occasions.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-xl my-4">Do you make home deliveries?</AccordionTrigger>
                  <AccordionContent>
                    Yes. We deliver to homes and offices within our coverage areas.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-xl my-4">Do you have parking?</AccordionTrigger>
                  <AccordionContent>
                    Yes. Parking is available for guests.
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

          <form onSubmit={handleInquirySubmit} className="md:mx-auto w-full md:w-7/12">
            <div className="flex flex-wrap justify-between gap-4 mb-4">
              <input
                type="text"
                name="name"
                id="name__contact"
                className="p-4 rounded-md border border-primary w-full md:w-48p text-gray-900 placeholder:text-gray-500"
                placeholder="Name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
              <input
                type="text"
                name="phone"
                id="phone__contact"
                className="p-4 rounded-md border border-primary w-full md:w-48p text-gray-900 placeholder:text-gray-500"
                placeholder="Phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
              <select
                name="inquiry_type"
                id="inquiry_type_contact"
                className="p-4 rounded-md border border-primary w-full text-gray-900"
                value={inquiryType}
                onChange={(e) => setInquiryType(e.target.value)}
              >
                <option value="">Select what you are reaching out for</option>
                {inquiryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {inquiryType === "other" ? (
                <input
                  type="text"
                  name="inquiry_other"
                  id="inquiry_other_contact"
                  className="p-4 rounded-md border border-primary w-full text-gray-900 placeholder:text-gray-500"
                  placeholder="Please specify your reason"
                  value={inquiryOther}
                  onChange={(e) => setInquiryOther(e.target.value)}
                />
              ) : null}
              <textarea
                rows={8}
                name="message"
                id="message__contact"
                className="p-4 rounded-md border border-primary w-full text-gray-900 placeholder:text-gray-500"
                placeholder="Enter message here"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={submittingInquiry}
              className="text-black my-4 border-primary text-xl px-20 py-6 hover:text-white hover:bg-primary disabled:opacity-70"
            >
              {submittingInquiry ? "Sending..." : "Send"}
            </Button>

            {inquiryStatus ? (
              <p className={`text-sm mt-2 ${inquiryStatus.type === "success" ? "text-green-700" : "text-red-600"}`}>
                {inquiryStatus.message}
              </p>
            ) : null}
          </form>

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
