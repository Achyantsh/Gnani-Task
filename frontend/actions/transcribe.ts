"use server";

import { createClient } from "@/lib/supabase/server";

export interface TranscriptSegment {
  segment_id?: number;
  start_time: number;
  end_time: number;
  text: string;
  speaker_id?: number;
}

export interface TranscribeTaskResponse {
  success: boolean;
  taskId?: string;
  status?: string;
  lifecycleStage?: string;
  transcript?: string;
  summary?: string;
  durationSeconds?: number;
  playbackUrl?: string;
  error?: string;
  segments?: TranscriptSegment[];
  debugInfo?: Record<string, unknown>;
}

function getFastApiBaseUrl(): string {
  let url = process.env.FASTAPI_URL!;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, "");
}

export async function startAudioTranscription(
  fileKey: string,
  filename: string,
  languageCode: string = "en-IN"
): Promise<TranscribeTaskResponse> {

  try {
    let userId: string | undefined;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        userId = user.id;
      }
    } catch {
      // Unauthenticated or guest flow
    }

    if (!userId) {
      return {success: false}
    }

    const apiUrl = `${getFastApiBaseUrl()}/transcribe`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_key: fileKey,
        filename,
        language_code: languageCode,
        user_id: userId,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Transcription service error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();

    if (!data.success || !data.task_id) {
      return {
        success: false,
        error: data.error || "Failed to start transcription task in backend.",
      };
    }

    return {
      success: true,
      taskId: data.task_id,
      status: "STARTING",
      lifecycleStage: "CREATED",
    };
  } catch (error: unknown) {
    console.error("FastAPI startAudioTranscription error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not reach FastAPI backend.",
    };
  }
}

export async function checkTranscriptionTask(
  taskId: string,
  _providedFileKey?: string
): Promise<TranscribeTaskResponse> {
  try {
    const apiUrl = `${getFastApiBaseUrl()}/transcribe/${taskId}`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        taskId,
        error: `Status check failed (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();

    if (data.status === "FAILED") {
      return {
        success: false,
        taskId,
        status: "FAILED",
        lifecycleStage: "FAILED",
        error: data.error || "Gnani ASR transcription failed.",
      };
    }

    if (data.status === "COMPLETED") {
      return {
        success: true,
        taskId,
        status: "COMPLETED",
        lifecycleStage: "COMPLETED",
        transcript: data.transcript || "",
        summary: data.summary || "",
        durationSeconds: data.duration_seconds,
        playbackUrl: data.playback_url,
        segments: data.segments,
      };
    }

    return {
      success: true,
      taskId,
      status: data.status || "TRANSCRIBING",
      lifecycleStage: data.lifecycle_stage || data.status,
    };
  } catch (error: unknown) {
    console.error("FastAPI checkTranscriptionTask error:", error);
    return {
      success: false,
      taskId,
      error:
        error instanceof Error
          ? error.message
          : "Could not reach FastAPI backend for status update.",
    };
  }
}

export async function cancelAudioTranscription(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiUrl = `${getFastApiBaseUrl()}/transcribe/${taskId}/cancel`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: errText };
    }

    const data = await response.json();
    return { success: data.success ?? true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel transcription task.",
    };
  }
}