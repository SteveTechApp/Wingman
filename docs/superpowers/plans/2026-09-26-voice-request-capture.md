# Voice request capture implementation plan

**Goal:** Let the salesperson dictate, capture a customer speaking live, or transcribe a recorded voice note into editable request text.

**Architecture:** A reusable voice capture component appends final speech results to the existing request field. Browser speech recognition supports live input. A protected server endpoint accepts bounded audio uploads and calls the OpenAI transcription API with a server-only key. No automatic decoding, sending, or audio persistence.

**Spec:** The user's 26 September request and request decoder screenshot.

**Constraints:** Preserve keyboard input and existing document decoding. Stop microphones on stop, unmount and page hiding. Make processing and errors visible; retain existing text on failure. Enforce upload size/type and workspace permissions on the server. Never expose or commit API keys.

- [ ] Add and test bounded audio transcription endpoint, timeout and sanitised errors.
- [ ] Add live dictation/customer capture, file preview/upload, cancellation and editable transcript integration.
- [ ] Test transcript append/deduplication, cleanup, unsupported browser and upload errors.
- [ ] Verify typecheck, lint, build, targeted tests and the rendered decoder; commit and merge into main with preceding proposal/UI work.

Reference: https://developers.openai.com/api/docs/guides/speech-to-text
