import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initialDesktopCapabilities } from "@/lib/desktop";
import { setLocale } from "@/lib/i18n";
import type { SidebarDensity } from "@/lib/sidebar-preferences";
import { StoreProvider } from "@/state/store";

const fixture = vi.hoisted(() => ({
  density: "comfortable" as SidebarDensity,
  advanced: true,
  windowChrome: undefined as "mac-inset" | "win-caption" | "native" | undefined,
  hostLabel: undefined as string | undefined,
}));

vi.mock("@/lib/sidebar-preferences", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/sidebar-preferences")>(),
  useSidebarDensity: () => fixture.density,
}));
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => fixture.advanced, setAdvancedMode: () => {} }));
vi.mock("./DesktopCapabilities", async (importOriginal) => ({
  ...await importOriginal<typeof import("./DesktopCapabilities")>(),
  useDesktopCapabilities: () => {
    const capabilities = initialDesktopCapabilities();
    const host = { ...capabilities.host, label: fixture.hostLabel ?? capabilities.host.label };
    return { capabilities: { ...capabilities, host, windowChrome: fixture.windowChrome }, ready: true };
  },
}));

import { MAC_TRAFFIC_LIGHT_CENTER_Y, Sidebar } from "./Sidebar";

const render = () => renderToStaticMarkup(
  createElement(StoreProvider, null, createElement(Sidebar, { open: true, onClose: () => {} })),
);

beforeEach(() => {
  fixture.density = "comfortable";
  fixture.advanced = true;
  fixture.windowChrome = undefined;
  fixture.hostLabel = undefined;
  vi.stubGlobal("window", { innerWidth: 1280, location: { protocol: "http:", search: "" } });
  setLocale("en");
});

afterEach(() => {
  vi.unstubAllGlobals();
  setLocale("en");
});

describe("sidebar header", () => {
  it.each(["comfortable", "compact", "icons"] as const)(
    "keeps collapse, activity and add but no density menu at %s density in Advanced mode",
    (density) => {
      fixture.density = density;
      const html = render();
      expect(html).toContain(density === "icons" ? 'aria-label="Expand sidebar"' : 'aria-label="Collapse sidebar to avatars"');
      expect(html).toContain('aria-label="Active Threads"');
      expect(html).toContain('aria-label="New or share"');
      expect(html).not.toContain("Choose sidebar density");
      expect(html).not.toContain('title="Sidebar density"');
    },
  );

  it.each(["comfortable", "compact"] as const)("keeps collapse and add but no activity menu in Simple mode at %s density", (density) => {
    fixture.advanced = false;
    fixture.density = density;
    const html = render();
    expect(html).toContain('aria-label="Collapse sidebar to avatars"');
    expect(html).not.toContain('aria-label="Active Threads"');
    expect(html).toContain('aria-label="New or share"');
  });

  it("still offers Expand on an icons rail in Simple mode, so the rail is never a dead end", () => {
    fixture.advanced = false;
    fixture.density = "icons";
    const html = render();
    expect(html).toContain('aria-label="Expand sidebar"');
    expect(html).not.toContain('aria-label="Active Threads"');
  });
});

