import React from "react";
import Link from "next/link";
import {
  Cloud,
  Cpu,
  Layers,
  ShieldCheck,
  FileAudio,
  Sparkles,
  Terminal,
  ExternalLink,
  ArrowRight,
  Database,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { GlassEffect } from "@/components/liquid";

export const metadata = {
  title: "System Architecture | Gnani Audio Notes",
  description:
    "Technical deep dive into the serverless, server-action-driven audio processing pipeline, Gnani Batch STT integration, and Cloudflare R2 storage.",
};

export default function ArchitecturePage() {
  return (
    <div className="flex min-h-screen flex-col font-sans text-white">
      <main className="flex-1 px-4 pt-32 pb-20 sm:px-6 sm:pt-40 sm:pb-28 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-14 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-emerald-400 backdrop-blur-md mb-4">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Direct Server Action & Batch STT Architecture
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            System Architecture
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-3xl">
            A comprehensive breakdown of how our audio transcription platform scales to handle
            long recordings (up to 4 hours) using Next.js Server Actions, Cloudflare R2 presigned
            storage, the official Gnani Batch STT API, and LLM summarization.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <a
              href="https://github.com/achyu/gnani-app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-md hover:bg-zinc-200 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View on GitHub
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 transition-colors"
            >
              Back to Recorder
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* High-Level Architecture Flow Diagram */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            End-to-End Pipeline Overview
          </h2>
          <GlassEffect className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center md:text-left">
              {/* Step 1 */}
              <div className="flex flex-col p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    01. INGESTION
                  </span>
                  <Cloud className="h-4 w-4 text-zinc-400" />
                </div>
                <h3 className="font-semibold text-white text-sm">Direct R2 Upload</h3>
                <p className="text-xs text-zinc-400 mt-2">
                  Client gets presigned S3 PUT URL via Server Action, streaming audio directly to
                  Cloudflare R2 without burdening the application server.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                    02. DISPATCH
                  </span>
                  <Cpu className="h-4 w-4 text-zinc-400" />
                </div>
                <h3 className="font-semibold text-white text-sm">Gnani Batch STT</h3>
                <p className="text-xs text-zinc-400 mt-2">
                  Server action generates presigned GET link and dispatches an asynchronous job to
                  Gnani Batch API (<code className="text-[11px] text-zinc-300">/batch/jobs</code>)
                  with auto-start.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    03. OBSERVABILITY
                  </span>
                  <Terminal className="h-4 w-4 text-zinc-400" />
                </div>
                <h3 className="font-semibold text-white text-sm">Polled Execution</h3>
                <p className="text-xs text-zinc-400 mt-2">
                  Client polls <code className="text-[11px] text-zinc-300">checkTranscriptionTask</code>.
                  Terminal logs display real-time execution steps, timestamps, and job progress.
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    04. SYNTHESIS
                  </span>
                  <Sparkles className="h-4 w-4 text-zinc-400" />
                </div>
                <h3 className="font-semibold text-white text-sm">LLM Summary & DB</h3>
                <p className="text-xs text-zinc-400 mt-2">
                  Downloads transcript JSON, synthesizes Executive Summary & Action Items via LLM,
                  and saves to Supabase Postgres with RLS.
                </p>
              </div>
            </div>
          </GlassEffect>
        </section>

        {/* Deep Dive Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
          {/* Pillar 1: Long Audio & Gnani Batch API */}
          <GlassEffect className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <FileAudio className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-white">Handling Long Audio (&gt; 30 Seconds)</h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed mb-4">
              Gnani STT REST API has a strict 30-second audio duration limit. Slicing long recordings into
              manual 25-second chunks produces audible boundary artifacts and sentence fragmentation.
            </p>
            <div className="space-y-3 text-xs text-zinc-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Official Batch STT:</strong> We use{" "}
                  <code className="text-zinc-200">https://api.vachana.ai/stt/v3/batch/jobs</code>,
                  which supports continuous recordings up to <strong>4 hours</strong> per file.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Cloud Storage Ingestion:</strong> By pointing
                  Gnani Batch STT to Cloudflare R2 presigned URLs, we bypass the 10 MB direct upload
                  cap completely.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Automated Start &amp; Download:</strong> Server
                  actions create the job, immediately call <code className="text-zinc-200">/start</code>,
                  and fetch the signed S3 transcript URL once terminal status is reached.
                </span>
              </div>
            </div>
          </GlassEffect>

          {/* Pillar 2: Pure Server Action Architecture */}
          <GlassEffect className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Terminal className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-white">Pure Server Action Architecture</h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed mb-4">
              Rather than maintaining a separate Python/FastAPI microservice with redundant port
              configurations and cross-origin complexity, all orchestration is unified in Next.js Server Actions.
            </p>
            <div className="space-y-3 text-xs text-zinc-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Zero Server Sprawl:</strong> Only Next.js is
                  required. No external Python venvs, uvicorn daemons, or ffmpeg binary dependencies.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Native Auth Context:</strong> Server actions run in
                  the request scope with access to Supabase auth cookies, eliminating auth token passing.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Verbose Debug Observability:</strong> Every action
                  call emits structured logs with timestamps, file keys, response codes, and timings.
                </span>
              </div>
            </div>
          </GlassEffect>
        </div>

        {/* Database & Security */}
        <section className="mb-14">
          <GlassEffect className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">PostgreSQL &amp; Row Level Security (RLS)</h2>
                <p className="text-xs text-zinc-400">Managed via Supabase PostgreSQL</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed mb-4">
              All user notes, raw transcripts, and AI-generated summaries are persisted in the{" "}
              <code className="text-zinc-200">public.transcriptions</code> table protected with
              PostgreSQL Row Level Security policies.
            </p>

            <div className="rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
              <pre className="text-emerald-400">-- Migration: 20261001000000_create_transcriptions_table.sql</pre>
              <pre>{`ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own transcriptions"
ON public.transcriptions
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);`}</pre>
            </div>
          </GlassEffect>
        </section>

        {/* Debugging & Observability Section */}
        <section>
          <GlassEffect className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Live Server Action Debugging Traces</h2>
                <p className="text-xs text-zinc-400">Inspecting terminal execution logs</p>
              </div>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed mb-4">
              Every invocation of <code className="text-zinc-200">getPresignedUploadUrl</code>,{" "}
              <code className="text-zinc-200">startAudioTranscription</code>, and{" "}
              <code className="text-zinc-200">checkTranscriptionTask</code> prints detailed telemetry
              directly to your server console:
            </p>
            <div className="rounded-xl border border-white/10 bg-black/70 p-4 font-mono text-xs text-zinc-300 space-y-1.5 overflow-x-auto">
              <div className="text-zinc-500"># Console Debug Trace Example</div>
              <div className="text-sky-400">🎙️ [DEBUG: transcribe.ts] [STEP: START_PIPELINE] fileKey: &apos;audio/user-id/...&apos;</div>
              <div className="text-zinc-400">🎙️ [DEBUG: transcribe.ts] [STEP: R2_PRESIGN_SUCCESS] Presigned URL generated (valid 2h)</div>
              <div className="text-emerald-400">🎙️ [DEBUG: transcribe.ts] [STEP: GNANI_CREATE_SUCCESS] job_id: &apos;01a0f874-0bb6-...&apos;</div>
              <div className="text-amber-400">🎙️ [DEBUG: transcribe.ts] [STEP: GNANI_START_SUCCESS] status: &apos;STARTING&apos;</div>
              <div className="text-purple-400">🎙️ [DEBUG: transcribe.ts] [STEP: POLL_STATUS_RECEIVED] status: &apos;IN_PROGRESS&apos; (percent: 50)</div>
              <div className="text-emerald-300">🎙️ [DEBUG: transcribe.ts] [STEP: JOB_COMPLETED] Transcript parsed: 2,429 chars</div>
              <div className="text-pink-400">🎙️ [DEBUG: transcribe.ts] [STEP: GENERATE_SUMMARY_START] Executive summary created</div>
            </div>
          </GlassEffect>
        </section>
      </main>
    </div>
  );
}