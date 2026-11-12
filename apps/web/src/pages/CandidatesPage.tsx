import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiErrorMessage,
  candidatesApi,
  clientsApi,
  lookupsApi,
  usersApi,
} from '../lib/api';
import { scopeClientsForUser } from '../lib/client-scope';
import { formatDate } from '../lib/format';
import {
  COST_CENTER_OPTIONS,
  labelFromOptions,
  WORK_LOCATION_OPTIONS,
} from '../lib/masterLists';
import type {
  BenchFeedback,
  BenchFeedbackKind,
  Candidate,
  EmployeeCategory,
  EmployeeTeam,
} from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useCostCenter } from '../context/CostCenterContext';
import PageHeader from '../components/ui/PageHeader';
import PublicId from '../components/ui/PublicId';
import StatusPill from '../components/ui/StatusPill';
import EmptyState from '../components/ui/EmptyState';
import Dialog from '../components/ui/Dialog';
import Spinner from '../components/ui/Spinner';
import FilterBar from '../components/ui/FilterBar';
import Alert from '../components/ui/Alert';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { DetailField, DetailGrid, clickableRowClass } from '../components/ui/DetailGrid';
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  fieldClass,
  labelClass,
  tableWrap,
  tdClass,
  thClass,
} from '../components/ui/styles';

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR' },
  { value: 'DOLLAR', label: 'Dollar' },
] as const;

const CATEGORY_TABS: { id: '' | EmployeeCategory; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'BILLABLE', label: 'Billable' },
  { id: 'NON_BILLABLE', label: 'Non-billable' },
  { id: 'BENCH', label: 'Bench' },
];

const CATEGORY_LABEL: Record<EmployeeCategory, string> = {
  BILLABLE: 'Billable',
  NON_BILLABLE: 'Non-billable',
  BENCH: 'Bench',
};

const TEAM_OPTIONS: { value: EmployeeTeam; label: string }[] = [
  { value: 'SUPPORT', label: 'Support' },
  { value: 'LEADERSHIP', label: 'Leadership Team' },
  { value: 'DELIVERY', label: 'Delivery Team' },
];

const TEAM_LABEL: Record<string, string> = {
  SUPPORT: 'Support',
  LEADERSHIP: 'Leadership Team',
  DELIVERY: 'Delivery Team',
};

const SUPPORT_ROLE_OPTIONS = [
  { value: 'HR', label: 'HR' },
  { value: 'TA', label: 'TA' },
  { value: 'ACCOUNTS', label: 'Accounts' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'FINANCE', label: 'Finance' },
] as const;

const SUPPORT_ROLE_LABEL: Record<string, string> = Object.fromEntries(
  SUPPORT_ROLE_OPTIONS.map((o) => [o.value, o.label]),
);

const NA = 'Not Applicable';

