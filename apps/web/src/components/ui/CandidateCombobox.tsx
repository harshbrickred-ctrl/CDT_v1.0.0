import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi } from '../../lib/api';
import type { Candidate } from '../../lib/types';
import { labelClass } from '../ui/styles';
import PublicId from '../ui/PublicId';

export type CandidateComboboxProps = {
  label?: string;
  value: string;
  selected?: Pick<
    Candidate,
    'id' | 'publicId' | 'fullName' | 'client' | 'clientName' | 'status'
  > | null;
  onChange: (candidate: Candidate | null) => void;
  status?: string;
  /** Comma-separated or array; when set, overrides status. */
  statuses?: string | string[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

function clientName(
  c: Pick<Candidate, 'client' | 'clientName'> | null | undefined,
) {
  return c?.client?.name ?? c?.clientName ?? null;
}

export default function CandidateCombobox({
  label = 'Candidate',
  value,
  selected,
  onChange,
  status = 'ACTIVE',
  statuses,
  required,
  placeholder = 'Search by name or public ID…',
  disabled,
}: CandidateComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const statusesParam = Array.isArray(statuses)
    ? statuses.join(',')
    : statuses;

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Keep input in sync when selection is cleared externally
  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  const { data, isFetching } = useQuery({
    queryKey: ['candidates', 'combobox', status, statusesParam, debounced],
    queryFn: () =>
      candidatesApi.list({
        ...(statusesParam
          ? { statuses: statusesParam }
          : { status }),
        q: debounced || undefined,
        pageSize: 12,
      }),
    enabled: open,
  });

  const items = data?.items ?? [];
  const displaySelected =
    selected && selected.id === value
      ? selected
      : items.find((c) => c.id === value) ?? null;

  function pick(c: Candidate) {
    onChange(c);
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery('');
    setOpen(true);
  }

  return (
    <div ref={wrapRef} className="relative">
      {label && (
        <label htmlFor={id} className={labelClass}>
          {label}
          {required ? ' *' : ''}
        </label>
      )}

      {value && displaySelected && !open ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-deep">
              {displaySelected.fullName}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <PublicId value={displaySelected.publicId} />
              {clientName(displaySelected) && (
                <span>· {clientName(displaySelected)}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={clear}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Change
          </button>
        </div>
      ) : (
        <div
          className={`flex items-center gap-2 rounded-lg border bg-background px-3 transition-all duration-200 ${
            focused
              ? 'border-primary/60 shadow-[0_0_0_3px_hsl(38_92%_46%_/_0.12)]'
              : 'border-border hover:border-border/80'
          }`}
        >
          <svg
            aria-hidden
            className={`h-4 w-4 shrink-0 ${
              focused ? 'text-primary' : 'text-muted-foreground'
            }`}
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
            id={id}
            type="search"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            required={required && !value}
            disabled={disabled}
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (value) onChange(null);
            }}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-xl border border-border/80 bg-card py-1 shadow-[0_24px_60px_-20px_hsl(222_28%_16%_/_0.28)]"
        >
          {isFetching && (
            <li className="px-3 py-2.5 text-xs text-muted-foreground">
              Searching…
            </li>
          )}
          {!isFetching && items.length === 0 && (
            <li className="px-3 py-2.5 text-xs text-muted-foreground">
              {debounced
                ? `No candidates match “${debounced}”.`
                : 'No candidates found.'}
            </li>
          )}
          {!isFetching &&
            items.map((c) => (
              <li key={c.id} role="option" aria-selected={c.id === value}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-muted/70"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c)}
                >
                  <span className="text-sm font-medium text-slate-deep">
                    {c.fullName}
                    {c.status === 'RELEASED' ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (Released)
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <PublicId value={c.publicId} />
                    {clientName(c) && <span>· {clientName(c)}</span>}
                    {c.roleTitle && <span>· {c.roleTitle}</span>}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
