"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AudioDropzone } from "./dropzone";
import { useDropzoneContext } from "@/context/dropzone-context";

export function Hero() {
  const { isExpanded, setIsExpanded } = useDropzoneContext();

  return (
    <div
      className={`w-full mx-auto transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExpanded
          ? "max-w-6xl py-1 lg:py-2 -mt-4 lg:-mt-8 mb-2"
          : "max-w-6xl py-8 lg:py-16 mt-0 mb-0"
      }`}
    >
      <div
        className={`flex flex-col lg:flex-row items-center w-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExpanded ? "gap-0" : "gap-8 lg:gap-12"
        }`}
      >
        <div
          className={`flex flex-col justify-center text-left transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
            isExpanded
              ? "w-0 max-w-0 opacity-0 -translate-x-20 pointer-events-none p-0 m-0"
              : "w-full lg:w-1/2 max-w-xl opacity-100 translate-x-0 pr-4 lg:pr-8"
          }`}
        >
          <div className="w-full lg:w-[460px] xl:w-[520px] shrink-0 transition-opacity duration-500">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-[1.1]">
              Audio notes, <br />
              <span className="text-white/60">distilled to clarity.</span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-white/70 max-w-lg leading-relaxed font-normal">
              Upload voice recordings of any length. Get clean transcripts powered by Gnani speech recognition and concise summaries with actionable takeaways.
            </p>

            <div className="mt-8 flex items-center gap-6">
              <Link
                href="/architecture"
                className="group inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                <span>How my pipeline works</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: AudioDropzone & Final Results (smoothly expands to occupy 100% width) */}
        <div
          className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isExpanded ? "w-full lg:w-full" : "w-full lg:w-1/2"
          }`}
        >
          <AudioDropzone
            isExpanded={isExpanded}
            onExpandedChange={setIsExpanded}
          />
        </div>
      </div>
    </div>
  );
}

export default Hero;
