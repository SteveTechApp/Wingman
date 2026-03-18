import * as React from "react";
import {
  getRoomProfileOptions,
  getWalkthroughQuestionsForProfile,
  interpretWalkthrough
} from "@/features/intelligence/walkthroughEngine";
import { roomProfiles } from "@/features/intelligence/roomProfiles";
import { buildDesignDirection } from "@/features/intelligence/designDirectionEngine";
import { buildSalespersonSummary } from "@/features/intelligence/responseBuilder";
import { buildDesignDirectionSummary } from "@/features/intelligence/designDirectionSummary";
import type {
  DiscoveryMode,
  RoomProfileId,
  SuggestedAnswerOption,
  WalkthroughAnswerMap,
  WalkthroughQuestionDefinition
} from "@/features/intelligence/types";

const STORAGE_KEY = "wm_guided_walkthrough_v3";

type StoredState = {
  mode: DiscoveryMode;
  roomProfileId?: RoomProfileId;
  answers: WalkthroughAnswerMap;
};

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: "walkthrough", answers: {} };
    const parsed = JSON.parse(raw) as StoredState;
    return {
      mode: parsed.mode ?? "walkthrough",
      roomProfileId: parsed.roomProfileId,
      answers: parsed.answers ?? {}
    };
  } catch {
    return { mode: "walkthrough", answers: {} };
  }
}

function appendAnswer(existing: string | undefined, addition: string): string {
  const current = (existing ?? "").trim();
  if (!current) return addition;
  if (current.toLowerCase().includes(addition.toLowerCase())) return current;
  return `${current}; ${addition}`;
}

function AnswerChips({
  options,
  value,
  onSelect
}: {
  options?: SuggestedAnswerOption[];
  value?: string;
  onSelect: (value: string) => void;
}) {
  if (!options?.length) return null;

  const current = (value ?? "").toLowerCase();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 6,
      }}
    >
      {options.map((option) => {
        const selected = current.includes(option.value.toLowerCase());

        return (
          <button
            key={option.value}
            type="button"
            className="wm-btn"
            onClick={() => onSelect(option.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "flex-start",
              minHeight: 30,
              width: "100%",
              padding: "5px 10px",
              borderRadius: 12,
              border: selected ? "2px solid var(--wm-accent, #26b3a8)" : "1px solid rgba(255,255,255,0.12)",
              background: selected ? "rgba(38,179,168,0.14)" : "rgba(255,255,255,0.04)",
              textAlign: "left",
              fontSize: 12,
              lineHeight: 1.25,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function QuestionCard({
  question,
  value,
  onChange
}: {
  question: WalkthroughQuestionDefinition;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 6,
        padding: 10,
        borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)"
      }}
    >
      <span style={{ fontWeight: 600 }}>{question.label}</span>

      <AnswerChips
        options={question.suggestedAnswers}
        value={value}
        onSelect={(chipValue) => onChange(appendAnswer(value, chipValue))}
      />

      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ resize: "vertical", padding: 10 }}
        placeholder="Add conversational notes here..."
      />
    </label>
  );
}

export default function GuidedWalkthroughPage() {
  const [state, setState] = React.useState<StoredState>(() => loadState());

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage issues
    }
  }, [state]);

  const roomStep = getRoomProfileOptions();

  const questions = React.useMemo(() => {
    if (!state.roomProfileId) return [];
    return getWalkthroughQuestionsForProfile(state.roomProfileId, state.answers);
  }, [state.roomProfileId, state.answers]);

  const interpretation = React.useMemo(() => {
    if (!state.roomProfileId) return null;
    return interpretWalkthrough(state.roomProfileId, state.answers);
  }, [state.roomProfileId, state.answers]);

  const designDirection = React.useMemo(() => {
    if (!interpretation) return null;
    return buildDesignDirection(interpretation.parsed);
  }, [interpretation]);

  const salespersonSummary = React.useMemo(() => {
    if (!interpretation || !designDirection) return "";
    return buildSalespersonSummary(
      interpretation.parsed,
      interpretation.recommendation,
      designDirection
    );
  }, [interpretation, designDirection]);

  const designDirectionSummary = React.useMemo(() => {
    if (!designDirection) return "";
    return buildDesignDirectionSummary(designDirection);
  }, [designDirection]);

  const selectedProfile = roomProfiles.find((p) => p.id === state.roomProfileId);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="wm-card">
        <div className="wm-card__body" style={{ display: "grid", gap: 12 }}>
          <div className="wm-eyebrow">Guided walkthrough</div>
          <h1 style={{ margin: 0 }}>Start with the type of space</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Wingman uses room type to guide more natural discovery questions and turn them into a practical design direction.
          </p>

          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>{roomStep.label}</span>
            <select
              value={state.roomProfileId ?? ""}
              onChange={(e) =>
                setState({
                  mode: "walkthrough",
                  roomProfileId: (e.target.value || undefined) as RoomProfileId | undefined,
                  answers: {}
                })
              }
              style={{ minHeight: 42, padding: "0 12px" }}
            >
              <option value="">Select room type</option>
              {roomProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>

          {selectedProfile ? (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Likely assumptions</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {selectedProfile.defaultAssumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {questions.length > 0 ? (
        <div className="wm-card">
          <div className="wm-card__body" style={{ display: "grid", gap: 12 }}>
            <div className="wm-eyebrow">Conversation prompts</div>
            <h2 style={{ margin: 0 }}>Guide the customer conversation</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>
              Use the chips for speed, then add free-text notes if needed. Some questions appear only when relevant.
            </p>

            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                value={state.answers[question.id]}
                onChange={(value) =>
                  setState((prev) => ({
                    ...prev,
                    answers: {
                      ...prev.answers,
                      [question.id]: value
                    }
                  }))
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {interpretation ? (
        <>
          <div className="wm-card">
            <div className="wm-card__body" style={{ display: "grid", gap: 10 }}>
              <div className="wm-eyebrow">Combined narrative</div>
              <h2 style={{ margin: 0 }}>What Wingman is inferring</h2>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                {interpretation.combinedNarrative}
              </pre>
            </div>
          </div>

          <div className="wm-card">
            <div className="wm-card__body" style={{ display: "grid", gap: 10 }}>
              <div className="wm-eyebrow">Interpreted requirement</div>
              <h2 style={{ margin: 0 }}>Structured output</h2>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                {JSON.stringify(interpretation.parsed, null, 2)}
              </pre>
            </div>
          </div>

          {designDirection ? (
            <div className="wm-card">
              <div className="wm-card__body" style={{ display: "grid", gap: 10 }}>
                <div className="wm-eyebrow">Design direction</div>
                <h2 style={{ margin: 0 }}>Recommended architecture path</h2>

                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)"
                  }}
                >
                  {designDirectionSummary}
                </pre>
              </div>
            </div>
          ) : null}

          <div className="wm-card">
            <div className="wm-card__body" style={{ display: "grid", gap: 10 }}>
              <div className="wm-eyebrow">Sales guidance</div>
              <h2 style={{ margin: 0 }}>Salesperson-ready summary</h2>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                {salespersonSummary}
              </pre>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
