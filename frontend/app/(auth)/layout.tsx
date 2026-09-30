import AuthNavbar from '@/components/auth/navbar'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col font-sans text-white selection:bg-blue-500/30 selection:text-white">

      {/* Auth Navbar */}
      <AuthNavbar/>

      {/* Auth Main Form Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}