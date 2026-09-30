'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { GlassEffect, GlassFilter } from './liquid'
import { Menu } from '@base-ui/react/menu'
import { Avatar } from '@base-ui/react/avatar'
import { Info, LogOut, User as UserIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { SITE_NAME } from '@/constant/site-config'

const navItems = [
  { name: 'Dashboard', path: '/' },
  { name: 'Architecture', path: '/architecture' },
  { name: 'About', path: '/about' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Fetch initial user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/')
  }

  const getUserInitials = (currentUser: User | null) => {
    if (!currentUser) return 'U'
    if (currentUser.user_metadata?.full_name) {
      const parts = currentUser.user_metadata.full_name.trim().split(' ')
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      return parts[0].slice(0, 2).toUpperCase()
    }
    if (currentUser.email) {
      return currentUser.email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  // Hide global navbar on auth pages where specialized auth header is used
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return null
  }

  return (
    <>
      {/* SVG Liquid Distortion Filter (hidden, referenced by glass effect) */}
      <GlassFilter />

      <header className="fixed top-0 left-0 right-0 z-50 w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pointer-events-none">
        <div className="mx-auto max-w-6xl pointer-events-auto">
          <GlassEffect className="w-full rounded-2xl sm:rounded-full border border-white/25 px-4 sm:px-6 py-2.5 shadow-2xl backdrop-blur-xl">
            {/* 3-Part Equal Grid Layout (Left, Center, Right) */}
            <div className="grid grid-cols-3 items-center w-full h-12">
              {/* Part 1 (Left): Brand / Logo */}
              <div className="flex items-center justify-start">
                <Link href="/" className="group flex items-center gap-2.5 transition">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 border border-white/40 shadow-inner backdrop-blur-md font-mono text-sm font-bold text-white transition-transform duration-300 group-hover:scale-105">
                    G
                  </div>
                  <span className="font-bold text-base sm:text-lg tracking-tight text-white drop-shadow-sm">
                    Audio<span className="font-medium text-sky-200">Note</span>
                  </span>
                </Link>
              </div>

              {/* Part 2 (Center): Floating Tabs with Smooth Motion Active Pill */}
              <div className="flex items-center justify-center">
                <nav className="relative flex items-center gap-1 rounded-full bg-black/25 p-1 border border-white/10 backdrop-blur-md shadow-inner">
                  {navItems.map((item) => {
                    const active = pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`relative rounded-full px-5 py-1.5 text-xs sm:text-sm font-medium transition-colors duration-200 select-none cursor-pointer ${
                          active
                            ? 'text-white font-semibold'
                            : 'text-zinc-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {active && (
                          <motion.div
                            layoutId="navbar-active-pill"
                            className="absolute inset-0 rounded-full bg-white/20 border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-md"
                            transition={{
                              type: 'spring',
                              stiffness: 400,
                              damping: 30,
                            }}
                          />
                        )}
                        <span className="relative z-10 drop-shadow-sm">
                          {item.name}
                        </span>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Part 3 (Right): Profile Circular Avatar with Base UI Glass Dropdown */}
              <div className="flex items-center justify-end">
                {loading ? (
                  <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
                ) : user ? (
                  <Menu.Root>
                    <Menu.Trigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer">
                      <Avatar.Root className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/40 shadow-md transition-all duration-300 hover:scale-105 hover:border-white/70 active:scale-95">
                        {user.user_metadata?.avatar_url && (
                          <Avatar.Image
                            src={user.user_metadata.avatar_url}
                            alt={user.email ?? 'User profile'}
                            className="aspect-square h-full w-full object-cover"
                          />
                        )}
                        <Avatar.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-blue-600/40 font-bold text-xs text-white backdrop-blur-md">
                          {getUserInitials(user)}
                        </Avatar.Fallback>
                      </Avatar.Root>
                    </Menu.Trigger>

                    <Menu.Portal>
                      <Menu.Positioner
                        side="bottom"
                        align="end"
                        sideOffset={12}
                        className="z-50 outline-none"
                      >
                        <Menu.Popup className="outline-none">
                          <GlassEffect className="w-64 rounded-3xl p-3 border border-white/25 shadow-2xl backdrop-blur-2xl">
                            {/* User details header */}
                            <div className="flex items-center gap-3 px-2.5 py-2 border-b border-white/10 mb-1">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white font-bold text-xs shrink-0">
                                {getUserInitials(user)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-white truncate">
                                  {user.user_metadata?.full_name ??
                                    user.email?.split('@')[0] ??
                                    'User'}
                                </span>
                                <span className="text-[11px] text-zinc-300 truncate">
                                  {user.email}
                                </span>
                              </div>
                            </div>

                            {/* Dropdown Items */}
                            <div className="space-y-1">
                              <Menu.Item
                                onClick={() => router.push('/')}
                                className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/15 transition-colors cursor-pointer outline-none select-none"
                              >
                                <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
                                <span>Home Workspace</span>
                              </Menu.Item>

                              <Menu.Item
                                onClick={() => router.push('/about')}
                                className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/15 transition-colors cursor-pointer outline-none select-none"
                              >
                                <Info className="h-3.5 w-3.5 text-zinc-400" />
                                <span>About {SITE_NAME}</span>
                              </Menu.Item>

                              <div className="my-1 border-t border-white/10" />

                              {/* Logout Button */}
                              <Menu.Item
                                onClick={handleSignOut}
                                className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 transition-colors cursor-pointer outline-none select-none"
                              >
                                <LogOut className="h-3.5 w-3.5 text-rose-300" />
                                <span>Logout</span>
                              </Menu.Item>
                            </div>
                          </GlassEffect>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full bg-white px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-zinc-950 shadow-md hover:bg-zinc-100 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </GlassEffect>
        </div>
      </header>
    </>
  )
}
