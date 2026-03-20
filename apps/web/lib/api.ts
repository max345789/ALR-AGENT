import type {
  AuthSessionResponse,
  BillingCheckoutResponse,
  BillingCaptureKeyResponse,
  BillingOverviewResponse,
  BillingPortalResponse,
  ApiLeadCreateResponse,
  BookingOfferResponse,
  BookingResponse,
  DashboardResponse,
  IntegrationOverviewResponse,
  LeadTimelineResponse,
  AuthStateResponse
} from './types';
import type {
  AuthForgotPasswordInput,
  AuthLoginInput,
  AuthResetPasswordInput,
  AuthSignupInput,
  LeadCaptureInput,
  LeadUpdateInput
} from '@alr/shared';

function resolveBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

  if (typeof window === 'undefined') {
    return configured;
  }

  if (configured.startsWith('/')) {
    return configured;
  }

  try {
    const url = new URL(configured);
    return `${url.pathname.replace(/\/$/, '')}${url.search}`;
  } catch {
    return '/api/v1';
  }
}

const baseUrl = resolveBaseUrl();

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return fetchJson<T>(`${baseUrl}${path}`, init);
}

async function internalFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return fetchJson<T>(path, init);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const hasBody = typeof init?.body !== 'undefined' && init.body !== null;
  const response = await fetch(url, {
    headers: hasBody
      ? {
          'content-type': 'application/json',
          ...(init?.headers ?? {})
        }
      : {
          ...(init?.headers ?? {})
        },
    ...init
  });

  const text = await response.text();
  if (!response.ok) {
    try {
      const parsed = text ? (JSON.parse(text) as { error?: string; message?: string }) : null;
      const message = parsed?.error ?? parsed?.message ?? text;
      throw new Error(message || `Request failed with ${response.status}`);
    } catch {
      throw new Error(text || `Request failed with ${response.status}`);
    }
  }

  return (text ? JSON.parse(text) : {}) as T;
}

export async function getHealth(): Promise<any> {
  return apiFetch('/health');
}

export async function getIntegrations(): Promise<IntegrationOverviewResponse> {
  return apiFetch('/integrations');
}

export async function getBilling(): Promise<BillingOverviewResponse> {
  return apiFetch('/billing');
}

export async function getDashboard(): Promise<DashboardResponse> {
  return apiFetch('/analytics/dashboard');
}

export async function getLeads(): Promise<{ leads: Array<DashboardResponse['recentLeads'][number]> }> {
  return apiFetch('/leads');
}

export async function captureLead(payload: LeadCaptureInput): Promise<ApiLeadCreateResponse> {
  return apiFetch('/leads', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getLead(id: string): Promise<LeadTimelineResponse> {
  return apiFetch(`/leads/${id}`);
}

export async function updateLead(id: string, payload: LeadUpdateInput): Promise<{ lead: LeadTimelineResponse['lead'] }> {
  return apiFetch(`/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function runQualification(id: string): Promise<any> {
  return apiFetch(`/leads/${id}/qualify`, {
    method: 'POST'
  });
}

export async function createBookingOffer(leadId: string): Promise<BookingOfferResponse> {
  return apiFetch('/bookings/offers', {
    method: 'POST',
    body: JSON.stringify({ leadId })
  });
}

export async function getBooking(token: string): Promise<BookingResponse> {
  return apiFetch(`/bookings/${token}`);
}

export async function confirmBooking(token: string, notes?: string): Promise<BookingResponse> {
  return apiFetch(`/bookings/${token}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ notes })
  });
}

export async function runDailyReport(date?: string): Promise<any> {
  return apiFetch('/analytics/daily-report', {
    method: 'POST',
    body: JSON.stringify(date ? { date } : {})
  });
}

export async function getLeadMetrics(leadId: string): Promise<{ leadId: string; messages: number; bookings: number; followUps: number; activities: number }> {
  return apiFetch(`/analytics/leads/${leadId}`);
}

export async function getPromptVersions(slug: string): Promise<any> {
  return apiFetch(`/prompts/${slug}/versions`);
}

export async function addCrmNote(leadId: string, note: string, metadata?: Record<string, unknown>): Promise<{ ok: true }> {
  return internalFetch(`/api/internal/crm/${leadId}/note`, {
    method: 'POST',
    body: JSON.stringify({ note, metadata })
  });
}

export async function updateCrmStatus(leadId: string, status: string, note?: string): Promise<{ ok: true }> {
  return internalFetch(`/api/internal/crm/${leadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note })
  });
}

export async function signup(payload: AuthSignupInput): Promise<AuthSessionResponse> {
  return apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function login(payload: AuthLoginInput): Promise<AuthSessionResponse> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function forgotPassword(payload: AuthForgotPasswordInput): Promise<{ ok: boolean; message: string }> {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function resetPassword(payload: AuthResetPasswordInput): Promise<AuthSessionResponse> {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function logout(): Promise<{ ok: boolean }> {
  return apiFetch('/auth/logout', {
    method: 'POST'
  });
}

export async function createBillingCheckout(plan: 'starter' | 'pro' | 'enterprise'): Promise<BillingCheckoutResponse> {
  return apiFetch('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan })
  });
}

export async function createBillingPortal(): Promise<BillingPortalResponse> {
  return apiFetch('/billing/portal', {
    method: 'POST'
  });
}

export async function rotateCaptureKey(): Promise<BillingCaptureKeyResponse> {
  return apiFetch('/billing/capture-key/rotate', {
    method: 'POST'
  });
}

export async function getCurrentUser(): Promise<AuthStateResponse> {
  return apiFetch('/auth/me');
}
