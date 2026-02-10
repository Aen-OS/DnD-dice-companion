import { useEffect } from "react";
import { b64urlDecode, b64urlEncode } from "@/lib/encoding";
import { toInt } from "@/lib/dice";
import { makeId } from "@/lib/ids";

/**
 * Expects:
 * - getState(): returns serializable state
 * - applyState(parsed): sets state
 * - onBadState(): cleanup behavior
 */
export function useShareState({
  searchParams,
  router,
  getState,
  applyState,
  onBadState,
}) {
  function buildShareUrl() {
    const state = getState();
    const encoded = b64urlEncode(JSON.stringify(state));
    const url = new URL(window.location.href);
    url.searchParams.set("s", encoded);
    return url.toString();
  }

  async function copyShareLink() {
    const url = buildShareUrl();
    await navigator.clipboard.writeText(url);
  }

  function cleanUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("s");
    router.replace(url.pathname + url.search, { scroll: false });
  }

  useEffect(() => {
    const s = searchParams.get("s");
    if (!s) return;

    try {
      const raw = b64urlDecode(s);
      const parsed = JSON.parse(raw);

      // normalize mixed.pool ids on restore
      if (parsed?.mixed?.pool && Array.isArray(parsed.mixed.pool)) {
        parsed.mixed.pool = parsed.mixed.pool.map((r) => ({
          id: makeId(),
          count: toInt(r.count) ?? 1,
          sides: toInt(r.sides) ?? 6,
        }));
      }

      applyState(parsed);
    } catch {
      onBadState?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { buildShareUrl, copyShareLink, cleanUrl };
}
