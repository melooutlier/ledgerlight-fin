import { useSyncExternalStore } from "react";
import { money } from "@/lib/format";

const KEY = "mf-hide-balance";
let cached: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  if (typeof window === "undefined") return false;
  if (cached === null) {
    try {
      cached = window.localStorage.getItem(KEY) === "1";
    } catch {
      cached = false;
    }
  }
  return cached;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Turn the privacy (hide balances) mode on or off. */
export function setPrivacy(value: boolean) {
  cached = value;
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    /* storage unavailable — keep in-memory only */
  }
  for (const l of listeners) l();
}

/** True when balances should be hidden (privacy mode). */
export function usePrivacy(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

/** Formats an amount, or masks it when privacy mode is on. */
export function fmtMoney(value: number, hidden: boolean): string {
  return hidden ? "•••••" : money(value);
}
