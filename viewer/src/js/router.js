export function slugify(s) {
  return (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function resolveTeamParamFromLocation(teams, pathname, searchString) {
  const params = new URLSearchParams(searchString || '');
  let teamParam = params.get('team') || params.get('teamID') || params.get('slug');

  const pathParts = (pathname || '').split('/').filter(Boolean);
  if (!teamParam) {
    const tIndex = pathParts.indexOf('team');
    if (tIndex !== -1 && pathParts.length > tIndex + 1) {
      teamParam = decodeURIComponent(pathParts[tIndex + 1]);
    } else if (pathParts[0] === 'viewer' && pathParts.length > 1) {
      teamParam = decodeURIComponent(pathParts[1]);
    } else if (pathParts[0] === 'teams' && pathParts.length > 1) {
      teamParam = decodeURIComponent(pathParts[1]);
    }
  }

  if (!teamParam) return null;

  // Direct ID match
  let match = teams.find(t => t.teamID === teamParam);
  if (match) return match.teamID;

  // Match by slug property if present
  const target = decodeURIComponent(teamParam).toLowerCase();
  match = teams.find(t => (t.slug && slugify(t.slug) === slugify(target)));
  if (match) return match.teamID;

  // Try slugified teamName
  match = teams.find(t => slugify(t.teamName) === slugify(target));
  return match ? match.teamID : null;
}
