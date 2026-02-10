export function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return String(Date.now()) + "-" + String(Math.random()).slice(2);
}

export function nowStamp() {
  return new Date().toLocaleString();
}
