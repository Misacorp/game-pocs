import { describe, expect, it } from 'vitest';
import { selectNearestLights, type LightSource } from '../src/client/render/LightManager';

function src(id: string, x: number, y: number, priority?: number): LightSource {
  return { id, x: () => x, y: () => y, color: 0xffffff, radius: 10, intensity: 1, priority };
}

describe('selectNearestLights', () => {
  it('keeps only the nearest `budget` sources to the camera', () => {
    const sources = [src('far', 1000, 0), src('near', 10, 0), src('mid', 100, 0)];
    const picked = selectNearestLights(sources, 0, 0, 2);
    expect(picked.map((s) => s.id)).toEqual(['near', 'mid']);
  });

  it('never drops more sources than the budget allows', () => {
    const sources = Array.from({ length: 5 }, (_, i) => src(`s${i}`, i * 10, 0));
    expect(selectNearestLights(sources, 0, 0, 16)).toHaveLength(5);
  });

  it('a high-priority source always wins a slot over closer, unprioritized ones', () => {
    const sources = [src('close1', 5, 0), src('close2', 6, 0), src('far-but-important', 5000, 0, 5)];
    const picked = selectNearestLights(sources, 0, 0, 2);
    expect(picked.map((s) => s.id)).toContain('far-but-important');
  });

  it('returns an empty array for no sources', () => {
    expect(selectNearestLights([], 0, 0, 8)).toEqual([]);
  });
});
