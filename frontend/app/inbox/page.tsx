import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { listActionsServer } from '@/actions/actions'
import { ActionInbox } from '@/components/inbox/action-inbox'
import { Inbox } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ActionInboxPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return (
      <div className="flex min-h-screen flex-col font-sans text-white">
        <main className="flex-1 px-4 pt-28 pb-20 sm:px-6 sm:pt-36 sm:pb-28 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/[0.08] backdrop-blur-md mx-auto mb-4">
              <Inbox className="h-5 w-5 text-white/70" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white/90 leading-tight">
              Action Inbox
            </h1>
            <p className="text-white/45 mt-2">
              Please sign in to view your actions.
            </p>
            <a href="/login" className="mt-4 inline-block text-sky-400 hover:text-sky-300 underline">
              Sign in
            </a>
          </div>
        </main>
      </div>
    )
  }

  const { actions, count, error } = await listActionsServer(user.id)
  console.log('[DEBUG] listActionsServer result:', { actions: actions?.length, count, error })

  return (
    <div className="flex min-h-screen flex-col font-sans text-white">
      <main className="flex-1 px-4 pt-28 pb-20 sm:px-6 sm:pt-36 sm:pb-28 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/[0.08] backdrop-blur-md">
                <Inbox className="h-5 w-5 text-white/70" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white/90 leading-tight">
                  Action Inbox
                </h1>
                <p className="text-[12px] text-white/45 mt-0.5">
                  {count} action{count !== 1 ? 's' : ''} tracked
                </p>
              </div>
            </div>
          </div>

          <ActionInbox actions={actions} error={error} userId={user.id} />
        </div>
      </main>
    </div>
  )
}