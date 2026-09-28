import { supabase } from '../lib/supabase';
import type { ExtractedProductLabel, ScanPhotoCategory, ScanPhotoPaths } from './types';

const DEFAULT_TIMEOUT_MS = 15_000;

export interface SignedUpload {
  path: string;
  signedUrl: string;
  token?: string;
}

export interface ScanStatusResponse {
  id: string;
  status: string;
  errorCode: string | null;
  extractedData: Record<string, unknown>;
  fieldConfidence: Record<string, unknown>;
  resolvedProductId: string | null;
}

export type ScanApiClient = ReturnType<typeof createScanApiClient>;

export class ScanApiError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(code: string, status: number | null = null) {
    super(code);
    this.name = 'ScanApiError';
    this.code = code;
    this.status = status;
  }
}

interface ScanApiClientDependencies {
  getAccessToken(): Promise<string | null>;
  fetchImpl: typeof fetch;
  timeoutMs?: number;
}

async function defaultAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

async function safeErrorCode(response: Response): Promise<string> {
  if (!response.headers.get('content-type')?.includes('application/json')) return 'request_failed';
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === 'object' &&
      'code' in body &&
      typeof body.code === 'string' &&
      /^[a-z0-9_]{1,80}$/.test(body.code)
    ) {
      return body.code;
    }
  } catch {
    // Invalid JSON is intentionally reduced to a stable local code.
  }
  return 'request_failed';
}

export function createScanApiClient(dependencies: Partial<ScanApiClientDependencies> = {}) {
  const getAccessToken = dependencies.getAccessToken ?? defaultAccessToken;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const timeoutMs = dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function authorizedFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await getAccessToken();
    if (!token) throw new ScanApiError('auth_required', 401);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${token}`);
    try {
      const response = await fetchImpl(url, { ...init, headers, signal: controller.signal });
      if (!response.ok) throw new ScanApiError(await safeErrorCode(response), response.status);
      return response;
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        throw new ScanApiError('network_timeout');
      }
      if (error instanceof ScanApiError) throw error;
      throw new ScanApiError('network_error');
    } finally {
      clearTimeout(timeout);
    }
  }

  async function jsonRequest<T>(
    url: string,
    method: 'GET' | 'POST',
    body?: unknown,
  ): Promise<T> {
    const headers = new Headers();
    if (body !== undefined) headers.set('content-type', 'application/json');
    const response = await authorizedFetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    try {
      return await response.json() as T;
    } catch {
      throw new ScanApiError('invalid_response', response.status);
    }
  }

  return {
    createScan(barcode: string | null) {
      return jsonRequest<{ id: string; status: 'draft'; scannedBarcode: string | null }>(
        '/api/scans',
        'POST',
        barcode ? { barcode } : {},
      );
    },

    requestUploadUrl(
      scanId: string,
      category: ScanPhotoCategory,
      preparedImage: Blob,
    ) {
      return jsonRequest<SignedUpload>(`/api/scans/${scanId}/upload-url`, 'POST', {
        category,
        mimeType: preparedImage.type,
        size: preparedImage.size,
      });
    },

    async uploadEvidence(signed: SignedUpload, preparedImage: Blob): Promise<void> {
      await authorizedFetch(signed.signedUrl, {
        method: 'PUT',
        headers: {
          'content-type': preparedImage.type,
          'x-upsert': 'false',
        },
        body: preparedImage,
      });
    },

    submitImages(scanId: string, photoPaths: ScanPhotoPaths) {
      return jsonRequest<{ status: string }>(`/api/scans/${scanId}/process`, 'POST', {
        photoPaths,
      });
    },

    getScanStatus(scanId: string) {
      return jsonRequest<ScanStatusResponse>(`/api/scans/${scanId}`, 'GET');
    },

    confirmExtraction(
      scanId: string,
      confirmedData: ExtractedProductLabel,
      barcode?: string | null,
    ) {
      return jsonRequest<{ status: 'submitted' }>(`/api/scans/${scanId}/confirm`, 'POST', {
        confirmedData,
        barcode: barcode ?? undefined,
      });
    },

    publishScan(scanId: string) {
      return jsonRequest<
        | { productId: string; status: 'published' }
        | { status: 'needs_review'; code: string }
      >(
        `/api/scans/${scanId}/publish`,
        'POST',
      );
    },
  };
}

const defaultClient = createScanApiClient();

export const createScan = defaultClient.createScan;
export const requestUploadUrl = defaultClient.requestUploadUrl;
export const uploadEvidence = defaultClient.uploadEvidence;
export const submitImages = defaultClient.submitImages;
export const getScanStatus = defaultClient.getScanStatus;
export const confirmExtraction = defaultClient.confirmExtraction;
export const publishScan = defaultClient.publishScan;
