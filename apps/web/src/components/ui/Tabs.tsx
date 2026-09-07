import { motion, useReducedMotion } from 'framer-motion';

export type TabItem = {
  id: string;
  label: string;
};

export default function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative -mb-px px-3.5 py-2.5 text-sm font-medium transition-colors duration-200 ${
              isActive
                ? 'text-slate-deep'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {isActive && (
              <motion.span
                aria-hidden
                layoutId={prefersReducedMotion ? undefined : 'tab-underline'}
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
