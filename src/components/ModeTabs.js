export default function ModeTabs({ mode, setMode, clearMessage }) {
  return (
    <div className="tabs tabs-boxed">
      <button
        className={`tab ${mode === "single" ? "tab-active" : ""}`}
        onClick={() => {
          setMode("single");
          clearMessage?.();
        }}
      >
        Single
      </button>
      <button
        className={`tab ${mode === "same" ? "tab-active" : ""}`}
        onClick={() => {
          setMode("same");
          clearMessage?.();
        }}
      >
        Multiple (same)
      </button>
      <button
        className={`tab ${mode === "mixed" ? "tab-active" : ""}`}
        onClick={() => {
          setMode("mixed");
          clearMessage?.();
        }}
      >
        Mixed pool
      </button>
    </div>
  );
}
