import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CalendarRange,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  FlaskConical,
  PawPrint,
  Clock3,
  Flame,
  RotateCcw,
  CalendarCheck2,
  Search as SearchIcon,
  History,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { FeedingProductType, PetFeedingLog } from '../../types';
import {
  getFeedingLogsByDate,
  getFeedingLogMonth,
  getFeedingLogsByMonthFull,
  getFeedingLogsRange,
  getFeedingLogsForProduct,
  searchFeedingLogs,
  deleteFeedingLog,
} from '../../lib/supabase';
import {
  WEEKDAY_LABELS,
  PREFERENCE_OPTIONS,
  feedingTypeMeta,
  mealPeriodLabel,
  productTypeToFeedingType,
  toDateKey,
} from './feedingConstants';
import {
  computeDailySummary,
  groupByMealPeriod,
  computeMonthlyInsights,
  computePreferenceTrend,
  weekStartKey,
  weekDateKeys,
  logFeedingType,
  type TopProduct,
} from './feedingInsights';
import FeedingLogForm from './FeedingLogForm';
import BottomSheet from '../BottomSheet';
import StateView from '../StateView';
import { Skeleton } from '../Skeleton';

/** 제품 이력 조회용 참조 */
interface ProductRef {
  productId: string | null;
  customName: string | null;
  label: string;
  imageUrl: string | null;
}

function refFromLog(log: PetFeedingLog): ProductRef {
  return {
    productId: log.isCustomProduct ? null : log.productId,
    customName: log.isCustomProduct ? log.customProductName ?? '' : null,
    label: log.isCustomProduct ? log.customProductName ?? '직접 입력 제품' : log.product?.name ?? '제품',
    imageUrl: log.isCustomProduct ? null : log.product?.imageUrl ?? null,
  };
}

