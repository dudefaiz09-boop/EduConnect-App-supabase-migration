import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'blue' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose';
  trend?: string;
}

const tones = {
  blue: 'from-blue-500 to-blue-700 shadow-blue-200/70',
  violet: 'from-violet-500 to-purple-700 shadow-violet-200/70',
  cyan: 'from-cyan-500 to-sky-700 shadow-cyan-200/70',
  emerald: 'from-emerald-500 to-teal-700 shadow-emerald-200/70',
  amber: 'from-amber-400 to-orange-600 shadow-amber-200/70',
  rose: 'from-rose-500 to-pink-700 shadow-rose-200/70',
};

export function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = 'blue',
  trend,
}: StatCardProps) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative min-w-0 overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-5"
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-white via-blue-50/70 to-transparent" />
      <div className="relative flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-slate-400 sm:tracking-[0.18em]">
            {title}
          </p>
          <div className="mt-2 flex min-w-0 items-end gap-2 sm:mt-3">
            <span className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {value}
            </span>
            {trend && (
              <span className="mb-1 shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                {trend}
              </span>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-500">{detail}</p>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg sm:h-12 sm:w-12',
            tones[tone]
          )}
        >
          <Icon size={22} />
        </div>
      </div>
    </motion.article>
  );
}
