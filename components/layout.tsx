import Footer from "./footer";
import Nav from "./nav";

type LayoutProps = {
    preview: boolean;
    children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
    return (
        <>
            <Nav />
            <div className="min-h-screen">
                <main>{children}</main>
            </div>
            <Footer />

        </>
    )
}
