import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { MeshGradient } from "@/components/ui/mesh-gradient";
import Footer from "@/components/footer";
import { SITE_NAME } from "@/constant/site-config";
import { Toaster } from "@/components/ui/toast";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: SITE_NAME,
  description: "Enterprise AI Application Platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} font-sans h-full antialiased dark`}
    >
      <body
        className={`${outfit.className} font-sans min-h-full flex flex-col bg-[#070d24] text-white selection:bg-blue-500/30 selection:text-white`}
      >
        {/* Global Persistent Animated Mesh Gradient (z-0, never unmounts, zero flicker) */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
          <MeshGradient
            className="w-full h-full"
            color1="#4c9bff"
            color2="#1f4fd8"
            color3="#0a1a4a"
            color4="#6366f1"
            speed={0.8}
            distortion={0.85}
            swirl={0.57}
            scale={1.4}
            rotation={120}
          />
          {/* Subtle atmospheric vignette that maintains radiant brightness */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/35 pointer-events-none" />
        </div>

        {/* Global Floating Glass Navbar (z-50) */}
        <Navbar />

        {/* Route Content (relative z-10, layered on top of background) */}
        <div className="relative z-10 flex min-h-full flex-col flex-1">
          {children}
        </div>

        <Footer/>
        <Toaster/>
      </body>
    </html>
  );
}