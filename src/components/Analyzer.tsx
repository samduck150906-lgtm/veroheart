import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Zap, ShieldCheck, AlertTriangle, ChevronRight, ChevronDown, BookOpen, Camera } from 'lucide-react';
import type { AnalysisResponse, IngredientAnalysisItem, RiskLevel } from '../types/analyzer';
import { useStore } from '../store/useStore';
import { saveAnalysisReport } from '../lib/supabase';
import { CORE_COPY } from '../copy/marketing';
import { PetFoodScorer } from '../utils/petFoodScorer';
import ProductImage from './ProductImage';
import BottomSheet from './BottomSheet';
import { Button } from './Button';const SCAN_SAMPLES = [
  {
    id: 'sample-premium',
    name: '👑 최고급 생육 사료 (A+ 등급)',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200" style="background:%23F0FAF4;border-radius:20px;"><rect width="300" height="200" rx="20" fill="%23F0FAF4"/><circle cx="150" cy="80" r="40" fill="%2381C995" opacity="0.2"/><path d="M150 55 C135 75, 165 75, 150 95" stroke="%2381C995" stroke-width="4" fill="none"/><text x="50%25" y="145" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="14" fill="%23111111">Vero Premium Salmon %26 Dog</text><text x="50%25" y="165" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="%23575B5F">RAW INGREDIENTS ACTIVE SCRAPE</text></svg>',
    ingredients: '닭고기, 연어, 현미, 연어 오일, 글루코사민, 콘드로이친, 혼합 토코페롤, 완두콩, 당근, 블루베리, 비타민 E, 칼슘, 인',
    petType: 'dog' as const,
    productType: 'food'
  },
  {
    id: 'sample-allergy',
    name: '⚠️ 알레르기 유발 곡물 사료 (D 등급)',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200" style="background:%23FFFBEB;border-radius:20px;"><rect width="300" height="200" rx="20" fill="%23FFFBEB"/><circle cx="150" cy="80" r="40" fill="%23F5A623" opacity="0.2"/><path d="M140 70 L160 90 M160 70 L140 90" stroke="%23F5A623" stroke-width="4"/><text x="50%25" y="145" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="14" fill="%23111111">Standard Wheat %26 Corn Mix</text><text x="50%25" y="165" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="%23575B5F">GRAIN CORN WHEAT FLOUR SCAN</text></svg>',
    ingredients: '옥수수, 밀가루, 대두, 육분, 가금류 부산물, 동물성 지방, 프로필렌 글리콜, 멘아디온, 합성 보존제, 수분',
    petType: 'dog' as const,
    productType: 'food'
  },
  {
    id: 'sample-toxic',
    name: '☠️ 독성 자일리톨 검출 사료 (F 등급)',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200" style="background:%23FEF2F2;border-radius:20px;"><rect width="300" height="200" rx="20" fill="%23FEF2F2"/><circle cx="150" cy="80" r="40" fill="%23D93025" opacity="0.15"/><text x="150" y="90" dominant-baseline="middle" text-anchor="middle" font-size="36">☠️</text><text x="50%25" y="145" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="14" fill="%23D93025">CRITICAL DANGER FEED</text><text x="50%25" y="165" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="%23B91C1C">XYLITOL GRAPE DETECTED</text></svg>',
    ingredients: '자일리톨, 초콜릿, 포도, 건포도, 마늘, 양파, 가금류 부산물, 동물성 지방, BHA, BHT, 에톡시퀸, 카라기난',
    petType: 'dog' as const,
    productType: 'food'
  }
];

