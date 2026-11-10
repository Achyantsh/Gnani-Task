"use client";

import {
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
import { useSSE, type SSETranscriptionData } from "@/hooks/useSSE";

/** ---------- Types ---------- */

export type StepStatus =
  | "idle"
  | "requesting_url"
  | "uploading"
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

/** ---------- Constants ---------- */

const STORAGE_KEY = "gnani_dropzone_state_v1";

const GNANI_STAGE_RANKS: Record<string, number> = {
  INITIALIZING: 0,
  CREATED: 1,
  STARTING: 2,
  QUEUED: 3,
  DOWNLOADING: 4,
  IN_PROGRESS: 4,
  TRANSCRIBING: 4,
  FINALIZING: 5,
  SUMMARIZING: 6,
  COMPLETED: 7,
};

const POLL_INTERVAL_MS = 10_000;
const TRANSCRIPTION_PROGRESS_CEIL = 88;
const SUMMARIZING_PROGRESS_CEIL = 97;

/** ---------- Helpers ---------- */

function isActiveStatus(status: StepStatus): boolean {
  return [
    "requesting_url",
    "uploading",
    "processing",
    "transcribing",
    "summarizing",
  ].includes(status);
}

function derivePipelinePhase(status: StepStatus, pipelineStage: string): PipelinePhase {
  if (status === "completed") return "completed";
  if (status === "error") return "error";
  if (status === "summarizing" || pipelineStage.toUpperCase() === "SUMMARIZING")
    return "summarizing";
  if (status === "transcribing" || status === "processing") return "transcribing";
  if (status === "uploading") return "upload";
  return "idle";
}

function deriveIsTranscribing(status: StepStatus, pipelineStage: string): boolean {
  return (
    status === "transcribing" ||
    (status === "processing" &&
      pipelineStage.toUpperCase() !== "SUMMARIZING" &&
      pipelineStage.toUpperCase() !== "COMPLETED")
  );
}

function deriveIsSummarizing(status: StepStatus, pipelineStage: string): boolean {
  return (
    status === "summarizing" ||
    ((status === "processing" || status === "transcribing") &&
      pipelineStage.toUpperCase() === "SUMMARIZING")
  );
}

/** ---------- Custom Hooks ---------- */

function useElapsedTimer(isWorking: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isWorking) {
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      setTimeout(() => setElapsed(0), 10);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isWorking]);

  return elapsed;
}

function useSimulatedProgress(
  isActive: boolean,
  ceiling: number,
  intervalMs: number,
  baseIncrement: number,
  smallIncrement: number
): number {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= ceiling) return current;
        const remaining = ceiling - current;
        const inc = remaining > 20 ? Math.random() * baseIncrement + 0.5 : Math.random() * smallIncrement;
        return Math.min(Math.round(current + inc), ceiling);
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, ceiling, intervalMs, baseIncrement, smallIncrement]);

  return progress;
}

function usePersistedState<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      if (item) return JSON.parse(item);
    } catch {
      // ignore parse errors
    }
    return initialValue;
  });
  const isInitialized = useRef(false);

  useEffect(() => {
    isInitialized.current = true;
  }, []);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        if (isInitialized.current) {
          try {
            sessionStorage.setItem(key, JSON.stringify(newValue));
          } catch {
            // ignore write errors
          }
        }
        return newValue;
      });
    },
    [key]
  );

  return [storedValue, setValue] as const;
}

/** ---------- Context ---------- */

const DropzoneContext = createContext<DropzoneContextType | undefined>(undefined);

