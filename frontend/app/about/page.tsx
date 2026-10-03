import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileAudio,
  
  HardDrive,
  Layers3,
  Mic2,
  Play,
  Search,
  Sparkles,
  UploadCloud,
  Workflow,
} from "lucide-react";
import { GlassEffect } from "@/components/liquid";

export const metadata = {
  title: "About | AudioNote",
  description:
    "AudioNote turns audio recordings into transcripts, summaries, and a history you can revisit.",
};

const GITHUB_URL = "https://github.com/achyantsh/gnani-task";

const BENEFITS = [
  {
    title: "Capture",
    label: "Upload",
    icon: UploadCloud,
    text: "Bring an audio recording into AudioNote without sending the file through the application server.",
  },
  {
    title: "Understand",
    label: "Transcribe",
    icon: FileAudio,
    text: "Turn the recording into a complete transcript with the speech recognition pipeline.",
  },
  {
    title: "Extract",
    label: "Summarize",
    icon: Sparkles,
    text: "Convert the completed transcript into a concise summary that is easier to scan and revisit.",
  },
  {
    title: "Revisit",
    label: "History",
    icon: Database,
    text: "Keep completed recordings available so the transcript and summary can be opened again later.",
  },
];

const USE_CASES = [
  "Lectures",
  "Interviews",
  "Podcasts",
  "Research",
  "Voice memos",
  "Ideas",
  "Calls",
  "Personal notes",
  "Long-form recordings",
];

const JOURNEY = [
  {
    number: "01",
    title: "Upload",
    text: "Choose your recording and start processing.",
    icon: UploadCloud,
  },
  {
    number: "02",
    title: "Transcribe",
    text: "AudioNote processes the recording into a transcript.",
    icon: Mic2,
  },
  {
    number: "03",
    title: "Summarize",
    text: "The transcript is turned into a concise insight layer.",
    icon: Sparkles,
  },
  {
    number: "04",
    title: "Revisit",
    text: "Open the completed recording and its results whenever you need them.",
    icon: Search,
  },
];

