export default function RollButtonRow({
  isRolling,
  rollButtonLabel,
  onRoll,
  onCleanUrl,
}) {
  return (
    <div className="flex items-center gap-3">
      <button className="btn btn-primary" onClick={onRoll} disabled={isRolling}>
        {isRolling ? (
          <span className="inline-flex items-center gap-2">
            <span className="loading loading-spinner loading-sm" />
            Rolling…
          </span>
        ) : (
          rollButtonLabel
        )}
      </button>

      <button
        className="btn btn-outline"
        onClick={onCleanUrl}
        title="Remove share state from URL"
      >
        Clean URL
      </button>
    </div>
  );
}
