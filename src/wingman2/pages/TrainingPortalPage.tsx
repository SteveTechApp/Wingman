import { useState } from "react";
import "../styles/wingman-training-portal.css";
import {
  ArrowRight,
  BookOpen,
  Cable,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  EthernetPort,
  Gauge,
  GraduationCap,
  Headphones,
  Lightbulb,
  Monitor,
  Network,
  Play,
  Radio,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";

type LearningPath = {
  id: string;
  label: string;
  title: string;
  description: string;
  duration: string;
  lessons: number;
  icon: LucideIcon;
  outcome: string;
  topics: string[];
};

const learningPaths: LearningPath[] = [
  {
    id: "signal",
    label: "Start here",
    title: "Follow the signal",
    description: "Learn the complete AV journey from a source device to the audience, and the questions that expose risk at every hand-off.",
    duration: "35 min",
    lessons: 5,
    icon: Cable,
    outcome: "Map a customer requirement into a credible signal path.",
    topics: ["Sources and formats", "Switching and distribution", "Transport and distance", "Displays and destinations"],
  },
  {
    id: "video",
    label: "Video essentials",
    title: "Resolution is only the start",
    description: "Understand bandwidth, colour, scaling, EDID and HDCP well enough to qualify a project without drowning the customer in jargon.",
    duration: "28 min",
    lessons: 4,
    icon: Monitor,
    outcome: "Explain why a picture may fail even when every product says 4K.",
    topics: ["4K and refresh rate", "Chroma and bandwidth", "EDID", "HDCP"],
  },
  {
    id: "transport",
    label: "System design",
    title: "Choose the right transport",
    description: "Compare HDMI, HDBaseT, fibre and AV over IP by application, scale, distance and operational ownership.",
    duration: "32 min",
    lessons: 5,
    icon: EthernetPort,
    outcome: "Recommend an architecture for the reason that matters to the buyer.",
    topics: ["Copper limits", "HDBaseT", "Fibre", "1G and 10G AVoIP"],
  },
  {
    id: "uc",
    label: "Collaboration",
    title: "Make the room feel effortless",
    description: "Connect cameras, microphones, speakers, USB hosts and conferencing platforms into a room people can actually operate.",
    duration: "24 min",
    lessons: 4,
    icon: Users,
    outcome: "Discover how people need the room to work before specifying its technology.",
    topics: ["BYOD and BYOM", "USB extension", "Audio pickup", "Room control"],
  },
];

const signalStages = [
  { label: "Source", example: "Laptop · camera · player", question: "What is being shown?", icon: Play },
  { label: "Process", example: "Switch · scale · compose", question: "What must happen to it?", icon: SlidersHorizontal },
  { label: "Transport", example: "Copper · fibre · network", question: "How far must it travel?", icon: Radio },
  { label: "Destination", example: "Display · recorder · USB host", question: "Where must it arrive?", icon: Monitor },
];

const fieldNotes = [
  { term: "EDID", meaning: "The display tells the source which picture and audio formats it can accept.", ask: "Are all displays the same capability?", icon: Gauge },
  { term: "HDCP", meaning: "Content protection must be supported across every device in the chain.", ask: "Will protected streaming content be shown?", icon: ShieldCheck },
  { term: "Latency", meaning: "The delay between an action and its result; visible in speech, cameras and interaction.", ask: "Is this for viewing, presenting or live interaction?", icon: Clock3 },
  { term: "Audio path", meaning: "Sound often needs a different destination and control plan from the picture.", ask: "Where should sound be heard and who controls it?", icon: Headphones },
];

const discoveryQuestions = [
  "How many sources and destinations are there now — and in two years?",
  "Must every screen show something different, or can outputs be mirrored?",
  "What are the real cable-route distances, not the straight-line distances?",
  "Who owns the network, control system and ongoing support?",
  "What does a successful day in this room look like for the people using it?",
];

export function TrainingPortalPage() {
  const [activePath, setActivePath] = useState(learningPaths[0]);

  return (
    <main data-wingman-page="true" data-wingman-page-key="Learn" className="wm-training-page">
      <section className="wm-training-hero" aria-labelledby="training-title">
        <div className="wm-training-hero__copy">
          <p className="wm-training-kicker"><GraduationCap aria-hidden="true" /> Wingman academy</p>
          <h1 id="training-title">What you need to know about <span>AV technology</span></h1>
          <p className="wm-training-hero__intro">A technical sales field guide for better discovery, stronger recommendations and fewer surprises after the quote.</p>
          <div className="wm-training-hero__actions">
            <button type="button" onClick={() => document.getElementById("learning-paths")?.scrollIntoView({ behavior: "smooth" })}>
              Start with the signal path <ArrowRight aria-hidden="true" />
            </button>
            <Link to={routeCatalogByKey.glossary.path}><Search aria-hidden="true" /> Search the AV glossary</Link>
          </div>
        </div>
        <div className="wm-training-hero__diagram" aria-label="The four stages of an AV signal path">
          {signalStages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div className="wm-training-signal-node" key={stage.label}>
                <span className="wm-training-signal-node__index">0{index + 1}</span>
                <Icon aria-hidden="true" />
                <strong>{stage.label}</strong>
                <small>{stage.example}</small>
                <p>{stage.question}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="wm-training-section" id="learning-paths" aria-labelledby="paths-title">
        <div className="wm-training-section__heading">
          <div><p className="wm-training-kicker">Learn by customer conversation</p><h2 id="paths-title">Build technical confidence in the right order</h2></div>
          <p>Each path turns engineering concepts into discovery questions, buying consequences and language you can use with a customer.</p>
        </div>
        <div className="wm-training-path-layout">
          <div className="wm-training-path-list" role="tablist" aria-label="Learning paths">
            {learningPaths.map((path, index) => {
              const Icon = path.icon;
              const active = activePath.id === path.id;
              return (
                <button key={path.id} type="button" role="tab" aria-selected={active} className={active ? "is-active" : ""} onClick={() => setActivePath(path)}>
                  <span className="wm-training-path-number">0{index + 1}</span><Icon aria-hidden="true" />
                  <span><small>{path.label}</small><strong>{path.title}</strong></span><ChevronRight aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <article className="wm-training-path-detail" role="tabpanel" aria-live="polite">
            <div className="wm-training-path-detail__meta"><span>{activePath.lessons} lessons</span><span><Clock3 aria-hidden="true" /> {activePath.duration}</span></div>
            <h3>{activePath.title}</h3><p>{activePath.description}</p>
            <ul>{activePath.topics.map((topic) => <li key={topic}><Check aria-hidden="true" /> {topic}</li>)}</ul>
            <div className="wm-training-outcome"><Lightbulb aria-hidden="true" /><span><small>You will be able to</small><strong>{activePath.outcome}</strong></span></div>
            <Link className="wm-training-topic-link" to={routeCatalogByKey.glossary.path}>Explore this topic in the glossary <ArrowRight aria-hidden="true" /></Link>
          </article>
        </div>
      </section>

      <section className="wm-training-section wm-training-field" aria-labelledby="field-title">
        <div className="wm-training-section__heading">
          <div><p className="wm-training-kicker">Field notes</p><h2 id="field-title">Translate specifications into consequences</h2></div>
          <Link to={routeCatalogByKey.glossary.path}>Explore all terms <ArrowRight aria-hidden="true" /></Link>
        </div>
        <div className="wm-training-field-grid">
          {fieldNotes.map((note) => { const Icon = note.icon; return (
            <article key={note.term}><div><Icon aria-hidden="true" /><h3>{note.term}</h3></div><p>{note.meaning}</p><aside><span>Ask the customer</span>{note.ask}</aside></article>
          ); })}
        </div>
      </section>

      <section className="wm-training-checklist" aria-labelledby="checklist-title">
        <div className="wm-training-checklist__intro">
          <span><CircleAlert aria-hidden="true" /></span><p className="wm-training-kicker">Before you recommend a product</p>
          <h2 id="checklist-title">Five questions protect almost every AV opportunity.</h2>
          <p>Good technical selling starts with the application. The specification comes after the constraints are understood.</p>
          <Link to={routeCatalogByKey.discovery.path}>Open guided discovery <ArrowRight aria-hidden="true" /></Link>
        </div>
        <ol>{discoveryQuestions.map((question, index) => <li key={question}><span>{index + 1}</span><p>{question}</p></li>)}</ol>
      </section>

      <section className="wm-training-next" aria-label="Additional learning tools">
        <div><Sparkles aria-hidden="true" /><span><small>Put it into practice</small><strong>Learn a family, test a claim, then use it in discovery.</strong></span></div>
        <nav>
          <Link to={routeCatalogByKey.productFamilies.path}><Network aria-hidden="true" /> Product family learning</Link>
          <Link to={routeCatalogByKey.productCallCards.path}><BookOpen aria-hidden="true" /> Product call cards</Link>
        </nav>
      </section>
    </main>
  );
}
