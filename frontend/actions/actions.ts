'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

interface ActionUpdatePayload {
  user_status?: string
  title?: string
  description?: string
  person_or_party?: string
  due_date_text?: string
  due_at?: string
  payment_method?: string
  amount_minor_units?: number
  currency?: string
}

interface ActionCreatePayload {
  action_type: string
  title: string
  description?: string
  person_or_party?: string
  quantity_value?: number
  quantity_unit?: string
  amount_minor_units?: number
  currency?: string
  payment_method?: string
  due_date_text?: string
  due_at?: string
  evidence_quote?: string
  grounding_status?: string
}

interface TTSGeneratePayload {
  text: string
  language_code: string
  voice?: string
  speed?: number
  conversation_id?: string
}

interface TTSResponse {
  success: boolean
  audio_url?: string
  error?: string
  voice_used?: string
}

async function getFastAPIHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`
  }
  return headers
}

export async function listActionsServer(userId: string, status?: string) {
  const url = new URL(`${FASTAPI_URL}/actions`)
  if (userId) url.searchParams.set('user_id', userId)
  if (status) url.searchParams.set('status', status)

  console.log('[DEBUG] listActionsServer fetching:', url.toString())
  try {
    const res = await fetch(url, { headers: await getFastAPIHeaders() })
    console.log('[DEBUG] listActionsServer response:', res.status, res.ok)
    if (!res.ok) {
      return { actions: [], count: 0, error: `HTTP ${res.status}` }
    }
    return res.json()
  } catch (e) {
    console.error('[DEBUG] listActionsServer fetch error:', e)
    return { actions: [], count: 0, error: `Fetch failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function getActionServer(actionId: string, userId: string) {
  const url = new URL(`${FASTAPI_URL}/actions/${actionId}`)
  if (userId) url.searchParams.set('user_id', userId)

  const res = await fetch(url, { headers: await getFastAPIHeaders() })
  if (!res.ok) {
    return { error: `HTTP ${res.status}` }
  }
  return res.json()
}

export async function updateActionServer(actionId: string, userId: string, updates: ActionUpdatePayload) {
  const res = await fetch(`${FASTAPI_URL}/actions/${actionId}`, {
    method: 'PATCH',
    headers: await getFastAPIHeaders(),
    body: JSON.stringify({ ...updates, user_id: userId }),
  })
  if (!res.ok) {
    return { error: `HTTP ${res.status}` }
  }
  revalidatePath('/transcriptions')
  revalidatePath('/inbox')
  return res.json()
}

export async function createActionServer(userId: string, conversationId: string, action: ActionCreatePayload) {
  const res = await fetch(`${FASTAPI_URL}/actions`, {
    method: 'POST',
    headers: await getFastAPIHeaders(),
    body: JSON.stringify({ ...action, user_id: userId, conversation_id: conversationId }),
  })
  if (!res.ok) {
    return { error: `HTTP ${res.status}` }
  }
  revalidatePath('/inbox')
  return res.json()
}

export async function generateTTS(payload: TTSGeneratePayload): Promise<TTSResponse> {
  const res = await fetch(`${FASTAPI_URL}/tts/generate`, {
    method: 'POST',
    headers: await getFastAPIHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    return { success: false, error: `HTTP ${res.status}` }
  }
  return res.json()
}

export async function listTTSVoices(language?: string) {
  const url = new URL(`${FASTAPI_URL}/tts/voices`)
  if (language) url.searchParams.set('language', language)
  const res = await fetch(url, { headers: await getFastAPIHeaders() })
  if (!res.ok) {
    return { voices: [] }
  }
  return res.json()
}