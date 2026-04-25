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
    >
      <img src="/guru-bot.png" alt="Guru" className="wingman-guru-fab-image" />
    </button>
  );
}

export default WingmanGuruFab;