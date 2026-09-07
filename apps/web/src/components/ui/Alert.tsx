import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { fadeIn } from '../../lib/motion';

const tones = {
  error: 'border-destructive/25 bg-destructive/5 text-destructive',
  info: 'border-border bg-muted/50 text-muted-foreground',
  warning: 'border-warning/30 bg-warning/10 text-warning',
} as const;

export default function Alert({
  children,
  tone = 'info',
  className = '',
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      role={tone === 'error' ? 'alert' : undefined}
      className={`mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${tones[tone]} ${className}`}
      variants={fadeIn}
      initial={prefersReducedMotion ? false : 'hidden'}
      animate="visible"
    >
      {children}
    </motion.div>
  );
}
