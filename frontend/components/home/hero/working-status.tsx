"use client";

import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useDropzoneContext } from "@/context/dropzone-context";

export type StepStatus =
  | "idle"
  | "requesting_url"
  | "uploading"
  | "uploaded"
  | "processing"
  | "transcribing"
  | "summarizing"
  | "completed"
  | "error";

export interface WorkingStatusProps {
  status: StepStatus;
  pipelineStage: string;
  uploadProgress: number;
  elapsedSeconds: number;
}

function LoadingBar({
  progress,
  active,
  fast = false,
}: {
  progress: number;
  active: boolean;
  fast?: boolean;
}) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-white/55 transition-[width] duration-700 ease-out"
        style={{ width: `${progress}%` }}
      />
      {active && (
        <div
          className={`absolute top-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-white/45 to-transparent ${
            fast ? "animate-liquid-fast" : "animate-liquid"
          }`}
        />
      )}
    </div>
  );
}

function Connector({ active, completed }: { active: boolean; completed: boolean }) {
  return (
    <div className="hidden sm:flex items-center self-start mt-[22px] px-1.5 w-10 shrink-0">
      <div className="relative h-[3px] w-full overflow-hidden bg-white/10 rounded-full">
        <div
          className="absolute inset-y-0 left-0 bg-white/40 rounded-full transition-all duration-700"
          style={{ width: completed ? "100%" : active ? "55%" : "0%" }}
        />
        {active && (
          <div className="absolute top-0 bottom-0 w-10 bg-gradient-to-r from-transparent via-white/55 to-transparent animate-liquid" />
        )}
      </div>
    </div>
  );
}


const BAR_DELAYS  = [0, 0.18, 0.36, 0.54, 0.72, 0.9, 0.72, 0.54, 0.36, 0.18, 0];
const BAR_HEIGHTS = [0.45, 0.65, 0.85, 0.75, 1, 0.9, 1, 0.75, 0.85, 0.65, 0.45];

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-9">
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="rounded-full bg-white/65 w-[3px] origin-center"
          style={{
            height: `${h * 30}px`,
            animation: active
              ? `bar-wave ${0.9 + i * 0.04}s ease-in-out ${BAR_DELAYS[i]}s infinite`
              : "none",
            transform: active ? undefined : "scaleY(0.2)",
            opacity: active ? 0.75 : 0.2,
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        />
      ))}
    </div>
  );
}


function PulsingOrb({ active }: { active: boolean }) {
  return (
    <div className="relative flex items-center justify-center w-10 h-9">
      <div
        className="absolute inset-0 rounded-full border border-white/20"
        style={{
          animation: active ? "orb-pulse 1.8s ease-in-out infinite" : "none",
          boxShadow: active ? "0 0 18px rgba(255,255,255,0.10)" : "none",
        }}
      />
      <div
        className="absolute inset-2 rounded-full bg-white/08 border border-white/20"
        style={{
          animation: active ? "orb-pulse 1.8s ease-in-out 0.3s infinite" : "none",
        }}
      />
      <div
        className="relative z-10 w-2.5 h-2.5 rounded-full bg-white/70"
        style={{
          animation: active ? "float-y 2.2s ease-in-out infinite" : "none",
          boxShadow: active ? "0 0 10px rgba(255,255,255,0.45)" : "none",
        }}
      />
    </div>
  );
}


function Stage({
  number,
  label,
  sublabel,
  completed,
  active,
  waiting,
  progress,
  fast,
  children,
}: {
  number: string;
  label: string;
  sublabel?: string;
  completed: boolean;
  active: boolean;
  waiting: boolean;
  progress: number;
  fast?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`
        flex flex-col h-full rounded-xl border backdrop-blur-xl p-3.5
        transition-all duration-500
        ${active
          ? "border-white/30 bg-white/[0.10]"
          : completed
          ? "border-white/20 bg-white/[0.07]"
          : "border-white/10 bg-white/[0.03]"
        }
      `}
    >
  
      <div className="flex items-center gap-2.5">
        <div
          className={`
            flex h-7 w-7 shrink-0 items-center justify-center rounded-full border
            ${completed
              ? "border-white/40 bg-white/[0.18]"
              : active
              ? "border-white/30 bg-white/[0.12]"
              : "border-white/15 bg-white/[0.04]"
            }
          `}
        >
          {completed ? (
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
          ) : active ? (
            <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin block" />
          ) : (
            <span className="text-[9px] font-semibold text-white/60">{number}</span>
          )}
        </div>

        <div className="min-w-0">
          <p
            className={`font-semibold truncate leading-tight ${
              active || completed ? "text-white" : "text-white/60"
            }`}
          >
            {label}
          </p>
          <p className="text-xs sm:text-sm text-sky-200/90 mt-0.5 leading-tight font-mono font-medium">
            {sublabel
              ? sublabel
              : completed
              ? "COMPLETED"
              : active
              ? `${Math.round(progress)}%`
              : waiting
              ? "QUEUED"
              : ""}
          </p>
        </div>
      </div>

     
      <div className="flex-1 flex items-center justify-center mt-3 min-h-[2.25rem]">
        {children ?? null}
      </div>

     
      <div className="mt-3">
        {active || completed ? (
          <LoadingBar
            progress={completed ? 100 : progress}
            active={active}
            fast={fast}
          />
        ) : (
         
          <div className="h-2 w-full rounded-full bg-white/[0.06]" />
        )}
      </div>
    </div>
  );
}



