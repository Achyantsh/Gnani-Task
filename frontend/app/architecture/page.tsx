import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  ExternalLink,
  FileAudio,
  HardDrive,
  Layers3,
  LockKeyhole,
  RefreshCw,
  Server,
  Sparkles,
  UploadCloud,
  Workflow,
} from "lucide-react";
import { GlassEffect } from "@/components/liquid";

export const metadata = {
  title: "Architecture | AudioNote",
  description:
    "How AudioNote moves an audio file from upload to transcription, summarization, and persistent history.",
};

const GITHUB_URL = "https://github.com/achyantsh/gnani-task";

const FLOW = [
  {
    number: "01",
    title: "Select & validate",
    label: "Browser",
    icon: FileAudio,
    text: "The user selects an audio file and language. The client validates the file before starting the processing pipeline.",
  },
  {
    number: "02",
    title: "Direct upload",
    label: "Cloudflare R2",
    icon: UploadCloud,
    text: "Next.js creates a short-lived presigned upload URL. The browser uploads the binary directly to R2, keeping large files out of the application server.",
  },
  {
    number: "03",
    title: "Create ASR job",
    label: "FastAPI → Gnani",
    icon: Workflow,
    text: "After upload completes, FastAPI receives the object key, creates the Gnani batch job, starts it, and returns the task ID used for status tracking.",
  },
  {
    number: "04",
    title: "Track transcription",
    label: "Polling",
    icon: RefreshCw,
    text: "The frontend polls the backend while Gnani moves through its job lifecycle. The interface updates the active stage instead of appearing idle during long recordings.",
  },
  {
    number: "05",
    title: "Generate summary",
    label: "Gemini",
    icon: Sparkles,
    text: "When the ASR job completes, the backend retrieves the transcript and sends it to the summarization service to create the final insight layer.",
  },
  {
    number: "06",
    title: "Persist & reopen",
    label: "Supabase",
    icon: Database,
    text: "Transcript, summary, metadata, and the object key are stored in Postgres. Past recordings can then be reopened from the history page.",
  },
];

const STACK = [
  {
    title: "Next.js",
    subtitle: "Frontend + Server Actions",
    icon: Layers3,
    description:
      "App Router UI, authentication-aware actions, upload orchestration, progress feedback, and the transcription experience.",
  },
  {
    title: "Cloudflare R2",
    subtitle: "Object storage",
    icon: HardDrive,
    description:
      "Audio files are stored outside the application runtime. Presigned URLs are used for controlled upload and playback access.",
  },
  {
    title: "FastAPI",
    subtitle: "Application backend",
    icon: Server,
    description:
      "Starts Gnani jobs, exposes task status, handles completion, obtains playback URLs, generates summaries, and writes results.",
  },
  {
    title: "Gnani ASR",
    subtitle: "Speech recognition",
    icon: FileAudio,
    description:
      "Receives an accessible audio URL, processes the recording, and returns the completed transcript with timing information.",
  },
  {
    title: "Gemini",
    subtitle: "Summarization",
    icon: Sparkles,
    description:
      "Transforms the completed transcript into a concise summary for the final result view.",
  },
  {
    title: "Supabase",
    subtitle: "Auth + PostgreSQL",
    icon: Database,
    description:
      "Provides authenticated user context and persistent transcription history for each account.",
  },
];

const NOTES = [
  {
    title: "Large files stay off the app server",
    text: "The browser uploads directly to R2 through a presigned URL. This avoids sending the entire audio payload through Next.js or FastAPI.",
    icon: UploadCloud,
  },
  {
    title: "Processing is visible",
    text: "The client keeps an active task ID, polls for lifecycle changes, shows elapsed time, exposes cancellation, and keeps the processing state visible during longer jobs.",
    icon: Workflow,
  },
  {
    title: "Access is scoped",
    text: "Authenticated user context is passed into the pipeline and persisted with the completed transcription record. Audio access uses signed object URLs.",
    icon: LockKeyhole,
  },
];

const EXECUTION_MODEL = [
  {
    title: "Synchronous work",
    label: "Short-lived requests",
    icon: Workflow,
    items: [
      "Validate the selected file and language before processing starts.",
      "Request a presigned upload URL and upload the audio directly to R2.",
      "Create and start the Gnani batch transcription job.",
      "Poll the FastAPI status endpoint while the external job is running.",
      "Fetch the completed transcript, generate the summary, and persist the result.",
    ],
  },
  {
    title: "Asynchronous work",
    label: "Long-running processing",
    icon: RefreshCw,
    items: [
      "Gnani handles transcription as a batch job instead of keeping one HTTP request open for the entire recording.",
      "The browser receives a task identifier and observes progress through the backend.",
      "Gnani's lifecycle is mapped to user-facing states such as Transcribing and AI Insights.",
      "The current implementation does not require a separate internal worker queue for the transcription stage.",
    ],
  },
];

