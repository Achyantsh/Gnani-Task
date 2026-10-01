import Hero from '@/components/home/hero'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col font-sans text-white">
      <main className="flex-1 px-4 pt-28 pb-16 sm:px-6 sm:pt-36 sm:pb-24 lg:px-8 flex items-center justify-center">
        <Hero />
      </main>
    </div>
  )
}