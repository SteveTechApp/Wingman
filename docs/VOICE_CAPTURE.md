# Voice request capture

The request decoder accepts live dictation, a customer's spoken request, or an uploaded voice note. Final speech is appended to the editable Customer wording field. Users review that text and select Decode; transcription never sends a customer response or changes a project automatically.

## Live speech

Use a browser offering `SpeechRecognition` or `webkitSpeechRecognition`, microphone permission, and HTTPS (localhost is supported for development). Wingman shows listening state, interim speech and an explicit Stop control. Capture stops when the page is hidden or the component unmounts. Browser/service errors keep the text already captured. Live speech processing is provided by the browser's speech service, not necessarily on-device. Let other participants know before capture.

## Uploaded recordings

Configure `OPENAI_API_KEY` in the backend environment, optionally `WINGMAN_TRANSCRIPTION_MODEL` (default `gpt-4o-mini-transcribe`), then restart the backend. Never put the key in a `VITE_` variable. The user must have an authenticated workspace session with `canEditProjects` permission.

`POST /api/wingman/audio/transcribe?format=wav` accepts raw file bytes. Supported extensions: MP3, MP4, MPEG, MPGA, M4A, WAV, WebM, OGG and FLAC. Both client and server enforce a 25 MB maximum; the server also checks actual streamed bytes, not only Content-Length. Audio is held in memory for transcription and is not written to Wingman's store or logs. It is sent to OpenAI only when the user selects Transcribe voice note. The provider's data handling applies.

Failures are surfaced without replacing the user's existing text. The client supports cancellation and the server bounds the provider request to two minutes. No API credentials or provider error payloads are returned to the client.

Reference: [OpenAI file transcription](https://developers.openai.com/api/docs/guides/speech-to-text).

## Verification

Unit tests cover final/interim speech separation, repeated result deduplication, stopping/unmount cleanup, microphone errors, unsupported browsers, explicit upload submission, malformed uploads, service failures and no-speech results. Hardware microphone accuracy and a paid provider call require a configured environment and are not simulated as successful live end-to-end checks.
