export default function CritChip({ sides, value }) {
  const isD20 = sides === 20;
  const isNat20 = isD20 && value === 20;
  const isNat1 = isD20 && value === 1;

  if (!isD20) return <span className="badge badge-ghost">{value}</span>;
  if (isNat20)
    return <span className="badge badge-success font-semibold">20</span>;
  if (isNat1) return <span className="badge badge-error font-semibold">1</span>;
  return <span className="badge badge-ghost">{value}</span>;
}
