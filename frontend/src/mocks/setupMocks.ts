import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { isMockMode } from './config';
import { resolveMock } from './mockRouter';

function buildFullUrl(config: InternalAxiosRequestConfig): string {
  const url = config.url ?? '';
  if (url.startsWith('http')) return url;
  const base = (config.baseURL ?? '').replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

function createMockAxiosAdapter() {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const fullUrl = buildFullUrl(config);
    const method = (config.method ?? 'get').toUpperCase();
    const data = resolveMock(method, fullUrl, config.params as Record<string, unknown>, config.data);

    if (data === null) {
      throw new Error(`[Mock] External URL not mocked: ${fullUrl}`);
    }

    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
}

/** Attach mock adapter to an axios instance (shared api + standalone clients). */
export function applyMockAdapter(instance: AxiosInstance): void {
  if (!isMockMode()) return;
  instance.defaults.adapter = createMockAxiosAdapter();
}

/** Patch global fetch so authService and timelinessApi work without changes. */
export function patchGlobalFetch(): void {
  if (!isMockMode()) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

    // Allow external APIs (weather, AI, etc.)
    const isLocalApi =
      url.includes('/api/') ||
      url.startsWith('/api') ||
      (url.startsWith('http') && url.includes('/api'));

    if (!isLocalApi) {
      return originalFetch(input, init);
    }

    const method = (init?.method ?? 'GET').toUpperCase();
    const mock = resolveMock(method, url, undefined, init?.body);

    if (mock === null) {
      return originalFetch(input, init);
    }

    return new Response(JSON.stringify(mock), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

/** Bootstrap all mock interceptors — call once before React renders. */
export function setupMocks(): void {
  if (!isMockMode()) return;
  patchGlobalFetch();
  console.info('[Mock] Portfolio demo mode enabled — using mock data');
}
