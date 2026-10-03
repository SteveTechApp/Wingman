import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { handleAudioTranscription, MAX_AUDIO_BYTES } from './audio-transcription.mjs';

async function run({ bytes = Buffer.from('sample'), format = 'wav', key = 'test-key', response = { ok: true, json: async () => ({ text: 'Two meeting rooms.' }) }, length } = {}) {
  const req = Readable.from([bytes]); req.headers = length ? { 'content-length': length } : {};
  const res = new EventEmitter();
  const sendJson = vi.fn(); const fetch = vi.fn().mockResolvedValue(response);
  await handleAudioTranscription(req, res, new URL(`http://localhost/api/wingman/audio/transcribe?format=${format}`), { sendJson }, { apiKey: key, fetch });
  return { sendJson, fetch };
}
describe('audio transcription', () => {
  it('returns editable transcript and sends binary audio as a file', async () => {
    const { sendJson, fetch } = await run();
    expect(sendJson.mock.calls[0].slice(1)).toEqual([200, { ok: true, text: 'Two meeting rooms.' }]);
    expect(fetch.mock.calls[0][1].body.get('file').name).toBe('voice-note.wav');
    expect(fetch.mock.calls[0][1].body.get('file').size).toBe(6);
  });
  it.each([
    [{ key: '' }, 503], [{ format: 'exe' }, 415], [{ bytes: Buffer.alloc(0) }, 400],
    [{ length: MAX_AUDIO_BYTES + 1 }, 413], [{ bytes: Buffer.alloc(MAX_AUDIO_BYTES + 1) }, 413],
  ])('rejects invalid or unavailable uploads before contacting the provider', async (options, status) => {
    const { sendJson, fetch } = await run(options);
    expect(sendJson.mock.calls[0][1]).toBe(status); expect(fetch).not.toHaveBeenCalled();
  });
  it('never returns provider errors or credentials', async () => {
    const { sendJson } = await run({ response: { ok: false, status: 401, text: async () => 'secret-provider-detail' } });
    expect(sendJson.mock.calls[0][1]).toBe(502);
    expect(JSON.stringify(sendJson.mock.calls)).not.toContain('secret-provider-detail');
  });
  it('reports no speech instead of accepting an empty transcript', async () => {
    const { sendJson } = await run({ response: { ok: true, json: async () => ({ text: ' ' }) } });
    expect(sendJson.mock.calls[0][1]).toBe(422);
  });
});
