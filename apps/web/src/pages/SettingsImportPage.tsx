import { FormEvent, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiErrorMessage, importApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import {
  btnPrimary,
  btnSecondary,
  fieldClass,
  labelClass,
} from '../components/ui/styles';

type EntityKind = 'clients' | 'candidates';

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    return row;
  });
}

/** Normalize UI JSON/CSV into API `{ entity, rows }` shape. */
function toImportBody(
  raw: string,
  mode: 'json' | 'csv',
  kind: EntityKind,
): { entity: EntityKind; rows: Record<string, unknown>[] } {
  if (mode === 'csv') {
    return { entity: kind, rows: parseCsv(raw) };
  }
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return { entity: kind, rows: parsed as Record<string, unknown>[] };
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.rows)) {
      return {
        entity: (typeof obj.entity === 'string' ? obj.entity : kind) as EntityKind,
        rows: obj.rows as Record<string, unknown>[],
      };
    }
    if (Array.isArray(obj[kind])) {
      return { entity: kind, rows: obj[kind] as Record<string, unknown>[] };
    }
    if (Array.isArray(obj.clients) && kind === 'clients') {
      return { entity: 'clients', rows: obj.clients as Record<string, unknown>[] };
    }
    if (Array.isArray(obj.candidates) && kind === 'candidates') {
      return {
        entity: 'candidates',
        rows: obj.candidates as Record<string, unknown>[],
      };
    }
  }
  throw new Error('Expected an array of rows or { entity, rows } / { clients|candidates }');
}

function samplePayload(mode: 'json' | 'csv', kind: EntityKind) {
  if (mode === 'json') {
    return kind === 'clients'
      ? '{\n  "clients": [{ "name": "Acme", "code": "ACME" }]\n}'
      : '{\n  "candidates": [{ "fullName": "Alex", "clientName": "Acme", "joinedOn": "2026-07-01" }]\n}';
  }
  return kind === 'clients'
    ? 'name,code\nAcme,ACME'
    : 'fullName,clientName,joinedOn\nAlex Employee,Acme,2026-07-01';
}

export default function SettingsImportPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [mode, setMode] = useState<'json' | 'csv'>('json');
  const [kind, setKind] = useState<EntityKind>('clients');
  const [raw, setRaw] = useState(samplePayload('json', 'clients'));
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const placeholder = useMemo(() => samplePayload(mode, kind), [mode, kind]);

  const dryMut = useMutation({
    mutationFn: () => importApi.dryRun(toImportBody(raw, mode, kind)),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => {
      setResult(null);
      setError(apiErrorMessage(err));
    },
  });

  const commitMut = useMutation({
    mutationFn: () => importApi.commit(toImportBody(raw, mode, kind)),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => {
      setResult(null);
      setError(apiErrorMessage(err));
    },
  });

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  function onDryRun(e: FormEvent) {
    e.preventDefault();
    try {
      toImportBody(raw, mode, kind);
      dryMut.mutate();
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid payload'));
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Import"
        description="Paste JSON or CSV rows, dry-run first, then commit."
      />

      <Card accent>
        <form onSubmit={onDryRun} className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className={labelClass}>Format</label>
              <select
                className={fieldClass}
                value={mode}
                onChange={(e) => {
                  const next = e.target.value as 'json' | 'csv';
                  setMode(next);
                  setRaw(samplePayload(next, kind));
                  setResult(null);
                  setError(null);
                }}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Entity</label>
              <select
                className={fieldClass}
                value={kind}
                onChange={(e) => {
                  const next = e.target.value as EntityKind;
                  setKind(next);
                  setRaw(samplePayload(mode, next));
                  setResult(null);
                  setError(null);
                }}
              >
                <option value="clients">Clients</option>
                <option value="candidates">Employees</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Payload</label>
            <textarea
              className={`${fieldClass} min-h-[220px] font-mono text-xs`}
              value={raw}
              placeholder={placeholder}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Employees: use <code>clientName</code>, <code>clientCode</code>, or{' '}
              <code>clientId</code>.
            </p>
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={btnSecondary}
              disabled={dryMut.isPending}
            >
              {dryMut.isPending ? 'Checking…' : 'Dry run'}
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={commitMut.isPending || dryMut.isPending}
              onClick={() => {
                try {
                  toImportBody(raw, mode, kind);
                  commitMut.mutate();
                } catch (err) {
                  setError(apiErrorMessage(err, 'Invalid payload'));
                }
              }}
            >
              {commitMut.isPending ? 'Importing…' : 'Commit import'}
            </button>
          </div>
        </form>
      </Card>

      {result != null && (
        <Card className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-deep">Result</h2>
          <pre className="overflow-auto rounded-lg bg-muted/50 p-3 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
