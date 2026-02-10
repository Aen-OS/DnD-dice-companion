export default function ModifierField({ modifier, setModifier }) {
  return (
    <label className="form-control w-full sm:max-w-xs">
      <div className="label">
        <span className="label-text">Modifier</span>
        <span className="label-text-alt">applies to total</span>
      </div>
      <input
        type="number"
        className="input input-bordered w-full"
        value={modifier}
        onChange={(e) => setModifier(e.target.value)}
        placeholder="0"
      />
    </label>
  );
}
