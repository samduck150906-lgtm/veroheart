// @ts-nocheck
/**
 * PetProfileForm
 * 반려동물 프로필 등록 - 멀티스텝 폼
 * Step 1: 기본정보 (종, 이름, 성별, 중성화 여부)
 * Step 2: 나이 & 체중
 * Step 3: 건강/알레르기 설정
 * Step 4: 완료
 *
 * 진행률 표시줄 포함, 완료 시 Zustand updateProfile 호출
 */
import { useState, useEffect } from 'react';
import { Dog, Cat, ChevronRight, ChevronLeft, Check, Heart } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { UserPetProfile } from '../types';

const TOTAL_STEPS = 3;

// ──────────────────────────────────────────────
// Static option lists
// ──────────────────────────────────────────────
const HEALTH_OPTIONS = [
  '비만', '관절 질환', '신장 질환', '당뇨', '심장 질환',
  '피부 민감', '소화 예민', '구강 질환', '암/종양', '눈/귀 질환',
];

const ALLERGY_OPTIONS = [
  '닭고기', '소고기', '돼지고기', '양고기', '오리고기',
  '연어', '참치', '새우',
  '밀/글루텐', '옥수수', '콩', '유제품', '달걀',
  '감자', '고구마',
];

const BREED_LIST_DOG = ['믹스견', '말티즈', '포메라니안', '비숑', '푸들', '시츄', '골든리트리버', '래브라도', '리트리버', '진도', '기타'];
const BREED_LIST_CAT = ['믹스묘', '페르시안', '스코티시폴드', '러시안블루', '아비시니안', '메인쿤', '기타'];

// ──────────────────────────────────────────────
// Sub-step components
// ──────────────────────────────────────────────
type FormData = {
  species: 'Dog' | 'Cat';
  name: string;
  gender: 'male' | 'female' | '';
  neutered: boolean;
  breed: string;
  age: number;
  weight: number;
  healthConcerns: string[];
  allergies: string[];
};

