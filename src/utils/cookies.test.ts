import { describe, test, expect } from 'bun:test';
import { cookies } from './cookies';

describe('cookies persistence tests', () => {
  test('returns default value when running in environment without document or unset cookie', () => {
    const fallback = { activeLeagueId: 'clarity' };
    const val = cookies.get('test_key', fallback);
    expect(val).toEqual(fallback);
  });

  test('safely handles set and remove methods without throwing', () => {
    expect(() => {
      cookies.set('sample_pref', { test: true });
      cookies.remove('sample_pref');
    }).not.toThrow();
  });
});
