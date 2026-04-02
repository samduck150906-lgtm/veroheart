import { useState } from 'react';
import { Loader2, Zap, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { AnalysisResponse } from '../types/analyzer';
import { useStore } from '../store/useStore';
import { saveAnalysisReport } from '../lib/supabase';

export default function Analyzer() {
  const { userId, selectedProduct } = useStore();
  const [animal, setAnimal] = useState<'dog' | 'cat'>('dog');
  const [productType, setProductType] = useState('food');
  const [ingredientText, setIngredientText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!ingredientText.trim()) {
      setError('전성분 텍스트를 입력해주세요.');
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
        throw new Error('분석 요청에 실패했습니다.');
      }

      const data: AnalysisResponse = await response.json();
      setResult(data);

      if (userId) {
        // Save to DB in background
        saveAnalysisReport(userId, selectedProduct?.id || null, ingredientText, data).catch(console.error);
        useStore.getState().fetchReports(); // trigger refresh
      }
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-extrabold flex items-center gap-2 mb-4 text-gray-800">
        <Zap className="text-blue-500" /> AI 정밀 분석기 (OCR 연동 테스트)
      </h2>
      
      <div className="space-y-4 mb-6">
        <div className="flex gap-4">
          <select 
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={animal}
            onChange={(e) => setAnimal(e.target.value as 'dog'|'cat')}
          >
            <option value="dog">강아지 (Dog)</option>
            <option value="cat">고양이 (Cat)</option>
          </select>
          <select 
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
          >
            <option value="food">사료 (주식)</option>
            <option value="snack">간식</option>
            <option value="supplement">영양제</option>
          </select>
        </div>

        <textarea
          className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          placeholder="여기에 사진에서 추출한 전성분 텍스트를 붙여넣으세요..."
          value={ingredientText}
          onChange={(e) => setIngredientText(e.target.value)}
        />

        {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="w-full flex justify-center items-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition"
        >
          {isLoading ? (
            <><Loader2 className="animate-spin mr-2" /> 정밀 분석 중...</>
          ) : (
            '🚀 즉시 분석하기'
          )}
        </button>
      </div>

      {result && (
        <div className="mt-8 pt-8 border-t border-gray-200 animate-fade-in">
          {/* 머리글: 종합 요약 & 점수 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-black text-gray-900">{result.scores.final.toFixed(0)} <span className="text-sm font-medium text-gray-500">/ 100점</span></h3>
              <p className="text-gray-600 font-medium mt-1">{result.summary}</p>
            </div>
            <div className={`px-4 py-2 rounded-full font-bold text-sm ${
              result.risk_level === 'safe' ? 'bg-green-100 text-green-700' :
              result.risk_level === 'caution' ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
            }`}>
              {result.risk_level.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-gray-500 text-xs font-bold mb-1">안전성 점수</div>
              <div className="text-lg font-bold">{result.scores.safety.toFixed(0)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-gray-500 text-xs font-bold mb-1">영양 점수</div>
              <div className="text-lg font-bold">{result.scores.nutrition.toFixed(0)}</div>
            </div>
          </div>

          {/* 알림 배지 */}
          {result.alerts.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center text-red-600 font-bold gap-2">
                <AlertTriangle size={16} /> 꼭 확인하세요!
              </div>
              <ul className="list-disc pl-5 text-red-700 text-sm font-medium space-y-1">
                {result.alerts.map((alert, i) => (
                  <li key={i}>{alert}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 조합 코멘트 */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <div className="flex items-center text-blue-800 font-bold gap-2 mb-2">
              <ShieldCheck size={18} /> 조합 분석 코멘트
            </div>
            <p className="text-blue-900 text-sm leading-relaxed mb-3">
              {result.combination_analysis.risk_comment}
            </p>
            <div className="flex gap-4 text-xs">
              <span className="bg-white text-blue-700 px-3 py-1 rounded-full border border-blue-200 shadow-sm">단백질 품질: {result.combination_analysis.protein_quality}</span>
              <span className="bg-white text-blue-700 px-3 py-1 rounded-full border border-blue-200 shadow-sm">첨가물 수준: {result.combination_analysis.additive_level}</span>
            </div>
          </div>

          {/* 성분별 리스트 상세 매핑 */}
          <h4 className="font-bold text-gray-800 mb-3">전성분 상세 분석 ({result.ingredient_analysis.length}개)</h4>
          <div className="space-y-3">
            {result.ingredient_analysis.map((item, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${
                item.risk === 'danger' ? 'bg-red-50 border-red-200' :
                item.risk === 'caution' ? 'bg-orange-50 border-orange-200' :
                'bg-white border-gray-200'
              }`}>
                <div className={`w-8 h-8 flex items-center justify-center shrink-0 rounded-full text-xs font-bold ${
                  item.risk === 'danger' ? 'bg-red-200 text-red-700' :
                  item.risk === 'caution' ? 'bg-orange-200 text-orange-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {item.risk === 'danger' ? '위험' : item.risk === 'caution' ? '주의' : '안전'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{item.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{item.category}</span>
                  </div>
                  <div className={`text-sm mt-1 leading-snug ${
                    item.risk === 'danger' ? 'text-red-700 font-medium' :
                    item.risk === 'caution' ? 'text-orange-700 font-medium' :
                    'text-gray-600'
                  }`}>
                    {item.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h4 className="font-bold text-gray-800 mb-3 text-lg">AI 기반 매칭 추천 (Mock)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                <span className="font-bold mb-1 block">추천 제품 연결</span>
                <span className="text-xs">이 분석 결과를 바탕으로<br/>더 안전한 대안 추천</span>
              </div>
              <div className="h-32 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                <span className="font-bold mb-1 block">대체 천연 성분</span>
                <span className="text-xs">유해 보존제 대신<br/>로즈마리, 비타민E 제품 분류</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
