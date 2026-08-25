import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  HelpCircle,
  Zap,
} from "lucide-react";
import {
  applySmartDefaults,
  type QuickStartRoomType,
  quickStartConfigs,
  getQuickStartSummary,
} from "./discoveryQuickStart";
import type { DiscoveryAnswers } from "./discoveryTypes";

export function DiscoveryQuickStartEntry({ onAnswers }: { onAnswers: (answers: DiscoveryAnswers) => void }) {
  const [open, setOpen] = useState(false);
  if (open) return <div className="wm-discovery-question-layout"><DiscoveryQuickStart onSelect={(type) => { onAnswers(applySmartDefaults(type, {})); setOpen(false); }} onSkip={() => setOpen(false)} /></div>;
  return <div className="mx-auto mb-4 max-w-3xl"><button type="button" onClick={() => setOpen(true)} className="w-full rounded-xl border border-cyan-500/30 bg-cyan-900/20 px-4 py-3 text-left transition hover:bg-cyan-900/30"><div className="flex items-center gap-3"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-sm font-bold text-cyan-950">⚡</span><div><p className="text-sm font-bold text-cyan-300">Quick Start available</p><p className="text-xs text-[#8fb8d0]">Pre-fill common settings for meeting rooms, classrooms and more</p></div></div></button></div>;
}

type DiscoveryQuickStartProps = {
  onSelect: (roomType: QuickStartRoomType) => void;
  onSkip: () => void;
};

const roomTypeOrder: QuickStartRoomType[] = [
  "huddle-room",
  "meeting-room-small",
  "meeting-room-large",
  "boardroom",
  "classroom",
  "lecture-hall",
  "training-room",
  "custom",
];

export function DiscoveryQuickStart({
  onSelect,
  onSkip,
}: DiscoveryQuickStartProps) {
  const [selectedType, setSelectedType] =
    useState<QuickStartRoomType | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-900/40 px-4 py-2 text-sm font-bold text-cyan-300">
          <Zap className="h-4 w-4" />
          Quick Start
        </div>
        <h2 className="text-2xl font-black text-[#edf6ff]">
          What type of room is this?
        </h2>
        <p className="mt-2 text-sm text-[#8fb8d0]">
          Select a room type to pre-fill common settings. You can always adjust
          details later.
        </p>
      </div>

      {/* Room type grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roomTypeOrder.map((roomType) => {
          const config = quickStartConfigs[roomType];
          const isSelected = selectedType === roomType;
          const summary = getQuickStartSummary(roomType);

          return (
            <button
              key={roomType}
              type="button"
              onClick={() => setSelectedType(roomType)}
              className={`group relative rounded-2xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? "border-cyan-400 bg-cyan-900/30 shadow-lg shadow-cyan-900/20"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
              }`}
            >
              {/* Selection indicator */}
              {isSelected ? (
                <div className="absolute right-3 top-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400">
                    <Check className="h-3.5 w-3.5 text-cyan-900" />
                  </div>
                </div>
              ) : null}

              {/* Icon and label */}
              <div className="mb-3 flex items-center gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <p className="font-bold text-[#edf6ff]">{config.label}</p>
                  <p className="text-xs text-[#8fb8d0]">
                    {config.description}
                  </p>
                </div>
              </div>

              {/* Summary chips */}
              {summary.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {summary.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-[#cfe6f7]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Question count */}
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#6a97b0]">
                <Clock className="h-3 w-3" />
                ~{config.estimatedQuestions} questions
                {roomType === "custom" ? " (full workflow)" : ""}
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-5 py-2.5 text-sm font-semibold text-[#8fb8d0] transition hover:border-white/[0.2] hover:text-[#cfe6f7]"
        >
          <HelpCircle className="h-4 w-4" />
          Skip to full Discovery
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedType}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition ${
            selectedType
              ? "bg-cyan-500 text-cyan-950 hover:bg-cyan-400"
              : "cursor-not-allowed bg-white/[0.06] text-[#6a97b0]"
          }`}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Help text */}
      {selectedType && selectedType !== "custom" ? (
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-start gap-3">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
            <div>
              <p className="text-sm font-semibold text-[#edf6ff]">
                What happens next?
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8fb8d0]">
                Wingman will pre-fill common settings for a{" "}
                {quickStartConfigs[selectedType].label.toLowerCase()}. You'll
                answer a few essential questions, then can review and adjust any
                details before generating recommendations.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
