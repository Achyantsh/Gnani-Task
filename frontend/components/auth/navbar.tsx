import { SITE_NAME } from "@/constant/site-config";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const AuthNavbar = () => {
  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4 sm:px-8 border-b border-white/20 bg-white/10 backdrop-blur-xl shadow-sm">
      <Link href="/" className="group flex items-center gap-2.5 transition">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 border border-white/40 shadow-inner backdrop-blur-md font-mono text-sm font-bold text-white transition-transform duration-300 group-hover:scale-105">
          G
        </div>
        <span className="font-bold text-base sm:text-lg tracking-tight text-white drop-shadow-sm">
          {SITE_NAME} <span className="font-light text-sky-200">AI</span>
        </span>
      </Link>

      <div className="flex items-center gap-3 text-xs font-medium">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-white/90 hover:text-white hover:bg-white/20 transition border border-white/20 backdrop-blur-md"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
        <Link
          href="/about"
          className="rounded-full px-4 py-1.5 text-white/90 hover:text-white hover:bg-white/20 transition border border-white/20 backdrop-blur-md"
        >
          About
        </Link>
      </div>
    </header>
  );
};


export default AuthNavbar