import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { animal, product_type, ingredient } = await req.json();

    if (!ingredient?.trim()) {
      return new Response(JSON.stringify({ error: '성분 텍스트를 입력해주세요.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `당신은 반려동물 영양 전문 수의사입니다.
아래의 ${animal === 'dog' ? '강아지' : '고양이'} ${product_type === 'food' ? '사료' : product_type === 'snack' ? '간식' : '영양제'} 성분 목록을 분석해주세요.

성분 목록:
${ingredient}

다음 JSON 형식으로만 응답해주세요 (마크다운 없이 순수 JSON):
{
  "summary": "한줄 종합 평가",
  "risk_level": "safe | caution | danger",
  "scores": {
    "safety": 0~100,
    "nutrition": 0~100,
    "final": 0~100
  },
  "alerts": ["주의사항1", "주의사항2"],
  "combination_analysis": {
    "risk_comment": "성분 조합 분석",
    "protein_quality": "높음 | 보통 | 낮음",
    "additive_level": "없음 | 낮음 | 보통 | 높음"
  },
  "ingredient_analysis": [
    {
      "name": "성분명",
      "category": "단백질 | 탄수화물 | 지방 | 보존료 | 색소 | 첨가물 | 비타민 | 미네랄 | 기타",
      "risk": "safe | caution | danger",
      "reason": "이 성분에 대한 간단한 설명"
    }
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      throw new Error('AI 분석 서비스 오류가 발생했습니다.');
    }

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text ?? '';

    let result;
    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      throw new Error('AI 응답을 파싱하는 데 실패했습니다.');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '알 수 없는 오류가 발생했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
