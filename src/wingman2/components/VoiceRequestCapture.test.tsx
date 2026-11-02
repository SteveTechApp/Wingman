import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendTranscriptNote, VoiceRequestCapture } from "./VoiceRequestCapture";

class FakeRecognition {
  static current: FakeRecognition;
  continuous = false; interimResults = false; lang = "";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() { FakeRecognition.current = this; }
}
beforeEach(() => {
  Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: FakeRecognition });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => 'blob:voice') });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); delete window.SpeechRecognition; vi.unstubAllGlobals(); });

describe("voice request capture", () => {
  it("appends each final phrase once while keeping interim words separate", () => {
    const append = vi.fn(); render(<VoiceRequestCapture onTranscript={append} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dictate my request' }));
    const results = [{ isFinal: true, 0: { transcript: 'Two displays.' } }, { isFinal: false, 0: { transcript: 'And one' } }];
    act(() => { FakeRecognition.current.onresult?.({ results }); FakeRecognition.current.onresult?.({ results }); });
    expect(append).toHaveBeenCalledTimes(1); expect(append).toHaveBeenCalledWith('Two displays.');
    expect(screen.getByLabelText('Live transcript').textContent).toBe('And one');
    fireEvent.click(screen.getByRole('button', { name: 'Stop microphone' }));
    expect(FakeRecognition.current.stop).toHaveBeenCalled();
  });
  it("stops customer capture when the component unmounts", () => {
    const { unmount } = render(<VoiceRequestCapture onTranscript={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Capture customer live' }));
    const recognition = FakeRecognition.current;
    unmount(); expect(recognition.abort).toHaveBeenCalled(); expect(recognition.onresult).toBeNull();
  });
  it("explains permission failures without changing request text", () => {
    const append = vi.fn(); render(<VoiceRequestCapture onTranscript={append} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dictate my request' }));
    act(() => FakeRecognition.current.onerror?.({ error: 'not-allowed' }));
    expect(screen.getByRole('alert').textContent).toContain('denied'); expect(append).not.toHaveBeenCalled();
  });
  it("keeps upload available when browser speech is unsupported", () => {
    delete window.SpeechRecognition;
    render(<VoiceRequestCapture onTranscript={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Dictate my request' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText('Upload a voice note')).toBeTruthy();
  });
  it("transcribes an uploaded recording only after the salesperson requests it", async () => {
    const append = vi.fn(); const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, text: 'A classroom.' }) });
    vi.stubGlobal('fetch', fetch); render(<VoiceRequestCapture onTranscript={append} />);
    fireEvent.change(screen.getByLabelText('Upload a voice note'), { target: { files: [new File(['audio'], 'note.m4a', { type: 'audio/mp4' })] } });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Transcribe voice note' }));
    await waitFor(() => expect(append).toHaveBeenCalledWith('A classroom.'));
    expect(fetch.mock.calls[0][0]).toContain('format=m4a');
  });
  it("rejects invalid files and preserves text when the server fails", async () => {
    const append = vi.fn(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Sign in to transcribe.' }) }));
    render(<VoiceRequestCapture onTranscript={append} />);
    const input = screen.getByLabelText('Upload a voice note');
    fireEvent.change(input, { target: { files: [new File(['bad'], 'bad.txt')] } });
    expect(screen.getByRole('alert').textContent).toContain('25 MB');
    fireEvent.change(input, { target: { files: [new File(['audio'], 'note.wav')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Transcribe voice note' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Sign in'));
    expect(append).not.toHaveBeenCalled();
  });
});

describe("compact voice note", () => {
  it("dictates into the field it sits under without the full capture block", () => {
    const append = vi.fn(); render(<VoiceRequestCapture compact onTranscript={append} />);
    expect(screen.queryByLabelText("Voice capture")).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Record voice note' }));
    act(() => FakeRecognition.current.onresult?.({ results: [{ isFinal: true, 0: { transcript: 'Four sources.' } }] }));
    expect(append).toHaveBeenCalledWith('Four sources.');
    fireEvent.click(screen.getByRole('button', { name: 'Stop voice note' }));
    expect(FakeRecognition.current.stop).toHaveBeenCalled();
  });
  it("transcribes an uploaded note into the same field", async () => {
    const append = vi.fn(); const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, text: 'A 12 by 8 metre room.' }) });
    vi.stubGlobal('fetch', fetch); render(<VoiceRequestCapture compact onTranscript={append} />);
    fireEvent.change(screen.getByLabelText('Upload voice note'), { target: { files: [new File(['audio'], 'walkthrough.m4a', { type: 'audio/mp4' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Transcribe voice note' }));
    await waitFor(() => expect(append).toHaveBeenCalledWith('A 12 by 8 metre room.'));
  });
});

describe("appendTranscriptNote", () => {
  it("keeps what was typed and puts the spoken note on its own line", () => {
    expect(appendTranscriptNote('Boardroom refresh.', 'Two displays and a camera.')).toBe('Boardroom refresh.\nTwo displays and a camera.');
    expect(appendTranscriptNote('', 'Two displays.')).toBe('Two displays.');
    expect(appendTranscriptNote('Kept.', '   ')).toBe('Kept.');
  });
});
