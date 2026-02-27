// Test file for game clock estimation
// Run with: node --loader tsx apps/coach-app/src/js/game-clock.test.js

import { describe, it, expect } from 'vitest';
import { estimateGameClock, formatTimeRemaining, isGameToday } from './game-clock.js';

describe('Game Clock Estimation', () => {
  describe('estimateGameClock', () => {
    it('returns null if no startTime', () => {
      const game = { matchDuration: 40 };
      expect(estimateGameClock(game)).toBeNull();
    });

    it('returns null if no matchDuration', () => {
      const game = { startTime: new Date().toISOString() };
      expect(estimateGameClock(game)).toBeNull();
    });

    it('returns null if game hasn\'t started yet', () => {
      const future = new Date(Date.now() + 3600000); // 1 hour in future
      const game = {
        startTime: future.toISOString(),
        matchDuration: 40
      };
      expect(estimateGameClock(game)).toBeNull();
    });

    it('estimates Q1 correctly at start', () => {
      const now = new Date('2026-02-27T19:00:00Z');
      const game = {
        startTime: '2026-02-27T19:00:00Z',
        matchDuration: 40,
        breakDuration: 1,
        mainBreakDuration: 2
      };
      
      const clock = estimateGameClock(game, now);
      expect(clock).toEqual({
        quarter: 1,
        timeRemaining: 600, // 10 minutes = 600 seconds
        inBreak: false,
        breakType: null,
        matchEnded: false
      });
    });

    it('estimates Q1 mid-quarter', () => {
      const start = new Date('2026-02-27T19:00:00Z');
      const now = new Date('2026-02-27T19:05:00Z'); // 5 min into Q1
      const game = {
        startTime: start.toISOString(),
        matchDuration: 40,
        breakDuration: 1,
        mainBreakDuration: 2
      };
      
      const clock = estimateGameClock(game, now);
      expect(clock.quarter).toBe(1);
      expect(clock.timeRemaining).toBe(300); // 5 minutes = 300 seconds
      expect(clock.inBreak).toBe(false);
    });

    it('estimates quarter break after Q1', () => {
      const start = new Date('2026-02-27T19:00:00Z');
      const now = new Date('2026-02-27T19:10:30Z'); // 10.5 min (30 sec into break)
      const game = {
        startTime: start.toISOString(),
        matchDuration: 40,
        breakDuration: 1,
        mainBreakDuration: 2
      };
      
      const clock = estimateGameClock(game, now);
      expect(clock.quarter).toBe(1);
      expect(clock.inBreak).toBe(true);
      expect(clock.breakType).toBe('Quarter Break');
    });

    it('estimates Q2 start', () => {
      const start = new Date('2026-02-27T19:00:00Z');
      const now = new Date('2026-02-27T19:11:00Z'); // 11 min (Q1 + break done)
      const game = {
        startTime: start.toISOString(),
        matchDuration: 40,
        breakDuration: 1,
        mainBreakDuration: 2
      };
      
      const clock = estimateGameClock(game, now);
      expect(clock.quarter).toBe(2);
      expect(clock.timeRemaining).toBe(600); // Full quarter remaining
      expect(clock.inBreak).toBe(false);
    });

    it('estimates half time break', () => {
      const start = new Date('2026-02-27T19:00:00Z');
      const now = new Date('2026-02-27T19:21:30Z'); // 21.5 min (Q1 + Q2 + 1 break + 0.5 main break)
      const game = {
        startTime: start.toISOString(),
        matchDuration: 40,
        breakDuration: 1,
        mainBreakDuration: 2
      };
      
      const clock = estimateGameClock(game, now);
      expect(clock.quarter).toBe(2);
      expect(clock.inBreak).toBe(true);
      expect(clock.breakType).toBe('Half Time');
    });

    it('estimates Q4 end', () => {
      const start = new Date('2026-02-27T19:00:00Z');
      const now = new Date('2026-02-27T19:44:00Z'); // 44 min (all quarters + breaks)
      const game = {
        startTime: start.toISOString(),
        matchDuration: 40,
        breakDuration: 1,
        mainBreakDuration: 2
      };
      
      const clock = estimateGameClock(game, now);
      expect(clock.quarter).toBe(4);
      expect(clock.timeRemaining).toBe(0);
      expect(clock.matchEnded).toBe(true);
    });

    it('handles missing break durations with defaults', () => {
      const now = new Date('2026-02-27T19:00:00Z');
      const game = {
        startTime: '2026-02-27T19:00:00Z',
        matchDuration: 40
        // No breakDuration or mainBreakDuration
      };
      
      const clock = estimateGameClock(game, now);
      expect(clock).not.toBeNull();
      expect(clock.quarter).toBe(1);
    });
  });

  describe('formatTimeRemaining', () => {
    it('formats 0 seconds', () => {
      expect(formatTimeRemaining(0)).toBe('0:00');
    });

    it('formats seconds only', () => {
      expect(formatTimeRemaining(45)).toBe('0:45');
    });

    it('formats minutes and seconds', () => {
      expect(formatTimeRemaining(125)).toBe('2:05');
    });

    it('formats full quarters', () => {
      expect(formatTimeRemaining(600)).toBe('10:00');
    });

    it('handles negative values', () => {
      expect(formatTimeRemaining(-10)).toBe('0:00');
    });
  });

  describe('isGameToday', () => {
    it('returns false if no date', () => {
      expect(isGameToday({})).toBe(false);
    });

    it('returns true for today\'s date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isGameToday({ date: today })).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      expect(isGameToday({ date: yesterday })).toBe(false);
    });

    it('returns false for tomorrow', () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      expect(isGameToday({ date: tomorrow })).toBe(false);
    });
  });
});
