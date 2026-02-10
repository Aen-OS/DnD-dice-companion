import { MAX_DICE, toInt } from "@/lib/dice";

export default function RollControlsMixed({ pool, setPool }) {
  const totalDice = pool.reduce((sum, r) => sum + (toInt(r.count) ?? 0), 0);

  function addRow() {
    setPool((prev) => [
      ...prev,
      { id: String(Date.now()) + Math.random(), count: 1, sides: 6 },
    ]);
  }
  function removeRow(id) {
    setPool((prev) => prev.filter((r) => r.id !== id));
  }
  function updateRow(id, key, value) {
    setPool((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm opacity-70">
          Total dice in pool: <span className="font-semibold">{totalDice}</span>{" "}
          / {MAX_DICE}
        </div>
        <button className="btn btn-outline btn-sm" onClick={addRow}>
          + Add die type
        </button>
      </div>

      <div className="grid gap-3">
        {pool.map((row, idx) => (
          <div
            key={row.id}
            className="grid grid-cols-12 gap-3 items-end bg-base-200 rounded-xl p-3"
          >
            <div className="col-span-12 sm:col-span-5">
              <label className="form-control">
                <div className="label">
                  <span className="label-text">Count</span>
                  <span className="label-text-alt">Row {idx + 1}</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={MAX_DICE}
                  className="input input-bordered"
                  value={row.count}
                  onChange={(e) => updateRow(row.id, "count", e.target.value)}
                />
              </label>
            </div>

            <div className="col-span-12 sm:col-span-5">
              <label className="form-control">
                <div className="label">
                  <span className="label-text">Sides</span>
                  <span className="label-text-alt">d{row.sides}</span>
                </div>
                <input
                  type="number"
                  min={2}
                  className="input input-bordered"
                  value={row.sides}
                  onChange={(e) => updateRow(row.id, "sides", e.target.value)}
                />
              </label>
            </div>

            <div className="col-span-12 sm:col-span-2">
              <button
                className="btn btn-ghost w-full"
                onClick={() => removeRow(row.id)}
                disabled={pool.length <= 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
