import { Bot } from "lucide-react";

type WingmanGuruFabProps = {
  open: boolean;
  onClick: () => void;
};

export function WingmanGuruFab({ open, onClick }: WingmanGuruFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "fixed bottom-6 right-6 z-50 inline-flex items-center gap-3 rounded-full border px-5 py-3 shadow-2xl transition-all duration-200",
        open
          ? "border-orange-400 bg-orange-500 text-slate-950"
          : "border-orange-400/40 bg-slate-950 text-orange-100 hover:border-orange-300 hover:bg-slate-900",
      ].join(" ")}
      aria-label="Toggle Wingman Guru helper"
    >
      <Bot className="h-5 w-5" />
      <span className="text-sm font-semibold">Wingman Guru</span>
    </button>
  );
}
