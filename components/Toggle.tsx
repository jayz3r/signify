"use client";

import { useState } from "react";
import clsx from "clsx";

export default function Toggle({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <p className="font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-sm text-mute">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => setChecked((v) => !v)}
        className={clsx(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-shape" : "bg-line"
        )}
      >
        <span
          className={clsx(
            "absolute top-1 h-5 w-5 rounded-full bg-void transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}
