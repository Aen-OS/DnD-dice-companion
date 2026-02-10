import { toInt } from "@/lib/dice";

export default function RollControlsSingle({
  singleSides,
  setSingleSides,
  singleRollType,
  setSingleRollType,
}) {
  const isD20 = (toInt(singleSides) ?? 20) === 20;

  return (
    <section className="grid gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <label className="form-control w-full sm:max-w-xs">
          <div className="label">
            <span className="label-text">Sides</span>
            <span className="label-text-alt">d{singleSides}</span>
          </div>
          <input
            type="number"
            min={2}
            className="input input-bordered w-full"
            value={singleSides}
            onChange={(e) => setSingleSides(e.target.value)}
          />
        </label>

        <div className="flex-1">
          <div className="label">
            <span className="label-text">d20 Options</span>
            <span className="label-text-alt">adv/dis only for d20</span>
          </div>
          <div className="join w-full">
            <button
              className={`btn join-item w-1/3 ${singleRollType === "normal" ? "btn-active" : ""}`}
              onClick={() => setSingleRollType("normal")}
            >
              Normal
            </button>
            <button
              className={`btn join-item w-1/3 ${singleRollType === "adv" ? "btn-active" : ""}`}
              onClick={() => setSingleRollType("adv")}
              disabled={!isD20}
              title="Roll 2d20 keep highest"
            >
              Advantage
            </button>
            <button
              className={`btn join-item w-1/3 ${singleRollType === "dis" ? "btn-active" : ""}`}
              onClick={() => setSingleRollType("dis")}
              disabled={!isD20}
              title="Roll 2d20 keep lowest"
            >
              Disadv.
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
