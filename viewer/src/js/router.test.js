import { describe, it, expect } from 'vitest';
import { resolveTeamParamFromLocation, slugify } from './router.js';

const teams = [
  { teamID: 'team_1', teamName: 'Hazel Glen 6' },
  { teamID: 'team_2', teamName: 'U11 Flames' }
];

describe('router helpers', () => {
  it('slugify produces expected slugs', () => {
    expect(slugify('Hazel Glen 6')).toBe('hazel-glen-6');
    expect(slugify(' U11 Flames ')).toBe('u11-flames');
    expect(slugify('Hello & World')).toBe('hello-world');
  });

  it('resolves team from query param team', () => {
    const id = resolveTeamParamFromLocation(teams, '/', '?team=team_2');
    expect(id).toBe('team_2');
  });

  it('resolves team from slug query param', () => {
    const id = resolveTeamParamFromLocation(teams, '/', '?team=hazel-glen-6');
    expect(id).toBe('team_1');
  });

  it('resolves team from /team/<slug> path', () => {
    const id = resolveTeamParamFromLocation(teams, '/team/hazel-glen-6', '');
    expect(id).toBe('team_1');
  });

  it('resolves team from /viewer/<slug> path', () => {
    const id = resolveTeamParamFromLocation(teams, '/viewer/u11-flames', '');
    expect(id).toBe('team_2');
  });

  it('returns null when not found', () => {
    const id = resolveTeamParamFromLocation(teams, '/', '?team=notfound');
    expect(id).toBeNull();
  });
});
