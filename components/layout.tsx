import Script from 'next/script';
import Footer from "./footer";
import Nav from "./nav";

type LayoutProps = {
    preview: boolean;
    children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
    return (
        <>
            {/* Facebook Pixel Code */}
            <Script
                id="facebook-pixel"
                strategy="afterInteractive" // Load script after the page is interactive
            >
                {`!function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '1092918909501158');
                fbq('track', 'PageView');`}
            </Script>

            <noscript>
                <img height="1" width="1" style={{ display: 'none' }}
                    src="https://www.facebook.com/tr?id=1092918909501158&ev=PageView&noscript=1" />
            </noscript>
            <Nav />
            <div className="min-h-screen">
                <main>{children}</main>
            </div>
            <Footer />

        </>
    )
}
