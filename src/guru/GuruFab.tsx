
import React, { useMemo, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string; ts: number };

function now() { return Date.now(); }

async function callGuru(message: string): Promise<string> {
  try {
    const res = await fetch("/api/guru", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error("bad status");
    const data = await res.json();
    const out = typeof data?.answer === "string" ? data.answer : "";
    if (!out) throw new Error("empty");
    return out;
  } catch {
    // Placeholder until wired to your GenAI service
    return "Guru is not connected yet. Use /app/import to paste RFQ/tender text and extract requirements. If asking WyreStorm: include endpoint count, distances, USB-C/BYOD, and 4K/4K60.";
  }
}

export default function GuruFab() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    { role: "assistant", text: "Guru ready. Ask WyreStorm or general AV questions anytime.", ts: now() },
  ]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const quick = useMemo(
    () => [
      "Boardroom: 2 displays, USB-C BYOD, 6 sources. Recommend Bronze/Silver/Gold.",
      "AVoIP vs HDBaseT: which and why in most meeting rooms?",
      "How many endpoints before 10Gb becomes sensible?",
    ],
    []
  );

  async function send(t: string) {
    const q = t.trim();
    if (!q || busy) return;

    setMsgs((m) => m.concat([{ role: "user", text: q, ts: now() }]));
    setText("");
    setBusy(true);

    const a = await callGuru(q);
    setMsgs((m) => m.concat([{ role: "assistant", text: a, ts: now() }]));
    setBusy(false);

    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 40);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 40);
        }}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 70,
          height: 44,
          padding: "0 14px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: open ? "rgba(0,160,120,0.22)" : "rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.92)",
          cursor: "pointer",
          fontWeight: 900,
          letterSpacing: 0.2,
          boxShadow: "0 16px 44px rgba(0,0,0,0.40)",
        }}
        aria-label="Open Guru"
      >
        Guru
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 70,
            zIndex: 70,
            width: 380,
            maxWidth: "calc(100vw - 36px)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(8,12,16,0.92)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "grid", gap: 2 }}>
              <div style={{ fontWeight: 900, fontSize: 13 }}>Guru</div>
              <div style={{ opacity: 0.72, fontSize: 11 }}>Floating toolbox helper</div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                height: 28,
                padding: "0 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              Close
            </button>
          </div>

          <div style={{ padding: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {quick.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={busy}
                  onClick={() => send(q)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "inherit",
                    padding: "6px 10px",
                    fontSize: 11,
                    cursor: busy ? "not-allowed" : "pointer",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div
              style={{
                height: 240,
                overflow: "auto",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 10,
                display: "grid",
                gap: 10,
              }}
            >
              {msgs.map((m) => (
                <div key={m.ts} style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontSize: 10, opacity: 0.65, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {m.role}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {busy && <div style={{ opacity: 0.75, fontSize: 12 }}>Thinkingâ€¦</div>}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(text); }}
                placeholder="Ask a questionâ€¦"
                style={{
                  flex: 1,
                  height: 34,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.05)",
                  color: "inherit",
                  outline: "none",
                  fontSize: 12,
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => send(text)}
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,160,120,0.22)",
                  color: "inherit",
                  cursor: busy ? "not-allowed" : "pointer",
                  fontWeight: 900,
                  fontSize: 12,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}




