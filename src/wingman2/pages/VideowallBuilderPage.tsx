import { Cable, CheckCircle2, Circle, Clock3, Monitor, Network, PanelTop, Settings2, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { RecommendationCard } from "../components/RecommendationCard";
import { SalesToneQuickSetter } from "../components/SalesToneQuickSetter";
import { SectionCard } from "../components/SectionCard";
import { WingmanSelectionCard } from "../components/ui/WingmanSelectionCard";
import { WingmanSelectionGrid } from "../components/ui/WingmanSelectionGrid";

const wallTypes = [
  {
    key: "led",
    label: "LED videowall",
    summary: "Use when bezel-free impact, large-format scale, and long-term visual impact are the priority.",
    recommendationTitle: "Premium LED design direction",
    recommendationSku: "VIDEOWALL-LED-CONCEPT",
    confidence: 84,
    rationale: [
      "Strong path for premium large-format presentation impact.",
      "Best when the customer wants a single large canvas rather than tiled display panels.",
      "Requires careful discussion around pixel pitch, viewing distance, service access, controller path, and content resolution.",
    ],
    exampleWallSize: "6.0m x 2.0m",
    targetEnvironment: "Corporate foyer / experience area",
    signalPath: "Sources â†’ processing / controller â†’ LED controller â†’ LED cabinet canvas",
    caution: "Confirm viewing distance, pixel pitch, service access, heat, mounting structure, and controller architecture before final recommendation.",
    plainEnglish:
      "An LED wall is built from LED cabinets or modules. It behaves like one large canvas, but the processor or LED controller must correctly map the incoming image to the physical LED layout.",
    wyrestormPath:
      "Consider NHD-0401-MV for advanced LED-resolution multiview workflows, SW-0206-VW or SW-0204-VW for dedicated processing, or NetworkHD where flexible source routing is required.",
  },
  {
    key: "lcd",
    label: "LCD videowall",
    summary: "Use when standard display panels, fixed wall layouts, cost control, and straightforward serviceability are the priority.",
    recommendationTitle: "Structured LCD wall direction",
    recommendationSku: "VIDEOWALL-LCD-CONCEPT",
    confidence: 79,
    rationale: [
      "Better suited to cost-conscious indoor wall projects using standard commercial displays.",
      "Good fit where bezels are acceptable and the customer needs predictable tiled-display behaviour.",
      "Requires decisions around full-canvas mode, per-display content, matrix routing, AVoIP, or dedicated wall processing.",
    ],
    exampleWallSize: "3 x 3 55in layout",
    targetEnvironment: "Control room / reception signage / teaching wall",
    signalPath: "Sources â†’ processor / matrix / AVoIP â†’ individual LCD displays",
    caution: "Confirm bezel expectations, mount alignment, display model, processor layout support, and whether the customer needs one image or multiple layouts.",
    plainEnglish:
      "An LCD videowall is multiple flat panels working together. The design must decide whether the wall shows one large image, separate content on each display, or mixed layouts.",
    wyrestormPath:
      "Consider SW-0206-VW or SW-0204-VW for dedicated wall processing, seamless matrix products where fixed-I/O switching and scaling are useful, or NetworkHD when flexible routing and expansion are needed.",
  },
] as const;

type WallTypeKey = (typeof wallTypes)[number]["key"];
type ProgressState = "completed" | "current" | "upcoming";

const signalFlow: Array<{
  label: string;
  Icon: LucideIcon;
  led: string;
  lcd: string;
}> = [
  {
    label: "Sources",
    Icon: PanelTop,
    led: "Media players, laptops, signage systems, camera feeds, or control sources create the content.",
    lcd: "Media players, PCs, signage players, presentation sources, or camera feeds create the content.",
  },
  {
    label: "Processing",
    Icon: Settings2,
    led: "A processor, multiview unit, AV-over-IP system, or LED controller maps the source to the LED canvas.",
    lcd: "A wall processor, seamless matrix, matrix, or AV-over-IP system decides what each display shows.",
  },
  {
    label: "Transport",
    Icon: Cable,
    led: "Signals move over HDMI, HDBaseT, fibre, or AV-over-IP depending on distance and flexibility.",
    lcd: "Signals move to each display using HDMI, HDBaseT, fibre, or AV-over-IP depending on wall size and source location.",
  },
  {
    label: "Displays",
    Icon: Monitor,
    led: "LED cabinets or modules form a single large image surface.",
    lcd: "LCD panels form a tiled wall, with bezels, alignment, and display control to consider.",
  },
  {
    label: "Control",
    Icon: Network,
    led: "Control handles source selection, presets, layouts, power state, and operator/user control.",
    lcd: "Control handles layout presets, display power, source routing, and user/operator access.",
  },
];

const teachingQuestions = [
  "Is the customer expecting one large image, separate content per display, multiview, signage, or mixed layouts?",
  "How many sources need to appear, and do they need to change during use?",
  "Where are the sources physically located compared with the wall?",
  "Who controls layouts: end user, operator, room control system, signage software, or AV support?",
  "Which matters most: image impact, flexibility, low latency, simplicity, image quality, or future expansion?",
];

const designFactors = [
  "Wall type: LED or LCD",
  "Wall size and aspect ratio",
  "Viewing distance",
  "Pixel pitch or bezel strategy",
  "Number of sources",
  "Required layouts",
  "Control method",
  "Signal distance and cable route",
];

const builderOutputs: {
  label: string;
  routeKey: WingmanRouteKey;
  state: ProgressState;
}[] = [
  { label: "Choose LED or LCD wall direction", routeKey: "videowall", state: "current" },
  { label: "Create videowall project brief", routeKey: "projects", state: "upcoming" },
  { label: "Attach recommended signal and control path", routeKey: "compare", state: "upcoming" },
  { label: "Send validated summary to proposal builder", routeKey: "proposal", state: "upcoming" },
  { label: "Create customer assumptions list", routeKey: "support", state: "upcoming" },
];

function progressClasses(state: ProgressState) {
  switch (state) {
    case "completed":
      return {
        wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/70",
        icon: "text-emerald-600",
        badge: "bg-emerald-100 text-emerald-700",
        label: "Completed",
      };
    case "current":
      return {
        wrapper: "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100/70",
        icon: "text-amber-600",
        badge: "bg-amber-100 text-amber-700",
        label: "Current",
      };
    default:
      return {
        wrapper: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
        icon: "text-slate-400",
        badge: "bg-slate-200 text-slate-600",
        label: "To do",
      };
  }
}

function progressIcon(state: ProgressState) {
  switch (state) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5" />;
    case "current":
      return <Clock3 className="h-5 w-5" />;
    default:
      return <Circle className="h-5 w-5" />;
  }
}

