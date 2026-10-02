"use client";

import React, { useState } from "react";
import { GlassEffect } from "@/components/liquid";
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Layers,
  Play,
  Download,
} from "lucide-react";
import { AudioPlayer } from "./audio-player";
import { toast } from "@/components/ui/toast";
import { TranscriptSegment } from "@/actions/transcribe";

interface ResultCardProps {
  filename: string;
  transcript: string;
  summary: string;
  durationSeconds?: number;
  playbackUrl?: string;
  segments?: TranscriptSegment[];
  onReset: () => void;
  isExpanded?: boolean;
}

function formatDuration(secs?: number): string {
  if (!secs) return "0:00";
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.floor(secs % 60);
  return `${mins}m ${remainingSecs}s`;
}

function formatSegmentTime(secs: number): string {
  if (isNaN(secs) || secs < 0) return "0:00";
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.floor(secs % 60);
  return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
}

export function ResultCard({
  filename,
  transcript,
  summary,
  durationSeconds,
  playbackUrl,
  segments,
  onReset,
  isExpanded = true,
}: ResultCardProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedSegmentId, setCopiedSegmentId] = useState<number | null>(null);


  const hasSegments = Boolean(segments && segments.length > 0);
  const [transcriptMode, setTranscriptMode] = useState<"continuous" | "batches">(
    hasSegments ? "batches" : "continuous"
  );

  
  const [activeSeekTime, setActiveSeekTime] = useState<number | null>(null);

  const handleCopy = (type: "summary" | "transcript") => {
    const textToCopy = type === "summary" ? summary : transcript;
    navigator.clipboard.writeText(textToCopy);

    if (type === "summary") {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } else {
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    }

    toast.add({
      title: "Copied to clipboard",
      description: `${type === "summary" ? "Summary" : "Transcript"} copied.`,
      type: "success",
    });
  };

  const handleCopySegment = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSegmentId(index);
    setTimeout(() => setCopiedSegmentId(null), 2000);

    toast.add({
      title: "Segment copied",
      description: `Copied segment ${index + 1} to clipboard.`,
      type: "success",
    });
  };

  const handleSeekToSegment = (startTime: number) => {
    setActiveSeekTime(startTime);
  };

  const handleDownloadTxt = (type: "summary" | "transcript") => {
    const textToDownload = type === "summary" ? summary : transcript;
    if (!textToDownload || !textToDownload.trim()) {
      toast.add({
        title: "Nothing to download",
        description: `The ${type} is empty.`,
        type: "error",
      });
      return;
    }

    const baseName =
      filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") || "audio";
    const downloadName = `${baseName}_${type}.txt`;

    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      title: "Download started",
      description: `Saved as ${downloadName}`,
      type: "success",
    });
  };

  return (
    <GlassEffect
      className={`w-full rounded-3xl border border-white/25 shadow-[0_24px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${
        isExpanded
          ? "p-4 sm:p-5 lg:p-6 min-h-[58vh] lg:min-h-[75vh]"
          : "p-6 sm:p-7 min-h-0"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-white truncate max-w-[200px] sm:max-w-md">
              {filename}
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-white/60 mt-0.5">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3" />
                {formatDuration(durationSeconds)}
              </span>
             
              {hasSegments && (
                <>
                  <span>•</span>
                  <span className="text-sky-300 font-mono">
                    {segments?.length} Segments
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-3.5 py-1.5  font-medium text-white transition cursor-pointer active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>New Audio</span>
        </button>
      </div>

    
      {playbackUrl && (
        <div className="mb-3 shrink-0">
          <AudioPlayer src={playbackUrl} seekTime={activeSeekTime} />
        </div>
      )}

     
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 flex-1 min-h-0">
        
        <div className="flex flex-col rounded-2xl border border-white/15 bg-black/40 p-4 sm:p-5 backdrop-blur-xl min-h-[280px] lg:min-h-[380px] max-h-[60vh]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 text-white font-semibold  sm:text-sm">
              
              <span>AI Summary</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleCopy("summary")}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] text-white/80 hover:text-white transition cursor-pointer"
                title="Copy Summary"
              >
                {copiedSummary ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedSummary ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadTxt("summary")}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] text-white/80 hover:text-white transition cursor-pointer"
                title="Download Summary as .txt"
              >
                <Download className="h-3.5 w-3.5 " />
                {/* <span>Download</span> */}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2  text-white/90 leading-relaxed whitespace-pre-wrap font-sans space-y-2">
            {summary || "Summary unavailable."}
          </div>
        </div>

       
        <div className="flex flex-col rounded-2xl border border-white/15 bg-black/40 p-4 sm:p-5 backdrop-blur-xl min-h-[280px] lg:min-h-[380px] max-h-[60vh]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-white font-semibold  sm:text-sm mr-1">
                Transcript
              </span>
              {hasSegments && (
                <div className="inline-flex rounded-lg bg-white/10 p-0.5 border border-white/10 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTranscriptMode("batches")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                      transcriptMode === "batches"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    <Layers className="h-3 w-3" />
                    <span>Segments ({segments?.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranscriptMode("continuous")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                      transcriptMode === "continuous"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    <FileText className="h-3 w-3" />
                    <span>Paragraph</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleCopy("transcript")}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] text-white/80 hover:text-white transition cursor-pointer"
                title="Copy Full Transcript"
              >
                {copiedTranscript ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedTranscript ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadTxt("transcript")}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] text-white/80 hover:text-white transition cursor-pointer"
                title="Download Full Transcript as .txt"
              >
                <Download className="h-3.5 w-3.5" />
                {/* <span>Download</span> */}
              </button>
            </div>
          </div>

         
          {transcriptMode === "batches" && hasSegments ? (
            <div className="flex-1 overflow-y-auto pr-2 space-y-2.5">
              {segments?.map((seg, idx) => (
                <div
                  key={idx}
                  className="group rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 p-3 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      
                      <button
                        type="button"
                        onClick={() => handleSeekToSegment(seg.start_time)}
                        className="inline-flex items-center gap-1 font-mono text-sky-300 bg-sky-500/15 border border-sky-400/25 px-2 py-0.5 rounded-md hover:bg-sky-500/25 hover:border-sky-400/40 transition cursor-pointer"
                        title="Click to play from this timestamp"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        <span>
                          {formatSegmentTime(seg.start_time)} -{" "}
                          {formatSegmentTime(seg.end_time)}
                        </span>
                      </button>

                      {seg.speaker_id !== undefined && (
                        <span className="text-white/50 text-[10px] font-mono">
                          Speaker {seg.speaker_id}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopySegment(seg.text, idx)}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-white/50 hover:text-white rounded hover:bg-white/10 cursor-pointer"
                      title="Copy segment text"
                    >
                      {copiedSegmentId === idx ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  <p className="text-white/90 leading-relaxed font-sans">
                    {seg.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2  text-white/90 leading-relaxed whitespace-pre-wrap font-sans space-y-2">
              {transcript || "No speech detected in this recording."}
            </div>
          )}
        </div>
      </div>
    </GlassEffect>
  );
}
