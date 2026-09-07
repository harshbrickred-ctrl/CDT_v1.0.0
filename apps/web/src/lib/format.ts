import type { EngagementHealth } from './types';

export function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatPct(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(1)}%`;
}

export function formatInr(amount?: number | null) {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

export function clientFeedbackLabel(feedback?: string | null) {
  switch (feedback) {
    case 'GOOD':
      return 'Good';
    case 'AVERAGE':
      return 'Average';
    case 'POOR':
      return 'Poor';
    default:
      return feedback || '—';
  }
}

export function healthLabel(health?: string | null) {
  switch (health) {
    case 'ON_TRACK':
      return 'On Track';
    case 'AT_RISK':
      return 'At Risk';
    case 'ESCALATED':
      return 'Escalated';
    default:
      return health || '—';
  }
}

export function isHealth(value: string): value is EngagementHealth {
  return value === 'ON_TRACK' || value === 'AT_RISK' || value === 'ESCALATED';
}

export function candidateLabel(c: {
  publicId?: string;
  fullName?: string;
}) {
  return [c.publicId, c.fullName].filter(Boolean).join(' · ');
}
