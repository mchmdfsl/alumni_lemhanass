import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp = true,
}: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b1f3a]/5 transition-colors group-hover:bg-[#0b1f3a]/10">
          <Icon size={21} strokeWidth={1.8} className="text-[#0b1f3a]" />
        </div>

        {/* Trend */}
        {trend && (
          <div
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
              trendUp
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}

            {trend}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-5">
        <p className="text-sm font-medium text-[#64748b]">{title}</p>

        <h3 className="mt-1 text-2xl font-bold tracking-tight text-[#172033] sm:text-3xl">
          {value}
        </h3>

        <p className="mt-1 text-xs text-[#94a3b8]">{description}</p>
      </div>
    </div>
  );
}
