import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use AbortController with no timeout for long-lived SSE connections
  const controller = new AbortController();
  // Don't abort - let the connection stay open indefinitely
  // The client will close when the user navigates away

  const upstream = await fetch(`${FASTAPI_URL}/events/${userId}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
    signal: controller.signal,
    // Disable timeout for streaming responses
    // @ts-ignore - Next.js extends fetch with duplex option for streaming
    duplex: "half",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Event stream unavailable" },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
