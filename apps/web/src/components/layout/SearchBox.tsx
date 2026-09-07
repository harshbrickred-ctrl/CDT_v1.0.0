import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { searchApi } from '../../lib/api';
import { fadeIn } from '../../lib/motion';
import PublicId from '../ui/PublicId';

function hrefForHit(hit: {
  type?: string;
  id: string;
  publicId?: string;
  href?: string;
}) {
  if (hit.href) return hit.href;
  const key = (hit.type || '').toLowerCase();
  const id = hit.publicId || hit.id;
  if (key.includes('candidate')) return `/candidates/${id}`;
  if (key.includes('client')) return `/clients`;
  if (key.includes('leave')) return `/leave`;
  if (key.includes('timesheet')) return `/timesheets`;
  if (key.includes('review') || key.includes('delivery'))
    return `/delivery-reviews`;
  return `/candidates/${id}`;
}

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchApi.query(debounced),
    enabled: debounced.length >= 2,
  });

  const items = data?.items ?? [];
  const showPanel = open && debounced.length >= 2;

  return (
    <div ref={wrapRef} className="relative w-full max-w-sm">
      <div
        className={`flex items-center gap-2 rounded-xl border bg-background px-3 transition-all duration-200 ${
          focused
            ? 'border-primary/60 shadow-[0_0_0_3px_hsl(38_92%_46%_/_0.12)]'
            : 'border-border hover:border-border/90'
        }`}
      >
        <svg
          aria-hidden
          className={`h-4 w-4 shrink-0 transition-colors duration-200 ${focused ? 'text-primary' : 'text-muted-foreground'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="search"
          placeholder="Search candidates, clients…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      <AnimatePresence>
        {showPanel && (
          <motion.div
            className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border/80 bg-card shadow-[0_24px_60px_-20px_hsl(222_28%_16%_/_0.28)]"
            variants={fadeIn}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
            exit="exit"
          >
            {isFetching && (
              <p className="px-4 py-3 text-xs text-muted-foreground">Searching…</p>
            )}
            {!isFetching && items.length === 0 && (
              <p className="px-4 py-3 text-xs text-muted-foreground">
                No matches for “{debounced}”.
              </p>
            )}
            {items.map((hit) => (
              <Link
                key={`${hit.type}-${hit.id}`}
                to={hrefForHit(hit)}
                onClick={() => {
                  setOpen(false);
                  setQ('');
                }}
                className="block border-b border-border/60 px-4 py-2.5 transition-colors duration-150 last:border-0 hover:bg-muted/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{hit.label}</span>
                  {hit.publicId && <PublicId value={hit.publicId} />}
                </div>
                {(hit.subtitle || hit.type) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[hit.type, hit.subtitle].filter(Boolean).join(' · ')}
                  </p>
                )}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
