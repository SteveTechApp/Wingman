type WingmanGuruFabProps = {
  open: boolean;
  onClick: () => void;
};

export function WingmanGuruFab({ open, onClick }: WingmanGuruFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close Guru assistant" : "Open Guru assistant"}
      aria-pressed={open}
      className="wingman-guru-fab"
      data-open={open ? "true" : "false"}
    >
      <span className="wingman-guru-fab-sweep" aria-hidden="true" />
      <span className="wingman-guru-fab-glow" aria-hidden="true" />
      <img src="/guru-bot.png" alt="Guru" className="wingman-guru-fab-image" />
    </button>
  );
}

export default WingmanGuruFab;