import { getTranscriptions } from "@/actions/transcriptions";
import { TranscriptionList } from "@/components/transcriptions/transcription-list";
import { NewAudioButton } from "@/components/transcriptions/new-audio-button";
import { FileAudio } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TranscriptionsPage() {
  const { data, error } = await getTranscriptions();

  return (
    <div className="flex min-h-screen flex-col font-sans text-white">
      <main className="flex-1 px-4 pt-28 pb-20 sm:px-6 sm:pt-36 sm:pb-28 lg:px-8">
        <div className="mx-auto max-w-4xl">

          <div className="flex items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/[0.08] backdrop-blur-md">
                <FileAudio className="h-5 w-5 text-white/70" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white/90 leading-tight">
                  Transcriptions
                </h1>
                {data && data.length > 0 && (
                  <p className="text-[12px] text-white/45 mt-0.5">
                    {data.length} recording{data.length !== 1 ? "s" : ""} processed
                  </p>
                )}
              </div>
            </div>

            <NewAudioButton/>
          </div>

          {/* ── List ── */}
          <TranscriptionList records={data} error={error} />
        </div>
      </main>
    </div>
  );
}
