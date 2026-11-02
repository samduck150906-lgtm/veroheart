import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StartupSplash from './StartupSplash';

afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('startup splash timing', () => {
  it('reveals logo and caption together and gives the visible text a readable interval', () => {
    vi.useFakeTimers();
    const done = vi.fn();
    render(<StartupSplash onMinimumComplete={done} />);
    expect(screen.getByTestId('splash-brand').style.visibility).toBe('hidden');
    act(() => vi.advanceTimersByTime(400));
    fireEvent.load(screen.getByAltText('VERORO'));
    expect(screen.getByTestId('splash-brand').style.visibility).toBe('visible');
    act(() => vi.advanceTimersByTime(1099));
    expect(done).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('uses a text logo if the image stalls and does not wait forever', () => {
    vi.useFakeTimers();
    const done = vi.fn();
    render(<StartupSplash onMinimumComplete={done} />);
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText('VERORO')).toBeTruthy();
    act(() => vi.advanceTimersByTime(1100));
    expect(done).toHaveBeenCalledTimes(1);
  });
});
