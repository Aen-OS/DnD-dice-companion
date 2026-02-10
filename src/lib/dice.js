export const MAX_DICE = 200;

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function rollDie(sides) {
  return randInt(1, sides);
}

export function toInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export function validateSides(sides) {
  const s = toInt(sides);
  if (s === null) return { ok: false, message: "Sides must be a number." };
  if (s < 2) return { ok: false, message: "Sides must be at least 2." };
  if (s > 1_000_000) return { ok: false, message: "Sides is too large." };
  return { ok: true, value: s };
}

export function validateCount(count) {
  const c = toInt(count);
  if (c === null) return { ok: false, message: "Count must be a number." };
  if (c < 1) return { ok: false, message: "Count must be at least 1." };
  if (c > MAX_DICE)
    return { ok: false, message: `Count cannot exceed ${MAX_DICE}.` };
  return { ok: true, value: c };
}

export function validateModifier(mod) {
  const m = toInt(mod);
  if (m === null) return { ok: false, message: "Modifier must be a number." };
  if (m < -1_000_000 || m > 1_000_000)
    return { ok: false, message: "Modifier is too large." };
  return { ok: true, value: m };
}

export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}
