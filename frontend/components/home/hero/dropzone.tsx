"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  FileAudio,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { GlassEffect } from "@/components/liquid";
import { AudioPlayer } from "./audio-player";
import { LanguageDropdown } from "./language-dropdown";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function AudioDropzone() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setErrorMessage(null);

      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setErrorMessage("Audio exceeds 100MB limit.");
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setErrorMessage("Please drop a valid audio file (.mp3, .wav, .m4a).");
        } else {
          setErrorMessage(rejection.errors[0]?.message || "Could not read audio file.");
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
    maxSize: 100 * 1024 * 1024,
    multiple: false,
  });

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setSelectedFile(null);
    setAudioPreviewUrl(null);
    setErrorMessage(null);
  };

  const handleStartTranscription = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <GlassEffect className="w-full rounded-3xl border border-white/20 p-6 sm:p-7 shadow-[0_24px_48px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mb-4 flex items-center justify-between rounded-xl border border-rose-400/30 bg-rose-500/20 px-3 py-2.5 text-xs text-white"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-300" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-white/10 rounded transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            MP3 • WAV • M4A • FLAC (Up to 100MB)
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
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
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

          <button
            type="button"
            onClick={handleStartTranscription}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs sm:text-sm font-semibold text-neutral-950 hover:bg-white/90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-2 shadow-md"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-neutral-950" />
                <span>Transcribing...</span>
              </>
            ) : (
              <span>Transcribe Audio</span>
            )}
          </button>
        </div>
      )}
    </GlassEffect>
  );
}