const LARGE_AUDIO = [
  {
    title: "Direct browser upload",
    label: "R2",
    icon: UploadCloud,
    text: "The audio binary is sent directly from the browser to Cloudflare R2 using a presigned URL. FastAPI does not have to receive and proxy the complete file.",
  },
  {
    title: "Batch speech recognition",
    label: "Gnani Batch STT",
    icon: FileAudio,
    text: "After the file is stored, the backend gives Gnani an accessible object URL and starts a batch transcription job. This moves the long-running audio processing outside the application request.",
  },
  {
    title: "Progress without a frozen page",
    label: "Polling",
    icon: RefreshCw,
    text: "The frontend keeps polling the processing status and updates the current stage, so longer recordings still have visible activity from upload through transcription and summary generation.",
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

function ArchitectureDiagramCard({
  src,
  alt,
  title,
  badge,
  caption,
  priority = false,
}: {
  src: string;
  alt: string;
  title: string;
  badge: string;
  caption?: string;
  priority?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[30px] border border-white/20 bg-slate-900/50 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:border-white/35 hover:shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-6 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-sky-300/30 bg-sky-400/15 px-3.5 py-1 text-xs sm:text-sm font-semibold uppercase tracking-wider text-sky-200">
            {badge}
          </span>

          <span className="text-base sm:text-lg font-bold tracking-tight text-white">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-xs sm:text-sm font-semibold text-white/85 transition hover:bg-white/[0.12] hover:text-white"
            title="Open high-res SVG in a new tab"
          >
            <span>Full vector</span>
            <ExternalLink className="h-4 w-4" />
          </a>

          <a
            href={src}
            download
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2 text-xs sm:text-sm font-semibold text-white/85 transition hover:bg-white/[0.12] hover:text-white"
            title="Download SVG file"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto bg-[#F8FAFC] p-4 sm:p-6 md:p-8">
        <div className="relative mx-auto w-full min-w-[640px] max-w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          <Image
            src={src}
            alt={alt}
            width={1600}
            height={900}
            unoptimized
            priority={priority}
            className="h-auto w-full object-contain"
          />
        </div>
      </div>

      {caption && (
        <div className="border-t border-white/10 bg-white/[0.02] px-6 py-4 sm:px-8 text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
          {caption}
        </div>
      )}
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6 sm:pt-36 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-24">
        
        <section className="relative overflow-hidden rounded-[36px] border border-white/15 bg-slate-900/30 backdrop-blur-xl px-6 py-14 text-center sm:px-12 sm:py-20 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.22),transparent_48%)]" />

          <div className="relative mx-auto max-w-4xl space-y-6">
            <div className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-2 text-xs sm:text-sm font-semibold tracking-[0.14em] text-sky-200">
              <Layers3 className="h-4 w-4" />
              SYSTEM ARCHITECTURE
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]">
              From audio file to{" "}
              <span className="block bg-gradient-to-r from-sky-200 via-white to-cyan-200 bg-clip-text text-transparent">
                transcript & summary.
              </span>
            </h1>

            <p className="mx-auto max-w-3xl text-base sm:text-lg lg:text-xl leading-relaxed text-slate-300 font-normal">
              AudioNote moves each recording through a small, explicit pipeline.
              Upload to object storage, speech recognition through Gnani, summary
              generation, and persistent history for the user.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-white/90 shadow-lg active:scale-95"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.05] px-6 py-3 text-base font-semibold text-white transition hover:bg-white/[0.12] active:scale-95"
              >
                View source (GitHub)
              </a>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="At a glance"
            title="One recording, one continuous flow"
            description="The browser owns the upload experience, FastAPI orchestrates the processing, external services do the heavy AI work, and Supabase keeps the finished result available later."
          />

          <div className="overflow-hidden rounded-[32px] border border-white/20 bg-slate-900/50 backdrop-blur-xl p-6 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-center">
              {[
                ["Browser", "Select + upload", FileAudio],
                ["R2", "Store audio", Cloud],
                ["FastAPI", "Orchestrate", Server],
                ["Gnani → Gemini", "Transcribe + summarize", Sparkles],
                ["Supabase", "Persist history", Database],
              ].map(([title, subtitle, Icon], index) => {
                const IconComponent = Icon as typeof FileAudio;

                return (
                  <div key={String(title)} className="contents">
                    <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.04] p-5 sm:p-6 shadow-sm transition hover:bg-white/[0.08] hover:border-white/30">
                      <div className="flex h-13 w-13 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10 text-sky-300">
                        <IconComponent className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                          {title as string}
                        </div>

                        <div className="mt-1 text-xs sm:text-sm text-slate-300 font-medium">
                          {subtitle as string}
                        </div>
                      </div>
                    </div>

                    {index < 4 && (
                      <div className="hidden justify-center lg:flex">
                        <ArrowRight className="h-5 w-5 text-sky-300/40" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      
        <section className="space-y-8">
          <SectionHeading
            eyebrow="Architecture diagram"
            title="System architecture & component boundaries"
            description="Visual map showing services, data movement, and explicit boundaries between the browser client, Cloudflare R2 storage, FastAPI backend, external AI providers, and Supabase database."
          />

          <ArchitectureDiagramCard
            src="/architecture/AudioNote-System-Architecture.svg"
            alt="System architecture diagram"
            badge="01 · System Architecture"
            title="System Architecture & Service Boundaries"
            priority={true}
            caption="Overview of the system layout: Client (Next.js), Storage (Cloudflare R2), Backend Orchestration (FastAPI), AI Inference (Gnani Batch STT + Gemini Summarization), and Persistence (Supabase PostgreSQL)."
          />
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Processing lifecycle"
            title="What happens after the user presses Upload"
            description="The application separates file transfer from AI processing so the interface can communicate what is happening at each stage."
          />

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
            {FLOW.map((item, index) => {
              const Icon = item.icon;

              return (
                <GlassEffect
                  key={item.number}
                  className="rounded-[28px] border border-white/20 bg-slate-900/50 p-7 sm:p-9 shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:border-white/35 transition-all duration-300"
                >
                  <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-500/15 text-sky-300 shadow-inner">
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-sky-300">
                          {item.number}
                        </span>

                        <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3.5 py-1 text-xs sm:text-sm font-semibold text-sky-200">
                          {item.label}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-white">
                        {item.title}
                      </h3>

                      <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                        {item.text}
                      </p>
                    </div>
                  </div>

                  {index < FLOW.length - 2 && (
                    <div className="ml-[28px] mt-6 hidden h-px bg-white/10 lg:block" />
                  )}
                </GlassEffect>
              );
            })}
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Request sequence"
            title="End-to-end processing & polling flow"
            description="The sequence of short application requests followed by asynchronous batch processing and deterministic status polling."
          />

          <ArchitectureDiagramCard
            src="/architecture/End-to-end-processing-flow.svg"
            alt="End-to-end processing flow diagram"
            badge="02 · Sequence Flow"
            title="Upload → Task Creation → Polling → Completion"
            caption="Step-by-step lifecycle: client-side validation, direct presigned upload to R2, asynchronous batch job dispatch to Gnani, status polling, automated Gemini summarization, and Supabase record creation."
          />
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Execution model"
            title="Synchronous control, asynchronous processing"
            description="Short-lived application requests handle orchestration, while the long-running speech recognition work is handled by Gnani's batch processing lifecycle."
          />

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
            {EXECUTION_MODEL.map((item) => {
              const Icon = item.icon;

              return (
                <GlassEffect
                  key={item.title}
                  className="rounded-[28px] border border-white/20 bg-slate-900/50 p-7 sm:p-9 shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:border-white/35 transition-all duration-300"
                >
                  <div className="flex items-start gap-5">
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-500/15 text-sky-300 shadow-inner">
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                          {item.title}
                        </h3>

                        <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3.5 py-1 text-xs sm:text-sm font-semibold text-sky-200">
                          {item.label}
                        </span>
                      </div>

                      <div className="mt-6 space-y-4">
                        {item.items.map((point) => (
                          <div key={point} className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />

                            <p className="text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                              {point}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassEffect>
              );
            })}
          </div>

          <GlassEffect className="rounded-[28px] border border-white/20 bg-slate-900/50 p-7 sm:p-9 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
                  Current orchestration path
                </div>

                <h3 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Upload → Batch Job → Poll → Complete
                </h3>

                <p className="mt-3 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                  The browser does not wait on a single long-running HTTP
                  request. It receives a task identifier and observes the
                  processing state until the transcript and summary are ready.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {[
                  "Upload",
                  "Gnani job",
                  "Polling",
                  "Transcript",
                  "Summary",
                ].map((step, index) => (
                  <div key={step} className="contents">
                    <span className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-white">
                      {step}
                    </span>

                    {index < 4 && (
                      <ArrowRight className="hidden h-4 w-4 text-sky-300/50 sm:block" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </GlassEffect>
        </section>

        {/* Large audio */}
        <section className="space-y-8">
          <SectionHeading
            eyebrow="Large audio handling"
            title="Designed for longer recordings"
            description="Large uploads are separated from the application server, while Gnani Batch STT handles the long-running transcription workload and the frontend keeps the user informed."
          />

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
            {LARGE_AUDIO.map((item) => {
              const Icon = item.icon;

              return (
                <GlassEffect
                  key={item.title}
                  className="rounded-[28px] border border-white/20 bg-slate-900/50 p-7 sm:p-9 shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:border-white/35 transition-all duration-300"
                >
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-500/15 text-sky-300 shadow-inner">
                    <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>

                  <div className="mt-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        {item.title}
                      </h3>

                      <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
                        {item.label}
                      </span>
                    </div>

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
            eyebrow="Implementation map"
            title="Where each responsibility lives"
            description="Each layer has one clear responsibility. The architecture page keeps the stack readable without turning it into a list of package names."
          />

          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {STACK.map((item) => {
              const Icon = item.icon;

              return (
                <GlassEffect
                  key={item.title}
                  className="rounded-[28px] border border-white/20 bg-slate-900/50 p-7 sm:p-8 flex flex-col justify-between shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:border-white/35 transition-all duration-300 min-h-[240px]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-xs sm:text-sm font-semibold uppercase tracking-wider text-sky-300/90">
                          {item.subtitle}
                        </p>
                      </div>

                      <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-500/15 text-sky-300">
                        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>
                    </div>

                    <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                      {item.description}
                    </p>
                  </div>
                </GlassEffect>
              );
            })}
          </div>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Design notes"
            title="A few implementation choices worth keeping visible"
            description="These choices shape the behaviour users see on the dashboard and the way the system handles larger recordings."
          />

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
            {NOTES.map((item) => {
              const Icon = item.icon;

              return (
                <GlassEffect
                  key={item.title}
                  className="rounded-[28px] border border-white/20 bg-slate-900/50 p-7 sm:p-9 shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:border-white/35 transition-all duration-300"
                >
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-500/15 text-sky-300 mb-5">
                    <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                    {item.text}
                  </p>
                </GlassEffect>
              );
            })}
          </div>
        </section>

       
        <section className="space-y-8">
          <SectionHeading
            eyebrow="Lifecycle & failure states"
            title="Processing states & resilient failure handling"
            description="User-facing progress is mapped to the underlying Gnani batch lifecycle and explicit failure paths. Errors and cancellations are surfaced immediately instead of leaving the interface stalled."
          />

          <ArchitectureDiagramCard
            src="/architecture/Processing-states.svg"
            alt="Processing states and lifecycle diagram"
            badge="03 · State Machine"
            title="UI Progress to Batch Lifecycle Mapping"
            caption="State machine mapping between user-facing milestones (Upload → Transcribing → AI Insights → Completed) and Gnani batch statuses, with deterministic branches for cancellations and failures."
          />

          <GlassEffect className="rounded-[32px] border border-white/20 bg-slate-900/50 p-8 sm:p-10 lg:p-12 shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
            <h3 className="mb-6 text-sm sm:text-base font-bold uppercase tracking-wider text-sky-300">
              Guaranteed Failure & Edge Case Handling
            </h3>

            <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
              {[
                "Upload validation and size errors",
                "Presigned URL generation failures",
                "Gnani job failures or cancellation",
                "Backend / network errors during polling",
                "Summary generation errors",
                "Signed playback URL failures",
              ].map((item) => (
                <div key={item} className="flex items-start gap-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-sky-300" />

                  <span className="text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </GlassEffect>
        </section>

        <section className="space-y-8">
          <SectionHeading
            eyebrow="Future improvements"
            title="Where the architecture can grow"
            description="The current flow is intentionally small. These are natural next steps as audio volume and task concurrency increase."
          />

          <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
            {[
              "Move task state from process memory into a durable store so jobs survive restarts.",
              "Introduce a real background worker / queue for transcription and summarization jobs.",
              "Add stronger retry and idempotency handling around external API calls.",
              "Add richer observability for task duration, failure rate, and stage timings.",
            ].map((item) => (
              <GlassEffect
                key={item}
                className="rounded-[28px] border border-white/20 bg-slate-900/50 p-7 sm:p-8 shadow-[0_14px_36px_rgba(0,0,0,0.3)] hover:border-white/35 transition-all"
              >
                <div className="flex gap-4 items-start">
                  <ArrowRight className="mt-1 h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-sky-300" />

                  <p className="text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
                    {item}
                  </p>
                </div>
              </GlassEffect>
            ))}
          </div>
        </section>

        
        <section className="rounded-[36px] border border-white/20 bg-gradient-to-br from-sky-500/[0.18] via-slate-900/70 to-cyan-500/[0.14] p-8 text-center sm:p-12 lg:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-500/15 text-sky-300 mb-6 shadow-inner">
              <HardDrive className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              The architecture is designed around the user’s waiting time.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-300 font-medium">
              Large transfers happen directly against storage, long-running
              work is represented with explicit lifecycle states, and completed
              results are persisted for quick access later.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-white/90 shadow-md active:scale-95"
              >
                Back to dashboard
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