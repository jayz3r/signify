import { LucideIcon } from "lucide-react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  accent = "text-shape",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <Icon className={`h-5 w-5 ${accent}`} />
      <p className="mt-3 font-mono text-2xl text-ink">{value}</p>
      <p className="text-sm text-mute">{label}</p>
    </div>
  );
}