export function VideowallBuilderPage() {
  const [selectedWallType, setSelectedWallType] = useState<WallTypeKey | null>(null);

  const wallType = useMemo(() => {
    return wallTypes.find((item) => item.key === selectedWallType) ?? null;
  }, [selectedWallType]);

  const outputs = useMemo(() => {
    if (!wallType) {
      return builderOutputs;
    }

    return builderOutputs.map((item, index) => {
      if (index === 0) {
        return { ...item, state: "completed" as ProgressState };
      }

      if (index === 1) {
        return { ...item, state: "current" as ProgressState };
      }

      return item;
    });
  }, [wallType]);

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="LED / LCD Videowall Builder"
        title="Start with the wall type before choosing the product path."
        purpose="Choose LED or LCD first, then work through wall behaviour, signal flow, processing, transport, displays, and control before turning the requirement into a recommendation."
        nextMove="Select LED or LCD, confirm the desired wall behaviour, then decide whether the project needs a dedicated processor, matrix, AV-over-IP, or proposal output."
        actions={[
          { label: "Open discovery", to: routeCatalogByKey.discovery.path },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <SalesToneQuickSetter context="videowall" />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="1. Choose wall type"
          subtitle="The design starts here. LED and LCD walls have different physical, commercial, and processing requirements."
        >
          <WingmanSelectionGrid columns={2}>
            {wallTypes.map((type) => {
              const isActive = type.key === selectedWallType;

              return (
                <WingmanSelectionCard
                  key={type.key}
                  onClick={() => setSelectedWallType(type.key)}
                  title={type.label}
                  description={type.summary}
                  eyebrow={type.key === "led" ? "Bezel-free canvas" : "Tiled display wall"}
                  icon={type.key === "led" ? PanelTop : Monitor}
                  accent={type.key === "led" ? "purple" : "blue"}
                  selected={isActive}
                  indicator={isActive ? "recommended" : undefined}
                  metaBadges={[isActive ? "Selected" : `Select ${type.key.toUpperCase()}`]}
                />
              );
            })}
          </WingmanSelectionGrid>

          {!wallType ? (
            <div className="mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-amber-950">
              <p className="text-sm font-black uppercase tracking-[0.14em]">Start from the beginning</p>
              <p className="mt-2 text-sm leading-6">
                No recommendation is loaded yet. Choose LED or LCD first, then Wingman will reveal the relevant
                signal-flow explanation, questions, and product-path guidance.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">Core design inputs</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {designFactors.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-900">Example wall summary</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div>
                      <p className="text-slate-500">Wall type</p>
                      <p className="font-semibold text-slate-900">{wallType.label}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Wall size</p>
                      <p className="font-semibold text-slate-900">{wallType.exampleWallSize}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Target environment</p>
                      <p className="font-semibold text-slate-900">{wallType.targetEnvironment}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Signal path</p>
                      <p className="font-semibold text-slate-900">{wallType.signalPath}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950">
                <p className="text-sm font-black uppercase tracking-[0.14em]">How this AV system works</p>
                <p className="mt-2 text-sm leading-6">{wallType.plainEnglish}</p>

                <div className="mt-5 grid gap-3 lg:grid-cols-5">
                  {signalFlow.map(({ label, Icon, led, lcd }, index) => (
                    <div key={label} className="relative rounded-2xl border border-sky-200 bg-white p-4 text-sm leading-6">
                      <div className="flex items-center gap-2 font-black text-sky-950">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                      <p className="mt-2 text-sky-800">{selectedWallType === "led" ? led : lcd}</p>
                      {index < signalFlow.length - 1 ? (
                        <span className="mt-3 hidden text-xs font-black uppercase tracking-[0.14em] text-sky-500 lg:block">
                          flows to next step
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-2xl border border-sky-200 bg-white p-4">
                    <p className="text-sm font-black text-sky-950">WyreStorm path to consider</p>
                    <p className="mt-2 text-sm leading-6 text-sky-800">{wallType.wyrestormPath}</p>
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-white p-4">
                    <p className="text-sm font-black text-sky-950">Common beginner mistake</p>
                    <p className="mt-2 text-sm leading-6 text-sky-800">
                      Do not start with a processor SKU until the layout behaviour is clear: full canvas, per-display
                      content, signage, multiview, or mixed layouts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">Questions that teach the design</p>
                <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  {teachingQuestions.map((question) => (
                    <div key={question} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      {question}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SectionCard>

        <div className="space-y-6">
          {wallType ? (
            <RecommendationCard
              title={wallType.recommendationTitle}
              sku={wallType.recommendationSku}
              status="recommended"
              confidence={wallType.confidence}
              rationale={wallType.rationale}
              caution={wallType.caution}
              actionTo={routeCatalogByKey.proposal.path}
            />
          ) : (
            <SectionCard
              title="Recommendation pending"
              subtitle="Wingman will not recommend a video wall path until LED or LCD has been selected."
            >
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                Start by choosing <strong>LED videowall</strong> or <strong>LCD videowall</strong>. This prevents the page
                from defaulting to an LED recommendation before the user has made the first design decision.
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Builder outputs"
            subtitle="Use this progress guide to keep the sales motion structured and route each next action into the right Wingman workspace."
          >
            <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Completed</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Current</span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-600">To do</span>
            </div>

            <div className="grid gap-3 text-sm">
              {outputs.map((item) => {
                const tone = progressClasses(item.state);
                const destination = routeCatalogByKey[item.routeKey];

                return (
                  <Link
                    key={item.label}
                    to={destination.path}
                    className={`rounded-2xl border px-4 py-4 transition ${tone.wrapper}`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <span className="inline-flex items-center gap-3 font-medium">
                        <span className={tone.icon}>{progressIcon(item.state)}</span>
                        {item.label}
                      </span>

                      <span className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.badge}`}
                        >
                          {tone.label}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Open {destination.navLabel}
                        </span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default VideowallBuilderPage;
