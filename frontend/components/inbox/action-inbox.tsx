'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlassEffect } from '@/components/liquid'
import { Check, X, Edit2, AlertCircle, Calendar, CheckSquare, MessageSquare, Volume2, Loader2, Wifi, WifiOff } from 'lucide-react'
import { updateActionServer, generateTTS, listActionsServer } from '@/actions/actions'
import { toast } from '@/components/ui/toast'
import { AudioPlayer } from '@/components/home/hero/audio-player'
import { useSSE } from '@/hooks/useSSE'

export interface ActionRecord {
  id: string
  user_id: string
  conversation_id?: string
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
  grounding_status: string
  user_status: string
  created_at: string
}

interface SSEActionEvent {
  type: string;
  user_id?: string;
  action_id?: string;
  conversation_id?: string;
  data?: ActionRecord;
}

interface ActionInboxProps {
  actions: ActionRecord[]
  error?: string | null
  userId: string
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All Actions' },
  { id: 'needs_review', label: 'Needs Review' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'dismissed', label: 'Dismissed' },
]

export function ActionInbox({ actions: initialActions, error, userId }: ActionInboxProps) {
  const [actions, setActions] = useState<ActionRecord[]>(initialActions)
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [ttsGenerating, setTtsGenerating] = useState<string | null>(null)
  const [ttsAudioUrls, setTtsAudioUrls] = useState<Record<string, string>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)

  // SSE for real-time action updates
  const { isConnected, lastEvent } = useSSE(userId)

  const filteredActions = actions.filter((act) => {
    if (filter === 'all') return true
    return act.user_status === filter
  })

  const refreshActions = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      const res = await listActionsServer(userId)
      if (res.actions) {
        setActions(res.actions)
      }
    } catch (e) {
      console.error('Failed to refresh actions:', e)
    } finally {
      setIsRefreshing(false)
    }
  }, [userId, isRefreshing])

  // Handle SSE events for real-time action updates
  useEffect(() => {
    if (!lastEvent) return

    const event = lastEvent as SSEActionEvent

    // Handle new action created from transcription completion
    if (event.type === 'action_created' && event.data) {
      console.log('[SSE] New action created:', event.data)
      // Use setTimeout to avoid calling setState directly in effect
      setTimeout(() => {
        setActions((prev) => {
          // Avoid duplicates
          if (prev.some((a) => a.id === event.data?.id)) return prev
          return [event.data!, ...prev]
        })
      }, 0)
      toast.add({
        title: 'New action extracted',
        description: event.data.title,
        type: 'success',
      })
    }

    // Handle action updated (status change from another session)
    if (event.type === 'action_updated' && event.data) {
      console.log('[SSE] Action updated:', event.data)
      // Use setTimeout to avoid calling setState directly in effect
      setTimeout(() => {
        setActions((prev) =>
          prev.map((a) => (a.id === event.data?.id ? event.data! : a))
        )
      }, 0)
    }

    // Handle transcription completed - refresh actions
    if (event.type === 'transcription_completed') {
      console.log('[SSE] Transcription completed, refreshing actions')
      // Use setTimeout to avoid calling setState directly in effect
      setTimeout(() => refreshActions(), 0)
    }
  }, [lastEvent, userId, refreshActions])

  const handleStatusChange = async (actionId: string, userId: string, newStatus: string) => {
    setIsUpdating(true)
    try {
      const res = await updateActionServer(actionId, userId, { user_status: newStatus })
      if (res.error) {
        toast.add({
          title: 'Update failed',
          description: res.error,
          type: 'error',
        })
      } else {
        setActions((prev) =>
          prev.map((a) => (a.id === actionId ? { ...a, user_status: newStatus } : a))
        )
        toast.add({
          title: 'Action updated',
          description: `Status changed to ${newStatus.replace('_', ' ')}.`,
          type: 'success',
        })
      }
    } catch {
      toast.add({
        title: 'Error',
        description: 'Failed to update action status.',
        type: 'error',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGenerateActionTTS = async (actionId: string, userId: string, actionTitle: string) => {
    if (ttsGenerating === actionId) return;

    setTtsGenerating(actionId);
    try {
      // Create a concise text for the action
      const text = `Action: ${actionTitle}. Status: needs review.`;
      const res = await generateTTS({
        text,
        language_code: 'en-IN',
      });

      if (res.success && res.audio_url) {
        setTtsAudioUrls(prev => ({ ...prev, [actionId]: res.audio_url! }));
        toast.add({
          title: 'Action summary ready',
          description: `Playing with ${res.voice_used || 'Timbre'} voice`,
          type: 'success',
        });
      } else {
        toast.add({
          title: 'TTS failed',
          description: res.error || 'Could not generate speech',
          type: 'error',
        });
      }
    } catch (e) {
      toast.add({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Unknown error',
        type: 'error',
      });
    } finally {
      setTtsGenerating(null);
    }
  };

  const handleEditSave = async (actionId: string, userId: string) => {
    setIsUpdating(true)
    try {
      const res = await updateActionServer(actionId, userId, {
        title: editTitle,
        due_date_text: editDueDate,
      })
      if (res.error) {
        toast.add({
          title: 'Update failed',
          description: res.error,
          type: 'error',
        })
      } else {
        setActions((prev) =>
          prev.map((a) =>
            a.id === actionId ? { ...a, title: editTitle, due_date_text: editDueDate } : a
          )
        )
        setEditingId(null)
        toast.add({
          title: 'Action updated',
          description: 'Changes saved successfully.',
          type: 'success',
        })
      }
    } catch {
      toast.add({
        title: 'Error',
        description: 'Failed to save edits.',
        type: 'error',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (error) {
    return (
      <GlassEffect className="p-6 rounded-2xl border border-red-500/20 bg-red-500/[0.05] text-red-200">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">Failed to load actions: {error}</p>
        </div>
      </GlassEffect>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STATUS_FILTERS.map((f) => {
          const count =
            f.id === 'all'
              ? actions.length
              : actions.filter((a) => a.user_status === f.id).length
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                filter === f.id
                  ? 'bg-white text-neutral-950 shadow-sm font-semibold'
                  : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
              }`}
            >
              {f.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Action Cards */}
      {filteredActions.length === 0 ? (
        <GlassEffect className="p-12 text-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <CheckSquare className="h-10 w-10 text-white/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-white/70">No actions found</p>
          <p className="text-xs text-white/40 mt-1">
            {filter === 'all'
              ? 'Upload a conversation to automatically extract commitments and tasks.'
              : `No actions with status "${filter.replace('_', ' ')}".`}
          </p>
        </GlassEffect>
      ) : (
        <div className="space-y-3.5">
          {filteredActions.map((action) => {
            const isEditing = editingId === action.id

            return (
              <GlassEffect
                key={action.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  action.user_status === 'needs_review'
                    ? 'border-amber-500/30 bg-amber-500/[0.04]'
                    : action.user_status === 'confirmed' || action.user_status === 'pending'
                    ? 'border-sky-500/30 bg-sky-500/[0.04]'
                    : action.user_status === 'completed'
                    ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    {/* Header badges */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white/80 font-semibold uppercase">
                        {action.action_type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold uppercase ${
                          action.user_status === 'needs_review'
                            ? 'bg-amber-400/20 text-amber-300'
                            : action.user_status === 'confirmed' || action.user_status === 'pending'
                            ? 'bg-sky-400/20 text-sky-300'
                            : action.user_status === 'completed'
                            ? 'bg-emerald-400/20 text-emerald-300'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {action.user_status.replace('_', ' ')}
                      </span>
                      {action.grounding_status === 'grounded' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase">
                          EVIDENCE VERIFIED
                        </span>
                      )}
                    </div>

                    {/* Title & Edit */}
                    {isEditing ? (
                      <div className="space-y-2 mt-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40"
                          placeholder="Action title"
                        />
                        <input
                          type="text"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-mono focus:outline-none focus:border-white/40"
                          placeholder="Due date phrase (e.g. Friday 11am)"
                        />
                      </div>
                    ) : (
                      <h3 className="text-base font-semibold text-white tracking-tight leading-snug">
                        {action.title}
                      </h3>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-xs text-white/60 flex-wrap">
                      {action.due_date_text && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-white/40" />
                          <span>{action.due_date_text}</span>
                        </div>
                      )}
                      {action.person_or_party && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/40 font-mono">Party:</span>
                          <span>{action.person_or_party}</span>
                        </div>
                      )}
                      {action.payment_method && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/40 font-mono">Payment:</span>
                          <span>{action.payment_method}</span>
                        </div>
                      )}
                    </div>

                    {/* Evidence Quote */}
                    {action.evidence_quote && (
                      <div className="mt-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-sky-400/80 shrink-0 mt-0.5" />
                          <p className="text-xs text-white/80 italic leading-relaxed">
                            &ldquo;{action.evidence_quote}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}

                    {/* TTS Audio Player for Action */}
                    {ttsAudioUrls[action.id] && (
                      <div className="mt-3 pt-3 border-t border-white/10 shrink-0">
                        <AudioPlayer src={ttsAudioUrls[action.id]} />
                      </div>
                    )}
                  </div>

                  {/* Actions / Buttons */}
                  <div className="flex items-center gap-2 shrink-0 sm:self-start">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleEditSave(action.id, action.user_id)}
                          disabled={isUpdating}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-semibold hover:bg-white/20 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {action.user_status === 'needs_review' && action.grounding_status === 'grounded' && (
                          <button
                            onClick={() =>
                              handleStatusChange(action.id, action.user_id, 'confirmed')
                            }
                            disabled={isUpdating}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-semibold hover:bg-emerald-400 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Confirm
                          </button>
                        )}
                        {action.user_status === 'needs_review' && action.grounding_status !== 'grounded' && (
                          <span className="text-[11px] text-amber-300/80">
                            Verify evidence before confirming
                          </span>
                        )}

                        {action.user_status !== 'completed' &&
                          action.user_status !== 'dismissed' && (
                            <button
                              onClick={() =>
                                handleStatusChange(action.id, action.user_id, 'completed')
                              }
                              disabled={isUpdating}
                              className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              Done
                            </button>
                          )}

                        <button
                          onClick={() => {
                            setEditingId(action.id)
                            setEditTitle(action.title)
                            setEditDueDate(action.due_date_text || '')
                          }}
                          className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          title="Edit action"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* TTS Button */}
                        <button
                          onClick={() => handleGenerateActionTTS(action.id, action.user_id, action.title)}
                          disabled={ttsGenerating === action.id || !!ttsAudioUrls[action.id]}
                          className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title={ttsGenerating === action.id ? "Generating..." : ttsAudioUrls[action.id] ? "Play summary" : "Listen to action"}
                        >
                          {ttsGenerating === action.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : ttsAudioUrls[action.id] ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {action.user_status !== 'dismissed' && (
                          <button
                            onClick={() =>
                              handleStatusChange(action.id, action.user_id, 'dismissed')
                            }
                            disabled={isUpdating}
                            className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="Dismiss action"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </GlassEffect>
            )
          })}
        </div>
      )}
    </div>
  )
}