const GNANI_LIFECYCLE_STAGES = [
  "CREATED",
  "STARTING",
  "QUEUED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export function WorkingStatus({
  status,
  pipelineStage,
  uploadProgress,
}: WorkingStatusProps) {
  const dropzoneContext = useDropzoneContext();

  const normalizedStage = (pipelineStage || "").toUpperCase();

  const uploadActive = status === "requesting_url" || status === "uploading";
  const uploadDone =
    status === "uploaded" ||
    status === "processing" ||
    status === "transcribing" ||
    status === "summarizing" ||
    status === "completed";

  const transcriptionActive =
    (status === "processing" || status === "transcribing") &&
    [
      "CREATED",
      "STARTING",
      "QUEUED",
      "DOWNLOADING",
      "IN_PROGRESS",
      "TRANSCRIBING",
      "FINALIZING",
    ].includes(normalizedStage);

  const transcriptionDone =
    status === "summarizing" ||
    status === "completed" ||
    normalizedStage === "SUMMARIZING" ||
    normalizedStage === "COMPLETED";

  const aiActive =
    status === "summarizing" ||
    ((status === "processing" || status === "transcribing") &&
      normalizedStage === "SUMMARIZING");

  const aiDone = status === "completed" || normalizedStage === "COMPLETED";

  // Map Gnani API job status to index: CREATED (0) -> STARTING (1) -> QUEUED (2) -> IN_PROGRESS (3) -> COMPLETED (4)
  let gnaniCurrentIndex = -1;
  if (normalizedStage === "CREATED") {
    gnaniCurrentIndex = 0;
  } else if (normalizedStage === "STARTING") {
    gnaniCurrentIndex = 1;
  } else if (normalizedStage === "QUEUED") {
    gnaniCurrentIndex = 2;
  } else if (
    normalizedStage === "IN_PROGRESS" ||
    normalizedStage === "TRANSCRIBING" ||
    normalizedStage === "DOWNLOADING" ||
    normalizedStage === "FINALIZING"
  ) {
    gnaniCurrentIndex = 3;
  } else if (
    normalizedStage === "SUMMARIZING" ||
    normalizedStage === "COMPLETED" ||
    status === "completed"
  ) {
    gnaniCurrentIndex = 4;
  }

  const transcriptionProgress =
    dropzoneContext?.transcriptionProgress ?? (transcriptionDone ? 100 : 0);
  const aiProgress = dropzoneContext?.summarizingProgress ?? (aiDone ? 100 : 0);

  let title = "Processing Audio";
  let subtitle = "Preparing...";

  if (uploadActive) {
    title = "Uploading Audio";
    subtitle = "Direct browser-to-R2 upload in progress...";
  } else if (transcriptionActive) {
    title = "Transcribing Audio";
    if (normalizedStage === "CREATED") {
      subtitle = "Job created in Gnani batch service (CREATED)...";
    } else if (normalizedStage === "STARTING") {
      subtitle = "Initializing batch speech recognition (STARTING)...";
    } else if (normalizedStage === "QUEUED") {
      subtitle = "Job placed in Gnani ASR priority queue (QUEUED)...";
    } else if (
      normalizedStage === "IN_PROGRESS" ||
      normalizedStage === "TRANSCRIBING"
    ) {
      subtitle =
        "Gnani Prisma v2.5 (IN_PROGRESS)...";
    } else if (normalizedStage === "FINALIZING") {
      subtitle = "Finalizing transcription results...";
    } else {
      subtitle = "Processing audio with Gnani Batch STT...";
    }
  } else if (aiActive) {
    title = "Generating AI Summary";
    subtitle = "Synthesizing executive summary with Gemini...";
  } else if (aiDone) {
    title = "Processing Complete";
    subtitle = "Your transcript and AI summary are ready";
  }

  // Exact Gnani stage label to display in Transcription card sublabel
  const gnaniStageLabel =
    transcriptionDone || aiDone
      ? "COMPLETED"
      : normalizedStage === "CREATED"
      ? "CREATED"
      : normalizedStage === "STARTING"
      ? "STARTING"
      : normalizedStage === "QUEUED"
      ? "QUEUED"
      : normalizedStage === "IN_PROGRESS" || normalizedStage === "TRANSCRIBING"
      ? `IN_PROGRESS · ${Math.round(transcriptionProgress)}%`
      : normalizedStage === "FINALIZING"
      ? `FINALIZING · ${Math.round(transcriptionProgress)}%`
      : transcriptionActive
      ? `${normalizedStage || "IN_PROGRESS"} · ${Math.round(transcriptionProgress)}%`
      : "STARTING";

  return (
    <div className="flex-1 flex flex-col justify-center py-2">
      <div
        className="
          w-full rounded-2xl
          border border-white/20
          bg-white/[0.06]
          backdrop-blur-2xl
          shadow-[0_8px_40px_rgba(0,0,0,0.22)]
          p-5
          flex flex-col gap-4 flex-1
        "
      >
      
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
              {title}
            </h4>
            <p className="text-xs sm:text-sm text-white/80 mt-1 leading-tight truncate">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border border-white/20 bg-white/[0.08] text-white shadow-sm backdrop-blur-md">
              <span
                className={`h-2 w-2 rounded-full ${
                  aiDone ? "bg-emerald-400" : "bg-sky-400"
                }`}
              />
              <span className="uppercase text-[10px] sm:text-[11px] tracking-wider text-white">
                {aiDone
                  ? "COMPLETED"
                  : aiActive
                  ? "AI INSIGHTS"
                  : transcriptionActive
                  ? `GNANI: ${normalizedStage || "IN_PROGRESS"}`
                  : "UPLOADING"}
              </span>
            </span>

            {aiDone && (
              <Check className="h-4 w-4 text-emerald-400 shrink-0" strokeWidth={2.5} />
            )}
          </div>
        </div>

        
        <div className="flex items-stretch w-full gap-0">
          <div className="flex-1">
            <Stage
              number="1"
              label="Upload"
              completed={uploadDone}
              active={uploadActive}
              waiting={!uploadActive && !uploadDone}
              sublabel={
                uploadDone
                  ? "COMPLETED"
                  : uploadActive
                  ? `IN_PROGRESS · ${uploadProgress}%`
                  : "QUEUED"
              }
              progress={uploadActive ? uploadProgress : uploadDone ? 100 : 0}
            />
          </div>

          <Connector
            active={uploadDone && transcriptionActive}
            completed={uploadDone && (transcriptionDone || aiDone)}
          />

          <div className="flex-1">
            <Stage
              number="2"
              label="Transcription"
              completed={transcriptionDone || aiDone}
              active={transcriptionActive}
              waiting={!transcriptionActive && !transcriptionDone && !aiDone}
              sublabel={gnaniStageLabel}
              progress={transcriptionDone || aiDone ? 100 : transcriptionProgress}
            >
              {transcriptionActive ? <Waveform active /> : null}
            </Stage>
          </div>

          <Connector
            active={transcriptionDone && aiActive}
            completed={transcriptionDone && aiDone}
          />

          <div className="flex-1">
            <Stage
              number="3"
              label="AI Summary"
              completed={aiDone}
              active={aiActive}
              waiting={!aiActive && !aiDone}
              sublabel={
                aiDone
                  ? "COMPLETED"
                  : aiActive
                  ? `IN_PROGRESS · ${Math.round(aiProgress)}%`
                  : "QUEUED"
              }
              progress={aiDone ? 100 : aiProgress}
              fast
            >
              {aiActive ? <PulsingOrb active /> : null}
            </Stage>
          </div>
        </div>

       
        <div className="rounded-xl border border-white/18 bg-white/[0.05] p-3 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shrink-0 shadow-[0_0_8px_rgba(125,211,252,0.8)]" />
              <span className="text-[10px] font-mono tracking-wider uppercase text-sky-300 font-bold">
                GNANI BATCH LIFECYCLE
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/70">
              API Status:{" "}
              <span className="font-bold text-white uppercase">
                {normalizedStage ||
                  (uploadActive ? "WAITING (UPLOAD FIRST)" : "IDLE")}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {GNANI_LIFECYCLE_STAGES.map((stageName, idx) => {
              const isPast = gnaniCurrentIndex > idx;
              const isCurrent =
                gnaniCurrentIndex === idx &&
                (transcriptionActive ||
                  (idx === 4 && (transcriptionDone || aiDone)));
              const isFuture = gnaniCurrentIndex < idx;

              return (
                <React.Fragment key={stageName}>
                  <div
                    className={`
                      flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1.5 sm:px-2 rounded-lg border text-center transition-all duration-300
                      ${
                        isCurrent
                          ? "border-sky-300 bg-sky-400/25 text-white font-bold shadow-[0_0_14px_rgba(56,189,248,0.35)] ring-1 ring-sky-300"
                          : isPast
                          ? "border-white/25 bg-white/[0.12] text-white font-semibold"
                          : "border-white/10 bg-white/[0.03] text-white/50 font-medium"
                      }
                    `}
                  >
                    {isPast ? (
                      <Check
                        className="h-3 w-3 text-sky-200 shrink-0"
                        strokeWidth={2.6}
                      />
                    ) : isCurrent ? (
                      <span className="h-2 w-2 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/30 shrink-0" />
                    )}
                    <span className="font-mono text-[9px] sm:text-[10px] tracking-wider truncate">
                      {stageName}
                    </span>
                  </div>
                  {idx < GNANI_LIFECYCLE_STAGES.length - 1 && (
                    <div
                      className={`h-[2px] w-2 sm:w-3 shrink-0 rounded-full transition-all duration-300 ${
                        isPast || (isCurrent && idx < gnaniCurrentIndex)
                          ? "bg-sky-400"
                          : "bg-white/20"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}