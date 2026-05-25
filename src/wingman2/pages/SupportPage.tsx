import {
  Bot,
  BookOpen,
  FileCheck2,
  LifeBuoy,
  MessageSquareText,
  ShieldQuestion,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

const supportTasks = [
  {
    title: "Ask Guru",
    description: "Use this for product, terminology, system design or quick AV questions.",
    path: "/wingman/support",
    Icon: Bot,
  },
  {
    title: "Escalate to pre-sales",
    description: "Use when the architecture, USB, network, wall or compatibility risk is not clear.",
    path: "/wingman/guided-discovery",
    Icon: LifeBuoy,
  },
  {
    title: "Request proposal review",
    description: "Use when the proposal needs a second-pass technical check before sending.",
    path: "/wingman/proposal",
    Icon: FileCheck2,
  },
  {
    title: "Check terminology",
    description: "Clarify AV terms such as HDBaseT, AVoIP, multiview, KVM, EDID, Dante or NDI.",
    path: "/wingman/product-families",
    Icon: BookOpen,
  },
  {
    title: "Check system risk",
    description: "Validate distance, USB, audio, control, network or accessory assumptions.",
    path: "/wingman/guided-discovery",
    Icon: ShieldQuestion,
  },
  {
    title: "Open product support path",
    description: "Use when the next action is product selection, comparison or BOM creation.",
    path: "/wingman/finder",
    Icon: Wrench,
  },
];

export function SupportPage() {
  return (
    <main className="wm-calm-page wm-calm-stack">
      <section className="wm-calm-hero">
        <div>
          <p className="wm-calm-kicker">Support</p>
          <h1>Choose the help you need now.</h1>
          <p>
            Support should not be a readiness dashboard. It should help the user get unstuck and move to the right next action.
          </p>
        </div>

        <div className="wm-calm-actions">
          <Link className="wm-calm-link-button primary" to="/wingman/guided-discovery">
            Start Discovery
          </Link>
        </div>
      </section>

      <section className="wm-calm-launch-grid">
        {supportTasks.map(({ title, description, path, Icon }) => (
          <Link key={title} className="wm-calm-launch-card" to={path}>
            <Icon aria-hidden="true" />
            <strong>{title}</strong>
            <span>{description}</span>
          </Link>
        ))}
      </section>

      <section className="wm-calm-task-card">
        <p className="wm-calm-kicker">Guru prompt</p>
        <h2>Ask a direct question</h2>
        <p>
          Example: "Which WyreStorm product fits two HDMI sources to one display with a 30m cable run and no USB?"
        </p>
        <div className="wm-calm-actions" style={{ marginTop: "1rem" }}>
          <Link className="wm-calm-link-button" to="/wingman/call-cards">
            <MessageSquareText aria-hidden="true" />
            Open Live Call Cards
          </Link>
        </div>
      </section>
    </main>
  );
}
