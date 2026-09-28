import type { Config, Context } from '@netlify/functions';

import { normalizeBarcode } from '../../src/lib/productIdentity';
import type { ExtractedProductLabel, LabelComponent } from '../../src/scan/types';
import { jsonResponse, readJsonObject } from './_shared/http';
import {
  createDefaultPublicationDependencies,
  idFromRequest,
  type ScanPublishDependencies,
} from './scan-publish';

function text(value: unknown, max: number, required = false): string | null {
  if (value === null || value === undefined) {
    if (required) throw new Error('invalid_confirmation');
    return null;
  }
  if (typeof value !== 'string') throw new Error('invalid_confirmation');
  const trimmed = value.trim();
  if ((required && !trimmed) || trimmed.length > max) throw new Error('invalid_confirmation');
  return trimmed || null;
}

function components(value: unknown): LabelComponent[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('invalid_confirmation');
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('invalid_confirmation');
    const row = item as Record<string, unknown>;
    const numeric = row.value;
    if (numeric !== null && (typeof numeric !== 'number' || !Number.isFinite(numeric) || numeric < 0)) {
      throw new Error('invalid_confirmation');
    }
    return {
      name: text(row.name, 200, true) ?? '',
      value: numeric as number | null,
      unit: text(row.unit, 30),
      qualifier: ['min', 'max', 'exact'].includes(String(row.qualifier))
        ? row.qualifier as LabelComponent['qualifier']
        : null,
    };
  });
}

function sanitizeLabel(value: unknown): ExtractedProductLabel {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_confirmation');
  const row = value as Record<string, unknown>;
  const species = row.species;
  const productType = row.productType;
  if (!['dog', 'cat', 'all'].includes(String(species))) throw new Error('invalid_confirmation');
  if (!['food', 'treat', 'supplement'].includes(String(productType))) throw new Error('invalid_confirmation');
  if (!Array.isArray(row.ingredients) || row.ingredients.length > 200) {
    throw new Error('invalid_confirmation');
  }
  return {
    name: text(row.name, 500, true),
    brand: text(row.brand, 200),
    manufacturer: text(row.manufacturer, 300),
    species: species as ExtractedProductLabel['species'],
    productType: productType as ExtractedProductLabel['productType'],
    ingredients: row.ingredients.map((item) => text(item, 200, true) ?? ''),
    guaranteedComponents: components(row.guaranteedComponents),
    registeredComponents: components(row.registeredComponents),
  };
}

type Handler = (request: Request, context?: Context) => Promise<Response>;

export function createScanConfirmHandler(injected?: ScanPublishDependencies): Handler {
  return async (request) => {
    if (request.method !== 'POST') return jsonResponse(405, { code: 'method_not_allowed' });
    try {
      const deps = injected ?? createDefaultPublicationDependencies();
      const userId = await deps.authenticate(request);
      if (!userId) return jsonResponse(401, { code: 'auth_required' });
      const submissionId = idFromRequest(request, 'confirm');
      if (!submissionId) return jsonResponse(400, { code: 'invalid_scan_id' });
      const submission = await deps.repository.loadOwned(submissionId, userId);
      if (!submission) return jsonResponse(404, { code: 'scan_not_found' });
      if (submission.status !== 'needs_confirmation') {
        return jsonResponse(409, { code: 'scan_not_ready' });
      }
      const body = await readJsonObject(request);
      if (!body) return jsonResponse(400, { code: 'invalid_confirmation' });
      const confirmed = sanitizeLabel(body.confirmedData);
      const suppliedBarcode = typeof body.barcode === 'string' ? body.barcode.trim() : '';
      const confirmedBarcode = suppliedBarcode ? normalizeBarcode(suppliedBarcode) : null;
      if (suppliedBarcode && !confirmedBarcode) {
        return jsonResponse(400, { code: 'invalid_barcode' });
      }
      const result = await deps.repository.confirm({
        submissionId,
        userId,
        confirmed,
        confirmedBarcode,
      });
      return jsonResponse(200, result);
    } catch {
      return jsonResponse(400, { code: 'invalid_confirmation' });
    }
  };
}

export default async function scanConfirm(request: Request, context: Context): Promise<Response> {
  return createScanConfirmHandler()(request, context);
}

export const config: Config = { path: '/api/scans/:id/confirm', method: 'POST' };
