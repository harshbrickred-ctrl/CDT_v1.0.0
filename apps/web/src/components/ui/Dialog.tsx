import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { easeOut } from '../../lib/motion';
import { cardAccentBar } from './styles';

export default function Dialog({
  open,
  title,
  onClose,
  children,
  wide,
  size,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** @deprecated Prefer `size="wide"`. */
  wide?: boolean;
  /** default for forms; wide/xl for multi-column tables. */
  size?: 'default' | 'wide' | 'xl';
}) {
  const prefersReducedMotion = useReducedMotion();
  const resolvedSize = size ?? (wide ? 'wide' : 'default');
  const widthClass =
    resolvedSize === 'xl'
      ? 'max-w-5xl'
      : resolvedSize === 'wide'
        ? 'max-w-2xl'
        : 'max-w-lg';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Close dialog backdrop"
            className="fixed inset-0 bg-slate-deep/45 backdrop-blur-[3px]"
            onClick={onClose}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            initial={
              prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 8, scale: 0.98 }
            }
            transition={{ duration: 0.25, ease: easeOut }}
            className={`relative z-10 my-auto max-h-[min(85vh,820px)] w-full overflow-y-auto rounded-2xl border border-border/80 bg-card p-5 shadow-[0_32px_80px_-24px_hsl(222_28%_16%_/_0.35)] sm:p-6 ${widthClass}`}
          >
            <div aria-hidden className={cardAccentBar} />
            <div className="mb-5 flex items-start justify-between gap-3 pt-1">
              <h2
                id="dialog-title"
                className="font-display text-lg font-semibold text-slate-deep"
              >
                {title}
              </h2>
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                className="rounded-lg border border-border px-2.5 py-1 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Close
              </motion.button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