function Step1({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
  const breeds = data.species === 'Cat' ? BREED_LIST_CAT : BREED_LIST_DOG;

  return (
    <div className="pet-step">
      <h2 className="pet-step-title">어떤 반려동물인가요?</h2>

      {/* Species */}
      <div className="pet-species-row">
        {(['Dog', 'Cat'] as const).map((s) => {
          const Icon = s === 'Dog' ? Dog : Cat;
          return (
            <button
              key={s}
              className={`pet-species-btn ${data.species === s ? 'pet-species-btn--active' : ''}`}
              onClick={() => set({ species: s, breed: '' })}
            >
              <Icon size={32} />
              <span>{s === 'Dog' ? '강아지' : '고양이'}</span>
            </button>
          );
        })}
      </div>

      {/* Name */}
      <label className="pet-label">이름</label>
      <input
        className="pet-input"
        placeholder="반려동물 이름을 입력하세요"
        value={data.name}
        onChange={(e) => set({ name: e.target.value })}
        maxLength={20}
      />

      {/* Gender */}
      <label className="pet-label">성별</label>
      <div className="pet-radio-row">
        {[{ v: 'male', l: '남아' }, { v: 'female', l: '여아' }].map(({ v, l }) => (
          <button
            key={v}
            className={`pet-radio-btn ${data.gender === v ? 'pet-radio-btn--active' : ''}`}
            onClick={() => set({ gender: v as 'male' | 'female' })}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Neutered */}
      <label className="pet-label">중성화 여부</label>
      <div className="pet-radio-row">
        {[{ v: true, l: '중성화 완료' }, { v: false, l: '미완료' }].map(({ v, l }) => (
          <button
            key={String(v)}
            className={`pet-radio-btn ${data.neutered === v ? 'pet-radio-btn--active' : ''}`}
            onClick={() => set({ neutered: v })}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Breed */}
      <label className="pet-label">품종</label>
      <select className="pet-select" value={data.breed} onChange={(e) => set({ breed: e.target.value })}>
        <option value="">품종 선택</option>
        {breeds.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
    </div>
  );
}

function Step2({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
  const [weightStr, setWeightStr] = useState(String(data.weight));

  useEffect(() => {
    if (parseFloat(weightStr) !== data.weight) {
      setWeightStr(String(data.weight));
    }
  }, [data.weight]);

  const handleWeightChange = (val: string) => {
    setWeightStr(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      set({ weight: parsed });
    }
  };

  return (
    <div className="pet-step">
      <h2 className="pet-step-title">나이와 체중을 알려주세요</h2>

      {/* Age */}
      <label className="pet-label">나이 <span className="pet-label-val">{data.age}세</span></label>
      <input
        type="range" min={0} max={20} step={1}
        value={data.age}
        onChange={(e) => set({ age: Number(e.target.value) })}
        className="pet-slider"
      />
      <div className="pet-slider-marks">
        <span>0세 (퍼피)</span>
        <span>10세</span>
        <span>20세</span>
      </div>

      {/* Life stage badge */}
      <div className="pet-life-stage">
        {data.age < 1 ? '🐣 퍼피 (1세 미만)' : data.age < 7 ? '🐾 어덜트' : '🌿 시니어 (7세 이상)'}
      </div>

      {/* Weight */}
      <label className="pet-label" style={{ marginTop: '20px' }}>
        체중 <span className="pet-label-val">{data.weight} kg</span>
      </label>
      <input
        type="range" min={0.5} max={60} step={0.5}
        value={data.weight}
        onChange={(e) => handleWeightChange(e.target.value)}
        className="pet-slider"
      />
      <div className="pet-slider-marks">
        <span>0.5 kg</span>
        <span>30 kg</span>
        <span>60 kg</span>
      </div>

      {/* Or manual input */}
      <div className="pet-manual-row">
        <span>직접 입력</span>
        <input
          type="text"
          value={weightStr}
          onChange={(e) => handleWeightChange(e.target.value.replace(/[^0-9.]/g, ''))}
          className="pet-number-input"
          placeholder="예: 5.2"
        />
        <span>kg</span>
      </div>
    </div>
  );
}

function MultiChip({
  options, selected, onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="pet-chip-grid">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            className={`pet-chip ${active ? 'pet-chip--active' : ''}`}
            onClick={() => onToggle(opt)}
          >
            {active && <Check size={11} style={{ marginRight: 3 }} />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Step3({ data, set }: { data: FormData; set: (d: Partial<FormData>) => void }) {
  const toggleHealth = (v: string) => {
    set({ healthConcerns: data.healthConcerns.includes(v)
      ? data.healthConcerns.filter((x) => x !== v)
      : [...data.healthConcerns, v] });
  };
  const toggleAllergy = (v: string) => {
    set({ allergies: data.allergies.includes(v)
      ? data.allergies.filter((x) => x !== v)
      : [...data.allergies, v] });
  };

  return (
    <div className="pet-step">
      <h2 className="pet-step-title">건강 및 알레르기 설정</h2>
      <p className="pet-step-sub">해당하는 항목을 모두 선택해 주세요 (없으면 건너뛰세요)</p>

      <label className="pet-label">건강 특이사항</label>
      <MultiChip options={HEALTH_OPTIONS} selected={data.healthConcerns} onToggle={toggleHealth} />

      <label className="pet-label" style={{ marginTop: '20px' }}>피해야 할 알레르기 성분</label>
      <MultiChip options={ALLERGY_OPTIONS} selected={data.allergies} onToggle={toggleAllergy} />
    </div>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
interface PetProfileFormProps {
  onComplete?: () => void;
}

const DEFAULT_FORM: FormData = {
  species: 'Dog',
  name: '',
  gender: '',
  neutered: false,
  breed: '',
  age: 3,
  weight: 10,
  healthConcerns: [],
  allergies: [],
};

export default function PetProfileForm({ onComplete }: PetProfileFormProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [done, setDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const updateProfile   = useStore((s) => s.updateProfile);

  const patch = (d: Partial<FormData>) => setForm((f) => ({ ...f, ...d }));

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    return true;
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      setIsSaving(true);
      try {
        // Save
        await updateProfile({
          name:           form.name,
          species:        form.species,
          age:            form.age,
          weightKg:       form.weight,
          healthConcerns: form.healthConcerns,
          allergies:      form.allergies,
        });
        setDone(true);
        onComplete?.();
      } catch (err) {
        console.error('Failed to save pet profile:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const progress = ((step) / TOTAL_STEPS) * 100;

  if (done) {
    return (
      <div className="pet-done">
        <div className="pet-done-icon"><Heart size={48} color="#ef4444" fill="#ef4444" /></div>
        <h2 className="pet-done-title">{form.name}의 프로필이 저장됐어요!</h2>
        <p className="pet-done-sub">이제 맞춤 사료 분석을 시작해 보세요.</p>
      </div>
    );
  }

  return (
    <div className="pet-form-wrap">
      {/* Progress bar */}
      <div className="pet-progress-bar-track">
        <div className="pet-progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="pet-step-counter">
        {step + 1} / {TOTAL_STEPS} 단계
      </div>

      {/* Step content */}
      {step === 0 && <Step1 data={form} set={patch} />}
      {step === 1 && <Step2 data={form} set={patch} />}
      {step === 2 && <Step3 data={form} set={patch} />}

      {/* Nav buttons */}
      <div className="pet-nav">
        {step > 0 && (
          <button className="pet-btn-back" onClick={() => setStep((s) => s - 1)} disabled={isSaving}>
            <ChevronLeft size={18} /> 이전
          </button>
        )}
        <button
          className="pet-btn-next"
          onClick={handleNext}
          disabled={!canNext() || isSaving}
        >
          {isSaving ? (
            '저장 중...'
          ) : step === TOTAL_STEPS - 1 ? (
            <><Check size={18} style={{ marginRight: 6 }} />저장하기</>
          ) : (
            <>다음 <ChevronRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
}
