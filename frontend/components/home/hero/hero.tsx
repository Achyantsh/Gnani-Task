"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AudioDropzone } from "./dropzone";

export function Hero() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <div className="lg:col-span-6 flex flex-col justify-center text-left">
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

        <div className="lg:col-span-6 w-full">
          <AudioDropzone />
        </div>
      </div>
    </div>
  );
}

export default Hero;
