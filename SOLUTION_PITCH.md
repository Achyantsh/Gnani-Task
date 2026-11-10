# AudioNote — Solution Pitch

**Project:** [GitHub repository](https://github.com/Achyantsh/Gnani-Task)  
**Live demo:** [AudioNote](https://gnani-task-one.vercel.app)  


## The problem

Important commitments are frequently buried inside phone calls and voice
notes. People may remember the conversation but forget the owner, deadline,
or next step. Replaying long recordings and manually creating tasks is slow,
inconsistent, and difficult to scale.

## Our solution

**AudioNote turns conversations into verified actions.** A user uploads or
forwards a voice note, selects its language, and receives a transcript, a
concise summary, and an Action Inbox containing extracted follow-ups. Each
action includes evidence from the original conversation, so the user can
review and confirm it before it becomes a trusted next step.

The product is designed to take the lead without removing human control:
AudioNote captures the conversation, understands its meaning, prioritizes
what needs to happen, and asks the user to verify the result.

## How it works

1. Audio is uploaded directly to Cloudflare R2.
2. Gnani Batch STT transcribes multilingual audio asynchronously.
3. Google Gemini produces a concise summary and identifies commitments.
4. Supabase stores the user’s history and extracted actions securely.
5. The Action Inbox displays evidence-backed actions for confirmation.

The interface shows progress throughout processing and retains polling as a
recovery path when a provider callback is unavailable.

## Why it matters

AudioNote helps founders, sales teams, support teams, and operations staff
convert unstructured conversations into accountable follow-up. Instead of
asking “What did we agree to?”, users can quickly see “What happens next,
who owns it, and why?”

## Current demonstration

The repository includes a working authenticated web application and a local
simulated WhatsApp handoff for recording the demo. The local flow demonstrates
upload, transcription, summary generation, evidence-backed action extraction,
and Action Inbox confirmation. A production WhatsApp Business integration
would add provider credentials, a public HTTPS webhook, signature
verification, media download, and durable background task storage.

