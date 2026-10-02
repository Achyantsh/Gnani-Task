"use client";

import React, { useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileAudio,
  X,
  Loader2,
} from "lucide-react";
import { GlassEffect } from "@/components/liquid";
import { AudioPlayer } from "./audio-player";
import { LanguageDropdown } from "./language-dropdown";
import { ResultCard } from "./result-card";
import { WorkingStatus } from "./working-status";
import { useDropzoneContext } from "@/context/dropzone-context";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface AudioDropzoneProps {
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function AudioDropzone({
  isExpanded: propExpanded,
  onExpandedChange,
}: AudioDropzoneProps = {}) {
  const {
    selectedFile,
    fileName,
    fileSize,
    audioPreviewUrl,
    selectedLanguage,
    setSelectedLanguage,
    status,
    uploadProgress,
    pipelineStage,
    isCancelling,
    elapsedSeconds,
    isWorking,
    completedResult,
    isExpanded: contextExpanded,
    setIsExpanded,
    handleStartPipeline,
    handleCancelPipeline,
    resetAll,
    onDropFiles,
  } = useDropzoneContext();

      useEffect(()=>{
      console.log(status)
    }, [status])

 

  const isExpanded = propExpanded !== undefined ? propExpanded : contextExpanded;

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: onDropFiles,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"],
    },
    maxFiles: 1,
    maxSize: 1024 * 1024 * 1024,
    multiple: false,
  });

  const hasFile = Boolean(selectedFile || fileName);

  // Enable audio upload and file browsing by pressing Enter on the dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Do not intercept if typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          (target.tagName === "BUTTON" &&
            target.getAttribute("data-upload-trigger") !== "true"))
      ) {
        return;
      }

      // If a modal dialog or dropdown menu is active, let it handle Enter
      if (
        document.querySelector("[data-slot='dialog-content']") ||
        document.querySelector("[role='dialog']") ||
        document.querySelector("[role='menu']")
      ) {
        return;
      }

      if (hasFile && !isWorking && status !== "completed") {
        e.preventDefault();
        handleStartPipeline();
      } else if (!hasFile && status !== "completed") {
        e.preventDefault();
        open();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasFile, isWorking, status, handleStartPipeline, open]);

  if (status === "completed" && completedResult) {
    return (
      <ResultCard
        filename={fileName || selectedFile?.name || "recording.wav"}
        transcript={completedResult.transcript}
        summary={completedResult.summary}
        durationSeconds={completedResult.durationSeconds}
        playbackUrl={completedResult.playbackUrl}
        segments={completedResult.segments}
        onReset={() => {
          resetAll();
          onExpandedChange?.(false);
          setIsExpanded(false);
        }}
        isExpanded={isExpanded}
      />
    );
  }

  return (
    <GlassEffect
      className={`w-full rounded-3xl border border-white/20 shadow-[0_24px_48px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExpanded
          ? "p-4 sm:p-5 lg:p-6 min-h-[58vh] lg:min-h-[75vh] flex flex-col justify-between"
          : "p-6 sm:p-7 min-h-0"
      }`}
    >
      {!hasFile ? (
        <div
          {...getRootProps()}
          className={`group relative flex flex-col items-center justify-center rounded-2xl border border-dashed py-14 px-6 text-center transition-all duration-200 cursor-pointer select-none ${
            isDragActive
              ? "border-white bg-white/10"
              : "border-white/20 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.05]"
          }`}
        >
          <input {...getInputProps()} />

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white/80 group-hover:scale-105 group-hover:text-white transition-all mb-4">
            <Upload className="h-5 w-5" />
          </div>

          <p className="text-sm font-medium text-white">
            {isDragActive ? "Drop audio here" : "Drop audio file here"}
          </p>
          <p className="mt-1 text-xs text-white/50">
            or click to browse from device (or press <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white/10 rounded border border-white/15 text-white/70">↵ Enter</kbd>)
          </p>

          <div className="mt-6 text-[11px] text-white/40 tracking-wide font-mono">
            MP3 • WAV • M4A • FLAC (Up to 1GB)
          </div>
        </div>
      ) : (
        <div
          className={`space-y-4 ${
            isExpanded ? "flex-1 flex flex-col justify-between" : ""
          }`}
        >
          {/* Top Config Section */}
          <div className="space-y-3.5 shrink-0">
            {/* File summary pill with disabled remove button during processing */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white">
                  <FileAudio className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-white truncate max-w-[200px] sm:max-w-md">
                    {fileName || selectedFile?.name}
                  </p>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {formatFileSize(fileSize || selectedFile?.size || 0)}
                  </p>
                </div>
              </div>

              {/* Remove button disabled during active processing */}
              <button
                type="button"
                onClick={() => {
                  resetAll();
                  onExpandedChange?.(false);
                  setIsExpanded(false);
                }}
                disabled={isWorking}
                className={`p-1.5 rounded-lg text-white/50 transition ${
                  isWorking
                    ? "opacity-25 cursor-not-allowed pointer-events-none"
                    : "hover:text-white hover:bg-white/10 cursor-pointer"
                }`}
                title={
                  isWorking
                    ? "Cannot remove file while processing"
                    : "Remove file"
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Local Audio Player preview */}
            {audioPreviewUrl && <AudioPlayer src={audioPreviewUrl} />}

            {/* Language Selector disabled during active processing */}
            <LanguageDropdown
              value={selectedLanguage}
              onChange={setSelectedLanguage}
              disabled={isWorking}
            />
          </div>

          <div className="flex-1">
            {isWorking && (
              <WorkingStatus
                status={status}
                pipelineStage={pipelineStage}
                uploadProgress={uploadProgress}
                elapsedSeconds={elapsedSeconds}
              />
            )}
          </div>

          {/* Bottom Processing Bar: Action button + Cancel Job button pinned at the bottom */}
          <div className="mt-auto pt-2 shrink-0 flex items-center gap-3">
            <button
              type="button"
              data-upload-trigger="true"
              onClick={handleStartPipeline}
              disabled={isWorking}
              className={`flex-1 flex items-center justify-center gap-2.5 rounded-xl py-3 text-xs sm:text-sm font-semibold transition-all shadow-md ${
                isWorking
                  ? "bg-white/85 text-neutral-900 cursor-not-allowed opacity-90 select-none"
                  : "bg-white text-neutral-950 hover:bg-white/90 active:scale-[0.99] cursor-pointer"
              }`}
            >
              {isWorking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-900 shrink-0" />
                  <span className="truncate">
                    {status === "requesting_url"
                      ? "Securing R2 Cloud Signature..."
                      : status === "uploading"
                      ? `Uploading Directly to R2 (${uploadProgress}%)...`
                      : pipelineStage === "SUMMARIZING"
                      ? "AI Summary with Gemini..."
                      : "Transcribing with Gnani ASR.."}
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Upload &amp; Transcribe Audio</span>
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-neutral-600 bg-neutral-100 rounded border border-neutral-300 shadow-2xs">
                    ↵ Enter
                  </kbd>
                </div>
              )}
            </button>

            {isWorking && (
              <button
                type="button"
                onClick={handleCancelPipeline}
                disabled={isCancelling}
                className="
                  relative overflow-hidden shrink-0
                  px-5 py-3 rounded-xl
                  border border-white/15
                  bg-white/[0.06]
                  hover:bg-white/[0.11]
                  active:scale-95
                  text-xs sm:text-sm font-medium text-white/60
                  hover:text-white/85
                  transition-all duration-200
                  cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                  backdrop-blur-md
                "
                title="Cancel ongoing Gnani transcription job"
              >
                {/* Liquid shimmer overlay */}
                <span
                  className="pointer-events-none absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-liquid"
                  aria-hidden
                />
                <span className="relative z-10">
                  {isCancelling ? "Cancelling..." : "Cancel"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </GlassEffect>
  );
}
