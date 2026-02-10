import CritChip from "./CritChip";

export default function DiceBreakdown({ entry }) {
  return (
    <div className="grid gap-2">
      {entry.dice.map((d, idx) => (
        <div key={`${d.sides}-${idx}`} className="text-sm opacity-90">
          <span className="font-semibold">d{d.sides}:</span>{" "}
          <span className="inline-flex flex-wrap gap-1 align-middle">
            {d.results.map((r, i) => (
              <CritChip key={i} sides={d.sides} value={r} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
