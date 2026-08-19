# AI / LLM Configuration Inventory

## Provider and runtime

All runtime AI calls use the OpenAI Node SDK. The shared server client lives in
`lib/integrations-openai-ai-server/` and requires:

```text
AI_INTEGRATIONS_OPENAI_BASE_URL
AI_INTEGRATIONS_OPENAI_API_KEY
```

On Replit these values point to an AI integration proxy. For a portable host,
set the base URL to `https://api.openai.com/v1` and use an API key from the
application owner’s OpenAI project, or change the shared client module.

No Anthropic, Gemini, or generic AI SDK runtime calls were found.

## Chat-completion workflows

All templates below are committed source code. The listed files are the
canonical full prompt text, including dynamically injected case records,
conversation history, state facts, page context, and user input.

| Feature | Model / parameters | Full prompt/template source | Behavior and failures |
| --- | --- | --- | --- |
| Case Advisor chat | `gpt-5.2`, streaming, `max_completion_tokens: 8192` | `artifacts/api-server/src/prompts/chat-prompt.ts`; route `routes/chat.ts` | Legal-assistant/system policy, state-specific terminology, filing/forms/evidence guidance, and full case context. Streams SSE. Route catches errors and emits a stream error; no explicit retry. |
| Help Genie | `gpt-4o-mini`, streaming, `max_tokens: 750`, `temperature: 0.5` | `prompts/help-chat-prompt.ts`; `routes/help-chat.ts` | Visitor/app-help legal guidance, current page/state context, feature tags and suggestion rules. Includes deterministic defendant/no-counterclaim guardrails in the stream parser. Logs/emits errors; no retry. |
| Case classifier | `gpt-4o-mini`, streaming, `max_tokens: 800`, `temperature: 0.5` | `routes/case-classifier.ts` | Classifies visitor dispute/product questions and gives small-claims guidance. Errors are handled by the route; no retry. |
| Hearing preparation | `gpt-5.2`, streaming, `max_completion_tokens: 8192` | `routes/hearing-prep.ts` | California plaintiff practice-hearing system prompt; injects case data and recent session messages. Streams SSE; catch/error response; no retry. |
| Evidence checklist | `gpt-5.2`, `max_completion_tokens: 1000` | `routes/cases.ts` | User prompt asks for JSON evidence checklist from case/doc data. Regex-extracted JSON is stored on the case. Invalid JSON fails the route; no retry. |
| Missing-facts analysis | `gpt-5.2`, `max_completion_tokens: 500` | `routes/cases.ts` | User prompt asks for JSON missing facts from case data. Parses response JSON; no explicit retry. |
| Case-description draft | `gpt-5.2`, `max_completion_tokens: 800` | `routes/cases.ts` | Produces a concise California case description from a complete case record and follow-up answers. No explicit retry. |
| Case follow-up/advisor artifacts | `gpt-5.2`, two calls, `max_completion_tokens: 600` | `routes/cases.ts` | Fire-and-forget prompts based on case data. Errors are not awaited/handled as a durable job; no retry. |
| Document OCR/analysis | `gpt-5.2`, multimodal, `max_completion_tokens: 4096` | `routes/documents.ts` | Extracts facts, summaries, and metadata from documents/images. Route error handling only; no retry. |
| Demand letters and declarations | OpenAI chat completion models defined in route/form call sites | `routes/demand-letter.ts`, `routes/forms-mc030.ts`, relevant form definitions | Templates generate demand-letter and declaration text from case facts. Errors surface through route/form generation; no explicit retry. |
| SC-100 enrichment/calibration | OpenAI chat/vision calls defined in the SC-100 generator/calibration paths | `forms/definitions/sc100-definition.ts`, `routes/forms-sc100.ts`, related form helpers | Produces/enriches form text and calibration diagnostics. Some internal calibration paths write derived maps; they are not an AI prompt database. |

## Audio, transcription, image, and speech

| Feature | Model / settings | Canonical source | Prompt/error behavior |
| --- | --- | --- | --- |
| Browser voice transcription | `gpt-4o-mini-transcribe`, JSON response | `routes/transcribe.ts` | No system prompt. Accepts up to 10 MB audio through memory upload; returns a typed fallback error on failure; no retry. |
| Shared speech-to-text | `gpt-4o-mini-transcribe`, streaming and non-streaming | `lib/integrations-openai-ai-server/src/audio/client.ts` | No system prompt. Converts unsupported browser media to WAV with `ffmpeg`; temporary files are deleted in `finally`; no retry. |
| Voice chat | `gpt-audio`, text+audio modalities, selectable voices | `audio/client.ts` | User audio is sent directly; no system prompt. Supports streaming PCM output; no retry. |
| Text-to-speech | `gpt-audio`, text+audio; voice defaults to `alloy` | `audio/client.ts` | System prompt is exactly: “You are an assistant that performs text-to-speech.” User prompt is “Repeat the following text verbatim: …”. No retry. |
| Image generation/editing | `gpt-image-1` | `lib/integrations-openai-ai-server/src/image/client.ts` | Caller-provided prompt and image buffers; no system prompt. Errors propagate; no retry. |

## Prompt data and database storage

No system prompt or reusable prompt template is stored in the database. Prompt
templates are source-controlled TypeScript. Runtime inputs include case records,
conversation history, document content, user messages, state facts, page
context, and form data. The database stores application/conversation data and
some AI-derived output, not the canonical prompt templates.

## Error/retry policy

There is no shared retry/backoff wrapper around OpenAI calls. Most routes catch
errors and return an HTTP or SSE error. A portable production deployment should
add provider-aware retry, timeout, cost controls, and observability as a
separate application-behavior change; it is intentionally outside this backup.

## Portable-host checklist

1. Create an OpenAI project and a restricted server-side API key.
2. Set `AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1`.
3. Set `AI_INTEGRATIONS_OPENAI_API_KEY` in the host secret manager.
4. Install `ffmpeg` for audio conversion.
5. Validate streaming proxy behavior for SSE responses and OpenAI streaming.
6. Review every source prompt named above before changing models or providers.