export function DropzoneProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // ---- File state ----
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");

  // ---- Pipeline state ----
  const [status, setStatus] = useState<StepStatus>("idle");
  const [pipelineStage, setPipelineStage] = useState("INITIALIZING");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [completedResult, setCompletedResult] = useState<CompletedResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // ---- Set transcription progress directly (for hydration) ----
  const setTranscriptionProgress = useCallback((val: number) => {
    // We can't directly set the simulated progress, but we can use it for initial hydration
    // This is a limitation of the hook-based approach; for now we'll use a ref workaround
  }, []);

  const setSummarizingProgress = useCallback((val: number) => {
    // Same as above
  }, []);

  // ---- SSE ----
  const [userId, setUserId] = useState<string | null>(null);
  const { lastEvent: sseEvent } = useSSE(userId);

  // ---- Refs for polling ----
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingCheckInProgressRef = useRef(false);
  const activePollingTaskIdRef = useRef<string | null>(null);
  const hasNotifiedCompletionRef = useRef<string | null>(null);

  // ---- Derived state ----
  const isWorking = isActiveStatus(status);
  const pipelinePhase = derivePipelinePhase(status, pipelineStage);
  const isTranscribing = deriveIsTranscribing(status, pipelineStage);
  const isSummarizing = deriveIsSummarizing(status, pipelineStage);

  // ---- Progress simulation ----
  const transcriptionProgress = useSimulatedProgress(
    isTranscribing,
    TRANSCRIPTION_PROGRESS_CEIL,
    900,
    2.5,
    0.7
  );

  const summarizingProgress = useSimulatedProgress(
    isSummarizing,
    SUMMARIZING_PROGRESS_CEIL,
    450,
    5,
    1.5
  );

  // Auto-complete summarizing progress when done
  useEffect(() => {
    if (status === "completed" && summarizingProgress < 100) {
      const timer = setTimeout(() => setSummarizingProgress(100), 0);
      return () => clearTimeout(timer);
    }
  }, [status, summarizingProgress, setSummarizingProgress]);

  // ---- Elapsed timer ----
  const elapsedSeconds = useElapsedTimer(isWorking);

  // ---- Persisted state ----
  const [persistedState, setPersistedState] = usePersistedState<{
    status: StepStatus;
    pipelinePhase: PipelinePhase;
    completedResult?: CompletedResult;
    activeTaskId?: string;
    activeFileKey?: string;
    fileName?: string;
    fileSize?: number;
    selectedLanguage?: string;
    pipelineStage?: string;
    transcriptionProgress?: number;
    summarizingProgress?: number;
    elapsedSeconds?: number;
    isExpanded?: boolean;
  }>(STORAGE_KEY, {
    status: "idle",
    pipelinePhase: "idle",
  });

  // ---- Hydrate from sessionStorage on mount ----
  useEffect(() => {
    const { status: savedStatus, ...rest } = persistedState;

    if (savedStatus === "completed" && rest.completedResult) {
      const result: CompletedResult = rest.completedResult;
      setTimeout(() => {
        setStatus("completed");
        setPipelineStage("COMPLETED");
        setCompletedResult(result);
        setFileName(rest.fileName ?? "recording.wav");
        setFileSize(rest.fileSize ?? 0);
        setSelectedLanguage(rest.selectedLanguage ?? "en-IN");
        setTranscriptionProgress(100);
        setSummarizingProgress(100);
        setIsExpanded(true);
      }, 10);
    } else if (
      (savedStatus === "processing" ||
        savedStatus === "transcribing" ||
        savedStatus === "summarizing") &&
      rest.activeTaskId
    ) {
      const nextStatus: StepStatus =
        savedStatus === "summarizing" || rest.pipelineStage === "SUMMARIZING"
          ? "summarizing"
          : "transcribing";

      setTimeout(() => {
        setStatus(nextStatus);
        setActiveTaskId(rest.activeTaskId!);
        setActiveFileKey(rest.activeFileKey || null);
        setFileName(rest.fileName || "recording.wav");
        setFileSize(rest.fileSize || 0);
        setSelectedLanguage(rest.selectedLanguage || "en-IN");
        setPipelineStage(rest.pipelineStage || "STARTING");
        setTranscriptionProgress(rest.transcriptionProgress || 15);
        setSummarizingProgress(rest.summarizingProgress || 0);
        setIsExpanded(true);
      }, 10);
    }
  }, []);

  // ---- Persist state changes ----
  useEffect(() => {
    if (status === "completed" && completedResult) {
      setPersistedState({
        status: "completed",
        pipelinePhase: "completed",
        fileName: fileName ?? undefined,
        fileSize: fileSize ?? undefined,
        selectedLanguage: selectedLanguage ?? undefined,
        completedResult,
        isExpanded: true,
      });
    } else if (isWorking && activeTaskId) {
      setPersistedState({
        status,
        pipelinePhase,
        activeTaskId,
        activeFileKey: activeFileKey ?? undefined,
        fileName: fileName ?? undefined,
        fileSize: fileSize ?? undefined,
        selectedLanguage: selectedLanguage ?? undefined,
        pipelineStage,
        transcriptionProgress,
        summarizingProgress,
        elapsedSeconds,
        isExpanded: true,
      });
    } else if (status === "idle") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
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
    isWorking,
    setPersistedState,
  ]);

  // ---- SSE event handler ----
  useEffect(() => {
    if (!sseEvent) return;

    if (sseEvent.type === "transcription_completed" && sseEvent.task_id === activeTaskId) {
      const data = sseEvent.data as SSETranscriptionData | undefined;
      if (!data) return;

      queueMicrotask(() => {
        setStatus("summarizing");
        setPipelineStage("SUMMARIZING");
        setTranscriptionProgress(100);
      });

      setTimeout(() => {
        setStatus("completed");
        setPipelineStage("COMPLETED");
        setSummarizingProgress(100);
        setCompletedResult({
          transcript: data.transcript || "",
          summary: data.summary || "",
          durationSeconds: data.duration_seconds,
          playbackUrl: data.playback_url,
          segments: (data.segments as TranscriptSegment[]) || [],
        });

        if (hasNotifiedCompletionRef.current !== activeTaskId) {
          hasNotifiedCompletionRef.current = activeTaskId;
          toast.add({
            title: "Transcription ready!",
            description: "Gnani ASR transcript & AI summary generated.",
            type: "success",
          });
        }
      }, 1000);
    }
  }, [sseEvent, activeTaskId]);

  // ---- Get user ID for SSE ----
  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/user")
      .then((res) => res.ok && res.json())
      .then((data) => mounted && setUserId(data.user?.id || null))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // ---- Polling management ----
  const stopPolling = useCallback(() => {
    pollIntervalRef.current && clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = null;
    activePollingTaskIdRef.current = null;
    isPollingCheckInProgressRef.current = false;
  }, []);

  const resetAll = useCallback(() => {
    stopPolling();
    hasNotifiedCompletionRef.current = null;
    audioPreviewUrl && URL.revokeObjectURL(audioPreviewUrl);
    setSelectedFile(null);
    setFileName(null);
    setFileSize(null);
    setAudioPreviewUrl(null);
    setStatus("idle");
    setPipelineStage("INITIALIZING");
    setUploadProgress(0);
    setActiveTaskId(null);
    setActiveFileKey(null);
    setCompletedResult(null);
    setIsExpanded(false);
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
        const code = rejection.errors[0]?.code;

        if (code === "file-too-large") {
          toast.add({
            title: "File too large",
            description: "Audio exceeds the 1GB limit. Please upload a smaller file.",
            type: "error",
          });
        } else if (code === "file-invalid-type") {
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
        setFileName(file.name);
        setFileSize(file.size);
        setAudioPreviewUrl(URL.createObjectURL(file));
      }
    },
    [resetAll]
  );

  const handleStartPipeline = useCallback(async () => {
    if (!selectedFile || isWorking) return;

    setStatus("requesting_url");
    setPipelineStage("INITIALIZING");

    try {
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

      setIsExpanded(true);
      setStatus("uploading");
      setUploadProgress(0);
      setActiveFileKey(presigned.fileKey);

      // Upload to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presigned.uploadUrl!);
        xhr.setRequestHeader("Content-Type", selectedFile.type || "audio/mpeg");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
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

        xhr.onerror = () => reject(new Error("Network error during Cloudflare R2 upload"));
        xhr.send(selectedFile);
      });

      // Start transcription
      setStatus("transcribing");
      setPipelineStage("STARTING");
      setTranscriptionProgress(5);

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

      // Dedupe polling
      if (activePollingTaskIdRef.current === taskId && pollIntervalRef.current) {
        return;
      }

      stopPolling();
      activePollingTaskIdRef.current = taskId;
      const fileKey = presigned.fileKey;

      const poll = async () => {
        if (isPollingCheckInProgressRef.current) return;
        if (activePollingTaskIdRef.current !== taskId) return;
        isPollingCheckInProgressRef.current = true;

        try {
          const check = await checkTranscriptionTask(taskId, fileKey);

          if (activePollingTaskIdRef.current !== taskId) {
            isPollingCheckInProgressRef.current = false;
            return;
          }

          if (!check.success || check.status === "FAILED") {
            stopPolling();
            setStatus("error");
            toast.add({
              title: "Transcription error",
              description: check.error || "Gnani ASR transcription failed.",
              type: "error",
            });
            isPollingCheckInProgressRef.current = false;
            return;
          }

          if (check.status === "COMPLETED") {
            stopPolling();

            setStatus("summarizing");
            setPipelineStage("SUMMARIZING");
            setTranscriptionProgress(100);

            setTimeout(() => {
              setStatus("completed");
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

            isPollingCheckInProgressRef.current = false;
          } else if (check.lifecycleStage || check.status) {
            const rawStage = (check.lifecycleStage || check.status || "IN_PROGRESS").toUpperCase();
            setPipelineStage((current) => {
              const currentRank = GNANI_STAGE_RANKS[current?.toUpperCase()] ?? 0;
              const nextRank = GNANI_STAGE_RANKS[rawStage] ?? 4;
              return nextRank >= currentRank ? rawStage : current;
            });

            if (rawStage === "SUMMARIZING") {
              setStatus("summarizing");
              setTranscriptionProgress(100);
            } else {
              setStatus("transcribing");
            }

            isPollingCheckInProgressRef.current = false;
          }
        } catch (err) {
          console.error("Transcription polling error:", err);
          isPollingCheckInProgressRef.current = false;
        }
      };

      poll();
      pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    } catch (err) {
      console.error("Audio pipeline error:", err);
      setStatus("error");
      toast.add({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "The audio pipeline could not be started.",
        type: "error",
      });
    }
  }, [selectedFile, selectedLanguage, isWorking, router, stopPolling]);

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
    throw new Error("useDropzoneContext must be used within a DropzoneProvider");
  }
  return context;
}