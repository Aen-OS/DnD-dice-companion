import DiceBreakdown from "./DiceBreakdown";

export default function HistoryCard({
  history,
  onClearHistory,
  onClearLastRoll,
}) {
  return (
    <div className="bg-base-100 rounded-2xl shadow p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">History</h2>
        <span className="badge">{history.length}/50</span>
      </div>

      {history.length === 0 ? (
        <p className="mt-3 opacity-70">No rolls yet.</p>
      ) : (
        <div className="mt-4 grid gap-3 max-h-[480px] overflow-auto pr-1">
          {history.map((h) => (
            <div key={h.id} className="bg-base-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{h.label}</div>
                <div className="text-sm opacity-70 whitespace-nowrap">
                  {h.at}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-sm opacity-80">
                  subtotal {h.subtotal}{" "}
                  {h.modifier ? (
                    <>{h.modifier >= 0 ? `+${h.modifier}` : h.modifier} = </>
                  ) : (
                    " = "
                  )}
                  <span className="font-semibold">{h.total}</span>
                </div>

                {h.dice.some(
                  (d) => d.sides === 20 && d.results.includes(20),
                ) && <span className="badge badge-success">Crit 20</span>}
                {h.dice.some(
                  (d) => d.sides === 20 && d.results.includes(1),
                ) && <span className="badge badge-error">Nat 1</span>}
              </div>

              <div className="mt-2">
                <DiceBreakdown entry={h} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button className="btn btn-outline btn-sm" onClick={onClearHistory}>
          Clear history
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onClearLastRoll}>
          Clear last roll
        </button>
      </div>
    </div>
  );
}
