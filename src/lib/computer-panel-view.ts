import { useEffect } from "react";

export type ComputerPanelView = "computer" | "android" | "browser" | "routines" | "files" | "data";

type PanelTabsContext = { advanced: boolean; androidConnected: boolean };

export function computerPanelTabs({ advanced, androidConnected }: PanelTabsContext): ComputerPanelView[] {
  return advanced
    ? ["computer", "routines", ...(androidConnected ? (["android"] as const) : []), "browser", "data", "files"]
    : ["computer", "browser", "data", "files"];
}

export function resolveComputerPanelView(view: ComputerPanelView, context: PanelTabsContext): ComputerPanelView {
  return computerPanelTabs(context).includes(view) ? view : "computer";
}

const STORAGE_PREFIX = "omb-computer-panel-view";

function storageKey(botId: string): string {
  return `${STORAGE_PREFIX}:${botId}`;
}

export function readComputerPanelView(
  botId: string,
  storage: Pick<Storage, "getItem"> = localStorage,
): ComputerPanelView {
  try {
    const value = storage.getItem(storageKey(botId));
    if (value === "android" || value === "browser" || value === "routines" || value === "files" || value === "data") return value;
  } catch {
  }
  return "computer";
}

export function writeComputerPanelView(
  botId: string,
  view: ComputerPanelView,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  try {
    storage.setItem(storageKey(botId), view);
  } catch {
  }
}

const viewRequests = new Set<(botId: string, view: ComputerPanelView) => void>();
const pendingViews = new Map<string, ComputerPanelView>();

export function requestComputerPanelView(botId: string, view: ComputerPanelView): void {
  writeComputerPanelView(botId, view);
  pendingViews.set(botId, view);
  for (const request of Array.from(viewRequests)) request(botId, view);
}

export function useComputerPanelViewRequests(botId: string, select: (view: ComputerPanelView) => void): void {
  useEffect(() => {
    const request = (target: string, view: ComputerPanelView) => {
      if (target !== botId) return;
      pendingViews.delete(target);
      select(view);
    };
    const pending = pendingViews.get(botId);
    if (pending) request(botId, pending);
    viewRequests.add(request);
    return () => {
      viewRequests.delete(request);
    };
  }, [botId, select]);
}