function shiftDateKey(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toDateKey(dt);
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80';

function petAgeLabel(age: number): string {
  if (age < 2) return '아기';
  if (age > 7) return '시니어';
  return '성인';
}

function formatDateHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${m}월 ${d}일 (${weekday})`;
}

interface FeedingDiaryProps {
  /** 반려동물 등록 화면(내 반려동물 탭)으로 이동 */
  onRegisterPet: () => void;
}

export default function FeedingDiary({ onRegisterPet }: FeedingDiaryProps) {
  const { pets, activePetId, userId } = useStore();
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const [selectedPetId, setSelectedPetId] = useState<string | null>(activePetId ?? pets[0]?.id ?? null);
  const [viewMode, setViewMode] = useState<'calendar' | 'week' | 'list'>('calendar');
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1~12
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [weekStart, setWeekStart] = useState<string>(() => weekStartKey(todayKey));

  const [monthMarks, setMonthMarks] = useState<Record<string, Set<string>>>({});
  const [dayLogs, setDayLogs] = useState<PetFeedingLog[]>([]);
  const [monthLogs, setMonthLogs] = useState<PetFeedingLog[]>([]);
  const [weekLogs, setWeekLogs] = useState<PetFeedingLog[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<PetFeedingLog | null>(null);
  const [presetLog, setPresetLog] = useState<PetFeedingLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PetFeedingLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [historyRef, setHistoryRef] = useState<ProductRef | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // 반려동물이 바뀌거나 새로 로드되면 선택값 보정
  useEffect(() => {
    if (selectedPetId && pets.some((p) => p.id === selectedPetId)) return;
    setSelectedPetId(activePetId ?? pets[0]?.id ?? null);
  }, [pets, activePetId, selectedPetId]);

  // 월간 마크(달력 점) 로드
  const loadMonthMarks = useCallback(async () => {
    if (!selectedPetId) {
      setMonthMarks({});
      return;
    }
    const rows = await getFeedingLogMonth(selectedPetId, viewYear, viewMonth);
    const map: Record<string, Set<string>> = {};
    for (const r of rows) {
      const type = productTypeToFeedingType(r.productType);
      if (!map[r.feedingDate]) map[r.feedingDate] = new Set();
      map[r.feedingDate].add(type);
    }
    setMonthMarks(map);
  }, [selectedPetId, viewYear, viewMonth]);

  // 목록 보기 월간 전체 로드
  const loadMonthLogs = useCallback(async () => {
    if (!selectedPetId) {
      setMonthLogs([]);
      return;
    }
    setLoadingMonth(true);
    try {
      const rows = await getFeedingLogsByMonthFull(selectedPetId, viewYear, viewMonth);
      setMonthLogs(rows);
    } finally {
      setLoadingMonth(false);
    }
  }, [selectedPetId, viewYear, viewMonth]);

  // 주간 범위 기록 로드
  const loadWeekLogs = useCallback(async () => {
    if (!selectedPetId) {
      setWeekLogs([]);
      return;
    }
    setLoadingWeek(true);
    try {
      const rows = await getFeedingLogsRange(selectedPetId, weekStart, shiftDateKey(weekStart, 6));
      setWeekLogs(rows);
    } finally {
      setLoadingWeek(false);
    }
  }, [selectedPetId, weekStart]);

  // 선택 날짜 기록 로드
  const loadDayLogs = useCallback(async () => {
    if (!selectedPetId) {
      setDayLogs([]);
      return;
    }
    setLoadingDay(true);
    try {
      const rows = await getFeedingLogsByDate(selectedPetId, selectedDate);
      setDayLogs(rows);
    } finally {
      setLoadingDay(false);
    }
  }, [selectedPetId, selectedDate]);

  useEffect(() => {
    if (viewMode === 'calendar') loadMonthMarks();
    else if (viewMode === 'week') loadWeekLogs();
    else loadMonthLogs();
  }, [viewMode, loadMonthMarks, loadMonthLogs, loadWeekLogs]);

  useEffect(() => {
    if (viewMode === 'calendar' || viewMode === 'week') loadDayLogs();
  }, [viewMode, loadDayLogs]);

  const refreshAll = useCallback(() => {
    loadDayLogs();
    if (viewMode === 'calendar') loadMonthMarks();
    else if (viewMode === 'week') loadWeekLogs();
    else loadMonthLogs();
  }, [loadDayLogs, loadMonthMarks, loadMonthLogs, loadWeekLogs, viewMode]);

  const goPrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedDate(todayKey);
  };

  const goWeek = (delta: number) => {
    const dow = new Date(`${selectedDate}T00:00:00`).getDay();
    const nextStart = shiftDateKey(weekStart, delta * 7);
    setWeekStart(nextStart);
    setSelectedDate(shiftDateKey(nextStart, dow));
  };
  const goThisWeek = () => {
    setWeekStart(weekStartKey(todayKey));
    setSelectedDate(todayKey);
  };

  const switchView = (mode: 'calendar' | 'week' | 'list') => {
    if (mode === 'week') setWeekStart(weekStartKey(selectedDate));
    setViewMode(mode);
  };

  /** 검색 결과 등에서 특정 날짜로 이동 */
  const jumpToDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    setViewYear(Number(dateKey.slice(0, 4)));
    setViewMonth(Number(dateKey.slice(5, 7)));
    setWeekStart(weekStartKey(dateKey));
    if (viewMode === 'list') setViewMode('calendar');
    setSearchOpen(false);
  };

  const openCreate = () => {
    setEditingLog(null);
    setPresetLog(null);
    setFormOpen(true);
  };
  const openEdit = (log: PetFeedingLog) => {
    setPresetLog(null);
    setEditingLog(log);
    setFormOpen(true);
  };
  /** "다시 기록" — 기존 기록을 복제해 새 기록으로 (오늘 날짜) */
  const openRelog = (log: PetFeedingLog) => {
    setEditingLog(null);
    setSelectedDate(todayKey);
    setPresetLog(log);
    setFormOpen(true);
  };
  const openHistory = (ref: ProductRef) => setHistoryRef(ref);

  const handleSaved = (saved: PetFeedingLog) => {
    // 저장된 기록의 날짜로 이동해 즉시 확인
    setSelectedDate(saved.feedingDate);
    const savedMonth = Number(saved.feedingDate.slice(5, 7));
    const savedYear = Number(saved.feedingDate.slice(0, 4));
    if (savedYear !== viewYear || savedMonth !== viewMonth) {
      setViewYear(savedYear);
      setViewMonth(savedMonth);
    } else {
      refreshAll();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !userId || deleting) return;
    setDeleting(true);
    try {
      const ok = await deleteFeedingLog(deleteTarget.id, userId);
      if (ok) {
        setDeleteTarget(null);
        refreshAll();
      }
    } finally {
      setDeleting(false);
    }
  };

  // ── 반려동물 없음 상태 ──
  if (pets.length === 0) {
    return (
      <StateView
        icon={<PawPrint size={30} />}
        title="식이 기록을 시작하려면 반려동물을 먼저 등록해주세요."
        description="반려동물을 등록하면 매일 먹은 사료·간식·영양제를 날짜별로 기록할 수 있어요."
        action={{ label: '반려동물 등록', onClick: onRegisterPet }}
        minHeight={360}
      />
    );
  }

  // ── 일일 요약 (선택 날짜) — 열량은 데이터가 있을 때만 합산 ──
  const summary = computeDailySummary(dayLogs);
  const daySections = groupByMealPeriod(dayLogs);

  // 선택 날짜 요약 + 기록 (달력·주간 뷰 공용)
  const dayDetail = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: 'var(--text-dark)' }}>
          {formatDateHeading(selectedDate)}
          {selectedDate === todayKey && (
            <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 800, color: 'var(--primary-dark)', background: 'rgba(250,204,21,0.2)', padding: '3px 8px', borderRadius: '999px' }}>오늘</span>
          )}
        </h3>
        <button type="button" onClick={openCreate} style={addBtnStyle}>
          <Plus size={16} /> 기록 추가
        </button>
      </div>

      {dayLogs.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <SummaryPill label={`사료 ${summary.food}회`} show={summary.food > 0} tone="food" />
          <SummaryPill label={`간식 ${summary.snack}회`} show={summary.snack > 0} tone="snack" />
          <SummaryPill label={`영양제 ${summary.supplement}종`} show={summary.supplement > 0} tone="supplement" />
          <SummaryPill label={`총 ${summary.total}건`} show tone="total" />
          {summary.kcal != null && (
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#B45309', background: 'rgba(245, 158, 11, 0.14)', padding: '6px 12px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Flame size={13} /> 약 {summary.kcal.toLocaleString()}kcal
              {summary.kcalCounted < summary.total && (
                <span style={{ fontWeight: 600, opacity: 0.8 }}> ({summary.kcalCounted}건)</span>
              )}
            </span>
          )}
        </div>
      )}

      {loadingDay ? (
        <DayLogSkeleton />
      ) : dayLogs.length === 0 ? (
        <DayEmpty onAdd={openCreate} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {daySections.map((section) => (
            <div key={section.period}>
              {daySections.length > 1 && (
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {section.label}
                  <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>{section.logs.length}</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {section.logs.map((log) => (
                  <FeedingLogCard
                    key={log.id}
                    log={log}
                    onEdit={() => openEdit(log)}
                    onDelete={() => setDeleteTarget(log)}
                    onRelog={() => openRelog(log)}
                    onHistory={() => openHistory(refFromLog(log))}
                    onViewAnalysis={(pid) => navigate(`/product/${pid}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* 반려동물 선택 카드 */}
      <div>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {pets.map((p) => {
            const active = selectedPetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPetId(p.id)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  border: active ? '2px solid var(--primary)' : '1px solid var(--line)',
                  background: active ? 'rgba(250, 204, 21, 0.14)' : 'var(--surface-elevated)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: '64px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'var(--surface-alt)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                  }}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span aria-hidden>{p.species === 'Cat' ? '🐱' : '🐶'}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {p.species === 'Cat' ? '고양이' : '강아지'}
                    {p.breed ? ` · ${p.breed}` : ''} · {petAgeLabel(p.age)}
                    {p.weightKg ? ` · ${p.weightKg}kg` : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 이동 + 검색 + 뷰 전환 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {viewMode === 'week' ? (
            <>
              <button type="button" onClick={() => goWeek(-1)} aria-label="이전 주" style={iconBtnStyle}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)', minWidth: '112px', textAlign: 'center' }}>
                {weekStart.slice(5).replace('-', '.')}~{shiftDateKey(weekStart, 6).slice(5).replace('-', '.')}
              </span>
              <button type="button" onClick={() => goWeek(1)} aria-label="다음 주" style={iconBtnStyle}>
                <ChevronRight size={18} />
              </button>
              <button type="button" onClick={goThisWeek} style={todayBtnStyle}>이번 주</button>
            </>
          ) : (
            <>
              <button type="button" onClick={goPrevMonth} aria-label="이전 달" style={iconBtnStyle}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-dark)', minWidth: '96px', textAlign: 'center' }}>
                {viewYear}년 {viewMonth}월
              </span>
              <button type="button" onClick={goNextMonth} aria-label="다음 달" style={iconBtnStyle}>
                <ChevronRight size={18} />
              </button>
              <button type="button" onClick={goToday} style={todayBtnStyle}>오늘</button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" onClick={() => setSearchOpen(true)} aria-label="기록 검색" style={iconBtnStyle}>
            <SearchIcon size={18} />
          </button>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-alt)', borderRadius: '12px', padding: '4px' }}>
            <button type="button" onClick={() => switchView('calendar')} aria-label="달력 보기" style={segBtnStyle(viewMode === 'calendar')}>
              <CalendarDays size={16} />
            </button>
            <button type="button" onClick={() => switchView('week')} aria-label="주간 보기" style={segBtnStyle(viewMode === 'week')}>
              <CalendarRange size={16} />
            </button>
            <button type="button" onClick={() => switchView('list')} aria-label="목록 보기" style={segBtnStyle(viewMode === 'list')}>
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <>
          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            todayKey={todayKey}
            selectedDate={selectedDate}
            marks={monthMarks}
            onSelect={setSelectedDate}
          />
          {dayDetail}
        </>
      ) : viewMode === 'week' ? (
        <>
          <WeekStrip
            weekStart={weekStart}
            todayKey={todayKey}
            selectedDate={selectedDate}
            logs={weekLogs}
            onSelect={setSelectedDate}
          />
          <WeekSummary logs={weekLogs} loading={loadingWeek} />
          {dayDetail}
        </>
      ) : (
        // ── 목록 보기 ──
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>
              {viewYear}년 {viewMonth}월 · 총 {monthLogs.length}건
            </span>
            <button type="button" onClick={openCreate} style={addBtnStyle}>
              <Plus size={16} /> 기록 추가
            </button>
          </div>
          {loadingMonth ? (
            <DayLogSkeleton />
          ) : monthLogs.length === 0 ? (
            <DayEmpty onAdd={openCreate} />
          ) : (
            <>
              <MonthlyInsightsCard logs={monthLogs} onRelog={openRelog} onOpenProduct={openHistory} />
              <MonthList
                logs={monthLogs}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onRelog={openRelog}
                onHistory={(log) => openHistory(refFromLog(log))}
                onViewAnalysis={(pid) => navigate(`/product/${pid}`)}
              />
            </>
          )}
        </div>
      )}

      {/* 기록 추가/수정 폼 */}
      <FeedingLogForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        pets={pets}
        initialPetId={selectedPetId}
        editingLog={editingLog}
        presetLog={presetLog}
        initialDate={selectedDate}
        userId={userId}
        onSaved={handleSaved}
      />

      {/* 삭제 확인 */}
      {deleteTarget && (
        <ConfirmDialog
          title="이 섭취 기록을 삭제할까요?"
          description="삭제된 기록은 복구할 수 없습니다."
          confirmLabel={deleting ? '삭제 중…' : '삭제'}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}

      {/* 제품 급여 이력 */}
      <ProductHistorySheet
        petId={selectedPetId}
        productRef={historyRef}
        onClose={() => setHistoryRef(null)}
        onViewAnalysis={(pid) => navigate(`/product/${pid}`)}
        onRelog={(log) => { setHistoryRef(null); openRelog(log); }}
      />

      {/* 메모 검색 */}
      <MemoSearchSheet
        petId={selectedPetId}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onJump={jumpToDate}
      />
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  border: '1px solid var(--line)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-dark)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

function segBtnStyle(active: boolean): React.CSSProperties {
  return {
    minWidth: '40px',
    height: '32px',
    borderRadius: '9px',
    border: 'none',
    background: active ? 'var(--surface-elevated)' : 'transparent',
    color: active ? 'var(--text-dark)' : 'var(--text-muted)',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

const addBtnStyle: React.CSSProperties = {
  minHeight: '40px',
  padding: '0 14px',
  borderRadius: '12px',
  border: 'none',
  background: 'var(--primary)',
  color: 'var(--text-dark)',
  fontWeight: 800,
  fontSize: '13px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  flexShrink: 0,
};

const todayBtnStyle: React.CSSProperties = {
  marginLeft: '4px',
  minHeight: '36px',
  padding: '0 12px',
  borderRadius: '10px',
  border: '1px solid var(--line)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-muted)',
  fontWeight: 700,
  fontSize: '12px',
  cursor: 'pointer',
  flexShrink: 0,
};

function SummaryPill({ label, show, tone }: { label: string; show: boolean; tone: 'food' | 'snack' | 'supplement' | 'total' }) {
  if (!show) return null;
  const palette: Record<string, { bg: string; color: string }> = {
    food: { bg: 'rgba(245, 158, 11, 0.14)', color: '#B45309' },
    snack: { bg: 'rgba(249, 115, 22, 0.14)', color: '#C2410C' },
    supplement: { bg: 'rgba(99, 102, 241, 0.14)', color: '#4338CA' },
    total: { bg: 'var(--surface-alt)', color: 'var(--text-dark)' },
  };
  const c = palette[tone];
  return (
    <span style={{ fontSize: '13px', fontWeight: 800, color: c.color, background: c.bg, padding: '6px 12px', borderRadius: '999px' }}>
      {label}
    </span>
  );
}

function CalendarGrid({
  year,
  month,
  todayKey,
  selectedDate,
  marks,
  onSelect,
}: {
  year: number;
  month: number;
  todayKey: string;
  selectedDate: string;
  marks: Record<string, Set<string>>;
  onSelect: (dateKey: string) => void;
}) {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dotColor = (type: string): string => feedingTypeMeta(productTypeToFeedingType(type)).color;

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: '18px',
        padding: '12px',
        background: 'var(--surface-elevated)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={w}
            style={{
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 800,
              color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : 'var(--text-muted)',
              padding: '4px 0',
            }}
          >
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((d, idx) => {
          if (d == null) return <div key={`e${idx}`} />;
          const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const dayMarks = marks[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              style={{
                aspectRatio: '1 / 1',
                minHeight: '40px',
                borderRadius: '12px',
                border: isSelected ? '2px solid var(--primary-dark)' : '1px solid transparent',
                background: isSelected ? 'rgba(250, 204, 21, 0.18)' : isToday ? 'var(--surface-alt)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: 0,
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: isToday || isSelected ? 900 : 600,
                  color: isToday ? 'var(--primary-dark)' : 'var(--text-dark)',
                }}
              >
                {d}
              </span>
              <span style={{ display: 'flex', gap: '2px', height: '5px', alignItems: 'center' }}>
                {dayMarks &&
                  [...dayMarks].slice(0, 3).map((t) => (
                    <span
                      key={t}
                      style={{ width: '5px', height: '5px', borderRadius: '50%', background: dotColor(t) }}
                    />
                  ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FeedingLogCard({
  log,
  onEdit,
  onDelete,
  onRelog,
  onHistory,
  onViewAnalysis,
}: {
  log: PetFeedingLog;
  onEdit: () => void;
  onDelete: () => void;
  onRelog: () => void;
  onHistory: () => void;
  onViewAnalysis: (productId: string) => void;
}) {
  const meta = feedingTypeMeta(log.productType === 'custom' ? productTypeToFeedingType(log.product?.productType) : log.productType);
  const name = log.isCustomProduct ? log.customProductName ?? '직접 입력 제품' : log.product?.name ?? '제품';
  const brand = log.isCustomProduct ? '직접 입력' : log.product?.brand ?? '';
  const img = log.isCustomProduct ? null : log.product?.imageUrl ?? null;
  const timeText = log.feedingTime ?? mealPeriodLabel(log.mealPeriod);
  const showAnalysis = !log.isCustomProduct && Boolean(log.productId);
  const pref = log.preferenceLevel != null ? PREFERENCE_OPTIONS.find((p) => p.value === log.preferenceLevel) : null;

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: '16px',
        background: 'var(--surface-elevated)',
        padding: '14px',
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flexShrink: 0 }}>
          {img ? (
            <img src={img || FALLBACK_IMG} alt={name} style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }} />
          ) : (
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                background: meta.bg,
                color: meta.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '13px',
              }}
            >
              {meta.label}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: meta.color, background: meta.bg, padding: '3px 8px', borderRadius: '999px' }}>
              {meta.label}
            </span>
            {timeText && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Clock3 size={11} /> {timeText}
              </span>
            )}
            {pref && (
              <span title={`기호도: ${pref.label}`} style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <span aria-hidden>{pref.emoji}</span> {pref.label}
              </span>
            )}
          </div>
          {brand && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{brand}</div>}
          <div className="line-clamp-2" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.4 }}>
            {name}
          </div>
          {(log.amount != null || log.unit) && (
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '4px' }}>
              {log.amount != null ? log.amount : ''}
              {log.unit ? ` ${log.unit}` : ''}
            </div>
          )}
          {log.memo && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{log.memo}</p>
          )}
          {log.reactionNote && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>· {log.reactionNote}</p>
          )}
        </div>
        {log.imageUrl && (
          <img
            src={log.imageUrl}
            alt="기록 사진"
            loading="lazy"
            style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, alignSelf: 'flex-start' }}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
        {showAnalysis && (
          <button type="button" onClick={() => onViewAnalysis(log.productId!)} style={cardActionStyle}>
            <FlaskConical size={14} /> 성분 분석
          </button>
        )}
        <button type="button" onClick={onHistory} style={cardActionStyle}>
          <History size={14} /> 이력
        </button>
        <button type="button" onClick={onRelog} style={cardActionStyle}>
          <RotateCcw size={14} /> 다시 기록
        </button>
        <button type="button" onClick={onEdit} style={cardActionStyle}>
          <Pencil size={14} /> 수정
        </button>
        <button type="button" onClick={onDelete} style={{ ...cardActionStyle, color: '#DC2626' }}>
          <Trash2 size={14} /> 삭제
        </button>
      </div>
    </div>
  );
}

