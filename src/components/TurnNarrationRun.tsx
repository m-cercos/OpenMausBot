// Providers such as Grok narrate before tools.
import { useEffect, useState } from "react";
import { WorkLine } from "./ActivityRun";

export function TurnNarrationRun({
  label,
  forceOpen = false,
  children,
}: {
  label: string;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(forceOpen);
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div className="flex flex-col gap-2">
      <WorkLine
        label={label}
        open={open}
        title={open ? "Hide progress messages" : "Show progress messages"}
        onToggle={() => setOpen((value) => !value)}
      />
      {open && children}
    </div>
  );
}
