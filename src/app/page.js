"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MAX_DICE = 200;

/* ------------------------- utils ------------------------- */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min; // inclusive
}

function toInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function validateSides(sides) {
  const s = toInt(sides);
  if (s === null) return { ok: false, message: "Sides must be a number." };
  if (s < 2) return { ok: false, message: "Sides must be at least 2." };
  if (s > 1_000_000) return { ok: false, message: "Sides is too large." };
  return { ok: true, value: s };
}

function validateCount(count) {
  const c = toInt(count);
  if (c === null) return { ok: false, message: "Count must be a number." };
  if (c < 1) return { ok: false, message: "Count must be at least 1." };
  if (c > MAX_DICE)
    return { ok: false, message: `Count cannot exceed ${MAX_DICE}.` };
  return { ok: true, value: c };
}

function validateModifier(mod) {
  const m = toInt(mod);
  if (m === null) return { ok: false, message: "Modifier must be a number." };
  if (m < -1_000_000 || m > 1_000_000)
    return { ok: false, message: "Modifier is too large." };
  return { ok: true, value: m };
}

function rollDie(sides) {
  return randInt(1, sides);
}

function nowStamp() {
  return new Date().toLocaleString();
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return String(Date.now()) + "-" + String(Math.random()).slice(2);
}

function b64urlEncode(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlDecode(b64url) {
  const b64 = b64url.replaceAll("-", "+").replaceAll("_", "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const out = atob(b64 + pad);
  return decodeURIComponent(escape(out));
}

/* ------------------------- sound ------------------------- */
/**
 * Lightweight “dice rattle” using Web Audio; no file required.
 * Autoplay restrictions: works after a user gesture (click).
 */
function playRollSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const dur = 0.12; // short
    const now = ctx.currentTime;

    // White-ish noise using a buffer
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // quick decay noise
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.8;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900 + Math.random() * 400, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + dur);

    // cleanup
    src.onended = () => {
      try {
        ctx.close();
      } catch {}
    };
  } catch {
    // no-op
  }
}

/* ------------------------- UI helpers ------------------------- */
function CritChip({ sides, value }) {
  const isD20 = sides === 20;
  const isNat20 = isD20 && value === 20;
  const isNat1 = isD20 && value === 1;

  if (!isD20) return <span className="badge badge-ghost">{value}</span>;
  if (isNat20)
    return <span className="badge badge-success font-semibold">20</span>;
  if (isNat1) return <span className="badge badge-error font-semibold">1</span>;
  return <span className="badge badge-ghost">{value}</span>;
}

