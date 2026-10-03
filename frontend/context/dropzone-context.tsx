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
  | "transcribing"
  | "summarizing"
  | "completed"
  | "error";

export type PipelinePhase =
  | "idle"
  | "upload"
  | "transcribing"
  | "summarizing"
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
  pipelinePhase: PipelinePhase;
  uploadProgress: number;
  transcriptionProgress: number;
  summarizingProgress: number;
  pipelineStage: string;
  activeTaskId: string | null;
  isCancelling: boolean;
  elapsedSeconds: number;
  isWorking: boolean;
  isTranscribing: boolean;
  isSummarizing: boolean;

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
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [summarizingProgress, setSummarizingProgress] = useState(0);
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
    status === "processing" ||
    status === "transcribing" ||
    status === "summarizing";

  const isTranscribing =
    status === "transcribing" ||
    (status === "processing" &&
      pipelineStage?.toUpperCase() !== "SUMMARIZING" &&
      pipelineStage?.toUpperCase() !== "COMPLETED");

  const isSummarizing =
    status === "summarizing" ||
    ((status === "processing" || status === "transcribing") &&
      pipelineStage?.toUpperCase() === "SUMMARIZING");

  // Rehydrate completed result or active state from sessionStorage on browser mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.status === "completed" && parsed.completedResult) {
          setTimeout(() => {
            setStatus("completed");
            setPipelinePhase("completed");
            setCompletedResult(parsed.completedResult);
            setFileName(parsed.fileName || "recording.wav");
            setFileSize(parsed.fileSize || 0);
            setSelectedLanguage(parsed.selectedLanguage || "en-IN");
            setTranscriptionProgress(100);
            setSummarizingProgress(100);
            setIsExpanded(true);
          }, 10);
        } else if (
          (parsed.status === "processing" ||
            parsed.status === "transcribing" ||
            parsed.status === "summarizing") &&
          parsed.activeTaskId
        ) {
          setTimeout(() => {
            const nextStatus: StepStatus =
              parsed.status === "summarizing" || parsed.pipelineStage === "SUMMARIZING"
                ? "summarizing"
                : "transcribing";
            setStatus(nextStatus);
            setPipelinePhase(nextStatus === "summarizing" ? "summarizing" : "transcribing");
            setActiveTaskId(parsed.activeTaskId);
            setActiveFileKey(parsed.activeFileKey || null);
            setFileName(parsed.fileName || "recording.wav");
            setFileSize(parsed.fileSize || 0);
            setSelectedLanguage(parsed.selectedLanguage || "en-IN");
            setPipelineStage(parsed.pipelineStage || "IN_PROGRESS");
            setTranscriptionProgress(parsed.transcriptionProgress || 15);
            setSummarizingProgress(parsed.summarizingProgress || 0);
            setElapsedSeconds(parsed.elapsedSeconds || 0);
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
            pipelinePhase: "completed",
            fileName,
            fileSize,
            selectedLanguage,
            completedResult,
            isExpanded: true,
          }),
        );
      } else if (isWorking && activeTaskId) {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            status,
            pipelinePhase,
            activeTaskId,
            activeFileKey,
            fileName,
            fileSize,
            selectedLanguage,
            pipelineStage,
            transcriptionProgress,
            summarizingProgress,
            elapsedSeconds,
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
    pipelinePhase,
    completedResult,
    fileName,
    fileSize,
    selectedLanguage,
    activeTaskId,
    activeFileKey,
    pipelineStage,
    transcriptionProgress,
    summarizingProgress,
    elapsedSeconds,
    isExpanded,
    isWorking,
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

  // Smooth persistent progress ticker during transcription phase (5% -> 88%)
  useEffect(() => {
    if (!isTranscribing) {
      return;
    }

    const timer = setInterval(() => {
      setTranscriptionProgress((current) => {
        if (current >= 88) return current;
        const remaining = 88 - current;
        const inc = remaining > 20 ? Math.random() * 2.5 + 0.5 : Math.random() * 0.7;
        return Math.min(Math.round(current + inc), 88);
      });
    }, 900);

    return () => clearInterval(timer);
  }, [isTranscribing, isSummarizing, status]);

  // Smooth persistent progress ticker during summarizing phase (0% -> 97%)
  useEffect(() => {
    let completionTimer: NodeJS.Timeout | null = null;

    if (!isSummarizing) {
      if (status === "completed") {
        completionTimer = setTimeout(() => {
          setSummarizingProgress(100);
        }, 0);
      }

      return () => {
        if (completionTimer) clearTimeout(completionTimer);
      };
    }

    const timer = setInterval(() => {
      setSummarizingProgress((current) => {
        if (current >= 97) return current;
        const remaining = 97 - current;
        const inc = remaining > 20 ? Math.random() * 5 + 2 : Math.random() * 1.5;
        return Math.min(Math.round(current + inc), 97);
      });
    }, 450);

    return () => clearInterval(timer);
  }, [isSummarizing, status]);

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
    setPipelinePhase("idle");
    setUploadProgress(0);
    setTranscriptionProgress(0);
    setSummarizingProgress(0);
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
            setPipelinePhase("error");
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
            setStatus("summarizing");
            setPipelinePhase("summarizing");
            setPipelineStage("SUMMARIZING");
            setTranscriptionProgress(100);

            setTimeout(() => {
              setStatus("completed");
              setPipelinePhase("completed");
              setPipelineStage("COMPLETED");
              setSummarizingProgress(100);
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
            const rawStage = (check.lifecycleStage || check.status || "IN_PROGRESS").toUpperCase();
            setPipelineStage(rawStage);
            if (rawStage === "SUMMARIZING") {
              setStatus("summarizing");
              setPipelinePhase("summarizing");
              setTranscriptionProgress(100);
            } else {
              setStatus("transcribing");
              setPipelinePhase("transcribing");
            }
          }
        } catch (err) {
          console.error("Transcription polling error:", err);
        } finally {
          isPollingCheckInProgressRef.current = false;
        }
      };

      // Initial instant check
      poll();

      // Poll every 3.5 seconds to track batch lifecycle promptly as per architecture
      pollIntervalRef.current = setInterval(poll, 20000);
    },
    [stopPolling],
  );

  // If page was refreshed during processing, resume polling
  useEffect(() => {
    if (
      (status === "processing" || status === "transcribing" || status === "summarizing") &&
      activeTaskId &&
      activeFileKey
    ) {
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
        setPipelinePhase("idle");
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
        setPipelinePhase("error");
        toast.add({
          title: "Upload authorization failed",
          description: presigned.error || "Failed to secure upload signature.",
          type: "error",
        });
        return;
      }

      setIsExpanded(true);
      setStatus("uploading");
      setPipelinePhase("upload");
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

      setStatus("transcribing");
      setPipelinePhase("transcribing");
      setPipelineStage("QUEUED");
      setTranscriptionProgress(5);

      const taskRes = await startAudioTranscription(
        presigned.fileKey,
        selectedFile.name,
        selectedLanguage,
      );

      if (!taskRes.success || !taskRes.taskId) {
        setStatus("error");
        setPipelinePhase("error");
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
      setPipelinePhase("error");
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
        pipelinePhase,
        uploadProgress,
        transcriptionProgress,
        summarizingProgress,
        pipelineStage,
        activeTaskId,
        isCancelling,
        elapsedSeconds,
        isWorking,
        isTranscribing,
        isSummarizing,
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
