"use client";

import React from "react";
import {
  CloudUpload,
  Headphones,
  Sparkles,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export type StepStatus =
  | "idle"
  | "requesting_url"
  | "uploading"
  | "uploaded"
  | "processing"
  | "completed"
  | "error";

export interface WorkingStatusProps {
  status: StepStatus;
  pipelineStage: string;
  uploadProgress: number;
  elapsedSeconds: number;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function WorkingStatus({
  status,
  pipelineStage,
  uploadProgress,
  elapsedSeconds,
}: WorkingStatusProps) {
  // Docs: CREATED -> STARTING -> QUEUED -> IN_PROGRESS -> COMPLETED
  const isUploadDone = status === "processing";
  const isGnaniActive =
    status === "processing" &&
    (pipelineStage === "CREATED" ||
      pipelineStage === "STARTING" ||
      pipelineStage === "QUEUED" ||
      pipelineStage === "DOWNLOADING" ||
      pipelineStage === "IN_PROGRESS" ||
      pipelineStage === "TRANSCRIBING");
  const isGnaniDone = pipelineStage === "SUMMARIZING";
  const isSummarizeActive = pipelineStage === "SUMMARIZING";

  return (
    <div className="flex-1 flex flex-col justify-center my-4 py-2 shrink-0 animate-fadeIn">
      <div className="rounded-2xl border border-white/15 bg-black/35 p-4 sm:p-5 backdrop-blur-xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {status === "uploading" ? (
              <CloudUpload className="h-5 w-5 text-sky-400 animate-pulse shrink-0" />
            ) : isGnaniActive ? (
              <Headphones className="h-5 w-5 text-indigo-400 animate-bounce shrink-0" />
            ) : (
              <Sparkles className="h-5 w-5 text-purple-400 animate-spin shrink-0" />
            )}
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                {status === "requesting_url"
                  ? "Securing Cloud Storage Signature..."
                  : status === "uploading"
                  ? `Uploading Directly to Cloud Storage (${uploadProgress}%)`
                  : pipelineStage === "CREATED" || pipelineStage === "STARTING"
                  ? "Batch Job Initialized with Gnani"
                  : pipelineStage === "QUEUED"
                  ? "Job Placed in Gnani ASR Priority Queue"
                  : pipelineStage === "DOWNLOADING"
                  ? "Gnani Reading Audio from Cloud Storage"
                  : pipelineStage === "IN_PROGRESS" || pipelineStage === "TRANSCRIBING"
                  ? "Transcribing Audio (Gnani Prisma v2.5 Neural Engine)..."
                  : pipelineStage === "SUMMARIZING"
                  ? "Synthesizing AI Summary & Action Items..."
                  : "Processing Background Transcription..."}
              </h4>
              <p className="text-[11px] text-white/50 mt-0.5 truncate">
                {status === "uploading"
                  ? "Direct browser-to-R2 upload bypasses server bottlenecks"
                  : "Polling Gnani Batch STT lifecycle every ~10s"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
           
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono border border-white/10 bg-white/5 text-white/80">
              <Clock className="h-3 w-3 text-sky-300" />
              <span>{formatElapsed(elapsedSeconds)}</span>
            </span>

            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-sky-400/20 bg-sky-400/10 text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping" />
              <span className="font-mono uppercase text-[10px]">
                {pipelineStage === "TRANSCRIBING" || pipelineStage === "IN_PROGRESS"
                  ? "A.S.R"
                  : pipelineStage}
              </span>
            </span>
          </div>
        </div>


        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-white/60">
            <span>Lifecycle Progress</span>
            <span className="text-sky-300 font-semibold">
              {status === "uploading"
                ? `${uploadProgress}% Uploaded`
                : pipelineStage === "SUMMARIZING"
                ? "90% (Summarizing)"
                : isGnaniActive
                ? "Gnani Processing"
                : "In Progress"}
            </span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                status === "uploading"
                  ? "bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500"
                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse w-full"
              }`}
              style={{
                width:
                  status === "uploading"
                    ? `${uploadProgress}%`
                    : pipelineStage === "SUMMARIZING"
                    ? "90%"
                    : "100%",
              }}
            />
          </div>
        </div>

      
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10">
          {/* Stage 1: Cloud Upload */}
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-2.5 border border-white/10">
            {isUploadDone ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : status === "uploading" ? (
              <Loader2 className="h-4 w-4 text-sky-400 animate-spin shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-white/40 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-white truncate">1. R2 Upload</p>
              <p className="text-[10px] text-white/50 truncate">
                {isUploadDone ? "Uploaded to R2" : `${uploadProgress}%`}
              </p>
            </div>
          </div>

          {/* Stage 2: Gnani Batch ASR */}
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-2.5 border border-white/10">
            {isGnaniDone ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : isGnaniActive ? (
              <Headphones className="h-4 w-4 text-indigo-400 animate-bounce shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-white/40 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-white truncate">2. Gnani ASR</p>
              <p className="text-[10px] text-white/50 truncate font-mono">
                {isGnaniDone
                  ? "COMPLETED"
                  : isGnaniActive
                  ? pipelineStage
                  : "QUEUED"}
              </p>
            </div>
          </div>

          {/* Stage 3: Gemini AI Summary */}
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-2.5 border border-white/10">
            {isSummarizeActive ? (
              <Sparkles className="h-4 w-4 text-purple-400 animate-spin shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-white/40 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-white truncate">3. AI Insights</p>
              <p className="text-[10px] text-white/50 truncate">
                {isSummarizeActive ? "Synthesizing..." : "Queued"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