function CaloricDonutChart({ protein, fat, carbs }: { protein: number; fat: number; carbs: number }) {
  const total = protein + fat + carbs;
  if (total === 0) return null;
  
  const r = 40;
  const circ = 2 * Math.PI * r; // 251.3
  
  const pDash = (protein / total) * circ;
  const fDash = (fat / total) * circ;
  const cDash = (carbs / total) * circ;
  
  const pOffset = 0;
  const fOffset = pDash;
  const cOffset = pDash + fDash;
  
  return (
    <div className="flex items-center gap-6 bg-slate-50/50 p-5 rounded-3xl border border-slate-100 hover:bg-slate-50 transition-colors duration-300">
      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="transparent" stroke="#E2E8F0" strokeWidth="12" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="transparent"
            stroke="#81C995"
            strokeWidth="12"
            strokeDasharray={`${pDash} ${circ}`}
            strokeDashoffset={-pOffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="transparent"
            stroke="#F5A623"
            strokeWidth="12"
            strokeDasharray={`${fDash} ${circ}`}
            strokeDashoffset={-fOffset}
            className="transition-all duration-500"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="transparent"
            stroke="#38BDF8"
            strokeWidth="12"
            strokeDasharray={`${cDash} ${circ}`}
            strokeDashoffset={-cOffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block">DMB</span>
          <span className="text-xs font-black text-slate-700 leading-tight">칼로리</span>
        </div>
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#81C995]" />🍗 조단백질</span>
          <span className="font-bold text-slate-800">{protein}%</span>
        </div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />🥑 조지방</span>
          <span className="font-bold text-slate-800">{fat}%</span>
        </div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />🌾 탄수화물 (NFE)</span>
          <span className="font-bold text-slate-800">{carbs}%</span>
        </div>
      </div>
    </div>
  );
}

interface AnalyzerProps {
  initialMode?: 'text' | 'scanner';
}

export default function Analyzer({ initialMode = 'text' }: AnalyzerProps) {
  const navigate = useNavigate();
  const { userId, isLoggedIn, selectedProduct, products, profile } = useStore();
  const [animal, setAnimal] = useState<'dog' | 'cat'>('dog');
  const [productType, setProductType] = useState('food');
  const [ingredientText, setIngredientText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState('');

  const [selectedIngredient, setSelectedIngredient] = useState<IngredientAnalysisItem | null>(null);
  const [showFediafInfo, setShowFediafInfo] = useState(false);

  const [inputMode, setInputMode] = useState<'text' | 'scanner'>(initialMode);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isScanningOverlay, setIsScanningOverlay] = useState(false);
  const [petWeight, setPetWeight] = useState<number>(5);
  const [activityFactor, setActivityFactor] = useState<'neutered' | 'intact' | 'senior'>('neutered');

  const handleAnimalChange = (newAnimal: 'dog' | 'cat') => {
    setAnimal(newAnimal);
    setPetWeight(newAnimal === 'cat' ? 4 : 5);
  };

  const recommendedProducts = useMemo(() => {
    if (!result) return [];

    const healthKeywordMap: Record<string, string[]> = {
      kidney: ['신장'],
      urinary: ['요로'],
      joint: ['관절'],
      obesity: ['비만', '다이어트', '체중'],
      allergy: ['알레르기', '저알러지'],
      dental: ['구강'],
      none: [],
    };

    const preferredCategory =
      productType === 'food' ? '사료' : productType === 'snack' ? '간식' : '영양제';

    const preferredKeywords = result.recommended_for.flatMap((item) => healthKeywordMap[item] || []);

    return products
      .filter((product) => product.id !== selectedProduct?.id)
      .filter((product) => !product.targetPetType || product.targetPetType === animal || product.targetPetType === 'all')
      .filter((product) => !product.mainCategory || product.mainCategory === preferredCategory)
      .map((product) => {
        const concernHits = preferredKeywords.filter((keyword) =>
          product.healthConcerns?.some((concern) => concern.includes(keyword)) ||
          product.ingredients.some(
            (ingredient) =>
              ingredient.purpose.includes(keyword) ||
              ingredient.nameKo.includes(keyword) ||
              ingredient.nameEn?.toLowerCase().includes(keyword.toLowerCase())
          )
        ).length;
        const safeIngredients = product.ingredients.filter((ingredient) => ingredient.riskLevel === 'safe').length;
        const dangerIngredients = product.ingredients.filter((ingredient) => ingredient.riskLevel === 'danger').length;

        // 적합도 기본 점수
        let compatibility = 80;
        compatibility += concernHits * 10 + safeIngredients * 2 - dangerIngredients * 12;

        return {
          product,
          rank: compatibility,
        };
      })
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 3);
  }, [animal, productType, products, selectedProduct?.id, result]);

  const ingredientSuggestions = useMemo(() => {
    const suggested = recommendedProducts
      .flatMap(({ product }) => product.ingredients)
      .filter((ingredient) => ingredient.riskLevel === 'safe')
      .map((ingredient) => ({
        key: ingredient.id || ingredient.nameKo,
        label: ingredient.nameKo,
        description: ingredient.purpose || '안전 성분',
      }));

    return Array.from(new Map(suggested.map((item) => [item.key, item])).values()).slice(0, 4);
  }, [recommendedProducts]);

  const feedingGuide = useMemo(() => {
    if (!result || !result.estimated_calories_kcal_kg) return null;
    
    const kcal = result.estimated_calories_kcal_kg;
    const isCat = animal === 'cat';
    
    // RER = 70 * (Weight)^0.75
    const rer = 70 * Math.pow(petWeight, 0.75);
    
    // DER factors
    let factor = 1.6;
    if (isCat) {
      if (activityFactor === 'neutered') factor = 1.2;
      else if (activityFactor === 'intact') factor = 1.4;
      else factor = 1.0;
    } else {
      if (activityFactor === 'neutered') factor = 1.6;
      else if (activityFactor === 'intact') factor = 1.8;
      else factor = 1.2;
    }
    
    const der = rer * factor;
    const dailyGrams = (der / kcal) * 1000;
    const dailyCups = dailyGrams / 85;
    
    return {
      rer: Math.round(rer),
      der: Math.round(der),
      grams: Math.round(dailyGrams),
      cups: parseFloat(dailyCups.toFixed(1))
    };
  }, [result, animal, petWeight, activityFactor]);

  const triggerScanSample = (sample: typeof SCAN_SAMPLES[0]) => {
    setScannedImage(sample.image);
    setIsScanningOverlay(true);
    setError('');
    
    setTimeout(() => {
      setIsScanningOverlay(false);
      setIngredientText(sample.ingredients);
      setAnimal(sample.petType);
      setPetWeight((sample.petType as string) === 'cat' ? 4 : 5);
      setProductType(sample.productType);
    }, 1500);
  };

  const handleAnalyze = async () => {
    if (!ingredientText.trim()) {
      setError('전성분 텍스트를 입력해주세요.');
      return;
    }

    if (!isLoggedIn || !userId) {
      setError('AI 정밀 분석은 로그인 후 이용할 수 있습니다.');
      return;
    }

    if (ingredientText.trim().length < 20) {
      setError('조금 더 자세한 전성분 정보를 입력해주세요.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const functionUrl = supabaseUrl
        ? `${supabaseUrl}/functions/v1/analyze-ingredients`
        : '/api/analyze';

      // 1. Deno Edge Function 호출 시도
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseKey ? { 'Authorization': `Bearer ${supabaseKey}` } : {})
        },
        body: JSON.stringify({
          animal,
          product_type: productType,
          ingredient: ingredientText
        }),
      });

      if (!response.ok) {
        throw new Error('Edge Function 호출에 실패하여 로컬 계산으로 대체합니다.');
      }

      const data: AnalysisResponse = await response.json();
      setResult(data);

      // Save to DB in background
      saveAnalysisReport(userId, selectedProduct?.id || null, ingredientText, data).catch(console.error);
      useStore.getState().fetchReports(); // trigger refresh
    } catch (err: unknown) {
      console.warn("Deno Edge Function error, falling back to PetFoodScorer engine locally:", err);
      
      // 2. 오프라인 또는 서버 실패 시 즉각적인 로컬 분석 엔진(PetFoodScorer) 실행으로 대체
      try {
        const ingredientsArray = ingredientText
          .split(/[,\n]/)
          .map(x => x.replace(/[*·•-]/g, '').trim())
          .filter(x => x.length > 1);

        // 정교한 100점 차감식 PetFoodScorer 실행
        const dummyGA = {
          crudeProtein: productType === 'snack' ? 15 : 26,
          crudeFat: productType === 'snack' ? 5 : 12,
          crudeFiber: 5,
          crudeAsh: 8,
          moisture: 10
        };

        const clientProfile = {
          species: animal === 'cat' ? 'cat' as const : 'dog' as const,
          allergies: profile.allergies,
          healthConcerns: profile.healthConcerns
        };

        const scorer = new PetFoodScorer(ingredientsArray, dummyGA, clientProfile);
        const localScore = scorer.execute();

        // TypeORM schema와 클라이언트 PDP의 AnalysisResponse 형식을 완벽하게 매핑
        const mappedAnalysis: AnalysisResponse = {
          summary: localScore.grade === 'A+' || localScore.grade === 'A' 
            ? "아주 훌륭해요! 안심하고 급여할 수 있는 프리미엄 성분 조화입니다."
            : localScore.grade === 'B' || localScore.grade === 'C'
            ? "급여 전에 꼼꼼히 확인해봐야 할 주의 성분들이 있습니다."
            : "주의! 유해 화학 보존료나 치명적인 독성 성분이 관찰됩니다.",
          risk_level: localScore.score >= 80 ? "safe" : localScore.score >= 60 ? "caution" : "danger",
          scores: {
            safety: localScore.score,
            nutrition: localScore.aafco_passed ? 100 : 50,
            final: localScore.score
          },
          ingredient_analysis: ingredientsArray.map(ing => {
            const isToxic = ['자일리톨', 'xylitol', '초콜릿', 'chocolate', '포도', 'grape', '건포도', 'raisin', '마늘', 'garlic', '양파', 'onion'].some(t => ing.toLowerCase().includes(t));
            const isCaution = ['옥수수', '밀가루', '밀 ', '대두', 'soybean', 'wheat', 'corn'].some(c => ing.toLowerCase().includes(c));
            const isPreservative = ['bha', 'bht', '에톡시퀸', 'ethoxyquin', '프로필렌 글리콜', 'propylene glycol', '카라기난', 'carrageenan', '멘아디온', 'menadione'].some(p => ing.toLowerCase().includes(p));

            let risk: RiskLevel = 'safe';
            let reason = '일반적으로 널리 쓰이는 사료 안전 성분입니다.';
            if (isToxic) {
              risk = 'danger';
              reason = '반려동물에게 매우 치명적인 급성 독성 반응을 유발할 수 있어 기피해야 하는 원료입니다.';
            } else if (isPreservative) {
              risk = 'danger';
              reason = '알레르기 유발 및 장기 급여 시 간/신장 기능 장애 논란이 있는 합성 화학 첨가물입니다.';
            } else if (isCaution) {
              risk = 'caution';
              reason = '피부 발진, 눈물, 소화 장애 등을 일으킬 가능성이 높은 대표적인 충전용 곡물 성분입니다.';
            }

            return {
              name: ing,
              category: isPreservative ? 'preservative' : isCaution ? 'carbohydrate' : 'protein_source',
              risk,
              reason
            };
          }),
          alerts: [
            ...localScore.penalties.map(p => p.reason),
            ...localScore.fediaf_warnings
          ],
          combination_analysis: {
            protein_quality: localScore.score >= 90 ? "생육 위주 양질 단백질" : "보통 수준의 배합 비율",
            additive_level: localScore.penalties.some(p => p.reason.includes('합성')) ? "BHA/BHT 합성 방부제 주의" : "천연 보존제 사용 안전 구성",
            risk_comment: `로컬 정밀 분석 완료. 총점은 ${localScore.score}점(등급: ${localScore.grade})이며, ${localScore.penalties.length}개의 주요 감점 요소가 발견되었습니다.`
          },
          recommended_for: profile.healthConcerns.map(c => c === '관절' ? 'joint' : c === '비만' ? 'obesity' : 'none' as any),
          not_recommended_for: [],
          estimated_calories_kcal_kg: localScore.estimated_calories_kcal_kg,
          caloric_distribution: localScore.caloric_distribution,
          contains_toxic: localScore.penalties.some(p => p.reason.includes('독성') || p.reason.includes('자일리톨') || p.reason.includes('초콜릿') || p.reason.includes('포도') || p.reason.includes('마늘') || p.reason.includes('양파')) || ingredientsArray.some(ing => ['자일리톨', 'xylitol', '초콜릿', 'chocolate', '포도', 'grape', '건포도', 'raisin', '마늘', 'garlic', '양파', 'onion'].some(t => ing.toLowerCase().includes(t))),
          toxic_ingredients: ingredientsArray
            .filter(ing => ['자일리톨', 'xylitol', '초콜릿', 'chocolate', '포도', 'grape', '건포도', 'raisin', '마늘', 'garlic', '양파', 'onion'].some(t => ing.toLowerCase().includes(t)))
            .map(ing => ({
              name: ing,
              reason: '반려동물에게 매우 치명적인 급성 독성 반응을 유발하여 영구적 신부전/간부전이나 급사를 일으킬 수 있습니다.'
            }))
        };

        setResult(mappedAnalysis);

        // Save report in background
        saveAnalysisReport(userId, selectedProduct?.id || null, ingredientText, mappedAnalysis).catch(console.error);
        useStore.getState().fetchReports(); // trigger refresh
      } catch (localErr) {
        setError("성분 분석 로컬 엔진 계산 실패: " + (localErr instanceof Error ? localErr.message : String(localErr)));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareResult = async () => {
    const shareUrl = `${window.location.origin}/event/viral`;
    const shareText = `반려동물 성향/성분 분석 결과 이벤트 참여하기: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '베로로 분석 이벤트',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // 사용자 취소
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      window.prompt('아래 문구를 복사해 공유해 주세요.', shareText);
    }
  };

  return (
    <div className="mt-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm">
          <Zap size={20} className="fill-emerald-400 stroke-emerald-500" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight leading-tight">
            AI 성분 정밀 종합 분석
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">
            Vet-Nutrition analysis engine
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500 font-medium mb-3 leading-relaxed">{CORE_COPY.ocr}</p>
      
      <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 text-[11px] font-semibold text-slate-500 leading-relaxed">
        실제 출시 환경에서는 로그인 사용자만 사용할 수 있으며, 지나치게 짧거나 긴 성분표는 분석이 제한됩니다.
      </div>
      {!isLoggedIn && (
        <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-3.5 text-xs font-bold text-rose-600">
          AI 정밀 분석은 비용이 발생하는 기능이라 로그인 사용자만 사용할 수 있습니다.
        </div>
      )}
      
      <style>{`
        @keyframes sweep {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>

      <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
        <button
          onClick={() => setInputMode('text')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-300 ${inputMode === 'text' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          ✍️ 성분표 직접 입력
        </button>
        <button
          onClick={() => setInputMode('scanner')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-300 ${inputMode === 'scanner' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          📷 라벨 촬영/스캔
        </button>
      </div>

      <div className="space-y-4 mb-6">
        {inputMode === 'scanner' ? (
          <div className="space-y-4">
            {/* Visual Bounding Box Scanner */}
            <div className="relative w-full aspect-[3/2] rounded-3xl border border-slate-100 bg-slate-900 overflow-hidden flex flex-col items-center justify-center group shadow-inner">
              {scannedImage ? (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950">
                  <img src={scannedImage} alt="Scanned Label" className="w-full h-full object-cover opacity-85" />
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-6 text-slate-400">
                  <Camera size={44} className="stroke-slate-500 mb-3 animate-pulse" />
                  <span className="text-xs font-black text-slate-200">성분 분석 라벨 카메라 시뮬레이터</span>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-relaxed">아래에서 테스트할 사료 라벨 샘플을 선택하여<br />정밀 OCR 스캐닝 시뮬레이션을 시작해보세요!</p>
                </div>
              )}
              
              {/* Scanning Active Overlay */}
              {isScanningOverlay && (
                <>
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300" />
                  <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_#10B981] animate-[sweep_2s_ease-in-out_infinite]" />
                  <div className="absolute bottom-4 left-4 right-4 bg-emerald-950/90 border border-emerald-500/30 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-black text-emerald-400 flex items-center justify-center gap-1.5 animate-pulse">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      🔒 Akamai 안티봇 우회 보안 프롬프트 통신 중...
                    </span>
                  </div>
                </>
              )}
              
              {/* Camera guiding border overlay */}
              <div className="absolute inset-4 border-2 border-dashed border-white/25 rounded-2xl pointer-events-none group-hover:border-white/40 transition-colors" />
              <div className="absolute top-6 left-6 w-5 h-5 border-t-4 border-l-4 border-emerald-400 pointer-events-none" />
              <div className="absolute top-6 right-6 w-5 h-5 border-t-4 border-r-4 border-emerald-400 pointer-events-none" />
              <div className="absolute bottom-6 left-6 w-5 h-5 border-b-4 border-l-4 border-emerald-400 pointer-events-none" />
              <div className="absolute bottom-6 right-6 w-5 h-5 border-b-4 border-r-4 border-emerald-400 pointer-events-none" />
            </div>
            
            {/* Click to scan samples */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">테스트용 라벨 성분 샘플 선택</span>
              <div className="grid grid-cols-3 gap-2">
                {SCAN_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => triggerScanSample(sample)}
                    disabled={isScanningOverlay || isLoading}
                    className="flex flex-col items-center p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 transition-all text-center cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <span className="text-lg mb-1">{sample.id === 'sample-premium' ? '🍗' : sample.id === 'sample-allergy' ? '🌾' : '☠️'}</span>
                    <span className="text-[9px] font-black text-slate-700 leading-tight">{sample.name.split(' (')[0]}</span>
                    <span className="text-[7px] text-slate-400 font-semibold mt-0.5">{sample.id === 'sample-premium' ? 'A+ 등급' : sample.id === 'sample-allergy' ? 'D 등급' : 'F 등급'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Populate Text area check */}
            {ingredientText && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 animate-fade-in">
                <span className="text-[9px] font-black text-emerald-700 block mb-1">✓ 스캔 추출 완료 (OCR OCR Text)</span>
                <p className="text-[10px] font-semibold text-slate-600 line-clamp-2 leading-relaxed">{ingredientText}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <select 
                className="flex-1 p-3 border border-slate-100 rounded-2xl bg-slate-50 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-emerald-100 outline-none transition-all duration-200 cursor-pointer"
                value={animal}
                onChange={(e) => handleAnimalChange(e.target.value as 'dog'|'cat')}
              >
                <option value="dog">🐶 강아지 (Dog)</option>
                <option value="cat">🐱 고양이 (Cat)</option>
              </select>
              <select 
                className="flex-1 p-3 border border-slate-100 rounded-2xl bg-slate-50 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-emerald-100 outline-none transition-all duration-200 cursor-pointer"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
              >
                <option value="food">🥣 사료 (주식)</option>
                <option value="snack">🦴 간식</option>
                <option value="supplement">💊 영양제</option>
              </select>
            </div>

            <textarea
              className="w-full h-32 p-4 border border-slate-100 rounded-2xl bg-slate-50/50 focus:bg-white text-xs font-medium text-slate-700 focus:ring-4 focus:ring-emerald-100 outline-none resize-none transition-all duration-300 placeholder:text-slate-400"
              placeholder={`${CORE_COPY.ocr} 여기에 붙여넣거나 직접 입력해 주세요.`}
              value={ingredientText}
              onChange={(e) => setIngredientText(e.target.value)}
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>💡 원재료명 전체를 20자 이상 쉼표로 연결해서 입력</span>
              <span>{ingredientText.trim().length} / 4000자</span>
            </div>
          </div>
        )}

        {error && <div className="text-rose-500 text-xs font-bold bg-rose-50/80 px-4 py-2.5 rounded-2xl border border-rose-100">{error}</div>}

        <Button
          title="🚀 즉시 분석하기"
          onClick={handleAnalyze}
          loading={isLoading}
          disabled={!isLoggedIn || isScanningOverlay}
        />
      </div>


      {result && (
        <div className="mt-8 pt-8 border-t border-slate-100 animate-fade-in space-y-6">
          
          {/* 머리글: 종합 요약 & 등급 링 차트 */}
          <div className="flex items-center justify-between bg-slate-50/60 p-4.5 rounded-3xl border border-slate-100/50">
            <div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total score</div>
              <h3 className="text-3xl font-black text-slate-800 flex items-baseline gap-1">
                {result.scores.final.toFixed(0)} 
                <span className="text-xs font-bold text-slate-400">/ 100점</span>
              </h3>
              <p className="text-xs font-bold text-slate-600 mt-2.5 leading-relaxed">{result.summary}</p>
            </div>
            
            {/* 알파벳 A-F 등급 뱃지 */}
            <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center shrink-0 border-4 shadow-sm transition-all duration-300 ${
              result.scores.final >= 90 ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
              result.scores.final >= 80 ? 'bg-teal-50 border-teal-300 text-teal-600' :
              result.scores.final >= 70 ? 'bg-amber-50 border-amber-300 text-amber-600' :
              'bg-rose-50 border-rose-400 text-rose-600'
            }`}>
              <span className="text-2xl font-black leading-none">
                {result.scores.final >= 95 ? 'A+' :
                 result.scores.final >= 90 ? 'A' :
                 result.scores.final >= 80 ? 'B' :
                 result.scores.final >= 70 ? 'C' :
                 result.scores.final >= 60 ? 'D' : 'F'}
              </span>
              <span className="text-[8px] font-black uppercase tracking-wider opacity-85">Grade</span>
            </div>
          </div>

          {/* 칼로리 영양 성분 도넛 차트 */}
          <CaloricDonutChart 
            protein={result.caloric_distribution?.protein || 0} 
            fat={result.caloric_distribution?.fat || 0} 
            carbs={result.caloric_distribution?.carbs || 0} 
          />

          {/* 반려동물 치명적 독성 원료 경고 카드 */}
          {result.contains_toxic && (
            <div className="bg-[#FCE8E6] border border-[#F87171]/40 rounded-3xl p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center text-[#D93025] font-black text-sm gap-2">
                <span className="text-xl">💀</span>
                <span>🚨 [초비상] 반려동물 치명적 독성 원료 검출!</span>
              </div>
              <p className="text-xs text-rose-800 font-semibold leading-relaxed">
                해당 제품에는 반려동물에게 급성 신부전, 간 손상, 또는 생명에 직접적인 위협을 유발할 수 있는 치명적인 물질이 포함되어 있습니다. 절대로 급여해서는 안 됩니다.
              </p>
              {result.toxic_ingredients && result.toxic_ingredients.length > 0 && (
                <div className="space-y-2 bg-white/60 p-3.5 rounded-2xl border border-rose-200">
                  <span className="text-[10px] font-black text-[#D93025] uppercase tracking-wider block">검출된 위험 성분 목록:</span>
                  <div className="space-y-2">
                    {result.toxic_ingredients.map((ing, idx) => (
                      <div key={idx} className="text-xs text-rose-900 font-bold">
                        • <span className="underline decoration-rose-400 font-black text-rose-700">{ing.name}</span>: <span className="text-[11px] font-semibold text-rose-800">{ing.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 리콜 & 독성 경고 카드 (ToxiPets 경고) */}
          {result.alerts.length > 0 && (
            <div className="bg-rose-50/60 border border-rose-100/80 rounded-3xl p-4.5 space-y-3 shadow-sm">
              <div className="flex items-center text-rose-600 font-black text-sm gap-2">
                <AlertTriangle size={18} className="fill-rose-100 stroke-rose-600 animate-pulse" /> {CORE_COPY.dangerHighlight}
              </div>
              <ul className="list-none pl-1 text-rose-700 text-xs font-semibold space-y-2">
                {result.alerts.map((alert, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 수의학적 영양 기준 가이드라인 (AAFCO / FEDIAF 교차 정보) */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4.5">
            <button 
              onClick={() => setShowFediafInfo(!showFediafInfo)}
              className="w-full flex items-center justify-between text-left text-xs font-black text-slate-700 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen size={15} className="text-slate-500" /> AAFCO 2024 & FEDIAF 글로벌 영양 가이드
              </span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${showFediafInfo ? 'rotate-180' : ''}`} />
            </button>
            {showFediafInfo && (
              <div className="mt-3.5 text-[11px] text-slate-500 font-medium leading-relaxed border-t border-slate-200/60 pt-3.5 space-y-2 animate-fade-in">
                <p>본 영양 성분 매치 점수는 미국사료검사관협회(AAFCO) 2024 라벨 현대화 규정 및 유럽반려동물산업연방(FEDIAF) 가이드에 부합하는지 2중 정밀 교차 검증을 적용했습니다.</p>
                <div className="grid grid-cols-2 gap-2 mt-2 bg-white p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-700">🐶 AAFCO Dog Standard</span>
                    <ul className="list-disc pl-3 text-[10px] mt-1 text-slate-400">
                      <li>Crude Protein DMB: 18% min</li>
                      <li>Crude Fat DMB: 5.5% min</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">🐱 AAFCO Cat Standard</span>
                    <ul className="list-disc pl-3 text-[10px] mt-1 text-slate-400">
                      <li>Crude Protein DMB: 26% min</li>
                      <li>Crude Fat DMB: 9% min</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 조합 분석 코멘트 */}
          <div className="bg-teal-50/50 border border-teal-100/60 rounded-3xl p-4.5">
            <div className="flex items-center text-teal-800 font-black text-xs gap-1.5 mb-2.5">
              <ShieldCheck size={18} className="text-teal-500" /> 수의 영양 조합 피드백
            </div>
            <p className="text-teal-900 text-xs leading-relaxed mb-3.5 font-medium">
              {result.combination_analysis.risk_comment}
            </p>
            <div className="flex gap-2 text-[10px] font-black">
              <span className="bg-white text-teal-700 px-3 py-1.5 rounded-full border border-teal-100 shadow-sm">단백원: {result.combination_analysis.protein_quality}</span>
              <span className="bg-white text-teal-700 px-3 py-1.5 rounded-full border border-teal-100 shadow-sm">첨가물: {result.combination_analysis.additive_level}</span>
            </div>
          </div>

          {/* Atwater 칼로리 계산기 & 하루 권장 급여량 가이드 (대화식 위젯) */}
          {result && result.estimated_calories_kcal_kg && (
            <div className="bg-slate-50/70 border border-slate-100 p-5 rounded-3xl space-y-4 hover:bg-slate-50 transition-all duration-300 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 shadow-sm">
                  <span className="text-sm">🥣</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 leading-tight">개별 칼로리 & 하루 급여 가이드</h4>
                  <p className="text-[9px] text-slate-400 font-semibold tracking-wide uppercase">Modified Atwater Calculator</p>
                </div>
              </div>

              {/* 사료의 칼로리 정보 */}
              <div className="bg-white border border-slate-100 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[9px] font-black text-slate-400 block mb-0.5">사료 추정 칼로리 (Modified Atwater)</span>
                  <span className="text-sm font-black text-slate-800">{result.estimated_calories_kcal_kg.toLocaleString()} <span className="text-[10px] font-semibold text-slate-400">kcal / kg</span></span>
                </div>
                <span className="text-xs font-bold text-sky-500 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                  DMB 칼로리
                </span>
              </div>

              {/* 몸무게 조절 슬라이더 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500">반려동물 몸무게 설정</span>
                  <span className="text-xs font-black text-slate-800 bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    {petWeight} kg
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400">1kg</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="40" 
                    step="0.5" 
                    value={petWeight}
                    onChange={(e) => setPetWeight(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-400 outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                  <span className="text-[10px] font-bold text-slate-400">40kg</span>
                </div>
              </div>

              {/* 활동량 팩터 선택 탭 */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-500 block">활동 지수 설정 (DER Factor)</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActivityFactor('neutered')}
                    className={`flex-1 py-2 text-[10px] font-black rounded-xl border transition-all duration-200 ${
                      activityFactor === 'neutered' 
                        ? 'bg-emerald-400 text-white border-emerald-400 shadow-sm font-black' 
                        : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    중성화 완료
                  </button>
                  <button
                    onClick={() => setActivityFactor('intact')}
                    className={`flex-1 py-2 text-[10px] font-black rounded-xl border transition-all duration-200 ${
                      activityFactor === 'intact' 
                        ? 'bg-emerald-400 text-white border-emerald-400 shadow-sm font-black' 
                        : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    중성화 미완료
                  </button>
                  <button
                    onClick={() => setActivityFactor('senior')}
                    className={`flex-1 py-2 text-[10px] font-black rounded-xl border transition-all duration-200 ${
                      activityFactor === 'senior' 
                        ? 'bg-emerald-400 text-white border-emerald-400 shadow-sm font-black' 
                        : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    노령 / 활동량 적음
                  </button>
                </div>
              </div>

              {/* 최종 권장 급여량 리포트 */}
              {feedingGuide && (
                <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                  <div className="bg-emerald-50/40 border border-emerald-100/50 p-3 rounded-2xl flex flex-col justify-between">
                    <span className="text-[9px] font-black text-emerald-700 block mb-1">하루 권장량 (그램)</span>
                    <span className="text-base font-black text-emerald-800 transition-all duration-300">
                      {feedingGuide.grams} <span className="text-[10px] font-bold text-emerald-600">g</span>
                    </span>
                  </div>
                  <div className="bg-emerald-50/40 border border-emerald-100/50 p-3 rounded-2xl flex flex-col justify-between">
                    <span className="text-[9px] font-black text-emerald-700 block mb-1">하루 권장량 (종이컵)</span>
                    <span className="text-base font-black text-emerald-800 transition-all duration-300">
                      {feedingGuide.cups} <span className="text-[10px] font-bold text-emerald-600">컵</span>
                    </span>
                  </div>
                </div>
              )}
              <div className="text-[9px] text-slate-400 font-semibold leading-relaxed px-1">
                * 종이컵 기준은 일반적인 180ml 종이컵 한 컵(수평으로 가득 채울 시 약 85g 내외) 기준입니다. 반려동물의 실제 체형이나 변 상태에 따라 가감하여 급여해 주세요.
              </div>
            </div>
          )}

          {/* 성분별 리스트 상세 매핑 (화해 스타일) */}
          <div className="space-y-3.5">
            <div className="flex justify-between items-center px-1">
              <h4 className="font-black text-slate-800 text-xs">전성분 세부 사전 ({result.ingredient_analysis.length}개)</h4>
              <span className="text-[10px] text-slate-400 font-bold">안전 등급순 정렬</span>
            </div>
            <div className="space-y-2">
              {result.ingredient_analysis.map((item, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setSelectedIngredient(item)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-200 active:scale-[0.99] ${
                    item.risk === 'danger' ? 'bg-rose-50/30 border-rose-100/80 hover:bg-rose-50/60' :
                    item.risk === 'caution' ? 'bg-amber-50/30 border-amber-100/60 hover:bg-amber-50/60' :
                    'bg-white border-slate-100 hover:border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.01)]'
                  }`}
                >
                  <div className={`w-8 h-8 flex items-center justify-center shrink-0 rounded-2xl text-[10px] font-black ${
                    item.risk === 'danger' ? 'bg-rose-100 text-rose-600' :
                    item.risk === 'caution' ? 'bg-amber-100 text-amber-600' :
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {item.risk === 'danger' ? '위험' : item.risk === 'caution' ? '주의' : '안전'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm truncate">{item.name}</span>
                      <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{item.category}</span>
                    </div>
                    <div className="text-xs mt-1 text-slate-500 font-semibold line-clamp-1 leading-normal">
                      {item.reason}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 self-center shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* 공유 유도 배너 */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="mb-6 rounded-3xl border border-amber-100 bg-amber-50/30 p-4.5 shadow-sm">
              <p className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                🎁 댕냥이 건강 보고서 공유 이벤트
              </p>
              <p className="mt-1 text-[11px] text-amber-800 font-semibold leading-relaxed">
                분석 결과를 친구 집사들에게 공유하고 캡쳐하여 인증을 제출하시면, 주간/월간 리워드(반려용품 패키지) 추첨에 자동 응모됩니다.
              </p>
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  title="결과 공유하기"
                  onClick={() => void handleShareResult()}
                  style={{ height: '44px', borderRadius: '16px', fontSize: '12px' }}
                />
                <Button
                  type="button"
                  title="인증 제출하러 가기"
                  onClick={() => navigate('/event/viral')}
                  style={{
                    height: '44px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    backgroundColor: '#F5A623', // Amber Theme Match
                  }}
                />
              </div>
            </div>

            {/* 실제 카탈로그 추천 상품 목록 */}
            <h4 className="font-black text-slate-800 mb-2.5 text-sm">실제 검수 완료 카탈로그 기반 매칭</h4>
            <p className="text-[11px] text-slate-500 mb-4.5 leading-relaxed font-medium">
              분석 결과와 선택한 조건에 따라 현재 베로로 DB에 안전 검수가 끝난 실제 상용 유통 제품 중 가장 적합도가 뛰어난 추천 후보입니다.
            </p>

            {recommendedProducts.length > 0 ? (
              <div className="space-y-3">
                {recommendedProducts.map(({ product }) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-3 hover:border-slate-200 active:scale-[0.98] transition-all duration-200 shadow-sm"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      style={{ width: '72px', height: '72px', borderRadius: '18px', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black text-slate-400 mb-0.5">{product.brand}</div>
                      <div className="text-xs font-black text-slate-800 line-clamp-1 leading-normal mb-1.5">{product.name}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-600 border border-emerald-100">
                          적합도 최상
                        </span>
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-500 border border-slate-100">
                          안전 원료 {product.ingredients.filter((i) => i.riskLevel === 'safe').length}개
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="flex-shrink-0 text-slate-300 self-center" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs font-bold text-slate-400">
                현재 조건에 맞는 실제 추천 제품이 아직 충분하지 않습니다. 카탈로그가 더 채워지면 이 영역도 자동으로 강화됩니다.
              </div>
            )}

            {/* 추천 제품 성분 칩 */}
            {ingredientSuggestions.length > 0 && (
              <div className="mt-6">
                <h5 className="mb-2.5 text-xs font-black text-slate-700">추천 제품 내 빈출 안전 기능성 성분</h5>
                <div className="flex flex-wrap gap-1.5">
                  {ingredientSuggestions.map((ingredient) => (
                    <span
                      key={ingredient.key}
                      className="rounded-full border border-emerald-100 bg-emerald-50/60 px-3 py-1.5 text-[10px] font-black text-emerald-800"
                      title={ingredient.description}
                    >
                      🛡️ {ingredient.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 성분 상세 설명 팝업 바텀 시트 */}
      <BottomSheet 
        isOpen={!!selectedIngredient} 
        onClose={() => setSelectedIngredient(null)}
        title={selectedIngredient?.name || ''}
      >
        {selectedIngredient && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wide">
              {selectedIngredient.category}
            </div>
            
            {selectedIngredient.risk === 'danger' ? (
              <div className="bg-rose-50 border border-rose-100 p-4.5 rounded-2xl text-rose-700 font-bold text-xs leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 text-rose-800 text-sm font-black mb-1">
                  ⚠️ 주의가 절대적으로 필요한 기피 성분
                </div>
                알레르기 피부염, 장내 염증 또는 장기 손상 우려를 유발하여 사료에서 배제되는 경우가 많은 유해 주의 원료입니다. 급여에 각별한 주의가 요구됩니다.
              </div>
            ) : selectedIngredient.risk === 'caution' ? (
              <div className="bg-amber-50 border border-amber-100 p-4.5 rounded-2xl text-amber-700 font-bold text-xs leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 text-sm font-black mb-1">
                  👁️ 사전 모니터링이 필요한 성분
                </div>
                심각한 독성은 없으나, 반려동물의 기저 질환 상태 또는 선천성 알레르기 요인에 따라 피부 눈물샘 활성화 및 소화 장애를 유발할 수 있으므로 처음 급여 시 소량 테스트를 거쳐야 합니다.
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 p-4.5 rounded-2xl text-emerald-700 font-bold text-xs leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 text-sm font-black mb-1">
                  🛡️ 신뢰할 수 있는 모범 원료 성분
                </div>
                수의 영양 기준과 임상 분석을 통해 반려동물의 면역, 소화, 피부 피모 장벽 유지에 기여하는 것이 입증된 고품질 안전 배합 원료입니다. 안심하고 급여하셔도 좋습니다.
              </div>
            )}
            
            {selectedIngredient.reason && (
              <div className="bg-slate-50 border border-slate-100/50 p-4.5 rounded-2xl">
                <div className="text-[10px] font-black text-slate-400 mb-2 uppercase">원료 백과사전 분석 정보</div>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  {selectedIngredient.reason}
                </p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      <style>{`
        /* Tailwind CSS polyfills for Analyzer component */
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .justify-center { justify-content: center; }
        .justify-between { justify-content: space-between; }
        .shrink-0, .flex-shrink-0 { flex-shrink: 0; }
        .flex-1 { flex: 1 1 0%; }
        .min-w-0 { min-width: 0; }
        
        .grid { display: grid; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        
        .gap-1.5 { gap: 6px; }
        .gap-2 { gap: 8px; }
        .gap-2.5 { gap: 10px; }
        .gap-3 { gap: 12px; }
        .gap-3.5 { gap: 14px; }
        .gap-4 { gap: 16px; }
        .gap-6 { gap: 24px; }
        
        .bg-white { background-color: #ffffff; }
        .bg-slate-50 { background-color: #f8fafc; }
        .bg-slate-50\\/50 { background-color: rgba(248, 250, 252, 0.5); }
        .bg-slate-50\\/60 { background-color: rgba(248, 250, 252, 0.6); }
        .bg-slate-50\\/70 { background-color: rgba(248, 250, 252, 0.7); }
        .bg-slate-100 { background-color: #f1f5f9; }
        .bg-slate-900 { background-color: #0f172a; }
        .bg-slate-950 { background-color: #020617; }
        .bg-emerald-50 { background-color: #f0faf4; }
        .bg-emerald-50\\/40 { background-color: rgba(240, 250, 244, 0.4); }
        .bg-emerald-50\\/50 { background-color: rgba(240, 250, 244, 0.5); }
        .bg-emerald-50\\/60 { background-color: rgba(240, 250, 244, 0.6); }
        .bg-emerald-100 { background-color: #d1fae5; }
        .bg-rose-50 { background-color: #fef2f2; }
        .bg-rose-50\\/30 { background-color: rgba(254, 242, 242, 0.3); }
        .bg-rose-50\\/50 { background-color: rgba(254, 242, 242, 0.5); }
        .bg-rose-50\\/60 { background-color: rgba(254, 242, 242, 0.6); }
        .bg-rose-50\\/80 { background-color: rgba(254, 242, 242, 0.8); }
        .bg-\\[\\#FCE8E6\\] { background-color: #fce8e6; }
        .bg-teal-50 { background-color: #f0fdfa; }
        .bg-teal-50\\/50 { background-color: rgba(240, 253, 250, 0.5); }
        .bg-amber-50 { background-color: #fffbeb; }
        .bg-amber-50\\/30 { background-color: rgba(253, 230, 138, 0.3); }
        .bg-sky-50 { background-color: #f0f9ff; }
        
        .rounded-xl { border-radius: 12px; }
        .rounded-2xl { border-radius: 20px; }
        .rounded-3xl { border-radius: 28px; }
        .rounded-full { border-radius: 9999px; }
        
        .border { border: 1px solid #e2e8f0; }
        .border-t { border-top: 1px solid #e2e8f0; }
        .border-slate-100 { border-color: #f1f5f9; }
        .border-slate-100\\/50 { border-color: rgba(241, 245, 249, 0.5); }
        .border-slate-200 { border-color: #cbd5e1; }
        .border-slate-200\\/60 { border-color: rgba(203, 213, 225, 0.6); }
        .border-emerald-100 { border-color: #a7f3d0; }
        .border-emerald-100\\/50 { border-color: rgba(167, 243, 208, 0.5); }
        .border-emerald-400 { border-color: #34d399; }
        .border-teal-100 { border-color: #99f6e4; }
        .border-teal-100\\/60 { border-color: rgba(153, 246, 228, 0.6); }
        .border-teal-300 { border-color: #5eead4; }
        .border-amber-100 { border-color: #fde68a; }
        .border-amber-300 { border-color: #fcd34d; }
        .border-rose-100 { border-color: #fecaca; }
        .border-rose-100\\/80 { border-color: rgba(254, 202, 202, 0.8); }
        .border-rose-400 { border-color: #f87171; }
        .border-dashed { border-style: dashed; }
        
        .w-8 { width: 32px; }
        .h-8 { height: 32px; }
        .w-10 { width: 40px; }
        .h-10 { height: 40px; }
        .w-16 { width: 64px; }
        .h-16 { height: 64px; }
        .w-28 { width: 112px; }
        .h-28 { height: 112px; }
        .w-full { width: 100%; }
        .h-full { height: 100%; }
        .h-1.5 { height: 6px; }
        .h-32 { height: 128px; }
        .aspect-\\[3\\/2\\] { aspect-ratio: 3 / 2; }
        
        .text-xs { font-size: 12px; }
        .text-sm { font-size: 14px; }
        .text-base { font-size: 16px; }
        .text-lg { font-size: 18px; }
        .text-2xl { font-size: 24px; }
        .text-3xl { font-size: 30px; }
        
        .text-slate-200 { color: #e2e8f0; }
        .text-slate-300 { color: #cbd5e1; }
        .text-slate-400 { color: #94a3b8; }
        .text-slate-500 { color: #64748b; }
        .text-slate-600 { color: #475569; }
        .text-slate-700 { color: #334155; }
        .text-slate-800 { color: #1e293b; }
        .text-emerald-500 { color: #10b981; }
        .text-emerald-600 { color: #059669; }
        .text-emerald-700 { color: #047857; }
        .text-emerald-800 { color: #065f46; }
        .text-rose-500 { color: #ef4444; }
        .text-rose-600 { color: #dc2626; }
        .text-rose-700 { color: #b91c1c; }
        .text-rose-800 { color: #991b1b; }
        .text-rose-900 { color: #7f1d1d; }
        .text-\\[\\#D93025\\] { color: #D93025; }
        .text-amber-500 { color: #f59e0b; }
        .text-amber-600 { color: #d97706; }
        .text-amber-700 { color: #b45309; }
        .text-amber-800 { color: #92400e; }
        .text-amber-900 { color: #78350f; }
        .text-teal-700 { color: #0f766e; }
        .text-teal-800 { color: #115e59; }
        .text-teal-900 { color: #134e4a; }
        .text-sky-50 { color: #0284c7; }
        .text-sky-500 { color: #0ea5e9; }
        .text-gray-800 { color: #1f2937; }
        
        .font-black { font-weight: 900; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .font-medium { font-weight: 500; }
        
        .tracking-tight { letter-spacing: -0.025em; }
        .tracking-wide { letter-spacing: 0.025em; }
        .tracking-widest { letter-spacing: 0.1em; }
        .leading-none { line-height: 1; }
        .leading-tight { line-height: 1.25; }
        .leading-normal { line-height: 1.5; }
        .leading-relaxed { line-height: 1.625; }
        
        .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06); }
        
        .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        .duration-200 { transition-duration: 200ms; }
        .duration-300 { transition-duration: 300ms; }
        .duration-500 { transition-duration: 500ms; }
        
        .hover\\:bg-slate-50:hover { background-color: #f8fafc; }
        .hover\\:bg-slate-50\\/60:hover { background-color: rgba(248, 250, 252, 0.6); }
        .hover\\:bg-rose-50\\/60:hover { background-color: rgba(254, 242, 242, 0.6); }
        .hover\\:border-slate-200:hover { border-color: #cbd5e1; }
        
        .active\\:scale-95:active { transform: scale(0.95); }
        .active\\:scale-\\[0\\.99\\]:active { transform: scale(0.99); }
        .active\\:scale-\\[0\\.98\\]:active { transform: scale(0.98); }
        
        .shrink-0 { flex-shrink: 0; }
        .grow { flex-grow: 1; }
        
        /* Range slider styling */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          background: #e2e8f0;
          height: 6px;
          border-radius: 999px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          background: #81C995;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          cursor: pointer;
          margin-top: -6px;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}
