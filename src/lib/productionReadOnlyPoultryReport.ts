import {
  buildProductionReadOnlyJoinedExportReport,
  type ProductionReadOnlyJoinedExportReport,
  type ProductionReadOnlyJoinedExportRow,
} from './productionReadOnlyJoinedExport';
import {
  buildProductionReadOnlyPoultryImpactSummary,
  type ProductionReadOnlyPoultryImpactSummaryReport,
} from './productionReadOnlyPoultryImpactSummary';
import {
  buildProductionReadOnlyPoultrySignalMatrix,
  type ProductionReadOnlyPoultrySignalMatrixReport,
} from './productionReadOnlyPoultrySignalMatrix';

export interface ProductionReadOnlyPoultryReport {
  reportKind: 'production_read_only_poultry_report';
  source: {
    format: 'supabase_joined_export_json';
    rowsReceived: number;
  };
  joinedExport: ProductionReadOnlyJoinedExportReport;
  signalMatrix: ProductionReadOnlyPoultrySignalMatrixReport;
  impactSummary: ProductionReadOnlyPoultryImpactSummaryReport;
  safety: {
    readOnlyOnly: true;
    executesSql: false;
    usesSupabaseClient: false;
    mutatesProductionRows: false;
    changesRuntimePolicy: false;
    authorizesProductionChange: false;
    allowsMigration: false;
    allowsEnvOrDeployChange: false;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === 'string';
}

function nullableNumber(value: unknown): value is number | null | undefined {
  return value === null || value === undefined || typeof value === 'number';
}

function isJoinedExportRow(value: unknown): value is ProductionReadOnlyJoinedExportRow {
  if (!isRecord(value)) return false;
  return (
    typeof value.product_id === 'string' &&
    typeof value.product_name === 'string' &&
    nullableString(value.main_category) &&
    nullableString(value.target_pet_type) &&
    nullableString(value.ingredient_id) &&
    nullableNumber(value.sort_order) &&
    nullableString(value.ingredient_name_ko) &&
    nullableString(value.ingredient_name_en) &&
    nullableString(value.ingredient_risk_level)
  );
}

/**
 * Accepts either Supabase's copied JSON array or an API-style `{ data: [...] }` envelope.
 * The boundary rejects malformed rows instead of silently inventing production values.
 */
export function parseProductionReadOnlyPoultryExportJson(
  input: string | unknown,
): ProductionReadOnlyJoinedExportRow[] {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  const candidate = isRecord(parsed) && 'data' in parsed ? parsed.data : parsed;

  if (!Array.isArray(candidate)) {
    throw new TypeError('Production read-only poultry export must be a JSON row array or { data: row[] }.');
  }

  candidate.forEach((row, index) => {
    if (!isJoinedExportRow(row)) {
      throw new TypeError(`Invalid production read-only poultry export row at index ${index}.`);
    }
  });

  return candidate;
}

export function buildProductionReadOnlyPoultryReport(
  input: string | unknown,
): ProductionReadOnlyPoultryReport {
  const rows = parseProductionReadOnlyPoultryExportJson(input);
  const joinedExport = buildProductionReadOnlyJoinedExportReport(rows);
  const signalMatrix = buildProductionReadOnlyPoultrySignalMatrix(joinedExport.adapterRows);
  const impactSummary = buildProductionReadOnlyPoultryImpactSummary(signalMatrix);

  return {
    reportKind: 'production_read_only_poultry_report',
    source: {
      format: 'supabase_joined_export_json',
      rowsReceived: rows.length,
    },
    joinedExport,
    signalMatrix,
    impactSummary,
    safety: {
      readOnlyOnly: true,
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimePolicy: false,
      authorizesProductionChange: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
    },
  };
}
