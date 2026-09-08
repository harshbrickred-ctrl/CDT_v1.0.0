import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, lookupsApi } from '../lib/api';
import type { LookupType, LookupValue } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import {
  btnPrimary,
  btnSecondary,
  fieldClass,
  labelClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/ui/styles';

function typeLabel(code: string) {
  return code
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

type DraftMap = Record<
  string,
  { label: string; sortOrder: string; isActive: boolean }
>;

function draftsFromType(type: LookupType | undefined): DraftMap {
  const map: DraftMap = {};
  for (const v of type?.values ?? []) {
    map[v.id] = {
      label: v.label,
      sortOrder: String(v.sortOrder ?? 0),
      isActive: v.isActive !== false,
    };
  }
  return map;
}

function rowDirty(
  value: LookupValue,
  draft: { label: string; sortOrder: string; isActive: boolean } | undefined,
) {
  if (!draft) return false;
  return (
    draft.label.trim() !== value.label ||
    Number(draft.sortOrder) !== (value.sortOrder ?? 0) ||
    draft.isActive !== (value.isActive !== false)
  );
}

export default function SettingsLookupsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const typesQuery = useQuery({
    queryKey: ['lookups', 'types'],
    queryFn: () => lookupsApi.listTypes(),
    enabled: isAdmin,
  });

  const types = typesQuery.data ?? [];
  const selectedType =
    types.find((t) => t.id === selectedTypeId) ?? types[0] ?? null;

  useEffect(() => {
    if (!types.length) return;
    if (!selectedTypeId || !types.some((t) => t.id === selectedTypeId)) {
      setSelectedTypeId(types[0].id);
    }
  }, [types, selectedTypeId]);

  const valuesSignature = useMemo(() => {
    if (!selectedType) return '';
    return `${selectedType.id}:${(selectedType.values ?? [])
      .map((v) => `${v.id}:${v.label}:${v.sortOrder}:${v.isActive}`)
      .join('|')}`;
  }, [selectedType]);

  useEffect(() => {
    if (!selectedType) return;
    setDrafts((prev) => {
      const fromServer = draftsFromType(selectedType);
      const merged: DraftMap = { ...fromServer };
      for (const [id, draft] of Object.entries(prev)) {
        const server = selectedType.values?.find((v) => v.id === id);
        if (server && rowDirty(server, draft)) {
          merged[id] = draft;
        }
      }
      return merged;
    });
    setRowError(null);
    // Reset add form only when switching types (signature prefix is type id).
  }, [valuesSignature, selectedType]);

  useEffect(() => {
    setAddOpen(false);
    setAddCode('');
    setAddLabel('');
    setAddError(null);
  }, [selectedTypeId]);

  const values = useMemo(() => {
    const list = [...(selectedType?.values ?? [])];
    list.sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.code.localeCompare(b.code),
    );
    return list;
  }, [selectedType?.values]);

  const updateMut = useMutation({
    mutationFn: (payload: {
      id: string;
      label: string;
      sortOrder: number;
      isActive: boolean;
    }) =>
      lookupsApi.updateValue(payload.id, {
        label: payload.label,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      }),
    onSuccess: async () => {
      setSavingId(null);
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['lookups'] });
    },
    onError: (err) => {
      setSavingId(null);
      setRowError(apiErrorMessage(err));
    },
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (!selectedType) throw new Error('No type selected');
      const nextSort =
        values.reduce((max, v) => Math.max(max, v.sortOrder ?? 0), 0) + 1;
      return lookupsApi.createValue({
        typeId: selectedType.id,
        code: addCode.trim().toUpperCase(),
        label: addLabel.trim(),
        sortOrder: nextSort,
        isActive: true,
      });
    },
    onSuccess: async () => {
      setAddOpen(false);
      setAddCode('');
      setAddLabel('');
      setAddError(null);
      await qc.invalidateQueries({ queryKey: ['lookups'] });
    },
    onError: (err) => setAddError(apiErrorMessage(err)),
  });

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  function patchDraft(
    id: string,
    patch: Partial<{ label: string; sortOrder: string; isActive: boolean }>,
  ) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  function saveRow(value: LookupValue) {
    const draft = drafts[value.id];
    if (!draft || !rowDirty(value, draft)) return;
    const label = draft.label.trim();
    if (!label) {
      setRowError('Label cannot be empty.');
      return;
    }
    setRowError(null);
    setSavingId(value.id);
    updateMut.mutate({
      id: value.id,
      label,
      sortOrder: Number(draft.sortOrder) || 0,
      isActive: draft.isActive,
    });
  }

  function toggleActive(value: LookupValue) {
    const draft = drafts[value.id] ?? {
      label: value.label,
      sortOrder: String(value.sortOrder ?? 0),
      isActive: value.isActive !== false,
    };
    const next = { ...draft, isActive: !draft.isActive };
    setDrafts((prev) => ({ ...prev, [value.id]: next }));
    setRowError(null);
    setSavingId(value.id);
    updateMut.mutate({
      id: value.id,
      label: next.label.trim() || value.label,
      sortOrder: Number(next.sortOrder) || 0,
      isActive: next.isActive,
    });
  }

  function onAddSubmit(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addCode.trim() || !addLabel.trim()) {
      setAddError('Code and label are required.');
      return;
    }
    createMut.mutate();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Lookups"
        description="Pick a list, edit labels inline, and toggle whether values appear in forms."
      />

      {typesQuery.isLoading && <Spinner />}
      {typesQuery.isError && (
        <Alert tone="error">{apiErrorMessage(typesQuery.error)}</Alert>
      )}

      {!typesQuery.isLoading && types.length === 0 ? (
        <EmptyState
          title="No lookup types"
          description="Run the database seed to populate master lists."
        />
      ) : (
        !typesQuery.isLoading &&
        selectedType && (
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <nav
              className="h-fit rounded-2xl border border-border/80 bg-card p-2 shadow-[0_16px_48px_-28px_hsl(222_28%_16%_/_0.12)]"
              aria-label="Lookup types"
            >
              <ul className="space-y-0.5">
                {types.map((t) => {
                  const active = t.id === selectedType.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          active
                            ? 'bg-primary/15 font-semibold text-slate-deep'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        onClick={() => setSelectedTypeId(t.id)}
                      >
                        <span className="block">{typeLabel(t.code)}</span>
                        <span className="block font-mono text-[10px] opacity-70">
                          {t.code}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-deep">
                    {typeLabel(selectedType.code)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {values.length} value{values.length === 1 ? '' : 's'} · edit
                    and save per row
                  </p>
                </div>
                {!addOpen && (
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => {
                      setAddOpen(true);
                      setAddError(null);
                    }}
                  >
                    Add value
                  </button>
                )}
              </div>

              {rowError && <Alert tone="error">{rowError}</Alert>}

              {values.length === 0 && !addOpen ? (
                <EmptyState
                  title="No values in this list"
                  description="Add a value to use it in forms."
                />
              ) : (
                <div className={tableWrap}>
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className={thClass}>Code</th>
                        <th className={thClass}>Label</th>
                        <th className={`${thClass} w-24`}>Sort</th>
                        <th className={`${thClass} w-28`}>Active</th>
                        <th className={`${thClass} w-28`} />
                      </tr>
                    </thead>
                    <tbody>
                      {values.map((value) => {
                        const draft = drafts[value.id] ?? {
                          label: value.label,
                          sortOrder: String(value.sortOrder ?? 0),
                          isActive: value.isActive !== false,
                        };
                        const dirty = rowDirty(value, draft);
                        const busy = savingId === value.id && updateMut.isPending;
                        return (
                          <tr key={value.id} className="group">
                            <td
                              className={`${tdClass} font-mono text-xs text-muted-foreground`}
                            >
                              {value.code}
                            </td>
                            <td className={tdClass}>
                              <input
                                className={`${fieldClass} !py-1.5`}
                                value={draft.label}
                                disabled={busy}
                                aria-label={`Label for ${value.code}`}
                                onChange={(e) =>
                                  patchDraft(value.id, {
                                    label: e.target.value,
                                  })
                                }
                                onBlur={() => saveRow(value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                              />
                            </td>
                            <td className={tdClass}>
                              <input
                                type="number"
                                min={0}
                                className={`${fieldClass} !py-1.5`}
                                value={draft.sortOrder}
                                disabled={busy}
                                aria-label={`Sort for ${value.code}`}
                                onChange={(e) =>
                                  patchDraft(value.id, {
                                    sortOrder: e.target.value,
                                  })
                                }
                                onBlur={() => saveRow(value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                              />
                            </td>
                            <td className={tdClass}>
                              <button
                                type="button"
                                disabled={busy}
                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                  draft.isActive
                                    ? 'bg-success/15 text-success'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                                onClick={() => toggleActive(value)}
                              >
                                {draft.isActive ? 'Active' : 'Off'}
                              </button>
                            </td>
                            <td className={tdClass}>
                              {busy ? (
                                <span className="text-xs text-muted-foreground">
                                  Saving…
                                </span>
                              ) : dirty ? (
                                <button
                                  type="button"
                                  className={`${btnSecondary} !px-2.5 !py-1.5 text-xs`}
                                  onClick={() => saveRow(value)}
                                >
                                  Save
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {addOpen && (
                <form
                  onSubmit={onAddSubmit}
                  className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_16px_48px_-28px_hsl(222_28%_16%_/_0.12)]"
                >
                  <p className="mb-3 text-sm font-medium text-slate-deep">
                    New value in {typeLabel(selectedType.code)}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="add-code">
                        Code *
                      </label>
                      <input
                        id="add-code"
                        className={fieldClass}
                        required
                        autoFocus
                        placeholder="e.g. COMPASSIONATE"
                        value={addCode}
                        onChange={(e) => setAddCode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="add-label">
                        Label *
                      </label>
                      <input
                        id="add-label"
                        className={fieldClass}
                        required
                        placeholder="Display name"
                        value={addLabel}
                        onChange={(e) => setAddLabel(e.target.value)}
                      />
                    </div>
                  </div>
                  {addError && (
                    <Alert tone="error" className="mt-3 !mb-0">
                      {addError}
                    </Alert>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={createMut.isPending}
                      onClick={() => {
                        setAddOpen(false);
                        setAddCode('');
                        setAddLabel('');
                        setAddError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMut.isPending}>
                      {createMut.isPending ? 'Adding…' : 'Add'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