const TECHNOLOGY = [
  {
    title: "Next.js",
    description: "Product interface and client-side orchestration.",
    icon: Layers3,
  },
  {
    title: "FastAPI",
    description: "Backend orchestration and processing endpoints.",
    icon: Workflow,
  },
  {
    title: "Cloudflare R2",
    description: "Private object storage for uploaded audio.",
    icon: HardDrive,
  },
  {
    title: "Gnani ASR",
    description: "Speech recognition for uploaded recordings.",
    icon: FileAudio,
  },
  {
    title: "Gemini",
    description: "AI-generated summaries from completed transcripts.",
    icon: Sparkles,
  },
  {
    title: "Supabase",
    description: "Authentication and persistent transcription history.",
    icon: Database,
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl space-y-3">
      <div className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
        {eyebrow}
      </div>

      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
        {title}
      </h2>

      <p className="text-base sm:text-lg leading-relaxed text-slate-300">
        {description}
      </p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6 sm:pt-36 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-24">
       
        <section className="relative overflow-hidden rounded-[36px] border border-white/15 bg-slate-900/30 backdrop-blur-xl px-6 py-14 text-center sm:px-12 sm:py-20 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.22),transparent_48%)]" />

          <div className="relative mx-auto max-w-4xl space-y-6">
            <div className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-2 text-xs sm:text-sm font-semibold tracking-[0.14em] text-sky-200">
              <Mic2 className="h-4 w-4" />
              ABOUT AUDIONOTE
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]">
              Turn recordings into something{" "}
              <span className="block bg-gradient-to-r from-sky-200 via-white to-cyan-200 bg-clip-text text-transparent">
                you can actually use.
              </span>
            </h1>

            <p className="mx-auto max-w-3xl text-base sm:text-lg lg:text-xl leading-relaxed text-slate-300 font-normal">
              AudioNote turns an audio recording into a transcript, a concise
              summary, and a reusable record you can come back to later.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-white/90 shadow-lg active:scale-95"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/architecture"
                className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.05] px-6 py-3 text-base font-semibold text-white transition hover:bg-white/[0.12] active:scale-95"
              >
                Explore architecture
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Why AudioNote"
            title="A simple path from audio to useful information"
            description="The product keeps the experience focused: get the recording in, make sense of it, and keep the result available without adding unnecessary steps."
          />

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-4">
            {BENEFITS.map((item) => {
              const Icon = item.icon;

              return (
                <GlassEffect
                  key={item.title}
                  className="rounded-[28px] border border-white/20 bg-slate-900/50 p-7 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-white/35"
                >
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-500/15 text-sky-300 shadow-inner">
                    <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>

                  <div className="mt-5">
                    <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
                      {item.label}
                    </span>

                    <h3 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-white">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                      {item.text}
                    </p>
                  </div>
                </GlassEffect>
              );
            })}
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Built for real recordings"
            title="Not limited to one kind of audio"
            description="AudioNote is designed around the recording itself, so the same workflow can be useful across different kinds of spoken content."
          />

          <div className="relative overflow-hidden rounded-[32px] border border-white/20 bg-slate-900/50 backdrop-blur-xl p-7 sm:p-10 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(34,211,238,0.10),transparent_30%)]" />

            <div className="relative flex flex-wrap gap-3 sm:gap-4">
              {USE_CASES.map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm sm:text-base font-semibold text-white/90 transition hover:border-sky-300/30 hover:bg-sky-400/[0.08]"
                >
                  <CheckCircle2 className="h-4 w-4 text-sky-300" />
                  {item}
                </div>
              ))}
            </div>

            <div className="relative mt-8 max-w-2xl">
              <p className="text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                Whether it is a lecture, interview, research recording, voice
                memo, or another long-form recording, the product keeps the
                workflow the same: upload, understand, extract, revisit.
              </p>
            </div>
          </div>
        </section>

        {/* Product journey */}
        <section className="space-y-8">
          <SectionHeading
            eyebrow="Product journey"
            title="Four steps. One continuous experience."
            description="The product surface stays intentionally simple while the processing underneath takes care of the heavier work."
          />

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-4">
            {JOURNEY.map((item, index) => {
              const Icon = item.icon;

              return (
                <div key={item.number} className="relative">
                  <GlassEffect className="h-full rounded-[28px] border border-white/20 bg-slate-900/50 p-7 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-white/35">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-xs sm:text-sm font-bold tracking-[0.18em] text-sky-300">
                        {item.number}
                      </span>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-300/30 bg-sky-500/15 text-sky-300">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <h3 className="mt-7 text-xl sm:text-2xl font-bold tracking-tight text-white">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                      {item.text}
                    </p>
                  </GlassEffect>

                  {index < JOURNEY.length - 1 && (
                    <div className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
                      <ArrowRight className="h-5 w-5 text-sky-300/40" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pt-2">
            <Link
              href="/architecture"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-sky-300/30 hover:bg-white/[0.08]"
            >
              See how the pipeline works
              <ArrowRight className="h-4 w-4 text-sky-300" />
            </Link>
          </div>
        </section>

        
        <section className="space-y-8">
          <SectionHeading
            eyebrow="Built with"
            title="A focused stack behind the experience"
            description="The product is intentionally composed from a small set of services, each responsible for one part of the recording workflow."
          />

          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {TECHNOLOGY.map((item) => {
              const Icon = item.icon;

              return (
                <GlassEffect
                  key={item.title}
                  className="rounded-[28px] border border-white/20 bg-slate-900/50 p-7 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-white/35"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        {item.title}
                      </h3>

                      <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-500/15 text-sky-300">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </GlassEffect>
              );
            })}
          </div>
        </section>

       
        <section className="relative overflow-hidden rounded-[36px] border border-white/20 bg-gradient-to-br from-sky-500/[0.18] via-slate-900/70 to-cyan-500/[0.14] p-8 text-center sm:p-12 lg:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.16),transparent_42%)]" />

          <div className="relative mx-auto max-w-3xl">
            <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-500/15 text-sky-300 mb-6 shadow-inner">
              <Play className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Give your recordings somewhere to go.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-300 font-medium">
              Upload a recording, follow its progress, and return to the
              transcript and summary whenever you need them.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-white/90 shadow-md active:scale-95"
              >
                Open AudioNote
                <ArrowRight className="h-5 w-5" />
              </Link>

              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3 text-base font-semibold text-white transition hover:bg-white/[0.12] active:scale-95"
              >
                GitHub repository
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}