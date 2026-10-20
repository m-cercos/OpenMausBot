import { useId } from "react";
import { Check } from "lucide-react";

import { approvalModeFor, type ApprovalMode } from "../../shared/approval-mode";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import {
  approvalModeOptionsFor,
  approvalModeSelectionRequiresLocalDesktop,
  shownApprovalMode,
} from "@/lib/approval-mode-options";

export function ApprovalModeChoices({
  approvalMode,
  autoApprove,
  driverKind,
  onSelect,
  label,
  disabled = false,
  trustedModesAvailable = true,
}: {
  approvalMode?: ApprovalMode;
  autoApprove?: boolean;
  driverKind: string;
  onSelect: (mode: ApprovalMode) => void;
  label: string;
  disabled?: boolean;
  trustedModesAvailable?: boolean;
}) {
  const mode = shownApprovalMode(driverKind, approvalModeFor({ approvalMode, autoApprove }));
  const modesDisabled = disabled || approvalModeSelectionRequiresLocalDesktop(mode, trustedModesAvailable);
  const headingId = useId();
  return (
    <div role="radiogroup" aria-labelledby={headingId} data-approval-choices className="flex flex-col gap-0.5">
      <span id={headingId} className="px-2 pb-0.5 text-[12px] font-medium text-ink-secondary">{label}</span>
      {approvalModeOptionsFor(driverKind, trustedModesAvailable).map((option) => {
        const selected = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={modesDisabled}
            title={disabled ? t("approvalMode.busy") : option.description}
            onClick={() => onSelect(option.mode)}
            className={cn(
              "flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              selected ? "bg-raised-hover" : "hover:bg-control/60",
              selected && option.mode === "full" ? "text-warning" : "text-ink",
              modesDisabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {selected && <Check size={14} className="shrink-0" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
