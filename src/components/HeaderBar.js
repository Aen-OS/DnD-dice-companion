export default function HeaderBar({ isRolling, onShare, onClear }) {
  return (
    <div
      className={`navbar bg-base-100 rounded-2xl shadow ${isRolling ? "shake" : ""}`}
    >
      <div className="flex-1">
        <span className="btn btn-ghost text-xl font-mono">
          D&amp;D Dice Companion
        </span>
      </div>
      <div className="flex-none gap-2">
        <button
          className="btn btn-secondary btn-outline mr-3"
          onClick={onShare}
          title="Copy a link to this setup"
        >
          Share
        </button>
        <button className="btn btn-outline" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