function MonthlyInsightsCard({
  logs,
  onRelog,
  onOpenProduct,
}: {
  logs: PetFeedingLog[];
  onRelog: (log: PetFeedingLog) => void;
  onOpenProduct: (ref: ProductRef) => void;
}) {
  const ins = computeMonthlyInsights(logs);
  const trend = computePreferenceTrend(logs);
  const typeTotal = ins.typeCounts.food + ins.typeCounts.snack + ins.typeCounts.supplement || 1;
  const bars: { key: 'food' | 'snack' | 'supplement'; label: string; color: string; count: number }[] = [
    { key: 'food', label: '사료', color: '#F59E0B', count: ins.typeCounts.food },
    { key: 'snack', label: '간식', color: '#F97316', count: ins.typeCounts.snack },
    { key: 'supplement', label: '영양제', color: '#6366F1', count: ins.typeCounts.supplement },
  ];

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface-elevated)', padding: '16px', marginBottom: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px' }}>이번 달 요약</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <InsightStat icon={<CalendarCheck2 size={15} />} value={`${ins.daysLogged}일`} label="기록한 날" />
        <InsightStat icon={<ListIcon size={15} />} value={`${ins.totalRecords}건`} label="총 기록" />
        <InsightStat icon={<Flame size={15} />} value={`${ins.streak}일`} label="연속 기록" />
      </div>

      {/* 유형 분포 바 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', height: '8px', borderRadius: '999px', overflow: 'hidden', background: 'var(--surface-alt)', marginBottom: '8px' }}>
          {bars.map((b) => (
            <div key={b.key} style={{ width: `${(b.count / typeTotal) * 100}%`, background: b.color }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {bars.map((b) => (
            <span key={b.key} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: b.color }} /> {b.label} {b.count}
            </span>
          ))}
        </div>
      </div>

      {/* 기호도 추이 — 기록이 있을 때만 */}
      {trend.length > 0 && (
        <div style={{ marginBottom: ins.topProducts.length > 0 ? '16px' : 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px' }}>기호도 추이</div>
          <PreferenceTrendChart points={trend} />
        </div>
      )}

      {ins.topProducts.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px' }}>자주 먹인 제품</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ins.topProducts.map((p: TopProduct) => (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => onOpenProduct({ productId: p.isCustom ? null : p.sample.productId, customName: p.isCustom ? p.label : null, label: p.label, imageUrl: p.imageUrl })}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.label} style={{ width: '36px', height: '36px', borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--surface-alt)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }} aria-hidden>🍽️</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="line-clamp-1" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>{p.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{p.count}회 · 이력 보기</div>
                  </div>
                </button>
                <button type="button" onClick={() => onRelog(p.sample)} style={{ ...cardActionStyle, minHeight: '34px', flexShrink: 0 }}>
                  <RotateCcw size={13} /> 다시 기록
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function prefColor(avg: number): string {
  if (avg >= 4) return '#16A34A';
  if (avg >= 3) return '#F59E0B';
  return '#DC2626';
}

function PreferenceTrendChart({ points }: { points: { date: string; avg: number; count: number }[] }) {
  // 최근 14일치만 표시(오래된 것은 왼쪽에서 잘라냄)
  const data = points.slice(-14);
  const maxBar = 64;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: `${maxBar}px` }}>
        {data.map((pt) => {
          const h = Math.max(6, Math.round((pt.avg / 5) * maxBar));
          return (
            <div key={pt.date} title={`${pt.date.slice(5).replace('-', '.')} · 평균 ${pt.avg.toFixed(1)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minWidth: 0 }}>
              <div style={{ width: '100%', maxWidth: '18px', height: `${h}px`, borderRadius: '4px', background: prefColor(pt.avg) }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-light)', fontWeight: 600 }}>{data[0].date.slice(5).replace('-', '.')}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-light)', fontWeight: 600 }}>{data[data.length - 1].date.slice(5).replace('-', '.')}</span>
      </div>
    </div>
  );
}

function InsightStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ background: 'var(--surface-alt)', borderRadius: '12px', padding: '12px 10px', textAlign: 'center' }}>
      <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text-dark)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>{label}</div>
    </div>
  );
}

/* ── 주간 뷰: 7일 스트립 + 주간 요약 ── */
function WeekStrip({
  weekStart,
  todayKey,
  selectedDate,
  logs,
  onSelect,
}: {
  weekStart: string;
  todayKey: string;
  selectedDate: string;
  logs: PetFeedingLog[];
  onSelect: (dateKey: string) => void;
}) {
  const keys = weekDateKeys(weekStart);
  const marks = new Map<string, Set<string>>();
  for (const log of logs) {
    const set = marks.get(log.feedingDate) ?? new Set<string>();
    set.add(logFeedingType(log));
    marks.set(log.feedingDate, set);
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
      {keys.map((key, i) => {
        const d = Number(key.slice(8, 10));
        const isToday = key === todayKey;
        const isSelected = key === selectedDate;
        const dayMarks = marks.get(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 0 6px',
              borderRadius: '14px',
              border: isSelected ? '2px solid var(--primary-dark)' : '1px solid var(--line)',
              background: isSelected ? 'rgba(250, 204, 21, 0.16)' : isToday ? 'var(--surface-alt)' : 'var(--surface-elevated)',
              cursor: 'pointer',
              minHeight: '68px',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 700, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : 'var(--text-muted)' }}>{WEEKDAY_LABELS[i]}</span>
            <span style={{ fontSize: '15px', fontWeight: isToday || isSelected ? 900 : 700, color: isToday ? 'var(--primary-dark)' : 'var(--text-dark)' }}>{d}</span>
            <span style={{ display: 'flex', gap: '2px', height: '5px', alignItems: 'center' }}>
              {dayMarks &&
                [...dayMarks].slice(0, 3).map((t) => (
                  <span key={t} style={{ width: '5px', height: '5px', borderRadius: '50%', background: feedingTypeMeta(t as FeedingProductType).color }} />
                ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WeekSummary({ logs, loading }: { logs: PetFeedingLog[]; loading: boolean }) {
  const s = computeDailySummary(logs);
  const daysLogged = new Set(logs.map((l) => l.feedingDate)).size;
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface-elevated)', padding: '14px' }}>
      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px' }}>이번 주 요약</div>
      {loading ? (
        <Skeleton width="70%" height={16} />
      ) : (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <SummaryPill label={`기록 ${daysLogged}일`} show tone="total" />
          <SummaryPill label={`사료 ${s.food}회`} show={s.food > 0} tone="food" />
          <SummaryPill label={`간식 ${s.snack}회`} show={s.snack > 0} tone="snack" />
          <SummaryPill label={`영양제 ${s.supplement}종`} show={s.supplement > 0} tone="supplement" />
          <SummaryPill label={`총 ${s.total}건`} show tone="total" />
          {s.kcal != null && (
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#B45309', background: 'rgba(245, 158, 11, 0.14)', padding: '6px 12px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Flame size={13} /> 약 {s.kcal.toLocaleString()}kcal
            </span>
          )}
          {s.total === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>이번 주 기록이 없어요.</span>}
        </div>
      )}
    </div>
  );
}

/* ── 특정 제품 급여 이력 타임라인 ── */
function ProductHistorySheet({
  petId,
  productRef,
  onClose,
  onViewAnalysis,
  onRelog,
}: {
  petId: string | null;
  productRef: ProductRef | null;
  onClose: () => void;
  onViewAnalysis: (productId: string) => void;
  onRelog: (log: PetFeedingLog) => void;
}) {
  const [logs, setLogs] = useState<PetFeedingLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productRef || !petId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const rows = await getFeedingLogsForProduct(petId, { productId: productRef.productId, customName: productRef.customName });
        if (!cancelled) setLogs(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [productRef, petId]);

  const prefs = logs.map((l) => l.preferenceLevel).filter((v): v is number => v != null);
  const avgPref = prefs.length ? prefs.reduce((a, b) => a + b, 0) / prefs.length : null;

  return (
    <BottomSheet isOpen={Boolean(productRef)} onClose={onClose} title={productRef?.label ?? '급여 이력'} footer={null}>
      {loading ? (
        <DayLogSkeleton />
      ) : logs.length === 0 ? (
        <div style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>이 제품의 급여 기록이 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <SummaryPill label={`총 ${logs.length}회`} show tone="total" />
            <SummaryPill label={`최근 ${formatDateHeading(logs[0].feedingDate)}`} show tone="total" />
            {avgPref != null && <SummaryPill label={`평균 기호도 ${avgPref.toFixed(1)}`} show tone="food" />}
          </div>
          {productRef?.productId && (
            <button type="button" onClick={() => onViewAnalysis(productRef.productId!)} style={{ ...cardActionStyle, alignSelf: 'flex-start' }}>
              <FlaskConical size={14} /> 성분 분석 보기
            </button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.map((log) => {
              const pref = log.preferenceLevel != null ? PREFERENCE_OPTIONS.find((p) => p.value === log.preferenceLevel) : null;
              const timeText = log.feedingTime ?? mealPeriodLabel(log.mealPeriod);
              return (
                <div key={log.id} style={{ border: '1px solid var(--line)', borderRadius: '14px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)' }}>
                      {formatDateHeading(log.feedingDate)}
                      {timeText && <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginLeft: '6px' }}>{timeText}</span>}
                    </div>
                    <button type="button" onClick={() => onRelog(log)} style={{ ...cardActionStyle, minHeight: '32px' }}>
                      <RotateCcw size={13} /> 다시 기록
                    </button>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 700, marginTop: '4px' }}>
                    {log.amount != null ? `${log.amount}${log.unit ? ` ${log.unit}` : ''}` : log.unit ?? ''}
                    {pref && <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginLeft: '8px' }}>{pref.emoji} {pref.label}</span>}
                  </div>
                  {log.memo && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{log.memo}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

/* ── 메모·특이사항·직접 입력 제품명 검색 ── */
function MemoSearchSheet({
  petId,
  isOpen,
  onClose,
  onJump,
}: {
  petId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onJump: (dateKey: string) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PetFeedingLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const term = q.trim();
    let cancelled = false;
    const run = async () => {
      if (!term || !petId) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const rows = await searchFeedingLogs(petId, term);
        if (!cancelled) setResults(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(run, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, isOpen, petId]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="기록 검색" footer={null}>
      <div style={{ position: 'relative', marginBottom: '14px' }}>
        <SearchIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="메모·특이사항·제품명 검색"
          style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1px solid var(--line)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'var(--surface-alt)', color: 'var(--text-dark)' }}
        />
      </div>
      {q.trim() === '' ? (
        <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>메모나 특이사항, 직접 입력한 제품명으로 검색해요.</div>
      ) : loading ? (
        <DayLogSkeleton />
      ) : results.length === 0 ? (
        <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>검색 결과가 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {results.map((log) => {
            const name = log.isCustomProduct ? log.customProductName ?? '직접 입력 제품' : log.product?.name ?? '제품';
            return (
              <button
                key={log.id}
                type="button"
                onClick={() => onJump(log.feedingDate)}
                style={{ display: 'block', width: '100%', textAlign: 'left', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px 14px', background: 'var(--surface-elevated)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>{formatDateHeading(log.feedingDate)}</span>
                  <ChevronRight size={16} color="var(--text-light)" />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '2px' }}>{name}</div>
                {(log.memo || log.reactionNote) && (
                  <p className="line-clamp-2" style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {[log.memo, log.reactionNote].filter(Boolean).join(' · ')}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}

const cardActionStyle: React.CSSProperties = {
  minHeight: '40px',
  padding: '0 12px',
  borderRadius: '10px',
  border: '1px solid var(--line)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-muted)',
  fontWeight: 700,
  fontSize: '13px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
};

function MonthList({
  logs,
  onEdit,
  onDelete,
  onRelog,
  onHistory,
  onViewAnalysis,
}: {
  logs: PetFeedingLog[];
  onEdit: (log: PetFeedingLog) => void;
  onDelete: (log: PetFeedingLog) => void;
  onRelog: (log: PetFeedingLog) => void;
  onHistory: (log: PetFeedingLog) => void;
  onViewAnalysis: (productId: string) => void;
}) {
  // 날짜별 그룹 (이미 날짜 내림차순 정렬됨)
  const groups: { date: string; items: PetFeedingLog[] }[] = [];
  for (const log of logs) {
    const last = groups[groups.length - 1];
    if (last && last.date === log.feedingDate) last.items.push(log);
    else groups.push({ date: log.feedingDate, items: [log] });
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {groups.map((g) => (
        <div key={g.date}>
          <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '10px' }}>
            {formatDateHeading(g.date)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {g.items.map((log) => (
              <FeedingLogCard
                key={log.id}
                log={log}
                onEdit={() => onEdit(log)}
                onDelete={() => onDelete(log)}
                onRelog={() => onRelog(log)}
                onHistory={() => onHistory(log)}
                onViewAnalysis={onViewAnalysis}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DayEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '44px 20px',
        borderRadius: '18px',
        background: 'var(--surface-alt)',
        border: '1px dashed var(--line)',
      }}
    >
      <div style={{ fontSize: '30px', marginBottom: '10px' }} aria-hidden>🍽️</div>
      <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)' }}>아직 기록된 식사가 없어요.</p>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        오늘 먹은 사료, 간식, 영양제를 기록해보세요.
      </p>
      <button
        type="button"
        onClick={onAdd}
        style={{
          minHeight: '44px',
          padding: '10px 20px',
          borderRadius: '12px',
          border: 'none',
          background: 'var(--primary)',
          color: 'var(--text-dark)',
          fontWeight: 800,
          fontSize: '14px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Plus size={16} /> 섭취 기록 추가
      </button>
    </div>
  );
}

function DayLogSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} aria-busy="true">
      {[0, 1].map((i) => (
        <div key={i} style={{ border: '1px solid var(--line)', borderRadius: '16px', padding: '14px', display: 'flex', gap: '12px' }}>
          <Skeleton width={56} height={56} radius={12} />
          <div style={{ flex: 1 }}>
            <Skeleton width="30%" height={12} />
            <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
            <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '340px',
          background: 'var(--surface-elevated)',
          borderRadius: '20px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 900, color: 'var(--text-dark)' }}>{title}</h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{description}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1,
              minHeight: '48px',
              borderRadius: '14px',
              border: '1px solid var(--line)',
              background: 'var(--surface-elevated)',
              color: 'var(--text-dark)',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1,
              minHeight: '48px',
              borderRadius: '14px',
              border: 'none',
              background: '#DC2626',
              color: '#fff',
              fontWeight: 800,
              fontSize: '15px',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
