import axios from 'axios';
import type {
  AuditLog,
  Candidate,
  Client,
  DashboardSummaryRaw,
  DashboardKpiDetail,
  DeliveryReview,
  Invoice,
  Leave,
  LookupValue,
  LookupType,
  OverdueReviewsResult,
  PaginationMeta,
  SearchHit,
  TimelineEvent,
  Timesheet,
  UserRow,
} from './types';
import { normalizeDashboardSummary } from './dashboard';

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api/v1';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

/** Unwrap `{ success, data }` envelopes or return raw payload. */
export function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function unwrapList<T>(payload: unknown): {
  items: T[];
  meta?: PaginationMeta;
} {
  if (Array.isArray(payload)) return { items: payload as T[] };
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) {
      return { items: p.data as T[], meta: p.meta as PaginationMeta | undefined };
    }
    if (Array.isArray(p.items)) {
      return {
        items: p.items as T[],
        meta: p.meta as PaginationMeta | undefined,
      };
    }
  }
  return { items: [] };
}

export function apiErrorMessage(err: unknown, fallback = 'Request failed') {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;
    return data?.error?.message || data?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function getList<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<{ items: T[]; meta?: PaginationMeta }> {
  const { data } = await api.get(path, { params });
  return unwrapList<T>(data);
}

export async function getOne<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const { data } = await api.get(path, { params });
  return unwrapData<T>(data);
}

export async function postOne<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await api.post(path, body);
  return unwrapData<T>(data);
}

export async function putOne<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await api.put(path, body);
  return unwrapData<T>(data);
}

export async function patchOne<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await api.patch(path, body);
  return unwrapData<T>(data);
}

export async function deleteOne<T = unknown>(path: string): Promise<T> {
  const { data } = await api.delete(path);
  return unwrapData<T>(data);
}

/* ---- Domain helpers ---- */

export const dashboardApi = {
  summary: async (params?: Record<string, unknown>) => {
    const raw = await getOne<DashboardSummaryRaw>('/dashboard/summary', params);
    return normalizeDashboardSummary(raw);
  },
  overdueReviews: (params?: Record<string, unknown>) =>
    getOne<OverdueReviewsResult>('/dashboard/overdue-reviews', params),
  kpiDetail: (params: Record<string, unknown>) =>
    getOne<DashboardKpiDetail>('/dashboard/kpi-detail', params),
};

export const clientsApi = {
  list: (params?: Record<string, unknown>) => getList<Client>('/clients', params),
  create: (body: Partial<Client>) => postOne<Client>('/clients', body),
  update: (id: string, body: Partial<Client>) =>
    patchOne<Client>(`/clients/${id}`, body),
  remove: (id: string) => deleteOne(`/clients/${id}`),
};

export const candidatesApi = {
  list: (params?: Record<string, unknown>) =>
    getList<Candidate>('/candidates', params),
  get: (id: string) => getOne<Candidate>(`/candidates/${id}`),
  create: (body: Record<string, unknown>) =>
    postOne<Candidate>('/candidates', body),
  update: (id: string, body: Record<string, unknown>) =>
    patchOne<Candidate>(`/candidates/${id}`, body),
  release: (id: string, body: { effectiveDate: string; reason?: string }) =>
    postOne<Candidate>(`/candidates/${id}/release`, body),
  timeline: (id: string) =>
    getList<TimelineEvent>(`/candidates/${id}/timeline`).catch(() => ({
      items: [] as TimelineEvent[],
    })),
};

export const leavesApi = {
  list: (params?: Record<string, unknown>) => getList<Leave>('/leaves', params),
  create: (body: Record<string, unknown>) => postOne<Leave>('/leaves', body),
  approve: (id: string) => postOne<Leave>(`/leaves/${id}/approve`),
  reject: (id: string, reason?: string) =>
    postOne<Leave>(`/leaves/${id}/reject`, { rejectionReason: reason }),
};

export const timesheetsApi = {
  list: (params?: Record<string, unknown>) =>
    getList<Timesheet>('/timesheets', params),
  upsert: (body: Record<string, unknown>) =>
    putOne<Timesheet>('/timesheets', body),
  approve: (id: string) => postOne<Timesheet>(`/timesheets/${id}/approve`),
  reject: (id: string, reason?: string) =>
    postOne<Timesheet>(`/timesheets/${id}/reject`, { remarks: reason }),
};

export const invoicesApi = {
  list: (params?: Record<string, unknown>) =>
    getList<Invoice>('/invoices', params),
  get: (id: string) => getOne<Invoice>(`/invoices/${id}`),
  generate: (timesheetId: string) =>
    postOne<Invoice>('/invoices/generate', { timesheetId }),
  approve: (id: string) => postOne<Invoice>(`/invoices/${id}/approve`),
  send: (id: string) => postOne<Invoice>(`/invoices/${id}/send`),
  markPaid: (id: string) => postOne<Invoice>(`/invoices/${id}/mark-paid`),
  reject: (id: string, reason?: string) =>
    postOne<Invoice>(`/invoices/${id}/reject`, {
      rejectionReason: reason,
    }),
};

export const deliveryReviewsApi = {
  list: (params?: Record<string, unknown>) =>
    getList<DeliveryReview>('/delivery-reviews', params),
  upsert: (body: Record<string, unknown>) =>
    putOne<DeliveryReview>('/delivery-reviews', body),
};

export const usersApi = {
  list: (params?: Record<string, unknown>) => getList<UserRow>('/users', params),
  create: (body: Record<string, unknown>) => postOne<UserRow>('/users', body),
  remove: (id: string) => deleteOne(`/users/${id}`),
};

export const lookupsApi = {
  list: (type: string) => getList<LookupValue>(`/lookups/${type}`),
  listTypes: () => getOne<LookupType[]>('/lookups'),
  listAll: async () => {
    const types = await getOne<LookupType[]>('/lookups');
    return (types ?? []).flatMap((t) =>
      (t.values ?? []).map((v) => ({
        ...v,
        type: t.code,
        typeId: t.id,
      })),
    );
  },
  createValue: (body: {
    typeId: string;
    code: string;
    label: string;
    sortOrder?: number;
    isActive?: boolean;
  }) => postOne<LookupValue>('/lookups/values', body),
  updateValue: (
    id: string,
    body: { label?: string; sortOrder?: number; isActive?: boolean },
  ) => patchOne<LookupValue>(`/lookups/values/${id}`, body),
};

export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    getList<AuditLog>('/audit-logs', params).catch(() =>
      getList<AuditLog>('/audit', params),
    ),
};

export const importApi = {
  dryRun: (body: unknown) => postOne<unknown>('/import/dry-run', body),
  commit: (body: unknown) => postOne<unknown>('/import/commit', body),
};

export const searchApi = {
  query: (q: string) =>
    getList<SearchHit>('/search', { q }).catch(async () => {
      const data = await getOne<SearchHit[] | { results?: SearchHit[] }>(
        '/search',
        { q },
      );
      if (Array.isArray(data)) return { items: data };
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        return { items: data.results };
      }
      return { items: [] as SearchHit[] };
    }),
};
