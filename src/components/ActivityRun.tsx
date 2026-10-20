import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Message } from "@/state/store";
import { describeRun } from "@/lib/activity-runs";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { useAdvancedMode } from "@/lib/interface-mode";
import { toolStepLabel } from "@/lib/tool-step-label";

export function WorkLine({
  label,
  open,
  title,
  onToggle,
}: {
  label: string;
  open: boolean;
  title?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={title}
      className="flex w-full min-w-0 items-center gap-1 border-b border-hairline/40 pb-2 text-left text-[13px] text-ink-secondary transition-colors hover:text-ink"
    >
      <span className="min-w-0 truncate leading-5">{label}</span>
      <ChevronRight size={14} aria-hidden="true" className={cn("shrink-0 transition-transform", open && "rotate-90")} />
    </button>
  );
}

export function ActivityRun({
  messages,
  forceOpen = false,
  children,
}: {
  messages: Message[];
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(forceOpen);
  const advanced = useAdvancedMode();
  const summary = advanced ? describeRun(messages) : describeRun(messages, toolStepLabel);
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);
  return (
    <div className="flex flex-col gap-1">
      <WorkLine label={summary} open={open} title={open ? undefined : t("chat.run.showSteps")} onToggle={() => setOpen((value) => !value)} />
      {open && children}
    </div>
  );
}
