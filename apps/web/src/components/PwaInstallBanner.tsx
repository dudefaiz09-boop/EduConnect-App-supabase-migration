import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';

const STORAGE_KEY = 'educonnect-pwa-banner-dismissed';

function getOS() {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isMobile() {
  return window.matchMedia('(max-width: 767px)').matches;
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (dismissed) return;
    if (isStandalone()) return;
    if (!isMobile()) return;

    const os = getOS();
    if (os !== 'ios' && os !== 'android') return;

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const os = getOS();
  const isIOS = os === 'ios';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className={cn(
            'fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto',
            'rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-slate-200/50 backdrop-blur-xl',
            'dark:border-white/[0.06] dark:bg-[#16162a]/90 dark:shadow-none'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
              <Smartphone size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Install EduConnect</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {isIOS
                  ? 'Tap Share, then Add to Home Screen for the best experience.'
                  : 'For the best experience on Android, use the native EduConnect app.'}
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
