"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface TranscriptionRecord {
  id: string;
  user_id: string;
  filename: string;
  file_key: string;
  language_code: string;
  duration_seconds: number | null;
  transcript: string;
  summary: string;
  status: string;
  created_at: string;
}

export async function getTranscriptions(): Promise<{
  data: TranscriptionRecord[] | null;
  error: string | null;
}> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // server component — can ignore
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("transcriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as TranscriptionRecord[], error: null };
}
