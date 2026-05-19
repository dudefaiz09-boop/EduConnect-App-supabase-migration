import { cn } from '../../lib/utils';

export interface LoadingSpinnerProps {
  className?: string;
  label?: string;
}

export function LoadingSpinner({ className, label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-3 text-blue-600', className)}>
      <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
