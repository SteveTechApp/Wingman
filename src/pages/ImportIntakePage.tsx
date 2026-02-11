
import React, { useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { extractTextFromFile } from "@/app/import/textExtractors";
import { extractRequirements } from "@/app/import/extractRequirements";
import { recommendWyrestorm } from "@/app/import/recommendWyrestorm";

export default function ImportIntakePage() {
  const [rawText, setRawText] = useState("");
  const [meta, setMeta] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const req = useMemo(() => extractRequirements(rawText), [rawText]);
  const rec = useMemo(() => recommendWyrestorm(req as any), [req, rawText]);

  async function onPick(file: File | null) {
    if (!file) return;
    setErr(null);
    setBusy(true);
    setMeta([]);
    try {
      const res = await extractTextFromFile(file);
      setMeta(((res as any).meta ?? "") as any);
      setRawText((((res as any).text ?? (res as any) ?? "") as string));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div className="wm-page" style={{ display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Import</div>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Upload PDF/DOCX/TXT or paste notes. Wingman extracts requirements and recommends WyreStorm options.
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        {busy && <div style={{ fontSize: 12, opacity: 0.8 }}>Extracting…</div>}
        {err && <div style={{ fontSize: 12, color: "rgba(255,120,120,0.95)" }}>{err}</div>}
      </div>

      {meta.length > 0 && (
        <div style={{ fontSize: 11, opacity: 0.75, display: "grid", gap: 4 }}>
          {meta.map((m) => <div key={m}>• {m}</div>)}
        </div>
      )}

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.2fr 0.8fr" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>SOURCE TEXT</div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste email notes / tender text / RFQ requirements…"
            style={{
              minHeight: 360,
              width: "100%",
              resize: "vertical",
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              color: "inherit",
              outline: "none",
              fontSize: 12,
              lineHeight: 1.35,
            }}
          />
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>EXTRACTED REQUIREMENTS</div>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              {((req as any).summary ?? []).length ? ((req as any).summary ?? []).map((x: any) => (
                <div key={x} style={{ fontSize: 12, fontWeight: 800 }}>{x}</div>
              )) : (
                <div style={{ opacity: 0.75, fontSize: 12 }}>Upload or paste content to extract requirements.</div>
              )}
            </div>
            {((req as any).notes ?? []).length > 0 && (
              <div style={{ marginTop: 10, opacity: 0.75, fontSize: 11, display: "grid", gap: 4 }}>
                {((req as any).notes ?? []).map((n: any) => <div key={n}>• {n}</div>)}
              </div>
            )}
          </div>

          {/* RESULTS */}
          {((rec as any).mode) === "room" ? (
            <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>ROOM SOLUTION OPTIONS (BRONZE / SILVER / GOLD)</div>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {((rec as any).tiers ?? []).map((r: any) => (
                  <div key={r.tier} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>{r.tier}</div>
                      <div style={{ opacity: 0.65, fontSize: 11 }}>Top {r.skus.length}</div>
                    </div>

                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      {r.skus.map((s: any) => (
                        <div key={s.sku} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 900, fontSize: 12 }}>{s.sku}</div>
                            <div style={{ opacity: 0.65, fontSize: 11 }}>Score: {s.score}</div>
                          </div>
                          <div style={{ opacity: 0.78, fontSize: 11, marginTop: 4 }}>{s.description}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 10, opacity: 0.78, fontSize: 11, display: "grid", gap: 4 }}>
                      {r.rationale.map((x: any) => <div key={x}>• {x}</div>)}
                    </div>
                    <div style={{ marginTop: 8, opacity: 0.70, fontSize: 11, display: "grid", gap: 4 }}>
                      {r.cautions.map((x: any) => <div key={x}>! {x}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>MATCHING WYRESTORM PRODUCTS (NO TIERS)</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={{ opacity: 0.78, fontSize: 11, display: "grid", gap: 4 }}>
                  {((rec as any).rationale ?? []).map((x: any) => <div key={x}>• {x}</div>)}
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: 12 }}>Best matches</div>
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    {((rec as any).best ?? []).map((s: any) => (
                      <div key={s.sku} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 900, fontSize: 12 }}>{s.sku}</div>
                          <div style={{ opacity: 0.65, fontSize: 11 }}>Score: {s.score}</div>
                        </div>
                        <div style={{ opacity: 0.78, fontSize: 11, marginTop: 4 }}>{s.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: 12 }}>Other suitable options</div>
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    {((rec as any).other ?? []).map((s: any) => (
                      <div key={s.sku} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 900, fontSize: 12 }}>{s.sku}</div>
                          <div style={{ opacity: 0.65, fontSize: 11 }}>Score: {s.score}</div>
                        </div>
                        <div style={{ opacity: 0.78, fontSize: 11, marginTop: 4 }}>{s.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 2, opacity: 0.70, fontSize: 11, display: "grid", gap: 4 }}>
                  {((rec as any).cautions ?? []).map((x: any) => <div key={x}>! {x}</div>)}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
    </PageShell>
  );
}



