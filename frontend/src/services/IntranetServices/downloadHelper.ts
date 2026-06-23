import axios, { type AxiosResponse } from 'axios';
import api from '../api';

export interface DownloadResult {
  isProtected: boolean;
}

function resolveApiPath(fullOrRelativeUrl: string): string {
  if (fullOrRelativeUrl.startsWith('/')) return fullOrRelativeUrl;

  const base = api.defaults.baseURL ?? '';
  if (base && fullOrRelativeUrl.startsWith(base)) {
    const path = fullOrRelativeUrl.slice(base.length);
    return path.startsWith('/') ? path : `/${path}`;
  }

  try {
    const url = new URL(fullOrRelativeUrl);
    const baseUrl = new URL(base.endsWith('/') ? base : `${base}/`);
    if (url.origin === baseUrl.origin) {
      const basePath = baseUrl.pathname.replace(/\/$/, '');
      let path = url.pathname + url.search;
      if (basePath && path.startsWith(basePath)) {
        path = path.slice(basePath.length);
      }
      return path.startsWith('/') ? path : `/${path}`;
    }
    return url.pathname + url.search;
  } catch {
    return fullOrRelativeUrl.replace(base, '');
  }
}

async function parseErrorFromBlob(blob: Blob): Promise<string> {
  try {
    const text = await blob.text();
    const json = JSON.parse(text) as { error?: string; message?: string };
    return json.error || json.message || 'Download failed';
  } catch {
    return 'Download failed';
  }
}

export async function parseAxiosDownloadError(error: unknown): Promise<string> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    return parseErrorFromBlob(error.response.data);
  }
  if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === 'object' && 'error' in (error.response.data as object)) {
    return (error.response.data as { error?: string }).error || 'Download failed';
  }
  if (error instanceof Error) return error.message;
  return 'Download failed';
}

export function triggerBlobSave(blob: Blob, fileName: string) {
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(blobUrl);
  document.body.removeChild(a);
}

export async function saveDownloadResponse(response: AxiosResponse<Blob>, fileName: string): Promise<DownloadResult> {
  const contentType = response.headers['content-type'] || response.data?.type || '';
  if (contentType.includes('application/json')) {
    throw new Error(await parseErrorFromBlob(response.data));
  }

  const isProtected =
    response.headers['x-file-protection'] === 'password-protected' ||
    response.headers['x-pdf-protection'] === 'owner-password-enforced';

  triggerBlobSave(response.data, fileName);
  return { isProtected };
}

export async function downloadFromApiUrl(fullOrRelativeUrl: string, fileName: string): Promise<DownloadResult> {
  const path = resolveApiPath(fullOrRelativeUrl);
  try {
    const response = await api.get<Blob>(path, { responseType: 'blob' });
    return saveDownloadResponse(response, fileName);
  } catch (error) {
    throw new Error(await parseAxiosDownloadError(error));
  }
}

export async function downloadFromApiPath(relativePath: string, fileName: string): Promise<DownloadResult> {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  try {
    const response = await api.get<Blob>(path, { responseType: 'blob' });
    return saveDownloadResponse(response, fileName);
  } catch (error) {
    throw new Error(await parseAxiosDownloadError(error));
  }
}

export function downloadSuccessMessage(fileName: string, isProtected: boolean): string {
  if (isProtected) {
    return `🔒 "${fileName}" downloaded with read-only protection.`;
  }
  return `📥 "${fileName}" downloaded successfully!`;
}
