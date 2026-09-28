import { describe, expect, it, vi } from 'vitest';

import { createScanApiClient, ScanApiError } from './scanApi';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('scan API client', () => {
  it('adds the current bearer token to API requests', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: 'scan-1', status: 'draft' }, 201));
    const client = createScanApiClient({
      getAccessToken: async () => 'session-token',
      fetchImpl,
    });

    await client.createScan('0036000291452');

    const [, init] = fetchImpl.mock.calls[0];
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer session-token');
  });

  it('uses PUT with the prepared blob for a signed upload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const client = createScanApiClient({
      getAccessToken: async () => 'session-token',
      fetchImpl,
    });
    const blob = new Blob(['prepared'], { type: 'image/webp' });

    await client.uploadEvidence({
      path: 'user/scan/front/image.webp',
      signedUrl: 'https://storage.example.test/upload-token',
      token: 'upload-token',
    }, blob);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://storage.example.test/upload-token');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(blob);
    expect(new Headers(init.headers).get('content-type')).toBe('image/webp');
  });

  it('maps an aborted request to network_timeout', async () => {
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const client = createScanApiClient({
      getAccessToken: async () => 'session-token',
      fetchImpl,
      timeoutMs: 1,
    });

    await expect(client.getScanStatus('scan-1')).rejects.toMatchObject({ code: 'network_timeout' });
  });

  it('does not expose non-JSON server HTML in errors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(
      '<html>private platform details</html>',
      { status: 502, headers: { 'content-type': 'text/html' } },
    ));
    const client = createScanApiClient({
      getAccessToken: async () => 'session-token',
      fetchImpl,
    });

    let error: unknown;
    try {
      await client.publishScan('scan-1');
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ScanApiError);
    expect(String(error)).not.toContain('private platform details');
  });

  it('returns auth_required before network activity when there is no session', async () => {
    const fetchImpl = vi.fn();
    const client = createScanApiClient({
      getAccessToken: async () => null,
      fetchImpl,
    });

    await expect(client.createScan(null)).rejects.toMatchObject({ code: 'auth_required' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
