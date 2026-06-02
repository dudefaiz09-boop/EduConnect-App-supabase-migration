import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickActionCardProps {
  title: string;
  description: string;
  to: string;
  icon: React.ElementType;
}

export function QuickActionCard({ title, description, to, icon: Icon }: QuickActionCardProps) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm shadow-slate-200/60 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/70 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none dark:hover:border-blue-700 sm:gap-4 sm:p-5"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950 dark:text-cyan-300 sm:h-12 sm:w-12">
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">{title}</h3>
        <p className="line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <ArrowRight
        size={18}
        className="shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-blue-600"
      />
    </Link>
  );
}
