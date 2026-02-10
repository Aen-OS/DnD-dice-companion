import { MAX_DICE } from "@/lib/dice";

export default function RollControlsSame({
  sameCount,
  setSameCount,
  sameSides,
  setSameSides,
}) {
  return (
    <section className="grid gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="form-control">
          <div className="label">
            <span className="label-text">Count</span>
            <span className="label-text-alt">max {MAX_DICE}</span>
          </div>
          <input
            type="number"
            min={1}
            max={MAX_DICE}
            className="input input-bordered"
            value={sameCount}
            onChange={(e) => setSameCount(e.target.value)}
          />
        </label>

        <label className="form-control">
          <div className="label">
            <span className="label-text">Sides</span>
            <span className="label-text-alt">d{sameSides}</span>
          </div>
          <input
            type="number"
            min={2}
            className="input input-bordered"
            value={sameSides}
            onChange={(e) => setSameSides(e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
