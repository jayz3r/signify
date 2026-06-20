"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Check } from "lucide-react";

const OPTIONS = [
  { id: "void", label: "Void", swatch: "bg-[#15101F]" },
  { id: "aurora", label: "Aurora", swatch: "bg-gradient-to-br from-[#15101F] via-[#1b2a3a] to-[#15101F]" },
  { id: "sunset", label: "Sunset", swatch: "bg-gradient-to-br from-[#2b1320] via-[#1f1830] to-[#15101F]" },
  { id: "forest", label: "Forest", swatch: "bg-gradient-to-br from-[#10241d] via-[#1a2418] to-[#15101F]" },
];

export default function ChangeBackgroundPage() {
  const [selected, setSelected] = useState("void");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("signify-bg");
      if (saved) setSelected(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const choose = (id: string) => {
    setSelected(id);
    try {
      window.localStorage.setItem("signify-bg", id);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>

      <h1 className="mt-6 font-display text-3xl font-bold text-ink">Change background</h1>
      <p className="mt-2 text-mute">This backdrop shows up behind every Play game screen.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => choose(opt.id)}
            className={clsx(
              "relative h-32 overflow-hidden rounded-2xl border-2 text-left transition-colors",
              selected === opt.id ? "border-shape" : "border-line hover:border-shape/40"
            )}
          >
            <div className={clsx("absolute inset-0", opt.swatch)} />
            <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-void/80 to-transparent p-4">
              <span className="font-medium text-ink">{opt.label}</span>
              {selected === opt.id && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-shape text-void">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
