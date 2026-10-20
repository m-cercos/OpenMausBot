// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setLocale } from "@/lib/i18n";
import type { SidebarDensity } from "@/lib/sidebar-preferences";
import { BotEditorStore, initialState, reducer, type AppState, type useStore } from "@/state/store";
import { SidebarTopNav } from "./SidebarNav";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root;
const dispatch = vi.fn();
async function render(density: SidebarDensity, state: Partial<AppState> = {}) {
  const store = { state: { ...initialState, ...state }, dispatch } as unknown as ReturnType<typeof useStore>;
  await act(async () => root.render(createElement(BotEditorStore, { value: store, children: createElement(SidebarTopNav, { density }) })));
}
const row = () => host.querySelector<HTMLButtonElement>('[data-sidebar-nav="today"]')!;

beforeEach(() => {
  setLocale("en");
  dispatch.mockReset();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

it.each(["comfortable", "compact", "icons"] as const)("offers Today in every sidebar size and opens the page (%s)", async (density) => {
  await render(density);
  if (density === "icons") expect(row().getAttribute("aria-label")).toBe("Today");
  else expect(row().textContent).toBe("Today");
  expect(row().getAttribute("aria-current")).toBeNull();
  await act(async () => row().click());
  expect(dispatch).toHaveBeenCalledWith({ type: "showToday" });
});

it("marks Today as the current page while it is open", async () => {
  await render("comfortable", { activeView: "today" });
  expect(row().getAttribute("aria-current")).toBe("page");
});

it("opening Today closes the side panels, and choosing a bot leaves it", () => {
  const open = reducer({ ...initialState, settingsOpen: true, pluginsOpen: true }, { type: "showToday" });
  expect(open).toMatchObject({ activeView: "today", settingsOpen: false, pluginsOpen: false });
  expect(reducer(open, { type: "showChat" }).activeView).toBe("chat");
});

it.each(["comfortable", "compact"] as const)("puts the places right under Today at the top of the sidebar (%s)", async (density) => {
  await render(density);
  const rows = [...host.querySelectorAll("[data-sidebar-nav]")].map((row) => row.getAttribute("data-sidebar-nav"));
  expect(rows[0]).toBe("today");
  expect(rows).toContain("automations");
});

it("leaves the avatars-only sidebar's places to its footer", async () => {
  await render("icons");
  expect([...host.querySelectorAll("[data-sidebar-nav]")].map((row) => row.getAttribute("data-sidebar-nav"))).toEqual(["today"]);
});
