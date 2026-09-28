import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { authenticateRequest } from './auth';

export interface StoredScanSubmission {
  id: string;
  user_id: string;
  status: string;
  processing_error_code: string | null;
  extracted_data: Record<string, unknown>;
  field_confidence: Record<string, unknown>;
  resolved_product_id: string | null;
  front_image_paths: string[];
  ingredient_image_paths: string[];
  nutrition_image_paths: string[];
}

export interface ScanRepository {
  isCommunityScanEnabled(): Promise<boolean>;
  countRecentUserSubmissions(userId: string, since: string): Promise<number>;
  consumeIpRateLimit(
    bucketDigest: string,
    windowStart: string,
    expiresAt: string,
    limit: number,
  ): Promise<boolean>;
  createSubmission(
    userId: string,
    barcode: string | null,
  ): Promise<{ id: string; status: 'draft'; scannedBarcode: string | null; ownerId?: string }>;
  findOwnedSubmission(id: string, userId: string): Promise<StoredScanSubmission | null>;
  createSignedUploadUrl(path: string): Promise<{ path: string; token: string; signedUrl: string }>;
}

export interface ScanEndpointContext {
  ip?: string;
}

export interface ScanEndpointDependencies {
  repository: ScanRepository;
  authenticate(request: Request): Promise<string | null>;
  rateLimitSecret: string;
  now(): Date;
  randomUUID(): string;
  clientIp(request: Request, context?: ScanEndpointContext): string;
}

interface NetlifyEnvironment {
  env?: { get(name: string): string | undefined };
}

function environmentValue(name: string): string {
  const netlify = (globalThis as typeof globalThis & { Netlify?: NetlifyEnvironment }).Netlify;
  return netlify?.env?.get(name) ?? process.env[name] ?? '';
}

export function getSupabaseServerClient(): SupabaseClient {
  const url = environmentValue('SUPABASE_URL');
  const serviceRoleKey = environmentValue('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) throw new Error('scan_api_not_configured');
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function createScanRepository(client: SupabaseClient): ScanRepository {
  return {
    async isCommunityScanEnabled() {
      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .eq('key', 'community_scan_enabled')
        .maybeSingle();
      if (error) throw new Error('scan_setting_unavailable');
      return data?.value !== false && data?.value !== 'false';
    },

    async countRecentUserSubmissions(userId, since) {
      const { count, error } = await client
        .from('product_scan_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', since);
      if (error) throw new Error('scan_rate_query_failed');
      return count ?? 0;
    },

    async consumeIpRateLimit(bucketDigest, windowStart, expiresAt, limit) {
      const { data, error } = await client.rpc('consume_scan_rate_limit', {
        p_bucket_digest: bucketDigest,
        p_scope: 'ip',
        p_window_start: windowStart,
        p_expires_at: expiresAt,
        p_limit: limit,
      });
      if (error || typeof data !== 'boolean') throw new Error('scan_rate_update_failed');
      return data;
    },

    async createSubmission(userId, barcode) {
      const { data, error } = await client
        .from('product_scan_submissions')
        .insert({ user_id: userId, scanned_barcode: barcode, status: 'draft' })
        .select('id,status,scanned_barcode')
        .single();
      if (error || !data) throw new Error('scan_create_failed');
      return { id: data.id, status: 'draft', scannedBarcode: data.scanned_barcode };
    },

    async findOwnedSubmission(id, userId) {
      const { data, error } = await client
        .from('product_scan_submissions')
        .select([
          'id',
          'user_id',
          'status',
          'processing_error_code',
          'extracted_data',
          'field_confidence',
          'resolved_product_id',
          'front_image_paths',
          'ingredient_image_paths',
          'nutrition_image_paths',
        ].join(','))
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error('scan_read_failed');
      return data as StoredScanSubmission | null;
    },

    async createSignedUploadUrl(path) {
      const { data, error } = await client.storage
        .from('product-scan-evidence')
        .createSignedUploadUrl(path);
      if (error || !data?.path || !data.token || !data.signedUrl) {
        throw new Error('scan_upload_sign_failed');
      }
      return { path: data.path, token: data.token, signedUrl: data.signedUrl };
    },
  };
}

export function createDefaultScanDependencies(): ScanEndpointDependencies {
  const client = getSupabaseServerClient();
  return {
    repository: createScanRepository(client),
    authenticate: (request) => authenticateRequest(request, client),
    rateLimitSecret: environmentValue('SCAN_RATE_LIMIT_SECRET'),
    now: () => new Date(),
    randomUUID,
    clientIp: (request, context) =>
      context?.ip ?? request.headers.get('x-nf-client-connection-ip') ?? 'unknown',
  };
}
