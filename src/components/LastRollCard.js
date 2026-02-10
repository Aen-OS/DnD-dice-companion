import DiceBreakdown from "./DiceBreakdown";

export default function LastRollCard({
  isRolling,
  lastRoll,
  onReroll,
  onCopyShare,
}) {
  return (
    <div
      className={`bg-base-100 rounded-2xl shadow p-4 sm:p-6 ${isRolling ? "shake" : ""}`}
    >
      <h2 className="text-lg font-semibold">Last Roll</h2>

      {!lastRoll ? (
        <p className="mt-3 opacity-70">Roll some dice to see results here.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="badge badge-outline">{lastRoll.label}</div>
            <div className="text-sm opacity-70 whitespace-nowrap">
              {lastRoll.at}
            </div>
          </div>

          <div className="stats stats-vertical bg-base-200 rounded-xl">
            <div className="stat">
              <div className="stat-title">Subtotal</div>
              <div className="stat-value text-2xl">{lastRoll.subtotal}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Modifier</div>
              <div className="stat-value text-2xl">
                {lastRoll.modifier >= 0
                  ? `+${lastRoll.modifier}`
                  : lastRoll.modifier}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">Total</div>
              <div className="stat-value">{lastRoll.total}</div>
              {lastRoll.meta?.keep && (
                <div className="stat-desc">
                  Kept {lastRoll.meta.keep === "high" ? "highest" : "lowest"}:{" "}
                  <span className="font-semibold">{lastRoll.meta.kept}</span>{" "}
                  (dropped {lastRoll.meta.dropped})
                </div>
              )}
            </div>
          </div>

          <div className="bg-base-200 rounded-xl p-3">
            <DiceBreakdown entry={lastRoll} />
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-outline"
              onClick={onReroll}
              disabled={isRolling}
            >
              Re-roll
            </button>
            <button className="btn btn-ghost" onClick={onCopyShare}>
              Copy share link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