function DiceBreakdown({ entry }) {
  // entry.dice: [{ sides, results: number[] }]
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

/* ------------------------- main ------------------------- */
export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Modes: "single" | "same" | "mixed"
  const [mode, setMode] = useState("single");

  // Single
  const [singleSides, setSingleSides] = useState(20);
  const [singleRollType, setSingleRollType] = useState("normal"); // normal | adv | dis

  // Same
  const [sameCount, setSameCount] = useState(2);
  const [sameSides, setSameSides] = useState(6);

  // Mixed pool
  const [pool, setPool] = useState([
    { id: makeId(), count: 2, sides: 20 },
    { id: makeId(), count: 1, sides: 8 },
  ]);

  // Modifier (global)
  const [modifier, setModifier] = useState(0);

  // Output / history
  const [lastRoll, setLastRoll] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  // Rolling animation
  const [isRolling, setIsRolling] = useState(false);

  // "subtle" | "flashy"
  const [fxMode, setFxMode] = useState("subtle"); // "subtle" | "flashy"

  const totalDiceInPool = useMemo(() => {
    return pool.reduce((sum, row) => sum + (toInt(row.count) ?? 0), 0);
  }, [pool]);

  function pushHistory(entry) {
    setLastRoll(entry);
    setHistory((prev) => [entry, ...prev].slice(0, 50));
  }

  function clearAll() {
    setLastRoll(null);
    setHistory([]);
    setError("");
  }

  function beginRollAnimation() {
    setIsRolling(true);
    playRollSound();
    // short “shake” window
    window.setTimeout(() => setIsRolling(false), 420);
  }

  /**
   * Roll result shape:
   * {
   *   id, at, label,
   *   dice: [{ sides, results: number[] }],
   *   subtotal, modifier, total,
   *   meta?: { keep?: "high"|"low", kept?: number, dropped?: number } (for adv/dis)
   * }
   */
  function handleRoll() {
    setError("");

    const modV = validateModifier(modifier);
    if (!modV.ok) return setError(modV.message);

    beginRollAnimation();

    // SINGLE
    if (mode === "single") {
      const sidesV = validateSides(singleSides);
      if (!sidesV.ok) return setError(sidesV.message);

      const s = sidesV.value;

      // Advantage / Disadvantage only makes sense for d20. If not d20, force normal.
      const rollType = s === 20 ? singleRollType : "normal";

      if (rollType === "adv" || rollType === "dis") {
        const a = rollDie(20);
        const b = rollDie(20);
        const kept = rollType === "adv" ? Math.max(a, b) : Math.min(a, b);
        const dropped = rollType === "adv" ? Math.min(a, b) : Math.max(a, b);

        const subtotal = kept;
        const total = subtotal + modV.value;

        const entry = {
          id: makeId(),
          at: nowStamp(),
          label:
            rollType === "adv" ? "2d20 (Advantage)" : "2d20 (Disadvantage)",
          dice: [{ sides: 20, results: [a, b] }],
          subtotal,
          modifier: modV.value,
          total,
          meta: { keep: rollType === "adv" ? "high" : "low", kept, dropped },
        };
        return pushHistory(entry);
      } else {
        const result = rollDie(s);
        const subtotal = result;
        const total = subtotal + modV.value;

        const entry = {
          id: makeId(),
          at: nowStamp(),
          label: `1d${s}`,
          dice: [{ sides: s, results: [result] }],
          subtotal,
          modifier: modV.value,
          total,
        };
        return pushHistory(entry);
      }
    }

    // SAME
    if (mode === "same") {
      const countV = validateCount(sameCount);
      if (!countV.ok) return setError(countV.message);

      const sidesV = validateSides(sameSides);
      if (!sidesV.ok) return setError(sidesV.message);

      const c = countV.value;
      const s = sidesV.value;

      const results = Array.from({ length: c }, () => rollDie(s));
      const subtotal = results.reduce((a, b) => a + b, 0);
      const total = subtotal + modV.value;

      const entry = {
        id: makeId(),
        at: nowStamp(),
        label: `${c}d${s}`,
        dice: [{ sides: s, results }],
        subtotal,
        modifier: modV.value,
        total,
      };
      return pushHistory(entry);
    }

    // MIXED
    if (mode === "mixed") {
      const normalized = [];
      for (const row of pool) {
        const countV = validateCount(row.count);
        if (!countV.ok) return setError(`Row count error: ${countV.message}`);

        const sidesV = validateSides(row.sides);
        if (!sidesV.ok) return setError(`Row sides error: ${sidesV.message}`);

        normalized.push({ count: countV.value, sides: sidesV.value });
      }

      const totalDice = normalized.reduce((sum, r) => sum + r.count, 0);
      if (totalDice < 2)
        return setError("Mixed pool must roll at least 2 dice.");
      if (totalDice > MAX_DICE)
        return setError(`Total dice in pool cannot exceed ${MAX_DICE}.`);

      const dice = normalized.map((r) => ({
        sides: r.sides,
        results: Array.from({ length: r.count }, () => rollDie(r.sides)),
      }));

      const label = normalized.map((r) => `${r.count}d${r.sides}`).join(" + ");
      const subtotal = dice
        .flatMap((d) => d.results)
        .reduce((a, b) => a + b, 0);
      const total = subtotal + modV.value;

      const entry = {
        id: makeId(),
        at: nowStamp(),
        label,
        dice,
        subtotal,
        modifier: modV.value,
        total,
      };
      return pushHistory(entry);
    }
  }

  function addRow() {
    setPool((prev) => [...prev, { id: makeId(), count: 1, sides: 6 }]);
  }

  function removeRow(id) {
    setPool((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id, key, value) {
    setPool((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    );
  }

  /* ------------------------- share links ------------------------- */
  function buildShareState() {
    const state = {
      mode,
      modifier: toInt(modifier) ?? 0,
      single: {
        sides: toInt(singleSides) ?? 20,
        rollType: singleRollType,
      },
      same: {
        count: toInt(sameCount) ?? 2,
        sides: toInt(sameSides) ?? 6,
      },
      mixed: {
        pool: pool.map((r) => ({
          count: toInt(r.count) ?? 1,
          sides: toInt(r.sides) ?? 6,
        })),
      },
    };
    return state;
  }

  function buildShareUrl() {
    const state = buildShareState();
    const encoded = b64urlEncode(JSON.stringify(state));
    const url = new URL(window.location.href);
    url.searchParams.set("s", encoded);
    return url.toString();
  }

  async function copyShareLink() {
    try {
      const url = buildShareUrl();
      await navigator.clipboard.writeText(url);
      // tiny UX: show an alert-like message using error slot (without being “error”)
      setError("Share link copied to clipboard.");
      window.setTimeout(() => setError(""), 1400);
    } catch {
      setError("Could not copy link. Your browser may block clipboard access.");
    }
  }

  // Restore from share link: ?s=<base64url>
  useEffect(() => {
    const s = searchParams.get("s");
    if (!s) return;

    try {
      const raw = b64urlDecode(s);
      const parsed = JSON.parse(raw);

      if (parsed?.mode) setMode(parsed.mode);

      if (typeof parsed?.modifier === "number") setModifier(parsed.modifier);

      if (parsed?.single) {
        if (parsed.single.sides != null) setSingleSides(parsed.single.sides);
        if (parsed.single.rollType) setSingleRollType(parsed.single.rollType);
      }

      if (parsed?.same) {
        if (parsed.same.count != null) setSameCount(parsed.same.count);
        if (parsed.same.sides != null) setSameSides(parsed.same.sides);
      }

      if (parsed?.mixed?.pool && Array.isArray(parsed.mixed.pool)) {
        setPool(
          parsed.mixed.pool.map((r) => ({
            id: makeId(),
            count: r.count ?? 1,
            sides: r.sides ?? 6,
          })),
        );
      }
    } catch {
      // If decoding fails, strip the param to avoid confusing reload loops
      const url = new URL(window.location.href);
      url.searchParams.delete("s");
      router.replace(url.pathname + url.search, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------- UI ------------------------- */
  const rollButtonLabel = useMemo(() => {
    if (mode === "single") {
      const s = toInt(singleSides) ?? 20;
      if (s === 20 && singleRollType === "adv") return "Roll Advantage";
      if (s === 20 && singleRollType === "dis") return "Roll Disadvantage";
      return `Roll 1d${s}`;
    }
    if (mode === "same") return `Roll ${sameCount}d${sameSides}`;
    return "Roll Pool";
  }, [mode, singleSides, singleRollType, sameCount, sameSides]);

  return (
    <main className="min-h-screen bg-base-200 font-sans">
      {/* keyframes for shake */}
      <style>{`
        @keyframes diceShake {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-2px, 1px) rotate(-1deg); }
          40% { transform: translate(3px, -1px) rotate(1deg); }
          60% { transform: translate(-2px, -1px) rotate(0deg); }
          80% { transform: translate(2px, 1px) rotate(1deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        .shake { animation: diceShake 420ms ease-in-out; }
      `}</style>

      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div
          className={`navbar bg-base-100 rounded-2xl shadow ${isRolling ? "shake" : ""}`}
        >
          <div className="flex-1">
            <span className="btn btn-ghost text-xl font-mono">
              D&amp;D Dice Companion
            </span>
          </div>

          <div className="flex-none gap-2">
            <button
              className="btn btn-secondary btn-outline mr-3"
              onClick={copyShareLink}
              title="Copy a link to this roll setup"
            >
              Share
            </button>
            <button className="btn btn-outline" onClick={clearAll}>
              Clear
            </button>
          </div>
        </div>

        {/* Controls */}
        <div
          className={`mt-6 bg-base-100 rounded-2xl shadow p-4 sm:p-6 ${isRolling ? "shake" : ""}`}
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="tabs tabs-boxed">
              <button
                className={`tab ${mode === "single" ? "tab-active" : ""}`}
                onClick={() => {
                  setMode("single");
                  setError("");
                }}
              >
                Single
              </button>
              <button
                className={`tab ${mode === "same" ? "tab-active" : ""}`}
                onClick={() => {
                  setMode("same");
                  setError("");
                }}
              >
                Multiple (same)
              </button>
              <button
                className={`tab ${mode === "mixed" ? "tab-active" : ""}`}
                onClick={() => {
                  setMode("mixed");
                  setError("");
                }}
              >
                Mixed pool
              </button>
            </div>

            {/* Modifier */}
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
          </div>

          <div className="mt-6 grid gap-4">
            {/* SINGLE */}
            {mode === "single" && (
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
                      <span className="label-text-alt">
                        adv/dis only for d20
                      </span>
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
                        disabled={(toInt(singleSides) ?? 20) !== 20}
                        title="Roll 2d20 keep highest"
                      >
                        Advantage
                      </button>
                      <button
                        className={`btn join-item w-1/3 ${singleRollType === "dis" ? "btn-active" : ""}`}
                        onClick={() => setSingleRollType("dis")}
                        disabled={(toInt(singleSides) ?? 20) !== 20}
                        title="Roll 2d20 keep lowest"
                      >
                        Disadv.
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* SAME */}
            {mode === "same" && (
              <section className="grid gap-4">
                <div className="grid sm:grid-cols-3 gap-4">
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

                  <div className="flex items-end">
                    <button
                      className="btn btn-ghost w-full"
                      onClick={() => {
                        setSameCount(2);
                        setSameSides(20);
                        setModifier(0);
                        setMode("single");
                        setSingleSides(20);
                        setSingleRollType("adv");
                      }}
                      title="Quick: Advantage as 2d20 keep high"
                    >
                      Quick: Adv (d20)
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* MIXED */}
            {mode === "mixed" && (
              <section className="grid gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm opacity-70">
                    Total dice in pool:{" "}
                    <span className="font-semibold">{totalDiceInPool}</span> /{" "}
                    {MAX_DICE}
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
                            <span className="label-text-alt">
                              Row {idx + 1}
                            </span>
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={MAX_DICE}
                            className="input input-bordered"
                            value={row.count}
                            onChange={(e) =>
                              updateRow(row.id, "count", e.target.value)
                            }
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
                            onChange={(e) =>
                              updateRow(row.id, "sides", e.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div className="col-span-12 sm:col-span-2 flex gap-2">
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
            )}

            {/* Roll button */}
            <div className="flex items-center gap-3">
              <button
                className="btn btn-primary"
                onClick={handleRoll}
                disabled={isRolling}
              >
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
                onClick={() => {
                  // keep URL clean unless user explicitly shares
                  const url = new URL(window.location.href);
                  url.searchParams.delete("s");
                  router.replace(url.pathname + url.search, { scroll: false });
                  setError("Share state cleared from URL.");
                  window.setTimeout(() => setError(""), 1200);
                }}
                title="Remove share state from URL"
              >
                Clean URL
              </button>
            </div>

            {/* Message / error */}
            {error && (
              <div
                className={`alert ${error.includes("copied") || error.includes("cleared") ? "alert-info" : "alert-error"}`}
              >
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results + History */}
        <div className="mt-6 grid lg:grid-cols-2 gap-6">
          {/* Last roll */}
          <div
            className={`bg-base-100 rounded-2xl shadow p-4 sm:p-6 ${isRolling ? "shake" : ""}`}
          >
            <h2 className="text-lg font-semibold">Last Roll</h2>

            {!lastRoll ? (
              <p className="mt-3 opacity-70">
                Roll some dice to see results here.
              </p>
            ) : (
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="badge badge-outline">{lastRoll.label}</div>
                  <div className="text-sm opacity-70 whitespace-nowrap">
                    {lastRoll.at}
                  </div>
                </div>

                {/* Totals */}
                <div className="stats stats-vertical bg-base-200 rounded-xl">
                  <div className="stat">
                    <div className="stat-title">Subtotal</div>
                    <div className="stat-value text-2xl">
                      {lastRoll.subtotal}
                    </div>
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
                        Kept{" "}
                        {lastRoll.meta.keep === "high" ? "highest" : "lowest"}:{" "}
                        <span className="font-semibold">
                          {lastRoll.meta.kept}
                        </span>{" "}
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
                    onClick={handleRoll}
                    disabled={isRolling}
                  >
                    Re-roll
                  </button>
                  <button className="btn btn-ghost" onClick={copyShareLink}>
                    Copy share link
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* History */}
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
                          <>
                            {h.modifier >= 0 ? `+${h.modifier}` : h.modifier}{" "}
                            ={" "}
                          </>
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
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setHistory([])}
              >
                Clear history
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setLastRoll(null);
                  setError("");
                }}
              >
                Clear last roll
              </button>
            </div>
          </div>
        </div>

        <footer className="mt-10 text-center opacity-60 text-sm">
          Made with ❤️ for DnD - Built with Next.js + React + Tailwind + DaisyUI
        </footer>
      </div>
    </main>
  );
}
