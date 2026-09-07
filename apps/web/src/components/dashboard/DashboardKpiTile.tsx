import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { cardAccentBar, cardClass } from '../ui/styles';

function AnimatedValue({
  value,
  format,
}: {
  value: number | string;
  format?: (n: number) => string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const isNumber = typeof value === 'number';
  const spring = useSpring(isNumber ? value : 0, {
    stiffness: 90,
    damping: 18,
  });
  const display = useTransform(spring, (v) =>
    format ? format(Math.round(v)) : String(Math.round(v)),
  );
  const [text, setText] = useState(
    isNumber ? (format ? format(value) : String(value)) : String(value),
  );

  useEffect(() => {
    if (!isNumber || prefersReducedMotion) {
      setText(format && typeof value === 'number' ? format(value) : String(value));
      return;
    }
    spring.set(value);
    return display.on('change', (v) => setText(v));
  }, [value, isNumber, spring, display, format, prefersReducedMotion]);

  return (
    <span className="font-display text-3xl font-semibold tracking-tight text-slate-deep">
      {text}
    </span>
  );
}

export type DashboardKpiTileProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon: ReactNode;
  accent?: string;
  formatValue?: (n: number) => string;
  onClick?: () => void;
};

export default function DashboardKpiTile({
  label,
  value,
  hint,
  icon,
  accent = 'from-primary/40 via-primary to-primary/40',
  formatValue,
  onClick,
}: DashboardKpiTileProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion || !ref.current || !onClick) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientY - rect.top - rect.height / 2) / 12;
    const y = (e.clientX - rect.left - rect.width / 2) / -12;
    setTilt({ x, y });
  }

  function onLeave() {
    setTilt({ x: 0, y: 0 });
  }

  const inner = (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      animate={
        prefersReducedMotion
          ? {}
          : { rotateX: tilt.x, rotateY: tilt.y, scale: 1 }
      }
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`${cardClass} relative h-full !p-4 sm:!p-5`}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 800,
      }}
    >
      <div aria-hidden className={`${cardAccentBar} bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-2">
        <AnimatedValue value={value} format={formatValue} />
      </div>
      {hint && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {onClick && (
        <p className="mt-3 text-[11px] font-medium text-primary/80">
          Click to view details
        </p>
      )}
    </motion.div>
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={prefersReducedMotion ? undefined : { y: -2 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="block h-full w-full cursor-pointer rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        {inner}
      </motion.button>
    );
  }

  return inner;
}
