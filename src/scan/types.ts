export type ScanState =
  | 'draft'
  | 'uploaded'
  | 'processing'
  | 'needs_confirmation'
  | 'submitted'
  | 'published'
  | 'needs_review'
  | 'failed'
  | 'cancelled'
  | 'rejected';

export type ScanPhotoCategory = 'front' | 'ingredient' | 'nutrition';
export type ProductType = 'food' | 'treat' | 'supplement';
export type ProductSpecies = 'dog' | 'cat' | 'all';
export type DuplicateResolution = 'none' | 'unique' | 'ambiguous';

export interface LabelComponent {
  name: string;
  value: number | null;
  unit: string | null;
  qualifier?: 'min' | 'max' | 'exact' | null;
}

export interface ExtractedProductLabel {
  name: string | null;
  brand: string | null;
  manufacturer: string | null;
  species: ProductSpecies | null;
  productType: ProductType | null;
  ingredients: string[];
  guaranteedComponents: LabelComponent[];
  registeredComponents: LabelComponent[];
}

export interface ScanPhotoPaths {
  front: string[];
  ingredient: string[];
  nutrition: string[];
}

export interface ScanSubmission {
  id: string;
  userId: string;
  state: ScanState;
  scannedBarcode: string | null;
  photoPaths: ScanPhotoPaths;
  extractionVersion: string | null;
  extracted: ExtractedProductLabel | null;
  confirmed: ExtractedProductLabel | null;
  fieldConfidence: Record<string, number>;
  processingErrorCode: string | null;
  resolvedProductId: string | null;
}

export interface PublicationGateInput {
  authenticated: boolean;
  scannedBarcode: string | null;
  printedBarcode: string | null;
  duplicateResolution: DuplicateResolution;
  photoPaths: ScanPhotoPaths;
  confirmed: ExtractedProductLabel;
}

export type PublicationGateResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'auth_required'
        | 'invalid_barcode'
        | 'missing_photo'
        | 'missing_identity'
        | 'missing_ingredients'
        | 'missing_registration'
        | 'barcode_conflict'
        | 'ambiguous_duplicate';
      fields: string[];
    };
