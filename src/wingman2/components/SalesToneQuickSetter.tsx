import { useEffect, useMemo, useState } from "react";
import { MessageCircle, MoveRight } from "lucide-react";
import {
  buildSalesConversationToneCopy,
  DEFAULT_SALES_CONVERSATION_TONE_ID,
  normalizeSalesConversationToneId,
  salesConversationToneOptions,
  type SalesConversationContext,
  type SalesConversationToneId,
} from "../lib/salesConversationTone";

const STORAGE_KEY = "wingman.salesLanguageMode.v1";

type SalesToneQuickSetterProps = {
  context: SalesConversationContext;
  className?: string;
  surface?: "light" | "dark";
};

function readStoredTone(): SalesConversationToneId {
  try {
    if (typeof window === "undefined") {
      return DEFAULT_SALES_CONVERSATION_TONE_ID;
    }

    return normalizeSalesConversationToneId(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_SALES_CONVERSATION_TONE_ID;
  }
}

export function SalesToneQuickSetter({ context, className = "", surface = "light" }: SalesToneQuickSetterProps) {
  const [activeToneId, setActiveToneId] = useState<SalesConversationToneId>(() => readStoredTone());
  const isDark = surface === "dark";

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, activeToneId);
    } catch {
      return;
    }
  }, [activeToneId]);

  const activeCopy = useMemo(() => {
    return buildSalesConversationToneCopy(context, activeToneId);
  }, [activeToneId, context]);

  return (
    <section
      className={[
        "mx-auto mb-5 w-full max-w-6xl rounded-3xl border p-4 shadow-sm",
        isDark
          ? "border-white/10 bg-white/[0.045] text-slate-100"
          : "border-amber-200 bg-amber-50/80 text-slate-950",
        className,
      ].join(" ")}
      aria-label="Sales language mode"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)]">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={[
                "grid h-9 w-9 place-items-center rounded-full",
                isDark ? "bg-amber-300 text-slate-950" : "bg-slate-950 text-amber-100",
              ].join(" ")}
            >
              <MessageCircle className="h-4 w-4" />
            </span>
            <div>
              <p
                className={[
                  "text-xs font-black uppercase tracking-[0.16em]",
                  isDark ? "text-amber-200" : "text-amber-900",
                ].join(" ")}
              >
                Sales language mode
              </p>
              <h2 className={["mt-1 text-lg font-black", isDark ? "text-white" : "text-slate-950"].join(" ")}>
                Set the tone before the detail.
              </h2>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {salesConversationToneOptions.map((option) => {
              const isActive = option.id === activeToneId;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveToneId(option.id)}
                  aria-pressed={isActive}
                  className={[
                    "rounded-2xl border px-3 py-2 text-left transition",
                    isActive
                      ? isDark
                        ? "border-amber-300 bg-amber-300 text-slate-950"
                        : "border-slate-950 bg-slate-950 text-white"
                      : isDark
                        ? "border-white/10 bg-white/[0.045] text-slate-200 hover:border-amber-300/60"
                        : "border-amber-200 bg-white text-slate-700 hover:border-amber-400",
                  ].join(" ")}
                >
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className={["mt-0.5 block text-xs", isActive ? "opacity-80" : "opacity-65"].join(" ")}>
                    {option.shortDescription}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={[
            "rounded-2xl border p-4",
            isDark ? "border-white/10 bg-slate-950/45" : "border-amber-200 bg-white",
          ].join(" ")}
        >
          <p className={["text-xs font-black uppercase tracking-[0.16em]", isDark ? "text-sky-200" : "text-sky-800"].join(" ")}>
            {activeCopy.title}
          </p>
          <p className={["mt-2 text-base font-black leading-7", isDark ? "text-white" : "text-slate-950"].join(" ")}>
            "{activeCopy.opener}"
          </p>
          <div className="mt-3 grid gap-2 text-sm font-semibold leading-6">
            <p className={isDark ? "text-slate-300" : "text-slate-700"}>{activeCopy.followUp}</p>
            <p className={["flex gap-2", isDark ? "text-amber-100" : "text-amber-950"].join(" ")}>
              <MoveRight className="mt-1 h-4 w-4 shrink-0" />
              <span>{activeCopy.handoff}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SalesToneQuickSetter;
