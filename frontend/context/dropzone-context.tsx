"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { FileRejection } from "react-dropzone";
import { toast } from "@/components/ui/toast";
import { getPresignedUploadUrl } from "@/actions/upload";
import {
  startAudioTranscription,
  checkTranscriptionTask,
  cancelAudioTranscription,
  TranscriptSegment,
} from "@/actions/transcribe";

export type StepStatus =
  | "idle"
  | "requesting_url"
  | "uploading"
  | "uploaded"
  | "processing"
  | "completed"
  | "error";

export interface CompletedResult {
  transcript: string;
  summary: string;
  durationSeconds?: number;
  playbackUrl?: string;
  segments?: TranscriptSegment[];
}

interface DropzoneContextType {
  selectedFile: File | null;
  fileName: string | null;
  fileSize: number | null;
  audioPreviewUrl: string | null;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;

  status: StepStatus;
  uploadProgress: number;
  pipelineStage: string;
  activeTaskId: string | null;
  isCancelling: boolean;
  elapsedSeconds: number;
  isWorking: boolean;

  completedResult: CompletedResult | null;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;

  handleStartPipeline: () => Promise<void>;
  handleCancelPipeline: () => Promise<void>;
  resetAll: () => void;
  onDropFiles: (acceptedFiles: File[], fileRejections: FileRejection[]) => void;
}

const STORAGE_KEY = "gnani_dropzone_state_v1";

const DropzoneContext = createContext<DropzoneContextType | undefined>(
  undefined,
);

