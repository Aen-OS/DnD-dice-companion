"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import HeaderBar from "@/components/HeaderBar";
import ModeTabs from "@/components/ModeTabs";
import ModifierField from "@/components/ModifierField";
import RollControlsSingle from "@/components/RollControlsSingle";
import RollControlsSame from "@/components/RollControlsSame";
import RollControlsMixed from "@/components/RollControlsMixed";
import RollButtonRow from "@/components/RollButtonRow";
import LastRollCard from "@/components/LastRollCard";
import HistoryCard from "@/components/HistoryCard";

import { useRollSound } from "@/hooks/useRollSound";
import { useShareState } from "@/hooks/useShareState";

import {
  MAX_DICE,
  rollDie,
  sum,
  toInt,
  validateCount,
  validateModifier,
  validateSides,
} from "@/lib/dice";
import { makeId, nowStamp } from "@/lib/ids";

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { play } = useRollSound();

  const [mode, setMode] = useState("single");
  const [singleSides, setSingleSides] = useState(20);
  const [singleRollType, setSingleRollType] = useState("normal");
  const [sameCount, setSameCount] = useState(2);
  const [sameSides, setSameSides] = useState(6);
  const [pool, setPool] = useState([
    { id: makeId(), count: 2, sides: 20 },
    { id: makeId(), count: 1, sides: 8 },
  ]);
  const [modifier, setModifier] = useState(0);

  const [lastRoll, setLastRoll] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [isRolling, setIsRolling] = useState(false);

  function pushHistory(entry) {
    setLastRoll(entry);
    setHistory((prev) => [entry, ...prev].slice(0, 50));
  }

  function clearAll() {
    setLastRoll(null);
    setHistory([]);
    setMessage("");
  }

  function beginRollFX() {
    setIsRolling(true);
    play();
    window.setTimeout(() => setIsRolling(false), 420);
  }

  function getShareState() {
    return {
      mode,
      modifier: toInt(modifier) ?? 0,
      single: { sides: toInt(singleSides) ?? 20, rollType: singleRollType },
      same: { count: toInt(sameCount) ?? 2, sides: toInt(sameSides) ?? 6 },
      mixed: {
        pool: pool.map((r) => ({
          count: toInt(r.count) ?? 1,
          sides: toInt(r.sides) ?? 6,
        })),
      },
    };
  }

  function applyShareState(parsed) {
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
      setPool(parsed.mixed.pool);
    }
  }

  const { copyShareLink, cleanUrl } = useShareState({
    searchParams,
    router,
    getState: getShareState,
    applyState: applyShareState,
    onBadState: () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("s");
      router.replace(url.pathname + url.search, { scroll: false });
      setMessage("Bad share link removed from URL.");
      window.setTimeout(() => setMessage(""), 1200);
    },
  });

  async function onShare() {
    try {
      await copyShareLink();
      setMessage("Share link copied to clipboard.");
      window.setTimeout(() => setMessage(""), 1400);
    } catch {
      setMessage("Could not copy link (clipboard permission issue).");
    }
  }

  function onRoll() {
    setMessage("");

    const modV = validateModifier(modifier);
    if (!modV.ok) return setMessage(modV.message);

    beginRollFX();

    if (mode === "single") {
      const sidesV = validateSides(singleSides);
      if (!sidesV.ok) return setMessage(sidesV.message);

      const s = sidesV.value;
      const rollType = s === 20 ? singleRollType : "normal";

      if (rollType === "adv" || rollType === "dis") {
        const a = rollDie(20);
        const b = rollDie(20);
        const kept = rollType === "adv" ? Math.max(a, b) : Math.min(a, b);
        const dropped = rollType === "adv" ? Math.min(a, b) : Math.max(a, b);

        const subtotal = kept;
        const total = subtotal + modV.value;

        return pushHistory({
          id: makeId(),
          at: nowStamp(),
          label:
            rollType === "adv" ? "2d20 (Advantage)" : "2d20 (Disadvantage)",
          dice: [{ sides: 20, results: [a, b] }],
          subtotal,
          modifier: modV.value,
          total,
          meta: { keep: rollType === "adv" ? "high" : "low", kept, dropped },
        });
      }

      const result = rollDie(s);
      const subtotal = result;
      const total = subtotal + modV.value;

      return pushHistory({
        id: makeId(),
        at: nowStamp(),
        label: `1d${s}`,
        dice: [{ sides: s, results: [result] }],
        subtotal,
        modifier: modV.value,
        total,
      });
    }

    if (mode === "same") {
      const countV = validateCount(sameCount);
      if (!countV.ok) return setMessage(countV.message);

      const sidesV = validateSides(sameSides);
      if (!sidesV.ok) return setMessage(sidesV.message);

      const results = Array.from({ length: countV.value }, () =>
        rollDie(sidesV.value),
      );
      const subtotal = sum(results);
      const total = subtotal + modV.value;

      return pushHistory({
        id: makeId(),
        at: nowStamp(),
        label: `${countV.value}d${sidesV.value}`,
        dice: [{ sides: sidesV.value, results }],
        subtotal,
        modifier: modV.value,
        total,
      });
    }

    if (mode === "mixed") {
      const normalized = [];
      for (const row of pool) {
        const countV = validateCount(row.count);
        if (!countV.ok) return setMessage(`Row count error: ${countV.message}`);

        const sidesV = validateSides(row.sides);
        if (!sidesV.ok) return setMessage(`Row sides error: ${sidesV.message}`);

        normalized.push({ count: countV.value, sides: sidesV.value });
      }

      const totalDice = normalized.reduce((a, r) => a + r.count, 0);
      if (totalDice < 2)
        return setMessage("Mixed pool must roll at least 2 dice.");
      if (totalDice > MAX_DICE)
        return setMessage(`Total dice in pool cannot exceed ${MAX_DICE}.`);

      const dice = normalized.map((r) => ({
        sides: r.sides,
        results: Array.from({ length: r.count }, () => rollDie(r.sides)),
      }));

      const label = normalized.map((r) => `${r.count}d${r.sides}`).join(" + ");
      const subtotal = dice
        .flatMap((d) => d.results)
        .reduce((a, b) => a + b, 0);
      const total = subtotal + modV.value;

      return pushHistory({
        id: makeId(),
        at: nowStamp(),
        label,
        dice,
        subtotal,
        modifier: modV.value,
        total,
      });
    }
  }

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
    <>
      {/* keep your shake CSS here or move to globals.css */}
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
        <HeaderBar isRolling={isRolling} onShare={onShare} onClear={clearAll} />

        <div
          className={`mt-6 bg-base-100 rounded-2xl shadow p-4 sm:p-6 ${isRolling ? "shake" : ""}`}
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <ModeTabs
              mode={mode}
              setMode={setMode}
              clearMessage={() => setMessage("")}
            />
            <ModifierField modifier={modifier} setModifier={setModifier} />
          </div>

          <div className="mt-6 grid gap-4">
            {mode === "single" && (
              <RollControlsSingle
                singleSides={singleSides}
                setSingleSides={setSingleSides}
                singleRollType={singleRollType}
                setSingleRollType={setSingleRollType}
              />
            )}

            {mode === "same" && (
              <RollControlsSame
                sameCount={sameCount}
                setSameCount={setSameCount}
                sameSides={sameSides}
                setSameSides={setSameSides}
              />
            )}

            {mode === "mixed" && (
              <RollControlsMixed pool={pool} setPool={setPool} />
            )}

            <RollButtonRow
              isRolling={isRolling}
              rollButtonLabel={rollButtonLabel}
              onRoll={onRoll}
              onCleanUrl={() => {
                cleanUrl();
                setMessage("Share state cleared from URL.");
                window.setTimeout(() => setMessage(""), 1200);
              }}
            />

            {message && (
              <div
                className={`alert ${message.includes("copied") || message.includes("cleared") ? "alert-info" : "alert-error"}`}
              >
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid lg:grid-cols-2 gap-6">
          <LastRollCard
            isRolling={isRolling}
            lastRoll={lastRoll}
            onReroll={onRoll}
            onCopyShare={onShare}
          />
          <HistoryCard
            history={history}
            onClearHistory={() => setHistory([])}
            onClearLastRoll={() => setLastRoll(null)}
          />
        </div>

        <footer className="mt-10 text-center opacity-60 text-sm">
          Built with Next.js + React + Tailwind + DaisyUI
        </footer>
      </div>
    </>
  );
}
