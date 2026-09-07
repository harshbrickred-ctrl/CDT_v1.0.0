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

function parseCsv(text: string, kind: EntityKind): Record<string, string>[] {
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
    row.__kind = kind;
    return row;
  });
}

function parsePayload(
  raw: string,
  mode: 'json' | 'csv',
  kind: EntityKind,
): unknown {
  if (mode === 'json') {
    return JSON.parse(raw);
  }
  return { [kind]: parseCsv(raw, kind) };
}

function samplePayload(mode: 'json' | 'csv', kind: EntityKind) {
  if (mode === 'json') {
    return kind === 'clients'
      ? '{\n  "clients": [{ "name": "Acme", "code": "ACME" }]\n}'
      : '{\n  "candidates": [{ "fullName": "Alex", "clientCode": "ACME", "joinedOn": "2026-07-01" }]\n}';
  }
  return kind === 'clients'
    ? 'name,code\nAcme,ACME'
    : 'fullName,clientCode,joinedOn\nAlex Candidate,ACME,2026-07-01';
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
    mutationFn: () => importApi.dryRun(parsePayload(raw, mode, kind)),
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
    mutationFn: () => importApi.commit(parsePayload(raw, mode, kind)),
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
      parsePayload(raw, mode, kind);
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
                }}
              >
                <option value="clients">Clients</option>
                <option value="candidates">Candidates</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Payload</label>
            <textarea
              className={`${fieldClass} font-mono text-xs`}
              rows={12}
              value={raw}
              placeholder={placeholder}
              onChange={(e) => setRaw(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={btnSecondary}
              disabled={dryMut.isPending}
            >
              {dryMut.isPending ? 'Dry-running…' : 'Dry run'}
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={commitMut.isPending}
              onClick={() => {
                try {
                  parsePayload(raw, mode, kind);
                  commitMut.mutate();
                } catch (err) {
                  setError(apiErrorMessage(err, 'Invalid payload'));
                }
              }}
            >
              {commitMut.isPending ? 'Committing…' : 'Commit'}
            </button>
          </div>
        </form>
      </Card>

      {error && <Alert tone="error" className="mt-4">{error}</Alert>}

      {result != null && (
        <Card className="mt-4 !p-0" padding={false}>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