export function DropzoneProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");

  const [status, setStatus] = useState<StepStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineStage, setPipelineStage] = useState<string>("INITIALIZING");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedResult, setCompletedResult] =
    useState<CompletedResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingCheckInProgressRef = useRef(false);
  const activePollingTaskIdRef = useRef<string | null>(null);
  const hasNotifiedCompletionRef = useRef<string | null>(null);
  const isWorking =
    status === "requesting_url" ||
    status === "uploading" ||
    status === "processing";

  // Rehydrate completed result or active state from sessionStorage on browser mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.status === "completed" && parsed.completedResult) {
          setTimeout(() => {
            setStatus("completed");
            setCompletedResult(parsed.completedResult);
            setFileName(parsed.fileName || "recording.wav");
            setFileSize(parsed.fileSize || 0);
            setSelectedLanguage(parsed.selectedLanguage || "en-IN");
            setIsExpanded(true);
          }, 10);
        } else if (parsed.status === "processing" && parsed.activeTaskId) {
          // Resume monitoring active background task if refreshed
          setTimeout(() => {
            setStatus("processing");
            setActiveTaskId(parsed.activeTaskId);
            setActiveFileKey(parsed.activeFileKey || null);
            setFileName(parsed.fileName || "recording.wav");
            setFileSize(parsed.fileSize || 0);
            setSelectedLanguage(parsed.selectedLanguage || "en-IN");
            setPipelineStage(parsed.pipelineStage || "IN_PROGRESS");
            setIsExpanded(true);
          }, 10);
        }
      }
    } catch {
      // Storage unavailable or parsing error
    }
  }, []);

  // Save persistent state across page reloads & tabs
  useEffect(() => {
    try {
      if (status === "completed" && completedResult) {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            status: "completed",
            fileName,
            fileSize,
            selectedLanguage,
            completedResult,
            isExpanded: true,
          }),
        );
      } else if (status === "processing" && activeTaskId) {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            status: "processing",
            activeTaskId,
            activeFileKey,
            fileName,
            fileSize,
            selectedLanguage,
            pipelineStage,
            isExpanded: true,
          }),
        );
      } else if (status === "idle") {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage write error
    }
  }, [
    status,
    completedResult,
    fileName,
    fileSize,
    selectedLanguage,
    activeTaskId,
    activeFileKey,
    pipelineStage,
    isExpanded,
  ]);

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

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    activePollingTaskIdRef.current = null;
    isPollingCheckInProgressRef.current = false;
  }, []);

  const resetAll = useCallback(() => {
    stopPolling();
    hasNotifiedCompletionRef.current = null;
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setSelectedFile(null);
    setFileName(null);
    setFileSize(null);
    setAudioPreviewUrl(null);
    setStatus("idle");
    setUploadProgress(0);
    setPipelineStage("INITIALIZING");
    setActiveTaskId(null);
    setActiveFileKey(null);
    setCompletedResult(null);
    setIsExpanded(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, [audioPreviewUrl, stopPolling]);

  const handleCancelPipeline = useCallback(async () => {
    stopPolling();

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
  }, [activeTaskId, resetAll, stopPolling]);

  const onDropFiles = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      resetAll();

      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          toast.add({
            title: "File too large",
            description:
              "Audio exceeds the 1GB limit. Please upload a smaller file.",
            type: "error",
          });
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          toast.add({
            title: "Invalid file format",
            description:
              "Please drop a valid audio file (.mp3, .wav, .m4a, .flac).",
            type: "error",
          });
        } else {
          toast.add({
            title: "Upload rejected",
            description:
              rejection.errors[0]?.message || "Could not read audio file.",
            type: "error",
          });
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        setFileName(file.name);
        setFileSize(file.size);
        const url = URL.createObjectURL(file);
        setAudioPreviewUrl(url);
      }
    },
    [resetAll],
  );

  // Resume or start polling for transcription task completion
  const startPolling = useCallback(
    (taskId: string, fileKey: string) => {
      if (activePollingTaskIdRef.current === taskId && pollIntervalRef.current) {
        return;
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      activePollingTaskIdRef.current = taskId;

      const poll = async () => {
        if (isPollingCheckInProgressRef.current) return;
        if (activePollingTaskIdRef.current !== taskId) return;
        isPollingCheckInProgressRef.current = true;

        try {
          const check = await checkTranscriptionTask(taskId, fileKey);

          if (activePollingTaskIdRef.current !== taskId) return;

          if (!check.success || check.status === "FAILED") {
            stopPolling();
            setStatus("error");
            toast.add({
              title: "Transcription error",
              description: check.error || "Gnani ASR transcription failed.",
              type: "error",
            });
            return;
          }

          if (check.status === "COMPLETED") {
            stopPolling();

            // Visually transition through SUMMARIZING before completing
            setPipelineStage("SUMMARIZING");

            setTimeout(() => {
              setStatus("completed");
              setCompletedResult({
                transcript: check.transcript || "",
                summary: check.summary || "",
                durationSeconds: check.durationSeconds,
                playbackUrl: check.playbackUrl,
                segments: check.segments || [],
              });

              if (hasNotifiedCompletionRef.current !== taskId) {
                hasNotifiedCompletionRef.current = taskId;
                toast.add({
                  title: "Transcription ready!",
                  description: "Gnani ASR transcript & AI summary generated.",
                  type: "success",
                });
              }
            }, 1000);
          } else if (check.lifecycleStage || check.status) {
            setPipelineStage(check.lifecycleStage || check.status || "IN_PROGRESS");
          }
        } catch (err) {
          console.error("Transcription polling error:", err);
        } finally {
          isPollingCheckInProgressRef.current = false;
        }
      };

      // Poll every 3 seconds to catch the summarization stage promptly
      pollIntervalRef.current = setInterval(poll, 3000);
    },
    [stopPolling],
  );

  // If page was refreshed during processing, resume polling
  useEffect(() => {
    if (status === "processing" && activeTaskId && activeFileKey) {
      startPolling(activeTaskId, activeFileKey);
    }
  }, [status, activeTaskId, activeFileKey, startPolling]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleStartPipeline = useCallback(async () => {
    if (!selectedFile) return;

    try {
      const presigned = await getPresignedUploadUrl(
        selectedFile.name,
        selectedFile.type || "audio/mpeg",
        selectedFile.size,
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

      setIsExpanded(true);
      setStatus("uploading");
      setUploadProgress(0);
      setActiveFileKey(presigned.fileKey);

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
        selectedLanguage,
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
      startPolling(taskId, presigned.fileKey);
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
  }, [selectedFile, selectedLanguage, router, startPolling]);

  return (
    <DropzoneContext.Provider
      value={{
        selectedFile,
        fileName,
        fileSize,
        audioPreviewUrl,
        selectedLanguage,
        setSelectedLanguage,
        status,
        uploadProgress,
        pipelineStage,
        activeTaskId,
        isCancelling,
        elapsedSeconds,
        isWorking,
        completedResult,
        isExpanded,
        setIsExpanded,
        handleStartPipeline,
        handleCancelPipeline,
        resetAll,
        onDropFiles,
      }}
    >
      {children}
    </DropzoneContext.Provider>
  );
}

export function useDropzoneContext() {
  const context = useContext(DropzoneContext);
  if (!context) {
    throw new Error(
      "useDropzoneContext must be used within a DropzoneProvider",
    );
  }
  return context;
}
