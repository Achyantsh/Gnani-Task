"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import {
  Upload,
  FileAudio,
  X,
  Loader2,
  CheckCircle2,
  CloudUpload,
} from "lucide-react";
import { GlassEffect } from "@/components/liquid";
import { AudioPlayer } from "./audio-player";
import { LanguageDropdown } from "./language-dropdown";
import { getPresignedUploadUrl } from "@/actions/upload";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

type UploadStatus =
  | "idle"
  | "requesting_url"
  | "uploading"
  | "uploaded"
  | "error";

export function AudioDropzone() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [, setUploadedFileKey] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  const resetUploadState = () => {
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadedFileKey(null);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      resetUploadState();

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
      "audio/*": [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".webm"],
    },
    maxFiles: 1,
    maxSize: 1024 * 1024 * 1024, // 1GB
    multiple: false,
  });

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setSelectedFile(null);
    setAudioPreviewUrl(null);
    resetUploadState();
  };

  const handleStartUploadAndTranscription = async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus("requesting_url");

      const presigned = await getPresignedUploadUrl(
        selectedFile.name,
        selectedFile.type || "audio/mpeg",
        selectedFile.size
      );

      if (presigned.statusCode === 403) {
        setUploadStatus("idle");
        toast.add({
          title: "Sign in required",
          description: "Please sign in to upload and transcribe audio.",
          type: "error",
        });
        router.push("/login");
        return;
      }

      if (!presigned.success || !presigned.uploadUrl || !presigned.fileKey) {
        setUploadStatus("error");
        toast.add({
          title: "Upload failed",
          description: presigned.error || "Failed to request upload signature.",
          type: "error",
        });
        return;
      }

      setUploadStatus("uploading");
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
            setUploadStatus("uploaded");
            setUploadedFileKey(presigned.fileKey!);
            toast.add({
              title: "Upload complete",
              description: `${selectedFile.name} successfully uploaded to Cloudflare R2.`,
              type: "success",
            });
            resolve();
          } else {
            setUploadStatus("error");
            toast.add({
              title: "Upload rejected",
              description: `Cloudflare R2 returned HTTP ${xhr.status}. Check your CORS and bucket settings.`,
              type: "error",
            });
            reject(new Error(`HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          setUploadStatus("error");
          toast.add({
            title: "Network error",
            description: "Failed to upload to Cloudflare R2. Please verify your bucket CORS settings.",
            type: "error",
          });
          reject(new Error("Network / CORS error during upload"));
        };

        xhr.send(selectedFile);
      });
    } catch (err: unknown) {
      setUploadStatus("error");
      toast.add({
        title: "Upload error",
        description:
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during upload.",
        type: "error",
      });
    }
  };

  const isUploading =
    uploadStatus === "requesting_url" || uploadStatus === "uploading";

  return (
    <GlassEffect className="w-full rounded-3xl border border-white/20 p-6 sm:p-7 shadow-[0_24px_48px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
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
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white">
                <FileAudio className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-white truncate max-w-[200px] sm:max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-white/50 mt-0.5">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={isUploading}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-30"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {audioPreviewUrl && <AudioPlayer src={audioPreviewUrl} />}

          <LanguageDropdown
            value={selectedLanguage}
            onChange={setSelectedLanguage}
          />

          {isUploading && (
            <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-3 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-xs text-white/80">
                <span className="flex items-center gap-1.5">
                  <CloudUpload className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
                  {uploadStatus === "requesting_url"
                    ? "Securing R2 upload signature..."
                    : `Uploading to Cloudflare R2...`}
                </span>
                <span className="font-mono text-[11px] text-sky-300">
                  {uploadProgress}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadStatus === "uploaded" && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-500/15 p-2.5 text-xs text-emerald-200 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Uploaded to Cloudflare R2 successfully!</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleStartUploadAndTranscription}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs sm:text-sm font-semibold text-neutral-950 hover:bg-white/90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-2 shadow-md"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-neutral-950" />
                <span>
                  {uploadStatus === "requesting_url"
                    ? "Preparing..."
                    : `Uploading (${uploadProgress}%)...`}
                </span>
              </>
            ) : uploadStatus === "uploaded" ? (
              <span>Proceed to Transcription</span>
            ) : (
              <span>Upload &amp; Transcribe Audio</span>
            )}
          </button>
        </div>
      )}
    </GlassEffect>
  );
}
