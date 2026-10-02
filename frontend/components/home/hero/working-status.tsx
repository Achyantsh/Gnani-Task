"use client";

import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";

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

function useSimulatedProgress(
  active: boolean,
  speed: "normal" | "fast",
  max: number
) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setTimeout(() => setProgress(0), 10);
      return;
    }
    const interval = setInterval(() => {
      setProgress((current) => {
        if (current >= max) return current;
        const remaining = max - current;
        let increment;
        if (speed === "fast") {
          increment = remaining > 20 ? Math.random() * 5 + 2 : Math.random() * 1.5;
        } else {
          increment = remaining > 20 ? Math.random() * 2.5 + 0.5 : Math.random() * 0.7;
        }
        return Math.min(current + increment, max);
      });
    }, speed === "fast" ? 450 : 900);
    return () => clearInterval(interval);
  }, [active, speed, max]);

  return progress;
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
          ? "border-white/25 bg-white/[0.10]"
          : completed
          ? "border-white/18 bg-white/[0.07]"
          : "border-white/[0.09] bg-white/[0.04]"
        }
      `}
    >
  
      <div className="flex items-center gap-2.5">
        <div
          className={`
            flex h-7 w-7 shrink-0 items-center justify-center rounded-full border
            ${completed
              ? "border-white/35 bg-white/[0.14]"
              : active
              ? "border-white/28 bg-white/[0.10]"
              : "border-white/12 bg-white/[0.04]"
            }
          `}
        >
          {completed ? (
            <Check className="h-3.5 w-3.5 text-white/85" strokeWidth={2.2} />
          ) : active ? (
            <span className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white/75 animate-spin block" />
          ) : (
            <span className="text-[9px] font-semibold text-white/35">{number}</span>
          )}
        </div>

        <div className="min-w-0">
          <p
            className={`font-semibold truncate leading-tight ${
              active || completed ? "text-white/85" : "text-white/45"
            }`}
          >
            {label}
          </p>
          <p className="text-sm text-white/70 mt-0.5 leading-tight">
            {completed
              ? sublabel ?? "Complete"
              : active
              ? `${Math.round(progress)}%`
              : waiting
              ? "Waiting"
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



export function WorkingStatus({
  status,
  pipelineStage,
  uploadProgress,
}: WorkingStatusProps) {


  const uploadActive = status === "requesting_url" || status === "uploading";
  const uploadDone   = status === "uploaded" || status === "processing" || status === "completed";

  const transcriptionActive =
    status === "processing" &&
    ["CREATED","STARTING","QUEUED","DOWNLOADING","IN_PROGRESS","TRANSCRIBING"].includes(pipelineStage);

  const transcriptionDone = status === "processing" && pipelineStage === "SUMMARIZING";
  const aiActive          = status === "processing" && pipelineStage === "SUMMARIZING";
  const aiDone            = status === "completed";

  
  const transcriptionProgress = useSimulatedProgress(transcriptionActive, "normal", 88);
  const aiProgress            = useSimulatedProgress(aiActive, "normal", 97);


  let title    = "Processing Audio";
  let subtitle = "Preparing...";

  if (uploadActive) {
    title    = "Uploading Audio";
    subtitle = status === "uploading" ? `${uploadProgress}% uploaded` : "Preparing upload...";
  }
  if (transcriptionActive) {
    title    = "Transcribing Audio";
    subtitle = "Converting speech to text...";
  }
  if (aiActive) {
    title    = "Generating AI Summary";
    subtitle = "Analyzing your transcript...";
  }
  if (aiDone) {
    title    = "Processing Complete";
    subtitle = "Your audio is ready";
  }

  return (
    <div className="flex-1 flex flex-col justify-center py-2">
      <div
        className="
          
          w-full rounded-2xl
          border border-white/[0.14]
          bg-white/[0.055]
          backdrop-blur-2xl
          shadow-[0_8px_40px_rgba(0,0,0,0.18)]
          p-5
          flex flex-col gap-5 flex-1
        "
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-lg font-semibold text-white/85 leading-tight">{title}</h4>
            <p className=" text-white/60 mt-1 leading-tight">{subtitle}</p>
          </div>

          {aiDone ? (
            <Check className="h-4 w-4 text-white/70 shrink-0" strokeWidth={2} />
          ) : (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white/60" />
            </span>
          )}
        </div>

    
        <div className="flex items-stretch w-full gap-0">

          <div className="flex-1">
            <Stage
              number="1"
              label="Upload"
              completed={uploadDone}
              active={uploadActive}
              waiting={false}
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
              progress={transcriptionDone || aiDone ? 100 : transcriptionProgress}
            >
              {transcriptionActive ? (
                <Waveform active />
              ) : null}
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
              progress={aiDone ? 100 : aiProgress}
              fast
            >
              {aiActive ? (
                <PulsingOrb active />
              ) : null}
            </Stage>
          </div>

        </div>

      </div>
    </div>
  );
}