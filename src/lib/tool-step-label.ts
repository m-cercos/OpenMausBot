import { composioActionPhrase } from "@/lib/approval-summary";
import { t } from "@/lib/i18n";
import type { LocaleKey } from "@/locales";
import type { Message } from "@/state/store";

type StepTool = Pick<NonNullable<Message["tool"]>, "name" | "summary">;

type StepId =
  | "runCommand"
  | "readFile"
  | "writeFile"
  | "editFile"
  | "deleteFile"
  | "searchFiles"
  | "searchWeb"
  | "openWebPage"
  | "lookAtScreen"
  | "useComputer"
  | "updatePlan"
  | "askHelper"
  | "think"
  | "useBrowser"
  | "checkTeam"
  | "useTool";

export type StepTense = "imperative" | "past";

const STEP_IDS: Record<string, StepId> = {
  bash: "runCommand",
  shell: "runCommand",
  terminal: "runCommand",
  run_command: "runCommand",
  execute: "runCommand",
  computer_exec: "runCommand",
  read: "readFile",
  read_file: "readFile",
  view: "readFile",
  write: "writeFile",
  create_file: "writeFile",
  edit: "editFile",
  multiedit: "editFile",
  str_replace: "editFile",
  apply_patch: "editFile",
  notebookedit: "editFile",
  delete: "deleteFile",
  grep: "searchFiles",
  glob: "searchFiles",
  find: "searchFiles",
  search: "searchFiles",
  ls: "searchFiles",
  websearch: "searchWeb",
  web_search: "searchWeb",
  webfetch: "openWebPage",
  web_fetch: "openWebPage",
  fetch: "openWebPage",
  open_url: "openWebPage",
  screenshot: "lookAtScreen",
  computer_screenshot: "lookAtScreen",
  click: "useComputer",
  type_text: "useComputer",
  press_key: "useComputer",
  scroll: "useComputer",
  computer_batch: "useComputer",
  todowrite: "updatePlan",
  update_plan: "updatePlan",
  task: "askHelper",
  agent: "askHelper",
  think: "think",
  list_bots: "checkTeam",
  tool: "useTool",
  other: "useTool",
  mcp: "useTool",
};

const STEP_LABELS: Record<StepId, Record<StepTense, LocaleKey>> = {
  runCommand: { imperative: "toolStep.runCommand", past: "toolStep.past.runCommand" },
  readFile: { imperative: "toolStep.readFile", past: "toolStep.past.readFile" },
  writeFile: { imperative: "toolStep.writeFile", past: "toolStep.past.writeFile" },
  editFile: { imperative: "toolStep.editFile", past: "toolStep.past.editFile" },
  deleteFile: { imperative: "toolStep.deleteFile", past: "toolStep.past.deleteFile" },
  searchFiles: { imperative: "toolStep.searchFiles", past: "toolStep.past.searchFiles" },
  searchWeb: { imperative: "toolStep.searchWeb", past: "toolStep.past.searchWeb" },
  openWebPage: { imperative: "toolStep.openWebPage", past: "toolStep.past.openWebPage" },
  lookAtScreen: { imperative: "toolStep.lookAtScreen", past: "toolStep.past.lookAtScreen" },
  useComputer: { imperative: "toolStep.useComputer", past: "toolStep.past.useComputer" },
  updatePlan: { imperative: "toolStep.updatePlan", past: "toolStep.past.updatePlan" },
  askHelper: { imperative: "toolStep.askHelper", past: "toolStep.past.askHelper" },
  think: { imperative: "toolStep.think", past: "toolStep.past.think" },
  useBrowser: { imperative: "toolStep.useBrowser", past: "toolStep.past.useBrowser" },
  checkTeam: { imperative: "toolStep.checkTeam", past: "toolStep.past.checkTeam" },
  useTool: { imperative: "toolStep.useTool", past: "toolStep.past.useTool" },
};

function sentence(words: string): string {
  return words[0]!.toLocaleUpperCase() + words.slice(1);
}

export function toolStepLabel(tool: StepTool, tense: StepTense = "imperative"): string {
  const { name } = tool;
  const label = (id: StepId) => t(STEP_LABELS[id][tense]);
  // Codex and ACP title a command's chip with the command line; only a command carries a summary.
  if (tool.summary) return label("runCommand");
  if (/\s/.test(name)) return name;
  const bare = name.replace(/^mcp__.+?__(?=.)/, "");
  if (/(?:^|_)browser_/i.test(bare)) return label("useBrowser");
  const id = STEP_IDS[bare.toLowerCase()];
  if (id) return label(id);
  const phrase = composioActionPhrase(bare) ?? bare
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.:]+/g, " ")
    .toLowerCase();
  const words = phrase.replace(/\s+/g, " ").trim();
  if (!words) return label("useTool");
  return tense === "imperative" ? sentence(words) : words;
}
