"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { GlassEffect } from "@/components/liquid";
import { toast } from "@/components/ui/toast";
import type { TranscriptionRecord } from "@/actions/transcriptions";

/* ─── helpers ─── */

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function langLabel(code: string): string {
  const map: Record<string, string> = {
    "en-IN": "English (IN)",
    "hi-IN": "Hindi",
    "kn-IN": "Kannada",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "ml-IN": "Malayalam",
    "mr-IN": "Marathi",
    "bn-IN": "Bengali",
    "gu-IN": "Gujarati",
    "pa-IN": "Punjabi",
    en: "English",
  };
  return map[code] ?? code;
}

function downloadTxt(text: string, filename: string, suffix: string) {
  if (!text.trim()) return;
  const base = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}_${suffix}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── copy button (text only, no icons) ─── */

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.add({
      title: "Copied",
      description: `${label} copied to clipboard.`,
      type: "success",
    });
  };
  return (
    <button
      type="button"
      onClick={handle}
      className="px-3 py-1 rounded-lg border border-white/15 bg-white/[0.07] hover:bg-white/15 text-sm font-medium text-white/70 hover:text-white transition-all cursor-pointer active:scale-95"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ─── download button (text only, no icons) ─── */

function DownloadBtn({
  text,
  filename,
  suffix,
}: {
  text: string;
  filename: string;
  suffix: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        downloadTxt(text, filename, suffix);
        toast.add({
          title: "Download started",
          description: `${suffix} saved as .txt`,
          type: "success",
        });
      }}
      title={`Download ${suffix} as .txt`}
      className="px-3 py-1 rounded-lg border border-white/15 bg-white/[0.07] hover:bg-white/15 text-sm font-medium text-white/70 hover:text-white transition-all cursor-pointer active:scale-95"
    >
      Download
    </button>
  );
}

/* ─── dialog content with GlassEffect ─── */

function TranscriptionDialog({
  rec,
  open,
  onClose,
}: {
  rec: TranscriptionRecord;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="!max-w-4xl w-full p-0 border-0 bg-transparent shadow-none ring-0 outline-none"
      >
        <GlassEffect className="w-full rounded-2xl sm:rounded-3xl border border-white/25 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl overflow-hidden flex flex-col text-white">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
            <div className="min-w-0 pr-4">
              <DialogTitle className="text-base sm:text-lg font-semibold text-white/90 truncate leading-tight">
                {rec.filename}
              </DialogTitle>
              <p className="text-sm text-white/50 mt-1 font-normal font-mono truncate">
                {formatDate(rec.created_at)}&ensp;·&ensp;
                {formatDuration(rec.duration_seconds)}&ensp;·&ensp;
                {langLabel(rec.language_code)}
              </p>
            </div>
            <DialogClose
              render={
                <button
                  type="button"
                  className="shrink-0 px-3.5 py-1.5 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.14] text-sm font-medium text-white/70 hover:text-white transition-all cursor-pointer active:scale-95"
                />
              }
            >
              Close
            </DialogClose>
          </div>

          {/* Body: side-by-side panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10 max-h-[65vh] overflow-hidden">
            {/* AI Summary */}
            <div className="flex flex-col p-5 sm:p-6 gap-3 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-base font-semibold text-white/85">
                  AI Summary
                </span>
                <div className="flex items-center gap-2">
                  <CopyBtn text={rec.summary} label="Summary" />
                  <DownloadBtn
                    text={rec.summary}
                    filename={rec.filename}
                    suffix="summary"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                <p className="text-base text-white/80 leading-relaxed whitespace-pre-wrap font-sans">
                  {rec.summary || "Summary unavailable."}
                </p>
              </div>
            </div>

            {/* Transcript */}
            <div className="flex flex-col p-5 sm:p-6 gap-3 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-base font-semibold text-white/85">
                  Transcript
                </span>
                <div className="flex items-center gap-2">
                  <CopyBtn text={rec.transcript} label="Transcript" />
                  <DownloadBtn
                    text={rec.transcript}
                    filename={rec.filename}
                    suffix="transcript"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                <p className="text-base text-white/80 leading-relaxed whitespace-pre-wrap font-sans">
                  {rec.transcript || "No speech detected."}
                </p>
              </div>
            </div>
          </div>
        </GlassEffect>
      </DialogContent>
    </Dialog>
  );
}

/* ─── individual row card (flat glass, no icons) ─── */

function TranscriptionRow({ rec }: { rec: TranscriptionRecord }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          w-full flex items-center gap-4 px-5 py-4 text-left
          rounded-2xl border border-white/12 bg-white/[0.05]
          hover:bg-white/[0.09] hover:border-white/20
          backdrop-blur-xl transition-all duration-200 cursor-pointer
          group
        "
      >
        {/* Left: meta */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white/90 truncate leading-snug group-hover:text-white transition-colors">
            {rec.filename}
          </p>
          <p className="text-sm text-white/45 mt-0.5 font-mono truncate">
            {formatDate(rec.created_at)}&ensp;·&ensp;
            {formatDuration(rec.duration_seconds)}&ensp;·&ensp;
            {langLabel(rec.language_code)}
          </p>
        </div>

        {/* Right: preview pill */}
        <span className="shrink-0 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-1.5 text-sm text-white/50 group-hover:text-white/80 group-hover:border-white/20 transition-all">
          View
        </span>
      </button>

      <TranscriptionDialog
        rec={rec}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/* ─── list with empty / error states ─── */

interface Props {
  records: TranscriptionRecord[] | null;
  error: string | null;
}

export function TranscriptionList({ records, error }: Props) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <p className="text-base text-white/55">{error}</p>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
        <p className="text-base font-medium text-white/65">
          No transcriptions yet
        </p>
        <p className="text-sm text-white/40">
          Upload an audio file from the Dashboard to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {records.map((rec) => (
        <TranscriptionRow key={rec.id} rec={rec} />
      ))}
    </div>
  );
}
