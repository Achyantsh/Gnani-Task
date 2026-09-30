import { SITE_NAME } from '@/constant/site-config';
import Link from 'next/link';
import React from 'react'

const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-white/15 bg-white/15 backdrop-blur-md py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
        <p>&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>
          <Link href="/about" className="hover:text-white transition">
            About
          </Link>
          <Link href="/login" className="hover:text-white transition">
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer
