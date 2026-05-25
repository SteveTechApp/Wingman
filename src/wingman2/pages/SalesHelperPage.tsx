import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Cable,
  ClipboardList,
  GitCompare,
  MessageSquareText,
  MonitorUp,
  Network,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { SalesToneQuickSetter } from "../components/SalesToneQuickSetter";

type CallPath = {
  id: string;
  title: string;
  description: string;
  opener: string;
  questions: string[];
  why: string;
  Icon: LucideIcon;
};

const callPaths: CallPath[] = [
  {
    id: "room",
    title: "Customer wants a room",
    description: "Meeting room, boardroom, classroom or general room upgrade.",
    opener: "Before I suggest hardware, can I understand how the room needs to be used?",
    questions: [
      "What kind of room is this and how many people normally use it?",
      "Is the main use presenting, video calls, teaching, signage, or a mix?",
      "What is frustrating people about the current setup?",
    ],
    why: "The room use decides whether Wingman should steer toward presentation switching, UC, matrix, AVoIP or a template.",
    Icon: Users,
  },
  {
    id: "io",
    title: "Sources and screens",
    description: "Map what connects to what.",
    opener: "Let me quickly map the signal flow so we do not miss anything.",
    questions: [
      "How many source devices are there?",
      "How many displays are there?",
      "Do all displays show the same thing or different things?",
    ],
    why: "The I/O pattern is the fastest way to separate extenders, switchers, matrix and AVoIP.",
    Icon: Cable,
  },
  {
    id: "usb",
    title: "Teams / Zoom / USB",
    description: "Camera, microphone, speaker, BYOD, touch or KVM.",
    opener: "For calls, I need to check both the video path and the USB path.",
    questions: [
      "Will users bring their own laptop, use a room PC, or both?",
      "Which camera, microphone or speaker devices need to be shared?",
      "Where are those USB devices compared with the laptop or room PC?",
    ],
    why: "USB is often missed. A working UC room needs the peripheral path designed separately from the video path.",
    Icon: MonitorUp,
  },
  {
    id: "network",
    title: "AV-over-IP possibility",
    description: "Multiple rooms, central racks, flexible routing or networked AV.",
    opener: "If this might use the network, I need to check whether the network is ready for AV.",
    questions: [
      "Is there a dedicated AV network or will this share the customer LAN?",
      "Who owns the switches and VLAN setup?",
      "Is low latency or very high image quality critical?",
    ],
    why: "Network readiness decides whether AVoIP is suitable, and whether NetworkHD 100, 500 or 600 is the right level.",
    Icon: Network,
  },
  {
    id: "wall",
    title: "Video wall",
    description: "LCD, LED, multiview, wall canvas or feature wall.",
    opener: "Video walls can be simple or complex, so I need to check the behaviour first.",
    questions: [
      "Is this LCD, LED, or a group of standard displays?",
      "Is it one big image, independent content, signage or multiview?",
      "How many sources feed the wall?",
    ],
    why: "This separates dedicated wall processors from matrix, seamless switching and AVoIP wall workflows.",
    Icon: Video,
  },
  {
    id: "competitor",
    title: "Competitor mentioned",
    description: "Customer references another product or brand.",
    opener: "I can look for a WyreStorm fit, but first I need to understand the role of that competitor product.",
    questions: [
      "Is the competitor SKU a fixed requirement or just an example?",
      "What feature matters most: I/O, distance, USB, scaling, audio or control?",
      "Is this a one-product replacement or a wider room design?",
    ],
    why: "Matching role first avoids false product comparisons based only on ports.",
    Icon: GitCompare,
  },
];

export function SalesHelperPage() {
  const [activeId, setActiveId] = useState(callPaths[0].id);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  const active = callPaths.find((item) => item.id === activeId) ?? callPaths[0];
  const ActiveIcon = active.Icon;
  const currentQuestion = active.questions[questionIndex] ?? active.questions[0];

  const noteText = useMemo(() => notes.join("\n"), [notes]);

  function selectPath(id: string) {
    setActiveId(id);
    setQuestionIndex(0);
    setAnswer("");
  }

  function saveAndNext() {
    if (answer.trim()) {
      setNotes((current) => [...current, `Q: ${currentQuestion}`, `A: ${answer.trim()}`, ""]);
    }

    setAnswer("");
    setQuestionIndex((current) => (current + 1 >= active.questions.length ? 0 : current + 1));
  }

  async function copyNotes() {
    if (!noteText.trim()) return;
    await navigator.clipboard.writeText(noteText);
  }

  return (
    <main className="wm-calm-page wm-calm-stack">
      <section className="wm-calm-hero">
        <div>
          <p className="wm-calm-kicker">Sales Language</p>
          <h1>Ask the next useful question.</h1>
          <p>
            Choose the call situation, ask one question, capture the answer, then continue or send the opportunity into Discovery.
          </p>
        </div>

        <div className="wm-calm-actions">
          <Link className="wm-calm-link-button primary" to="/wingman/guided-discovery">
            Guided Discovery
          </Link>
        </div>
      </section>

      <SalesToneQuickSetter context="salesHelper" surface="dark" />

      <section className="wm-calm-task-card">
        <p className="wm-calm-kicker">Conversation type</p>
        <h2>What is the customer talking about?</h2>

        <div className="wm-calm-choice-grid" style={{ marginTop: "1rem" }}>
          {callPaths.map(({ id, title, description, Icon }) => (
            <button
              key={id}
              type="button"
              className={id === active.id ? "wm-calm-choice-card is-selected" : "wm-calm-choice-card"}
              onClick={() => selectPath(id)}
            >
              <Icon aria-hidden="true" />
              <strong>{title}</strong>
              <span>{description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="wm-calm-task-card wm-calm-question">
        <p className="wm-calm-kicker">Ask this next</p>
        <h2><ActiveIcon aria-hidden="true" /> {active.title}</h2>
        <blockquote>{questionIndex === 0 ? active.opener : currentQuestion}</blockquote>

        <textarea
          className="wm-calm-textarea"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Capture the customer answer here..."
        />

        <div className="wm-calm-actions">
          <button className="wm-calm-button" type="button" onClick={() => setQuestionIndex((questionIndex + 1) % active.questions.length)}>
            Skip
          </button>
          <button className="wm-calm-button primary" type="button" onClick={saveAndNext}>
            Save and next
          </button>
        </div>
      </section>

      <details className="wm-calm-drawer">
        <summary>Why this matters</summary>
        <div className="wm-calm-drawer-body">
          <p>{active.why}</p>
        </div>
      </details>

      <details className="wm-calm-drawer">
        <summary>Show captured call notes</summary>
        <div className="wm-calm-drawer-body">
          {notes.length ? <pre>{noteText}</pre> : <p>No answers captured yet.</p>}
          <div className="wm-calm-actions">
            <button className="wm-calm-button" type="button" onClick={copyNotes}>Copy notes</button>
            <button className="wm-calm-button" type="button" onClick={() => setNotes([])}>Clear</button>
            <Link className="wm-calm-link-button primary" to="/wingman/proposal">Send to Proposal</Link>
          </div>
        </div>
      </details>
    </main>
  );
}
