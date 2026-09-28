import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import ExtractionConfirmStep from '../components/scan/ExtractionConfirmStep';
import LabelPhotoStep from '../components/scan/LabelPhotoStep';
import ScanProgress from '../components/scan/ScanProgress';
import { normalizeBarcode } from '../lib/productIdentity';
import { prepareLabelImage } from '../scan/imagePrepare';
import {
  createScanApiClient,
  type ScanApiClient,
  type ScanStatusResponse,
} from '../scan/scanApi';
import type {
  ExtractedProductLabel,
  LabelComponent,
  ProductSpecies,
  ProductType,
  ScanPhotoCategory,
  ScanPhotoPaths,
} from '../scan/types';
import { useStore } from '../store/useStore';

export type NewProductScanApi = Pick<ScanApiClient,
  | 'createScan'
  | 'requestUploadUrl'
  | 'uploadEvidence'
  | 'submitImages'
  | 'getScanStatus'
  | 'confirmExtraction'
  | 'publishScan'
>;

interface Props {
  api?: NewProductScanApi;
  prepareImage?: (source: Blob) => Promise<Blob>;
}

type UiStep = 'photos' | 'processing' | 'confirm' | 'published';
type UploadBusy = ScanPhotoCategory | null;

const STORAGE_KEY = 'veroro.communityScan.active.v1';
const EMPTY_PATHS: ScanPhotoPaths = { front: [], ingredient: [], nutrition: [] };

interface SavedScan {
  id: string;
  barcode: string | null;
  paths: ScanPhotoPaths;
}

function readSavedScan(): SavedScan | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as SavedScan | null;
    return parsed?.id && parsed.paths ? parsed : null;
  } catch {
    return null;
  }
}

function components(value: unknown): LabelComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (typeof row.name !== 'string') return [];
    return [{
      name: row.name,
      value: typeof row.value === 'number' ? row.value : null,
      unit: typeof row.unit === 'string' ? row.unit : null,
      qualifier: ['min', 'max', 'exact'].includes(String(row.qualifier))
        ? row.qualifier as LabelComponent['qualifier']
        : null,
    }];
  });
}

function labelFromExtraction(value: Record<string, unknown>): ExtractedProductLabel | null {
  const identity = value.identity;
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) return null;
  const row = identity as Record<string, unknown>;
  const ingredients = Array.isArray(value.ingredients)
    ? value.ingredients.flatMap((item) => {
      if (typeof item === 'string') return item.trim() ? [item.trim()] : [];
      if (!item || typeof item !== 'object') return [];
      const name = (item as Record<string, unknown>).name;
      return typeof name === 'string' && name.trim() ? [name.trim()] : [];
    })
    : [];
  return {
    name: typeof row.name === 'string' ? row.name : null,
    brand: typeof row.brand === 'string' ? row.brand : null,
    manufacturer: typeof row.manufacturer === 'string' ? row.manufacturer : null,
    species: ['dog', 'cat', 'all'].includes(String(row.species)) ? row.species as ProductSpecies : null,
    productType: ['food', 'treat', 'supplement'].includes(String(row.productType)) ? row.productType as ProductType : null,
    ingredients,
    guaranteedComponents: components(value.guaranteedComponents),
    registeredComponents: components(value.registeredComponents),
  };
}

