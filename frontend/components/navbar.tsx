'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { GlassEffect, GlassFilter } from './liquid'
import { Menu } from '@base-ui/react/menu'
import { Avatar } from '@base-ui/react/avatar'
import { Info, LogOut, User as UserIcon, FileAudio } from 'lucide-react'
import { motion } from 'motion/react'
import { SITE_NAME } from '@/constant/site-config'
import { useDropzoneContext } from '@/context/dropzone-context'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { resetAll } = useDropzoneContext()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const navItems = [
    { name: user ? 'Dashboard' : 'Home', path: '/' },
    ...(user ? [{ name: 'Transcriptions', path: '/transcriptions' }] : []),
    { name: 'Architecture', path: '/architecture' },
    { name: 'About', path: '/about' },
  ]

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

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

  const getUserAvatarUrl = (currentUser: User | null): string | null => {
    if (!currentUser) return null

    const meta = currentUser.user_metadata || {}

    // 1. Direct avatar_url or picture from Supabase Auth user_metadata (Google Auth sets picture)
    if (meta.avatar_url && typeof meta.avatar_url === 'string') return meta.avatar_url
    if (meta.picture && typeof meta.picture === 'string') return meta.picture
    if (meta.avatar && typeof meta.avatar === 'string') return meta.avatar

    // 2. OAuth provider identities (Google / GitHub stored in Supabase identities)
    if (currentUser.identities && currentUser.identities.length > 0) {
      for (const identity of currentUser.identities) {
        const idData = (identity.identity_data as Record<string, unknown>) || {}
        if (idData.avatar_url && typeof idData.avatar_url === 'string') return idData.avatar_url
        if (idData.picture && typeof idData.picture === 'string') return idData.picture
        if (idData.avatar && typeof idData.avatar === 'string') return idData.avatar
      }
    }

    // 3. Fallback to Supabase deterministic avatar from email or id
    if (currentUser.email || currentUser.id) {
      const seed = encodeURIComponent(currentUser.email || currentUser.id)
      return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=0284c7,2563eb,4f46e5&textColor=ffffff`
    }

    return null
  }

  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return null
  }

  return (
    <>
      
      <GlassFilter />

      <header className="fixed top-0 left-0 right-0 z-50 w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pointer-events-none">
        <div className="mx-auto max-w-6xl pointer-events-auto">
          <GlassEffect className="w-full rounded-2xl sm:rounded-full border border-white/25 px-4 sm:px-6 py-2.5 shadow-2xl backdrop-blur-xl">
           
            <div className="grid grid-cols-3 items-center w-full h-12">
             
              <div className="flex items-center justify-start">
                <Link
                  href="/"
                  onClick={() => resetAll()}
                  className="group flex items-center gap-2.5 transition cursor-pointer"
                  title="Return to Home & New Transcription"
                >
                  <div className="relative flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-md ring-1 ring-white/35 transition-transform duration-300 group-hover:scale-105 bg-white/10 backdrop-blur-md">
                    <Image
                      src="/gnani-logo.png"
                      alt="Gnani.ai Logo"
                      width={48}
                      height={48}
                      className="h-full w-full object-cover scale-[1.35]"
                      priority
                    />
                  </div>
                  <span className="font-bold text-base sm:text-lg tracking-tight text-white drop-shadow-sm">
                    Audio<span className="font-medium text-sky-200">Note</span>
                  </span>
                </Link>
              </div>

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

          
              <div className="flex items-center justify-end">
                {loading ? (
                  <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
                ) : user ? (
                  <Menu.Root>
                    <Menu.Trigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer">
                      <Avatar.Root className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/40 shadow-md transition-all duration-300 hover:scale-105 hover:border-white/70 active:scale-95">
                        {getUserAvatarUrl(user) && (
                          <Avatar.Image
                            src={getUserAvatarUrl(user)!}
                            alt={user.email ?? 'User profile'}
                            referrerPolicy="no-referrer"
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
                            
                            <div className="flex items-center gap-3 px-2.5 py-2 border-b border-white/10 mb-1">
                              <Avatar.Root className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/30 shadow-md">
                                {getUserAvatarUrl(user) && (
                                  <Avatar.Image
                                    src={getUserAvatarUrl(user)!}
                                    alt={user.email ?? 'User profile'}
                                    referrerPolicy="no-referrer"
                                    className="aspect-square h-full w-full object-cover"
                                  />
                                )}
                                <Avatar.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-blue-600/40 font-bold text-xs text-white backdrop-blur-md">
                                  {getUserInitials(user)}
                                </Avatar.Fallback>
                              </Avatar.Root>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-white truncate">
                                  {user.user_metadata?.full_name ??
                                    user.user_metadata?.name ??
                                    user.email?.split('@')[0] ??
                                    'User'}
                                </span>
                                <span className="text-[11px] text-zinc-300 truncate">
                                  {user.email}
                                </span>
                              </div>
                            </div>

                     
                            <div className="space-y-1">
                              <Menu.Item
                                onClick={() => {
                                  resetAll();
                                  router.push('/');
                                }}
                                className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/15 transition-colors cursor-pointer outline-none select-none"
                              >
                                <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
                                <span>Dashboard</span>
                              </Menu.Item>

                              <Menu.Item
                                onClick={() => router.push('/transcriptions')}
                                className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/15 transition-colors cursor-pointer outline-none select-none"
                              >
                                <FileAudio className="h-3.5 w-3.5 text-zinc-400" />
                                <span>My Transcriptions</span>
                              </Menu.Item>

                              <Menu.Item
                                onClick={() => router.push('/about')}
                                className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/15 transition-colors cursor-pointer outline-none select-none"
                              >
                                <Info className="h-3.5 w-3.5 text-zinc-400" />
                                <span>About </span>
                              </Menu.Item>

                              <div className="my-1 border-t border-white/10" />

                            
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
