"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import {
  Upload,
  FileAudio,
  X,
  Loader2,
  Ban,
} from "lucide-react";
import { GlassEffect } from "@/components/liquid";
import { AudioPlayer } from "./audio-player";
import { LanguageDropdown } from "./language-dropdown";
import { ResultCard } from "./result-card";
import { WorkingStatus } from "./working-status";
import { getPresignedUploadUrl } from "@/actions/upload";
import {
  startAudioTranscription,
  checkTranscriptionTask,
  cancelAudioTranscription,
  TranscriptSegment,
} from "@/actions/transcribe";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

type StepStatus =
  | "idle"
  | "requesting_url"
  | "uploading"
  | "uploaded"
  | "processing"
  | "completed"
  | "error";

interface AudioDropzoneProps {
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function AudioDropzone({
  isExpanded = false,
  onExpandedChange,
}: AudioDropzoneProps = {}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");

  // Pipeline states
  const [status, setStatus] = useState<StepStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineStage, setPipelineStage] = useState<string>("INITIALIZING");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Result state
  const [completedResult, setCompletedResult] = useState<{
    transcript: string;
    summary: string;
    durationSeconds?: number;
    playbackUrl?: string;
    segments?: TranscriptSegment[];
  } | null>(null);

  const router = useRouter();

  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const isWorking =
    status === "requesting_url" ||
    status === "uploading" ||
    status === "processing";

  // Live timer tracking elapsed time during active job
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isWorking) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setTimeout(() => {
        setElapsedSeconds(0);
      }, 10);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isWorking]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [audioPreviewUrl]);

  const resetAll = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setSelectedFile(null);
    setAudioPreviewUrl(null);
    setStatus("idle");
    setUploadProgress(0);
    setPipelineStage("INITIALIZING");
    setActiveTaskId(null);
    setCompletedResult(null);
    onExpandedChange?.(false);
  };

  const handleCancelPipeline = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (activeTaskId) {
      setIsCancelling(true);
      try {
        await cancelAudioTranscription(activeTaskId);
        toast.add({
          title: "Job cancelled",
          description: "Gnani transcription job was cancelled successfully.",
          type: "success",
        });
      } catch {
        // Fallback
      } finally {
        setIsCancelling(false);
      }
    }

    resetAll();
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      resetAll();

      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          toast.add({
            title: "File too large",
            description: "Audio exceeds the 1GB limit. Please upload a smaller file.",
            type: "error",
          });
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          toast.add({
            title: "Invalid file format",
            description: "Please drop a valid audio file (.mp3, .wav, .m4a, .flac).",
            type: "error",
          });
        } else {
          toast.add({
            title: "Upload rejected",
            description: rejection.errors[0]?.message || "Could not read audio file.",
            type: "error",
          });
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setAudioPreviewUrl(url);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"],
    },
    maxFiles: 1,
    maxSize: 1024 * 1024 * 1024,
    multiple: false,
  });

  const handleStartPipeline = async () => {
    if (!selectedFile) return;

    try {
      // R2 Uploading
      
      const presigned = await getPresignedUploadUrl(
        selectedFile.name,
        selectedFile.type || "audio/mpeg",
        selectedFile.size
      );

      if (presigned.statusCode === 403) {
        setStatus("idle");
        toast.add({
          title: "Sign in required",
          description: "Please sign in to upload and transcribe audio.",
          type: "error",
        });
        router.push("/login");
        return;
      }

      if (!presigned.success || !presigned.uploadUrl || !presigned.fileKey) {
        setStatus("error");
        toast.add({
          title: "Upload authorization failed",
          description: presigned.error || "Failed to secure upload signature.",
          type: "error",
        });
        return;
      }
      onExpandedChange?.(true);
      setStatus("uploading");
      setUploadProgress(0);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presigned.uploadUrl!);
        xhr.setRequestHeader("Content-Type", selectedFile.type || "audio/mpeg");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            resolve();
          } else {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during Cloudflare R2 upload"));
        };

        xhr.send(selectedFile);
      });

      setStatus("processing");
      setPipelineStage("QUEUED");

      const taskRes = await startAudioTranscription(
        presigned.fileKey,
        selectedFile.name,
        selectedLanguage
      );

      if (!taskRes.success || !taskRes.taskId) {
        setStatus("error");
        toast.add({
          title: "Pipeline dispatch failed",
          description: taskRes.error || "Failed to trigger transcription.",
          type: "error",
        });
        return;
      }

      const taskId = taskRes.taskId;
      setActiveTaskId(taskId);

      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        const check = await checkTranscriptionTask(taskId, presigned.fileKey);

        if (!check.success || check.status === "FAILED") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setStatus("error");
          toast.add({
            title: "Transcription error",
            description: check.error || "Gnani ASR transcription failed.",
            type: "error",
          });
          return;
        }

        if (check.status === "COMPLETED") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setStatus("completed");
          setCompletedResult({
            transcript: check.transcript || "",
            summary: check.summary || "",
            durationSeconds: check.durationSeconds,
            playbackUrl: check.playbackUrl,
            segments: check.segments || [],
          });
          toast.add({
            title: "Transcription ready!",
            description: "Gnani ASR transcript & AI summary generated.",
            type: "success",
          });
        } else if (check.lifecycleStage || check.status) {
          setPipelineStage(check.lifecycleStage || check.status || "IN_PROGRESS");
        }
      }, 10000);

    } catch (err: unknown) {
      setStatus("error");
      toast.add({
        title: "Processing error",
        description:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during processing.",
        type: "error",
      });
    }
  };

  if (status === "completed" && completedResult && selectedFile) {
    return (
      <ResultCard
        filename={selectedFile.name}
        transcript={completedResult.transcript}
        summary={completedResult.summary}
        durationSeconds={completedResult.durationSeconds}
        playbackUrl={completedResult.playbackUrl}
        segments={completedResult.segments}
        onReset={resetAll}
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
      {!selectedFile ? (
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
            or click to browse from device
          </p>

          <div className="mt-6 text-[11px] text-white/40 tracking-wide font-mono">
            MP3 • WAV • M4A • FLAC (Up to 1GB)
          </div>
        </div>
      ) : (
        <div className={`space-y-4 ${isExpanded ? "flex-1 flex flex-col justify-between" : ""}`}>
        
          <div className="space-y-3.5 shrink-0">
          
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white">
                  <FileAudio className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-white truncate max-w-[200px] sm:max-w-md">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetAll}
                disabled={isWorking}
                className={`p-1.5 rounded-lg text-white/50 transition ${
                  isWorking
                    ? "opacity-25 cursor-not-allowed pointer-events-none"
                    : "hover:text-white hover:bg-white/10 cursor-pointer"
                }`}
                title={isWorking ? "Cannot remove file while processing" : "Remove file"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

           
            {audioPreviewUrl && <AudioPlayer src={audioPreviewUrl} />}

      
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

          <div className="mt-auto pt-2 shrink-0 flex items-center gap-3">
            <button
              type="button"
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
                      ? "Synthesizing AI Summary with Gemini..."
                      : "Transcribing with Gnani ASR Neural Engine..."}
                  </span>
                </>
              ) : (
                <span>Upload &amp; Transcribe Audio</span>
              )}
            </button>

            {isWorking && (
              <button
                type="button"
                onClick={handleCancelPipeline}
                disabled={isCancelling}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs sm:text-sm font-medium text-rose-300 transition cursor-pointer active:scale-95 shrink-0"
                title="Cancel ongoing Gnani transcription job"
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4 text-rose-400" />
                )}
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>
      )}
    </GlassEffect>
  );
}