function errorMessage(code: string | null): string {
  switch (code) {
    case 'image_too_small': return '글자가 선명하게 보이도록 더 가까이 촬영해 주세요.';
    case 'image_too_large': return '사진 용량을 줄인 뒤 다시 선택해 주세요.';
    case 'unsupported_image_type': return 'JPG, PNG, WebP 또는 HEIC 사진을 선택해 주세요.';
    case 'auth_required': return '로그인이 만료됐어요. 다시 로그인해 주세요.';
    case 'community_scan_disabled': return '지금은 새 제품 등록을 잠시 멈췄어요.';
    case 'extraction_failed':
    case 'invalid_extraction': return '라벨을 읽지 못했어요. 사진을 확인하고 다시 분석해 주세요.';
    default: return '처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function NewProductScan({ api, prepareImage = prepareLabelImage }: Props) {
  const client = useMemo(() => api ?? createScanApiClient(), [api]);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isLoggedIn = useStore((state) => state.isLoggedIn);
  const queryBarcode = normalizeBarcode(params.get('barcode') ?? '');
  const [scanId, setScanId] = useState<string | null>(null);
  const [paths, setPaths] = useState<ScanPhotoPaths>(EMPTY_PATHS);
  const [step, setStep] = useState<UiStep>('photos');
  const [busyCategory, setBusyCategory] = useState<UploadBusy>(null);
  const [confirmed, setConfirmed] = useState<ExtractedProductLabel | null>(null);
  const [printedBarcode, setPrintedBarcode] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const scanPromiseRef = useRef<Promise<string> | null>(null);
  const pathsRef = useRef<ScanPhotoPaths>(EMPTY_PATHS);
  const processingRef = useRef(false);
  const aliveRef = useRef(true);

  const save = useCallback((id: string, nextPaths: ScanPhotoPaths) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, barcode: queryBarcode, paths: nextPaths }));
  }, [queryBarcode]);

  const applyStatus = useCallback((status: ScanStatusResponse): boolean => {
    if (status.status === 'needs_confirmation') {
      const label = labelFromExtraction(status.extractedData);
      if (!label) {
        setErrorCode('invalid_extraction');
        return true;
      }
      setConfirmed(label);
      const barcode = status.extractedData.printedBarcode;
      setPrintedBarcode(typeof barcode === 'string' ? barcode : queryBarcode);
      setStep('confirm');
      setErrorCode(status.errorCode);
      return true;
    }
    if (status.status === 'published' && status.resolvedProductId) {
      localStorage.removeItem(STORAGE_KEY);
      navigate(`/product/${status.resolvedProductId}`, { replace: true });
      return true;
    }
    if (status.status === 'failed' || status.status === 'needs_review' || status.status === 'rejected') {
      setErrorCode(status.errorCode ?? status.status);
      return true;
    }
    return false;
  }, [navigate, queryBarcode]);

  const poll = useCallback(async (id: string) => {
    setStep('processing');
    let interval = 500;
    while (aliveRef.current) {
      const status = await client.getScanStatus(id);
      if (!aliveRef.current || applyStatus(status)) return;
      await delay(interval);
      interval = Math.min(8_000, Math.round(interval * 1.7));
    }
  }, [applyStatus, client]);

  useEffect(() => {
    aliveRef.current = true;
    if (!isLoggedIn) return () => { aliveRef.current = false; };
    const saved = readSavedScan();
    if (!saved) return () => { aliveRef.current = false; };
    setScanId(saved.id);
    setPaths(saved.paths);
    pathsRef.current = saved.paths;
    scanPromiseRef.current = Promise.resolve(saved.id);
    client.getScanStatus(saved.id)
      .then((status) => {
        const terminal = applyStatus(status);
        if (!terminal && status.status === 'uploaded') {
          void client.submitImages(saved.id, saved.paths)
            .then(() => poll(saved.id))
            .catch(() => setErrorCode('network_error'));
        } else if (!terminal && ['processing', 'submitted'].includes(status.status)) {
          void poll(saved.id).catch(() => setErrorCode('network_error'));
        }
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY));
    return () => { aliveRef.current = false; };
  }, [applyStatus, client, isLoggedIn, poll]);

  const ensureScan = useCallback(async () => {
    if (scanId) return scanId;
    if (!scanPromiseRef.current) {
      scanPromiseRef.current = client.createScan(queryBarcode).then((created) => {
        setScanId(created.id);
        save(created.id, pathsRef.current);
        return created.id;
      });
    }
    return scanPromiseRef.current;
  }, [client, queryBarcode, save, scanId]);

  const startProcessing = useCallback(async (id: string, nextPaths: ScanPhotoPaths) => {
    if (processingRef.current) return;
    if (!nextPaths.front.length || !nextPaths.ingredient.length || !nextPaths.nutrition.length) return;
    processingRef.current = true;
    setErrorCode(null);
    try {
      await client.submitImages(id, nextPaths);
      await poll(id);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'network_error';
      setErrorCode(code);
    } finally {
      processingRef.current = false;
    }
  }, [client, poll]);

  const selectPhoto = useCallback(async (category: ScanPhotoCategory, file: File) => {
    setBusyCategory(category);
    setErrorCode(null);
    try {
      const id = await ensureScan();
      const prepared = await prepareImage(file);
      const signed = await client.requestUploadUrl(id, category, prepared);
      await client.uploadEvidence(signed, prepared);
      const nextPaths = { ...pathsRef.current, [category]: [signed.path] };
      pathsRef.current = nextPaths;
      setPaths(nextPaths);
      save(id, nextPaths);
      void startProcessing(id, nextPaths);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'network_error';
      setErrorCode(code);
    } finally {
      setBusyCategory(null);
    }
  }, [client, ensureScan, prepareImage, save, startProcessing]);

  const retry = useCallback(() => {
    if (!scanId) return;
    setErrorCode(null);
    void startProcessing(scanId, pathsRef.current);
  }, [scanId, startProcessing]);

  const publish = useCallback(async (label: ExtractedProductLabel) => {
    if (!scanId) return;
    setPublishing(true);
    setErrorCode(null);
    try {
      await client.confirmExtraction(scanId, label, printedBarcode ?? queryBarcode);
      const result = await client.publishScan(scanId);
      if (result.status === 'published') {
        localStorage.removeItem(STORAGE_KEY);
        setStep('published');
        navigate(`/product/${result.productId}`, { replace: true });
      } else {
        setErrorCode(result.code);
      }
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'network_error';
      setErrorCode(code);
    } finally {
      setPublishing(false);
    }
  }, [client, navigate, printedBarcode, queryBarcode, scanId]);

  if (!isLoggedIn) {
    const next = `/scan/new${queryBarcode ? `?barcode=${queryBarcode}` : ''}`;
    return (
      <main style={pageStyle}>
        <Helmet><title>새 제품 등록 | 베로로</title></Helmet>
        <div style={{ margin: 'auto 0', textAlign: 'center', background: '#fff', borderRadius: 24, padding: '34px 22px', border: '1px solid #E8E7DF' }}>
          <div aria-hidden="true" style={{ fontSize: 34 }}>🔒</div>
          <h1 style={{ fontSize: 20, margin: '16px 0 8px' }}>로그인 후 제품 정보를 등록할 수 있어요</h1>
          <p style={{ color: '#74736A', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 22px' }}>사진은 원재료와 제품 정보를 확인하는 데만 사용됩니다.</p>
          <Link className="vr-btn vr-btn--primary" to="/login" state={{ from: next }} style={{ display: 'block', padding: 15, textDecoration: 'none' }}>로그인하기</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <Helmet><title>새 제품 등록 | 베로로</title><meta name="robots" content="noindex" /></Helmet>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)} style={backStyle}>‹</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 21, letterSpacing: '-.03em' }}>새 제품 등록</h1>
          {queryBarcode && <div style={{ marginTop: 4, fontSize: 12, color: '#89887E', fontFamily: 'ui-monospace, monospace' }}>{queryBarcode}</div>}
        </div>
      </header>
      <ScanProgress current={step} />

      {step === 'photos' && (
        <div style={{ display: 'grid', gap: 11 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: '#66655C', lineHeight: 1.55 }}>라벨 전체가 잘리지 않고 글자가 선명하게 보이도록 촬영해 주세요.</p>
          <LabelPhotoStep title="제품 전면" inputLabel="제품 전면 사진" guidance="제품명과 브랜드가 보이게" path={paths.front[0] ?? null} busy={busyCategory === 'front'} onSelect={(file) => void selectPhoto('front', file)} />
          <LabelPhotoStep title="원재료명" inputLabel="원재료명 사진" guidance="원재료 목록 전체가 보이게" path={paths.ingredient[0] ?? null} busy={busyCategory === 'ingredient'} onSelect={(file) => void selectPhoto('ingredient', file)} />
          <LabelPhotoStep title="영양/등록성분" inputLabel="영양/등록성분 사진" guidance="수치와 단위가 함께 보이게" path={paths.nutrition[0] ?? null} busy={busyCategory === 'nutrition'} onSelect={(file) => void selectPhoto('nutrition', file)} />
        </div>
      )}

      {step === 'processing' && !errorCode && (
        <section aria-live="polite" style={centerCardStyle}>
          <div className="vero-spin" style={{ width: 34, height: 34, border: '3px solid #ECEADF', borderTopColor: '#15150F', borderRadius: '50%', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, margin: 0 }}>라벨 정보를 읽고 있어요</h2>
          <p style={{ fontSize: 13, color: '#74736A', margin: '8px 0 0' }}>화면을 닫아도 나중에 이어서 확인할 수 있어요.</p>
        </section>
      )}

      {step === 'confirm' && confirmed && <ExtractionConfirmStep initial={confirmed} busy={publishing} onSubmit={publish} />}

      {errorCode && (
        <section role="alert" style={{ ...centerCardStyle, borderColor: '#EAC8C2', background: '#FFF8F6' }}>
          <h2 style={{ fontSize: 17, margin: 0 }}>다시 확인해 주세요</h2>
          <p style={{ color: '#78554F', fontSize: 13, lineHeight: 1.55 }}>{errorMessage(errorCode)}</p>
          {scanId && paths.front.length > 0 && paths.ingredient.length > 0 && paths.nutrition.length > 0 && (
            <button type="button" className="vr-btn vr-btn--primary" onClick={retry} style={{ padding: 13 }}>다시 분석하기</button>
          )}
        </section>
      )}
    </main>
  );
}

const pageStyle = { minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: 'calc(18px + env(safe-area-inset-top,0px)) 18px calc(30px + env(safe-area-inset-bottom,0px))', background: '#FAF9F4', color: '#15150F', boxSizing: 'border-box' as const, display: 'flex', flexDirection: 'column' as const };
const backStyle = { width: 40, height: 40, borderRadius: 13, border: '1px solid #E5E3DA', background: '#fff', color: '#15150F', fontSize: 28, lineHeight: 1, cursor: 'pointer' };
const centerCardStyle = { textAlign: 'center' as const, border: '1px solid #E8E7DF', borderRadius: 20, background: '#fff', padding: '34px 20px' };
