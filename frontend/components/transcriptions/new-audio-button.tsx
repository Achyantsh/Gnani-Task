"use client";

import { useRouter } from "next/navigation";
import { useDropzoneContext } from "@/context/dropzone-context";

export function NewAudioButton() {
  const { resetAll } = useDropzoneContext();
  const router = useRouter();

  const handleClick = () => {
    resetAll();          // clears existing transcriptions state if present any
    router.push("/");    // go to the dashboard for dropzone
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="
        relative overflow-hidden shrink-0
        flex items-center gap-2 rounded-xl
        border border-white/15 bg-white/[0.07] hover:bg-white/[0.13]
        px-4 py-2 text-sm font-semibold text-white/75 hover:text-white
        transition-all duration-200 cursor-pointer backdrop-blur-md
        active:scale-95
      "
    >
      <span
        className="pointer-events-none absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-liquid"
        aria-hidden
      />
      <span className="relative z-10">+ New Audio</span>
    </button>
    
  );
}
