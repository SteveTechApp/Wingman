type WingmanGuruFabProps = {
  open: boolean;
  onClick: () => void;
};

export function WingmanGuruFab({ open, onClick }: WingmanGuruFabProps) {
  if (open) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Guru technical assistant"
      aria-pressed="false"
      className="wingman-guru-fab"
      data-open="false"
    >
      <span className="wingman-guru-fab-sweep" aria-hidden="true" />
      <span className="wingman-guru-fab-glow" aria-hidden="true" />
      <img src="/guru-bot.png" alt="Guru" className="wingman-guru-fab-image" width={64} height={64} decoding="async" loading="eager" />
    </button>
  );
}

export default WingmanGuruFab;
