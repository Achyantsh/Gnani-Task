"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Languages, ChevronDown, Check } from "lucide-react";

export const SUPPORTED_LANGUAGES = [
  { code: "en-IN", name: "English (India)" },
  { code: "hi-IN", name: "Hindi (हिंदी)" },
  { code: "ta-IN", name: "Tamil (தமிழ்)" },
  { code: "te-IN", name: "Telugu (తెలుగు)" },
  { code: "kn-IN", name: "Kannada (ಕನ್ನಡ)" },
  { code: "bn-IN", name: "Bengali (বাংলা)" },
  { code: "mr-IN", name: "Marathi (मराठी)" },
  { code: "gu-IN", name: "Gujarati (ગુજરાતી)" },
];

interface LanguageDropdownProps {
  value: string;
  onChange: (val: string) => void;
}

export function LanguageDropdown({ value, onChange }: LanguageDropdownProps) {
  const selectedOption =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === value) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className="w-full flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.1] px-3.5 py-2.5 text-xs text-white backdrop-blur-md transition-all cursor-pointer outline-none select-none"
      >
        <div className="flex items-center gap-2">
          <Languages className="h-3.5 w-3.5 text-sky-300" />
          <span className="text-white/60">Language:</span>
          <span className="font-medium text-white">{selectedOption.name}</span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-white/60 transition-transform duration-200" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        style={{ width: "var(--anchor-width)" }}
        className="w-(--anchor-width) max-h-56 overflow-y-auto rounded-2xl border border-white/20 bg-[#070d24]/95 p-1.5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10"
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = lang.code === value;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => onChange(lang.code)}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                isSelected
                  ? "bg-white/20 text-white font-medium shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10 focus:bg-white/15 focus:text-white"
              }`}
            >
              <span>{lang.name}</span>
              {isSelected && <Check className="h-3.5 w-3.5 text-sky-300 ml-auto" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
