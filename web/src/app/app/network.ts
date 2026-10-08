"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_NETWORK, NETWORKS, type Network, type NetworkId, isNetworkId } from "@/lib/networks";

const KEY = "heldby-network";
const listeners = new Set<() => void>();
let memory: NetworkId | null = null;

function read(): NetworkId {
  try {
    const v = localStorage.getItem(KEY);
    return isNetworkId(v) ? v : DEFAULT_NETWORK;
  } catch {
    return DEFAULT_NETWORK; // private mode / blocked storage
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  addEventListener("storage", cb); // keeps other tabs in sync
  return () => {
    listeners.delete(cb);
    removeEventListener("storage", cb);
  };
}

/** Remember the chosen network (per browser) and notify every component using it. */
export function setNetwork(id: NetworkId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // still switch for this page view
  }
  memory = id;
  listeners.forEach((l) => l());
}

/** The network the app is currently pointed at. Server render uses the default. */
export function useNetwork(): Network {
  const id = useSyncExternalStore(subscribe, () => memory ?? read(), () => DEFAULT_NETWORK);
  return NETWORKS[id];
}