function todayIso() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${now.getUTCFullYear()}-${month}-${day}`;
}

function latestBenchFeedback(
  entries: BenchFeedback[] | undefined,
  kind: BenchFeedbackKind,
): string | null {
  if (!entries?.length) return null;
  const match = entries.find((entry) => entry.kind === kind);
  return match?.body?.trim() || null;
}

const emptyForm = {
  category: 'BILLABLE' as EmployeeCategory,
  fullName: '',
  clientId: '',
  costCenter: 'BRICKRED',
  projectAccount: '',
  roleTitle: '',
  clientReportingManager: '',
  accountManagerUserId: '',
  salesOwnerUserId: '',
  team: '' as '' | EmployeeTeam,
  supportFunction: '',
  benchStartDate: '',
  interviewsScheduledCount: '0',
  interviewsClearedCount: '0',
  billingType: 'HOURLY',
  hourlyRate: '',
  monthlyFixedAmount: '',
  maxBillableHours: '',
  hoursPerDay: '8',
  currency: 'INR',
  joinedOn: '',
  contractEndDate: '',
  workLocation: '',
  email: '',
  mobile: '',
};

function optionalFields(form: typeof emptyForm) {
  const shared = {
    category: form.category,
    fullName: form.fullName,
    costCenter: form.costCenter,
    joinedOn: form.joinedOn || undefined,
    email: form.email || undefined,
    mobile: form.mobile || undefined,
  };
  if (form.category === 'NON_BILLABLE') {
    return {
      ...shared,
      roleTitle: null,
      team: form.team,
      supportFunction: form.supportFunction || null,
    };
  }
  if (form.category === 'BENCH') {
    return {
      ...shared,
      roleTitle: null,
      team: form.team || null,
      supportFunction: form.team ? form.supportFunction || null : null,
      benchStartDate: form.benchStartDate || todayIso(),
      interviewsScheduledCount: Number(form.interviewsScheduledCount || 0),
      interviewsClearedCount: Number(form.interviewsClearedCount || 0),
    };
  }
  return {
    ...shared,
    roleTitle: form.roleTitle || undefined,
    clientId: form.clientId,
    projectAccount: form.projectAccount || undefined,
    clientReportingManager: form.clientReportingManager || undefined,
    accountManagerUserId: form.accountManagerUserId || null,
    salesOwnerUserId: form.salesOwnerUserId || null,
    billingType: form.billingType as 'HOURLY' | 'FIXED',
    hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
    monthlyFixedAmount: form.monthlyFixedAmount
      ? Number(form.monthlyFixedAmount)
      : undefined,
    maxBillableHours: form.maxBillableHours
      ? Number(form.maxBillableHours)
      : undefined,
    hoursPerDay:
      form.billingType === 'FIXED'
        ? undefined
        : form.hoursPerDay
          ? Number(form.hoursPerDay)
          : undefined,
    currency: form.currency || undefined,
    contractEndDate: form.contractEndDate || undefined,
    workLocation: form.workLocation || undefined,
  };
}

function candidateToForm(c: Candidate): typeof emptyForm {
  const category = (c.category as EmployeeCategory) || 'BILLABLE';
  return {
    category,
    fullName: c.fullName ?? '',
    clientId: c.clientId ?? c.client?.id ?? '',
    costCenter: c.costCenter || 'BRICKRED',
    projectAccount: c.projectAccount ?? '',
    roleTitle: c.roleTitle ?? '',
    clientReportingManager: c.clientReportingManager ?? '',
    accountManagerUserId: c.accountManagerUserId ?? c.accountManager?.id ?? '',
    salesOwnerUserId: c.salesOwnerUserId ?? c.salesOwner?.id ?? '',
    team: (c.team as EmployeeTeam) || '',
    supportFunction: c.supportFunction ?? '',
    benchStartDate: c.benchStartDate
      ? String(c.benchStartDate).slice(0, 10)
      : category === 'BENCH'
        ? todayIso()
        : '',
    interviewsScheduledCount:
      c.interviewsScheduledCount != null
        ? String(c.interviewsScheduledCount)
        : '0',
    interviewsClearedCount:
      c.interviewsClearedCount != null
        ? String(c.interviewsClearedCount)
        : '0',
    billingType: (c.billingType as string) || 'HOURLY',
    hourlyRate: c.hourlyRate != null ? String(c.hourlyRate) : '',
    monthlyFixedAmount:
      c.monthlyFixedAmount != null ? String(c.monthlyFixedAmount) : '',
    maxBillableHours:
      c.maxBillableHours != null ? String(c.maxBillableHours) : '',
    hoursPerDay: c.hoursPerDay != null ? String(c.hoursPerDay) : '8',
    currency:
      c.currency === 'USD' || c.currency === 'DOLLAR'
        ? 'DOLLAR'
        : (c.currency ?? 'INR'),
    joinedOn: c.joinedOn ? String(c.joinedOn).slice(0, 10) : '',
    contractEndDate: c.contractEndDate
      ? String(c.contractEndDate).slice(0, 10)
      : '',
    workLocation: c.workLocation ?? '',
    email: c.email ?? '',
    mobile: c.mobile ?? '',
  };
}

export default function CandidatesPage() {
  const { user } = useAuth();
  const { costCenter, costCenterParam } = useCostCenter();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState('ACTIVE');
  const [category, setCategory] = useState<'' | EmployeeCategory>('');
  const [clientId, setClientId] = useState('');
  const [q, setQ] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(
    null,
  );
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const canManage =
    user?.role === 'ADMIN' || user?.role === 'DELIVERY_OWNER';

  const defaultFormCostCenter =
    costCenter === 'ALL' ? 'BRICKRED' : costCenter;

  const blankForm = (): typeof emptyForm => ({
    ...emptyForm,
    costCenter: defaultFormCostCenter,
  });

  const clientsQuery = useQuery({
    queryKey: ['clients', 'all', costCenterParam],
    queryFn: () =>
      clientsApi.list({ pageSize: 200, costCenter: costCenterParam }),
  });

  const scopedClients = useMemo(
    () =>
      scopeClientsForUser(
        clientsQuery.data?.items ?? [],
        user?.ownedClientIds,
      ),
    [clientsQuery.data?.items, user?.ownedClientIds],
  );

  const workLocationsQuery = useQuery({
    queryKey: ['lookups', 'WORK_LOCATION'],
    queryFn: () => lookupsApi.list('WORK_LOCATION'),
    enabled: formOpen || !!selectedCandidate,
  });

  const workLocations = useMemo(() => {
    const items = workLocationsQuery.data?.items ?? [];
    if (items.length) return items;
    return WORK_LOCATION_OPTIONS.map((o, i) => ({
      id: o.code,
      code: o.code,
      label: o.label,
      sortOrder: i + 1,
      isActive: true,
    }));
  }, [workLocationsQuery.data]);

  const workLocationLabel = (code?: string | null) =>
    labelFromOptions(workLocations, code);

  const selectedClient = useMemo(
    () => scopedClients.find((c) => c.id === form.clientId) ?? null,
    [scopedClients, form.clientId],
  );

  const accountOwnersForClient = selectedClient?.accountOwners ?? [];

  const usersQuery = useQuery({
    queryKey: ['users', 'options'],
    queryFn: () => usersApi.options(),
    enabled: formOpen && form.category === 'BILLABLE' && canManage,
  });
  const salesOwners = usersQuery.data ?? [];

  const listQuery = useQuery({
    queryKey: ['candidates', { status, category, clientId, q, costCenterParam }],
    queryFn: () =>
      candidatesApi.list({
        status: status || undefined,
        category: category || undefined,
        clientId: category === 'BILLABLE' || category === '' ? clientId || undefined : undefined,
        q: q || undefined,
        costCenter: costCenterParam,
        pageSize: 100,
      }),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const body = optionalFields(form);
      if (editingCandidate) {
        return candidatesApi.update(editingCandidate.id, body);
      }
      return candidatesApi.create(body);
    },
    onSuccess: async () => {
      setFormOpen(false);
      setEditingCandidate(null);
      setForm(blankForm());
      setError(null);
      setSelectedCandidate(null);
      await qc.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => candidatesApi.remove(id),
    onSuccess: async () => {
      setSelectedCandidate(null);
      await qc.invalidateQueries({ queryKey: ['candidates'] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    saveMut.mutate();
  }

  function resetDialog() {
    setForm(blankForm());
    setEditingCandidate(null);
    setError(null);
  }

  function openCreate() {
    resetDialog();
    setFormOpen(true);
  }

  function openEdit(c: Candidate) {
    setSelectedCandidate(null);
    setEditingCandidate(c);
    setForm(candidateToForm(c));
    setError(null);
    setFormOpen(true);
  }

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;
    let cancelled = false;
    candidatesApi
      .get(editId)
      .then((c) => {
        if (cancelled) return;
        openEdit(c);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('edit');
            return next;
          },
          { replace: true },
        );
      })
      .catch(() => {
        /* ignore invalid edit id */
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  function onCategoryChange(next: EmployeeCategory) {
    setForm((prev) => ({
      ...prev,
      category: next,
      clientId: next === 'BILLABLE' ? prev.clientId : '',
      salesOwnerUserId: next === 'BILLABLE' ? prev.salesOwnerUserId : '',
      team: next === 'BILLABLE' ? '' : prev.team,
      roleTitle: next === 'BILLABLE' ? prev.roleTitle : '',
      supportFunction: next === 'BILLABLE' ? '' : prev.supportFunction,
      benchStartDate:
        next === 'BENCH' ? prev.benchStartDate || todayIso() : '',
      interviewsScheduledCount:
        next === 'BENCH' ? prev.interviewsScheduledCount || '0' : '0',
      interviewsClearedCount:
        next === 'BENCH' ? prev.interviewsClearedCount || '0' : '0',
    }));
  }

  function onClientChange(nextClientId: string) {
    const client =
      scopedClients.find((c) => c.id === nextClientId) ?? null;
    const aos = client?.accountOwners ?? [];
    setForm((prev) => ({
      ...prev,
      clientId: nextClientId,
      accountManagerUserId:
        aos.length === 1
          ? aos[0].id
          : aos.some((a) => a.id === prev.accountManagerUserId)
            ? prev.accountManagerUserId
            : '',
    }));
  }

  const rows = listQuery.data?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Roster"
        title="Employees"
        description="Employees by engagement category, with public IDs."
        actions={
          <button
            type="button"
            className={btnPrimary}
            onClick={() => openCreate()}
          >
            New employee
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id || 'all'}
            type="button"
            className={category === tab.id ? btnPrimary : btnSecondary}
            onClick={() => setCategory(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <FilterBar>
        <div>
          <label className={labelClass} htmlFor="cand-search">
            Search
          </label>
          <input
            id="cand-search"
            className={fieldClass}
            placeholder="Search name or ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="cand-status">
            Employment status
          </label>
          <select
            id="cand-status"
            className={fieldClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="RELEASED">Released</option>
          </select>
        </div>
        {(category === '' || category === 'BILLABLE') && (
          <div>
            <label className={labelClass} htmlFor="cand-client">
              Client
            </label>
            <select
              id="cand-client"
              className={fieldClass}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">All clients</option>
              {scopedClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </FilterBar>

      {listQuery.isLoading && <Spinner />}
      {listQuery.isError && (
        <Alert tone="error">{apiErrorMessage(listQuery.error)}</Alert>
      )}

      {!listQuery.isLoading && rows.length === 0 ? (
        <EmptyState
          title="No employees"
          description="Create an employee to start leave, timesheets, and reviews."
          action={
            <button
              type="button"
              className={btnPrimary}
              onClick={() => openCreate()}
            >
              New employee
            </button>
          }
        />
      ) : (
        <div className={tableWrap}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={thClass}>Employee ID</th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Client</th>
                <th className={thClass}>Team</th>
                <th className={thClass}>Cost Center</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className={clickableRowClass}
                  onClick={() => setSelectedCandidate(c)}
                >
                  <td className={tdClass}>
                    <PublicId value={c.publicId} />
                  </td>
                  <td className={tdClass}>{c.fullName}</td>
                  <td className={tdClass}>
                    <StatusPill
                      status={c.category ?? 'BILLABLE'}
                      label={
                        CATEGORY_LABEL[(c.category as EmployeeCategory) || 'BILLABLE']
                      }
                    />
                  </td>
                  <td className={tdClass}>
                    {c.client?.name ?? c.clientName ?? '—'}
                  </td>
                  <td className={tdClass}>
                    {c.team ? (
                      <StatusPill status={c.team} label={TEAM_LABEL[c.team] ?? c.team} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={tdClass}>
                    {labelFromOptions(COST_CENTER_OPTIONS, c.costCenter)}
                  </td>
                  <td className={tdClass}>
                    <StatusPill status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={Boolean(selectedCandidate)}
        title="Employee details"
        wide
        onClose={() => setSelectedCandidate(null)}
      >
        {selectedCandidate && (
          <>
            <DetailGrid>
              <DetailField
                label="Employee ID"
                value={<PublicId value={selectedCandidate.publicId} />}
              />
              <DetailField
                label="Employee name"
                value={selectedCandidate.fullName}
              />
              <DetailField
                label="Category"
                value={
                  <StatusPill
                    status={selectedCandidate.category ?? 'BILLABLE'}
                    label={
                      CATEGORY_LABEL[
                        (selectedCandidate.category as EmployeeCategory) ||
                          'BILLABLE'
                      ]
                    }
                  />
                }
              />
              {(selectedCandidate.category ?? 'BILLABLE') === 'BILLABLE' && (
              <DetailField
                label="Client"
                value={
                  selectedCandidate.client?.name ?? selectedCandidate.clientName
                }
              />
              )}
              <DetailField
                label="Cost Center"
                value={labelFromOptions(
                  COST_CENTER_OPTIONS,
                  selectedCandidate.costCenter,
                )}
              />
              {selectedCandidate.team && (
                <DetailField
                  label="Team"
                  value={TEAM_LABEL[selectedCandidate.team] ?? selectedCandidate.team}
                />
              )}
              {selectedCandidate.team && (
                <DetailField
                  label="Role"
                  value={
                    selectedCandidate.supportFunction
                      ? (SUPPORT_ROLE_LABEL[selectedCandidate.supportFunction] ??
                        selectedCandidate.supportFunction)
                      : NA
                  }
                />
              )}
              {selectedCandidate.category === 'BENCH' && (
                <DetailField
                  label="Bench aging"
                  value={
                    selectedCandidate.benchAging
                      ? `${selectedCandidate.benchAging.months} months, ${selectedCandidate.benchAging.days} days`
                      : undefined
                  }
                />
              )}
              {(selectedCandidate.category ?? 'BILLABLE') === 'BILLABLE' && (
              <DetailField
                label="Project / Account"
                value={selectedCandidate.projectAccount}
              />
              )}
              <DetailField
                label="Role"
                value={selectedCandidate.roleTitle}
              />
              {(selectedCandidate.category ?? 'BILLABLE') === 'BILLABLE' && (
              <>
              <DetailField
                label="Client reporting manager"
                value={selectedCandidate.clientReportingManager}
              />
              <DetailField
                label="Sales owner"
                value={selectedCandidate.salesOwner?.fullName}
              />
              <DetailField
                label="Account owner"
                value={selectedCandidate.accountManager?.fullName}
              />
              <DetailField
                label="Billing type"
                value={selectedCandidate.billingType ?? 'HOURLY'}
              />
              <DetailField
                label="Hourly rate"
                value={
                  selectedCandidate.hourlyRate != null
                    ? `${selectedCandidate.hourlyRate} ${selectedCandidate.currency ?? 'INR'}`
                    : undefined
                }
              />
              <DetailField
                label="Monthly fixed amount"
                value={
                  selectedCandidate.monthlyFixedAmount != null
                    ? `${selectedCandidate.monthlyFixedAmount} ${selectedCandidate.currency ?? 'INR'}`
                    : undefined
                }
              />
              <DetailField
                label="Max billable hours"
                value={selectedCandidate.maxBillableHours}
              />
              {selectedCandidate.billingType !== 'FIXED' && (
                <DetailField
                  label="Hours per day"
                  value={selectedCandidate.hoursPerDay}
                />
              )}
              <DetailField
                label="Contract end date"
                value={formatDate(selectedCandidate.contractEndDate)}
              />
              <DetailField
                label="Work location"
                value={workLocationLabel(selectedCandidate.workLocation)}
              />
              </>
              )}
              <DetailField
                label={
                  (selectedCandidate.category ?? 'BILLABLE') === 'BILLABLE'
                    ? 'Client start date'
                    : 'Joined on'
                }
                value={formatDate(selectedCandidate.joinedOn)}
              />
              {selectedCandidate.category === 'BENCH' && (
                <>
                  <DetailField
                    label="Interviews scheduled"
                    value={selectedCandidate.interviewsScheduledCount ?? 0}
                  />
                  <DetailField
                    label="Interviews cleared"
                    value={selectedCandidate.interviewsClearedCount ?? 0}
                  />
                  <DetailField
                    label="Delivery Manager Feedback"
                    value={
                      latestBenchFeedback(
                        selectedCandidate.benchFeedback,
                        'DELIVERY_MANAGER',
                      ) ?? '—'
                    }
                  />
                  <DetailField
                    label="Account Manager Feedback"
                    value={
                      latestBenchFeedback(
                        selectedCandidate.benchFeedback,
                        'ACCOUNT_OWNER',
                      ) ?? '—'
                    }
                  />
                </>
              )}
              <DetailField
                label="Employment status"
                value={<StatusPill status={selectedCandidate.status} />}
              />
              <DetailField
                label="Email"
                value={selectedCandidate.email}
              />
              <DetailField
                label="Mobile"
                value={selectedCandidate.mobile}
              />
            </DetailGrid>
            <div className="mt-6 flex justify-end gap-2 border-t border-border/70 pt-4">
              {canManage && (
                <button
                  type="button"
                  className={btnDanger}
                  disabled={deleteMut.isPending}
                  onClick={() => {
                    if (!selectedCandidate) return;
                    if (
                      !window.confirm(
                        `Delete employee “${selectedCandidate.fullName}”? This cannot be undone from the list.`,
                      )
                    ) {
                      return;
                    }
                    deleteMut.mutate(selectedCandidate.id);
                  }}
                >
                  {deleteMut.isPending ? 'Deleting…' : 'Delete'}
                </button>
              )}
              {canManage && (
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => openEdit(selectedCandidate)}
                >
                  Edit
                </button>
              )}
              <Link
                to={`/employees/${selectedCandidate.publicId || selectedCandidate.id}`}
                className={btnPrimary}
                onClick={() => setSelectedCandidate(null)}
              >
                Open full profile
              </Link>
            </div>
          </>
        )}
      </Dialog>

      <Dialog
        open={formOpen}
        title={editingCandidate ? 'Edit employee' : 'Create employee'}
        wide
        onClose={() => {
          setFormOpen(false);
          resetDialog();
        }}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Select
            id="cand-category"
            label="Engagement category *"
            required
            value={form.category}
            onChange={(e) =>
              onCategoryChange(e.target.value as EmployeeCategory)
            }
          >
            <option value="BILLABLE">Billable</option>
            <option value="NON_BILLABLE">Non-billable</option>
            <option value="BENCH">Bench</option>
          </Select>

          {!editingCandidate && (
            <div className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Employee ID
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Assigned automatically on save (e.g. CD-00001). Not editable.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="cand-name">
                Employee name *
              </label>
              <input
                id="cand-name"
                className={fieldClass}
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>

            {form.category === 'BILLABLE' && (
              <Select
                id="cand-form-client"
                label="Client *"
                required
                value={form.clientId}
                onChange={(e) => onClientChange(e.target.value)}
              >
                <option value="">Select client</option>
                {scopedClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}

            <Select
              id="cand-cost-center"
              label="Cost Center *"
              required
              value={form.costCenter}
              onChange={(e) =>
                setForm({ ...form, costCenter: e.target.value })
              }
            >
              {COST_CENTER_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </Select>

            {form.category === 'BILLABLE' && (
              <Input
                id="cand-role"
                label="Role"
                value={form.roleTitle}
                onChange={(e) =>
                  setForm({ ...form, roleTitle: e.target.value })
                }
              />
            )}

            {form.category !== 'BILLABLE' && (
              <Select
                id="cand-team"
                label={form.category === 'NON_BILLABLE' ? 'Team *' : 'Team'}
                required={form.category === 'NON_BILLABLE'}
                value={form.team}
                onChange={(e) => {
                  const team = e.target.value as '' | EmployeeTeam;
                  setForm({
                    ...form,
                    team,
                    supportFunction: team ? form.supportFunction : '',
                  });
                }}
              >
                <option value="">
                  {form.category === 'NON_BILLABLE' ? 'Select team' : NA}
                </option>
                {TEAM_OPTIONS.map((team) => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </Select>
            )}

            {form.category !== 'BILLABLE' && form.team && (
              <Select
                id="cand-support"
                label={form.team === 'SUPPORT' ? 'Role *' : 'Role'}
                required={form.team === 'SUPPORT'}
                value={form.supportFunction}
                onChange={(e) =>
                  setForm({ ...form, supportFunction: e.target.value })
                }
              >
                <option value="">{NA}</option>
                {SUPPORT_ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            )}

            {form.category === 'BENCH' && (
              <>
                <Input
                  id="cand-bench-start"
                  label="Bench start *"
                  type="date"
                  required
                  value={form.benchStartDate}
                  onChange={(e) =>
                    setForm({ ...form, benchStartDate: e.target.value })
                  }
                />
                <Input
                  id="cand-interviews"
                  label="Interviews scheduled till date"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={form.interviewsScheduledCount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      interviewsScheduledCount: e.target.value,
                    })
                  }
                />
                <Input
                  id="cand-interviews-cleared"
                  label="Interviews cleared till date"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={form.interviewsClearedCount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      interviewsClearedCount: e.target.value,
                    })
                  }
                />
              </>
            )}

            {form.category === 'BILLABLE' && (
            <Input
              id="cand-project"
              label="Project / Account"
              value={form.projectAccount}
              onChange={(e) =>
                setForm({ ...form, projectAccount: e.target.value })
              }
            />
            )}

            {form.category === 'BILLABLE' && (
            <Input
              id="cand-crm"
              label="Client reporting manager"
              value={form.clientReportingManager}
              onChange={(e) =>
                setForm({ ...form, clientReportingManager: e.target.value })
              }
            />
            )}

            {form.category === 'BILLABLE' && (
            <Select
              id="cand-sales"
              label="Sales owner"
              value={form.salesOwnerUserId}
              onChange={(e) =>
                setForm({ ...form, salesOwnerUserId: e.target.value })
              }
            >
              <option value="">{NA}</option>
              {salesOwners.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </Select>
            )}

            {form.category === 'BILLABLE' && (
            <Select
              id="cand-am"
              label="Account owner"
              value={form.accountManagerUserId}
              onChange={(e) =>
                setForm({ ...form, accountManagerUserId: e.target.value })
              }
            >
              <option value="">
                {form.clientId ? NA : 'Select a client first'}
              </option>
              {accountOwnersForClient.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </Select>
            )}

            {form.category === 'BILLABLE' && (
            <Select
              id="cand-billing"
              label="Billing type *"
              required
              value={form.billingType}
              onChange={(e) =>
                setForm({ ...form, billingType: e.target.value })
              }
            >
              <option value="HOURLY">Hourly</option>
              <option value="FIXED">Fixed</option>
            </Select>
            )}

            {form.category === 'BILLABLE' && form.billingType === 'HOURLY' && (
              <Input
                id="cand-rate"
                label="Hourly rate"
                type="number"
                min={0}
                step={0.01}
                value={form.hourlyRate}
                onChange={(e) =>
                  setForm({ ...form, hourlyRate: e.target.value })
                }
              />
            )}
            {form.category === 'BILLABLE' && form.billingType === 'FIXED' && (
              <Input
                id="cand-fixed"
                label="Monthly fixed amount *"
                type="number"
                min={0}
                step={0.01}
                required
                value={form.monthlyFixedAmount}
                onChange={(e) =>
                  setForm({ ...form, monthlyFixedAmount: e.target.value })
                }
              />
            )}

            {form.category === 'BILLABLE' && (
            <Input
              id="cand-max-hours"
              label="Max billable hours (optional)"
              type="number"
              min={0}
              step={0.5}
              value={form.maxBillableHours}
              onChange={(e) =>
                setForm({ ...form, maxBillableHours: e.target.value })
              }
            />
            )}

            {form.category === 'BILLABLE' && form.billingType !== 'FIXED' && (
              <Input
                id="cand-hours"
                label="Hours per day"
                type="number"
                min={0}
                step={0.5}
                value={form.hoursPerDay}
                onChange={(e) =>
                  setForm({ ...form, hoursPerDay: e.target.value })
                }
              />
            )}

            {form.category === 'BILLABLE' && (
            <Select
              id="cand-currency"
              label="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            )}

            <Input
              id="cand-start"
              label={form.category === 'BILLABLE' ? 'Client start date' : 'Joined on'}
              type="date"
              value={form.joinedOn}
              onChange={(e) => setForm({ ...form, joinedOn: e.target.value })}
            />

            {form.category === 'BILLABLE' && (
            <Input
              id="cand-end"
              label="Contract end date"
              type="date"
              value={form.contractEndDate}
              onChange={(e) =>
                setForm({ ...form, contractEndDate: e.target.value })
              }
            />
            )}

            {form.category === 'BILLABLE' && (
            <Select
              id="cand-location"
              label="Work location"
              value={form.workLocation}
              onChange={(e) =>
                setForm({ ...form, workLocation: e.target.value })
              }
            >
              <option value="">{NA}</option>
              {workLocations.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.label}
                </option>
              ))}
            </Select>
            )}

            {!editingCandidate && (
              <div>
                <label className={labelClass} htmlFor="cand-employment">
                  Employment status
                </label>
                <input
                  id="cand-employment"
                  className={`${fieldClass} bg-muted/40 text-muted-foreground`}
                  value="Active"
                  readOnly
                  disabled
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  New employees are created as Active.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border/70 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Contact (optional)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="cand-email"
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                id="cand-mobile"
                label="Mobile"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
          </div>

          {error && <Alert tone="error" className="!mb-0">{error}</Alert>}

          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setFormOpen(false);
                resetDialog();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={btnPrimary}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending
                ? 'Saving…'
                : editingCandidate
                  ? 'Save changes'
                  : 'Create employee'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
