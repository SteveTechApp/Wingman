export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const formats = new Set(['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'flac']);

/** Auth and CSRF are enforced by the route registry before this handler. */
export async function handleAudioTranscription(req, res, url, { sendJson }, options = {}) {
  const key = options.apiKey ?? process.env.OPENAI_API_KEY;
  const fetchAudio = options.fetch ?? globalThis.fetch;
  const reply = (status, error) => sendJson(res, status, { ok: false, error });
  if (!key) return reply(503, 'Voice-note transcription is not configured. Ask your workspace administrator to enable it.');
  const extension = (url.searchParams.get('format') || '').toLowerCase();
  if (!formats.has(extension)) return reply(415, 'Choose an MP3, MP4, M4A, WAV, WebM, OGG, FLAC or MPEG recording.');
  if (Number(req.headers['content-length']) > MAX_AUDIO_BYTES) return reply(413, 'Audio must be 25 MB or smaller.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  const cancel = () => controller.abort();
  req.once('aborted', cancel);
  res.once('close', cancel);
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_AUDIO_BYTES) return reply(413, 'Audio must be 25 MB or smaller.');
      chunks.push(chunk);
    }
    if (!size) return reply(400, 'The recording is empty. Choose another audio file.');
    const form = new FormData();
    form.append('file', new Blob([Buffer.concat(chunks)]), `voice-note.${extension}`);
    form.append('model', process.env.WINGMAN_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe');
    form.append('response_format', 'json');
    const response = await fetchAudio('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form, signal: controller.signal,
    });
    if (!response.ok) return reply(response.status === 429 ? 429 : 502,
      response.status === 429 ? 'Transcription is busy. Please try again shortly.' : 'The recording could not be transcribed. Try a clearer or shorter recording.');
    const result = await response.json();
    if (typeof result.text !== 'string' || !result.text.trim()) return reply(422, 'No speech was found in this recording.');
    sendJson(res, 200, { ok: true, text: result.text.trim() });
  } catch {
    if (!res.destroyed) reply(controller.signal.aborted ? 504 : 502, 'Transcription did not complete. Your existing request text has been kept.');
  } finally {
    clearTimeout(timer);
    req.off('aborted', cancel);
    res.off('close', cancel);
  }
}