describe("sidebar top row", () => {
  const desktop = () => vi.stubGlobal("window", {
    innerWidth: 1280,
    location: { protocol: "http:", search: "" },
    ogb: { workspaces: { state: () => new Promise(() => {}), menu: () => Promise.resolve() } },
  });
  const topRow = (html: string) => {
    const start = html.indexOf("data-sidebar-top-row");
    const end = html.indexOf('aria-label="New or share"');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return html.slice(start, end);
  };
  const classesOf = (html: string, attribute: string) => {
    const match = new RegExp(`${attribute}(?:="[^"]*")? class="([^"]*)"`).exec(html);
    expect(match, attribute).not.toBeNull();
    return match![1].split(" ");
  };
  const order = (row: string) => ({
    lights: row.indexOf("data-traffic-light-space"),
    slot: row.indexOf("data-sidebar-top-slot"),
    spacer: row.indexOf("data-sidebar-top-spacer"),
    switcher: row.indexOf('data-workspace-switcher="inline"'),
    buttons: row.indexOf("data-sidebar-top-buttons"),
  });

  it("puts the lights, a drag space, then the compact server switcher beside the buttons on one macOS row in Advanced mode", () => {
    fixture.windowChrome = "mac-inset";
    desktop();
    const html = render();
    const row = topRow(html);
    expect(MAC_TRAFFIC_LIGHT_CENTER_Y).toBe(23);
    expect(row).toMatch(/^data-sidebar-top-row="true" class="[^"]*\bitems-center\b[^"]*" style="-webkit-app-region:drag;height:46px"/);
    const { lights, slot, spacer, switcher, buttons } = order(row);
    expect(lights).toBeGreaterThan(-1);
    expect(slot).toBeGreaterThan(lights);
    expect(spacer).toBeGreaterThan(slot);
    expect(switcher).toBeGreaterThan(spacer);
    expect(buttons).toBeGreaterThan(switcher);
    expect(row.slice(buttons).match(/<button/g)).toHaveLength(3);
    const rowClasses = classesOf(row, "data-sidebar-top-row");
    expect(rowClasses).toEqual(expect.arrayContaining(["relative", "pl-4", "pr-2"]));
    expect(rowClasses).not.toContain("px-4");
    expect(classesOf(row, "data-traffic-light-space")).toEqual(expect.arrayContaining(["w-[72px]", "shrink-0"]));
    expect(classesOf(row, "data-sidebar-top-slot")).toEqual(expect.arrayContaining(["@container/sidebar-top", "min-w-0", "flex-1"]));
    expect(row).toContain('<div data-sidebar-top-spacer="true" class="min-w-0 flex-1 @min-[96px]/sidebar-top:min-w-6"></div>');
    const switcherClasses = classesOf(row, "data-sidebar-top-switcher");
    expect(switcherClasses).toEqual(expect.arrayContaining(["min-w-0", "max-w-[140px]"]));
    expect(switcherClasses).not.toContain("flex-1");
    expect(classesOf(row, "data-sidebar-top-buttons")).toEqual(expect.arrayContaining(["shrink-0", "gap-0.5"]));
    expect(row).toMatch(/aria-label="Switch server: Servers"[^>]*title="Servers"[^>]*class="[^"]*\bh-7\b[^"]*\boverflow-hidden\b[^"]*\btext-\[12\.5px\][^"]*" style="-webkit-app-region:no-drag"/);
    expect(row).toContain('<span class="min-w-0 truncate @max-[96px]/sidebar-top:hidden">Servers</span>');
    expect(row).toContain("focus-visible:outline-2");
    expect(html).toContain('title="New or share"');
    expect(row).toContain('title="Collapse to avatars"');
    expect(row).toContain('aria-label="Collapse sidebar to avatars"');
    expect(row).toContain('title="Active Threads"');
    expect(html.match(/Switch server:/g)).toHaveLength(1);
  });

  it("in Simple mode leaves the macOS row to the lights, puts search and + beside the MausBot title and the server switcher in the foot", () => {
    fixture.advanced = false;
    fixture.windowChrome = "mac-inset";
    desktop();
    const html = render();
    const row = html.slice(html.indexOf("data-sidebar-top-row"), html.indexOf("data-sidebar-title"));
    expect(row).toMatch(/^data-sidebar-top-row="true" class="[^"]*\bitems-center\b[^"]*" style="-webkit-app-region:drag;height:46px"/);
    expect(row).toContain("data-traffic-light-space");
    expect(row).not.toContain("<button");
    expect(row).not.toContain("data-workspace-switcher");
    const title = html.slice(html.indexOf("data-sidebar-title"), html.indexOf('data-sidebar-nav="new-bot"'));
    expect(title).toContain(">MausBot</span>");
    const search = title.indexOf("data-sidebar-search-toggle");
    const plus = title.indexOf('aria-label="New or share"');
    expect(search).toBeGreaterThan(-1);
    expect(plus).toBeGreaterThan(search);
    expect(title).toMatch(/data-sidebar-search-toggle="true" aria-label="Search bots and messages" aria-expanded="false" title="Search bots and messages" class="[^"]*\bsize-8\b[^"]*\brounded-md\b/);
    expect(title).toMatch(/aria-label="New or share" class="[^"]*\bsize-8\b[^"]*\brounded-md\b/);
    expect(title).not.toContain("rounded-full");
    expect(html).toMatch(/data-sidebar-edge-toggle="true" aria-label="Collapse sidebar to avatars" aria-expanded="true" title="Collapse to avatars" style="-webkit-app-region:no-drag" class="[^"]*\babsolute\b[^"]*\btop-\[7px\][^"]*\brounded-r-\[4px\][^"]*"><svg[^>]*lucide-chevron-left/);
    const foot = html.slice(html.indexOf('data-glass-bar="bottom"'));
    expect(foot).toMatch(/data-workspace-switcher="rail"[^>]*><button[^>]*aria-label="Switch server: Servers"/);
    expect(foot.indexOf('data-workspace-switcher="rail"')).toBeLessThan(foot.indexOf('data-sidebar-nav="apps"'));
    expect(html).not.toContain('title="Active Threads"');
    expect(html).not.toContain("data-sidebar-search-pill");
    expect(html.match(/Switch server:/g)).toHaveLength(1);
    expect(html.match(/aria-label="New or share"/g)).toHaveLength(1);
  });

  it.each([["win-caption", "Windows"], ["native", "Linux"]] as const)(
    "keeps the same right-aligned order without traffic lights (%s)",
    (windowChrome, hostLabel) => {
      fixture.windowChrome = windowChrome;
      fixture.hostLabel = hostLabel;
      desktop();
      const html = render();
      const row = topRow(html);
      expect(row).not.toContain("data-traffic-light-space");
      expect(row).not.toContain("bg-[#ff5f57]");
      expect(classesOf(row, "data-sidebar-top-row")).toEqual(expect.arrayContaining(["relative", "h-12", "pl-4", "pr-2"]));
      const { slot, spacer, switcher, buttons } = order(row);
      expect(slot).toBeGreaterThan(-1);
      expect(spacer).toBeGreaterThan(slot);
      expect(switcher).toBeGreaterThan(spacer);
      expect(buttons).toBeGreaterThan(switcher);
      expect(html.match(/Switch server:/g)).toHaveLength(1);
    },
  );

  it("keeps the browser build's placeholder lights 12px clear of the drag space and buttons", () => {
    const row = topRow(render());
    expect(row).toContain('<div class="flex shrink-0 items-center gap-2 mr-3"><span class="size-3 rounded-full bg-[#ff5f57]"></span>');
    const { spacer, buttons } = order(row);
    expect(spacer).toBeGreaterThan(row.indexOf("bg-[#28c840]"));
    expect(buttons).toBeGreaterThan(spacer);
  });

  it("collapses Simple mode to a rail: only the lights on top, the expand bump on the edge, and search, +, server, Apps and profile at the foot", () => {
    fixture.advanced = false;
    fixture.density = "icons";
    fixture.windowChrome = "mac-inset";
    desktop();
    const html = render();
    const top = html.slice(html.indexOf("data-sidebar-top-row"), html.indexOf('data-glass-bar="bottom"'));
    expect(top).toContain("data-traffic-light-space");
    expect(top).not.toContain("data-sidebar-top-buttons");
    expect(top).not.toContain("data-workspace-switcher");
    const foot = html.slice(html.indexOf("data-sidebar-rail-footer"));
    const at = (marker: string) => {
      const index = foot.indexOf(marker);
      expect(index, marker).toBeGreaterThan(-1);
      return index;
    };
    expect(html).toMatch(/data-sidebar-edge-toggle="true" aria-label="Expand sidebar" aria-expanded="false"[^>]*><svg[^>]*lucide-chevron-right/);
    expect(foot).not.toContain('aria-label="Expand sidebar"');
    const positions = [
      at('aria-label="Search bots and messages"'),
      at('aria-label="New or share"'),
      at('data-workspace-switcher="rail"'),
      at('data-sidebar-nav="automations"'),
      at('data-sidebar-nav="apps"'),
      at("transition-colors size-10"),
    ];
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(foot).toMatch(/data-workspace-switcher="rail"[^>]*><button[^>]*aria-label="Switch server: Servers"/);
    expect(foot).not.toContain('data-sidebar-nav="routines"');
    expect(html.match(/Switch server:/g)).toHaveLength(1);
    expect(html.match(/aria-label="New or share"/g)).toHaveLength(1);
  });

  it("stacks the icons rail unchanged and keeps the icon-only switcher beneath it", () => {
    fixture.density = "icons";
    fixture.windowChrome = "mac-inset";
    desktop();
    const html = render();
    const row = topRow(html);
    expect(row).not.toContain("data-workspace-switcher");
    expect(row).not.toContain("data-sidebar-top-spacer");
    expect(classesOf(row, "data-sidebar-top-row")).toEqual(["flex", "items-center", "flex-col", "gap-1", "px-2", "pt-3.5", "pb-1"]);
    expect(classesOf(row, "data-traffic-light-space")).toEqual(["h-5", "w-full"]);
    expect(classesOf(row, "data-sidebar-top-buttons")).toEqual(["relative", "flex", "shrink-0", "items-center", "flex-col", "gap-1"]);
    expect(html.match(/Switch server:/g)).toHaveLength(1);
  });
});

describe("sidebar glass head and foot", () => {
  it.each(["comfortable", "compact", "icons"] as const)(
    "puts the top row, search and places in the glass head and the list below it, with the avatars-only places in the foot, at %s density",
    (density) => {
      fixture.density = density;
      const html = render();
      const at = (marker: string) => {
        const index = html.indexOf(marker);
        expect(index, marker).toBeGreaterThan(-1);
        return index;
      };
      const head = at('data-glass-bar="top"');
      const topRow = at("data-sidebar-top-row");
      const search = at('aria-label="Search bots and messages"');
      const list = at('class="glass-scroller ');
      const foot = at('data-glass-bar="bottom"');
      const automations = at('data-sidebar-nav="automations"');
      const places = at('data-sidebar-nav="team-map"');
      expect(head).toBeLessThan(topRow);
      expect(topRow).toBeLessThan(search);
      expect(search).toBeLessThan(list);
      expect(list).toBeLessThan(foot);
      if (density === "icons") expect(foot).toBeLessThan(automations);
      else {
        expect(search).toBeLessThan(automations);
        expect(places).toBeLessThan(list);
      }
      expect(automations).toBeLessThan(places);
      expect(html.match(/data-sidebar-nav="automations"/g)).toHaveLength(1);
      expect(html.match(/data-glass-frame=""/g)).toHaveLength(1);
      expect(at("data-glass-frame")).toBeLessThan(head);
    },
  );
});

describe("sidebar places and foot", () => {
  it.each(["comfortable", "compact"] as const)("puts Automations right under Today in Simple mode, with Apps beside the profile in the foot (%s)", (density) => {
    fixture.advanced = false;
    fixture.density = density;
    const html = render();
    const foot = html.indexOf('data-glass-bar="bottom"');
    const automations = html.indexOf('data-sidebar-nav="automations"');
    expect(html).not.toContain('data-sidebar-nav="routines"');
    expect(html.match(/data-sidebar-nav="automations"/g)).toHaveLength(1);
    expect(automations).toBeGreaterThan(html.indexOf('data-sidebar-nav="today"'));
    expect(automations).toBeLessThan(html.indexOf('class="glass-scroller '));
    expect(html.match(/data-sidebar-nav="apps"/g)).toHaveLength(1);
    expect(html.indexOf('data-sidebar-nav="apps"')).toBeGreaterThan(foot);
  });

  it("keeps one Automations row at the top and no Routines row in Advanced mode, and still one Apps in the foot", () => {
    fixture.advanced = true;
    const html = render();
    const foot = html.indexOf('data-glass-bar="bottom"');
    expect(html).not.toContain('data-sidebar-nav="routines"');
    expect(html.match(/data-sidebar-nav="automations"/g)).toHaveLength(1);
    expect(html.indexOf('data-sidebar-nav="automations"')).toBeLessThan(foot);
    expect(html.match(/data-sidebar-nav="apps"/g)).toHaveLength(1);
    expect(html.indexOf('data-sidebar-nav="apps"')).toBeGreaterThan(foot);
  });

  it.each([[true, "comfortable"], [true, "compact"], [false, "comfortable"], [false, "compact"]] as const)(
    "titles the sidebar MausBot with a search button where the search box was, above New bot (Advanced %s, %s)",
    (advanced, density) => {
      fixture.advanced = advanced;
      fixture.density = density;
      const html = render();
      const title = html.indexOf("data-sidebar-title");
      expect(title).toBeGreaterThan(-1);
      expect(html.slice(title, html.indexOf('data-sidebar-nav="new-bot"'))).toContain(">MausBot</span>");
      expect(html.slice(title, html.indexOf('data-sidebar-nav="new-bot"'))).toContain("data-sidebar-search-toggle");
      expect(html.match(/data-sidebar-search-toggle/g)).toHaveLength(1);
      expect(html).not.toContain('placeholder="Search"');
    },
  );

  it("keeps the title out of the avatars-only sidebar and the Simple rail", () => {
    fixture.density = "icons";
    expect(render()).not.toContain("data-sidebar-title");
    fixture.advanced = false;
    expect(render()).not.toContain("data-sidebar-title");
  });
});
