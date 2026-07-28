import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import type { AdminIngredient, ProductIngredientLink } from '../../lib/adminApi';

const h = vi.hoisted(() => ({ searchIngredients: vi.fn() }));

vi.mock('../../lib/adminApi', () => ({ searchIngredients: h.searchIngredients }));

import ProductIngredientsEditor from './ProductIngredientsEditor';

const CHICKEN: AdminIngredient = {
  id: '11111111-1111-4111-8111-111111111111',
  name_ko: '닭고기', name_en: 'Chicken', risk_level: 'safe', description: null, category: null,
};
const RICE: AdminIngredient = {
  id: '22222222-2222-4222-8222-222222222222',
  name_ko: '현미', name_en: 'Brown rice', risk_level: 'safe', description: null, category: null,
};

function link(ingredient: AdminIngredient, sortOrder: number): ProductIngredientLink {
  return {
    ingredientId: ingredient.id,
    nameKo: ingredient.name_ko,
    nameEn: ingredient.name_en,
    riskLevel: ingredient.risk_level,
    sortOrder,
  };
}

/** onChange 를 받아 상태를 유지하는 테스트용 래퍼 */
function Harness({ initial, onChange }: { initial: ProductIngredientLink[]; onChange: (v: ProductIngredientLink[]) => void }) {
  const [value, setValue] = React.useState(initial);
  return (
    <ProductIngredientsEditor
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

async function search(term: string) {
  fireEvent.change(screen.getByLabelText('원재료 검색'), { target: { value: term } });
  // 검색 디바운스(250ms)
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
}

describe('ProductIngredientsEditor', () => {
  beforeEach(() => {
    h.searchIngredients.mockReset().mockResolvedValue([CHICKEN, RICE]);
  });

  afterEach(() => cleanup());

  it('원재료가 없으면 분석에 미치는 영향을 안내한다', () => {
    render(<Harness initial={[]} onChange={() => {}} />);
    expect(screen.getByText(/연결된 원재료가 없습니다/)).toBeTruthy();
  });

  it('검색 결과를 선택해 원재료를 추가한다', async () => {
    const onChange = vi.fn();
    render(<Harness initial={[]} onChange={onChange} />);

    await search('닭');
    fireEvent.click(await screen.findByText(/닭고기/));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0]).toEqual([
      expect.objectContaining({ ingredientId: CHICKEN.id, sortOrder: 0 }),
    ]);
  });

  it('이미 추가된 원재료는 중복 추가할 수 없다', async () => {
    const onChange = vi.fn();
    render(<Harness initial={[link(CHICKEN, 0)]} onChange={onChange} />);

    await search('닭');
    const option = await screen.findByText(/이미 추가됨/);
    expect((option.closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('순서를 바꾸면 sortOrder 가 다시 매겨진다', async () => {
    const onChange = vi.fn();
    render(<Harness initial={[link(CHICKEN, 0), link(RICE, 1)]} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('현미 위로 이동'));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0]).toEqual([
      expect.objectContaining({ ingredientId: RICE.id, sortOrder: 0 }),
      expect.objectContaining({ ingredientId: CHICKEN.id, sortOrder: 1 }),
    ]);
  });

  it('첫 번째 원재료를 제1원료로 표시한다', () => {
    render(<Harness initial={[link(CHICKEN, 0), link(RICE, 1)]} onChange={() => {}} />);
    expect(screen.getByText('제1원료')).toBeTruthy();
  });

  it('맨 위/맨 아래 항목은 해당 방향 이동이 잠긴다', () => {
    render(<Harness initial={[link(CHICKEN, 0), link(RICE, 1)]} onChange={() => {}} />);
    expect((screen.getByLabelText('닭고기 위로 이동') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('현미 아래로 이동') as HTMLButtonElement).disabled).toBe(true);
  });

  it('원재료를 제거하면 남은 항목의 순서가 정리된다', async () => {
    const onChange = vi.fn();
    render(<Harness initial={[link(CHICKEN, 0), link(RICE, 1)]} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('닭고기 연결 해제'));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0]).toEqual([
      expect.objectContaining({ ingredientId: RICE.id, sortOrder: 0 }),
    ]);
  });

  it('검색 결과가 없으면 성분을 자동 생성하지 않고 등록 화면을 안내한다', async () => {
    h.searchIngredients.mockResolvedValue([]);
    const onChange = vi.fn();
    render(<Harness initial={[]} onChange={onChange} />);

    await search('없는성분');

    expect(await screen.findByText(/성분이 사전에 없습니다/)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});
