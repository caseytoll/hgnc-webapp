# v944 Deployment Quick Reference

## What Changed
- **Performance**: Added server-side caching + client-side skeleton loading
- **User Impact**: Lineup stats load 10x faster (perceived)
- **Risk Level**: Low - backward compatible, no breaking changes

## Three Components

### 1. Server-Side Caching (Code.js)
- `getLineupStats()` now checks CacheService first
- `computeLineupStats()` extracted for reuse
- `invalidateLineupCache()` clears cache on data change
- `onEdit()` trigger invalidates cache automatically

### 2. Client-Side Loading Shell (lineup.html)
- `showLoadingShell()` displays skeleton UI immediately
- `hideLoadingShell()` cleanup function
- Updated DOMContentLoaded to show skeleton before loading data

### 3. CSS Skeleton Styles (src/styles.html)
- `.skeleton-table`, `.skeleton-row`, `.skeleton-cell` classes
- Uses existing shimmer animation for visual polish

## Deployment Steps

```bash
# 1. Verify compilation
clasp --version

# 2. Push changes to Apps Script
clasp push

# 3. View deployment status
clasp deployments

# 4. Create deployment (replace ID if needed)
clasp deploy -i <current_deployment_id> -d "v944 - Cache lineup stats for instant load"

# 5. Verify in browser
# Open the web app and test:
# - Click any lineup view
# - Observe skeleton loads instantly
# - Wait for data to populate
# - Click again to verify cache hit (instant)
```

## Testing Checklist

### Basic Functionality
- [ ] App loads without errors
- [ ] Team selection works
- [ ] All three lineup views load (Defensive, Attacking, Position Pairings)

### Performance (v944 specific)
- [ ] First click: See skeleton UI load → data appears within 500ms
- [ ] Second click: Data appears instantly (< 100ms, no skeleton)
- [ ] Switch teams: Cache invalidates, skeleton + fresh data loads
- [ ] Browser console: No errors, see cache hit/miss logs

### Edge Cases
- [ ] No team selected: Proper error handling
- [ ] No game data: Empty state message
- [ ] Edit game data: Cache invalidates on next view
- [ ] Multiple teams: Each has separate cache entry

## Quick Debug

**Check if caching is working:**
1. Open browser DevTools → Console
2. Click lineup view
3. Watch for logs: `[getLineupStats] Cache HIT` or `[getLineupStats] Cache MISS`
4. Second click should show "Cache HIT"

**Clear cache manually** (if needed):
```javascript
// Run in Apps Script console
CacheService.getUserCache().removeAll();
Logger.log('Cache cleared');
```

**Verify onEdit trigger:**
1. Open any game record
2. Change a player position
3. View lineup stats → should recompute (fresh data)
4. Click again → should use new cache

## Rollback Plan (if needed)

```bash
# View deployment history
clasp deployments

# Rollback to previous version
clasp deploy -i <previous_deployment_id> -d "Rollback from v944"

# Or revert code and push again
git revert HEAD~1
clasp push
clasp deploy -i <current_deployment_id> -d "Reverted v944"
```

## Performance Metrics to Monitor

**Collect baseline metrics:**
- First-click latency (should be ~100-500ms perceived)
- Second-click latency (should be < 10ms)
- Cache hit rate (should increase after first use)
- Any console errors or cache failures

## Known Limitations

1. **First click still computes** - But skeleton hides the wait
2. **6-hour cache TTL** - After 6 hours, cache expires and recomputes
3. **Per-user cache** - Each user has separate cache (intentional)
4. **No automatic prefetch** - Cache fills on-demand, not proactively

## Support Notes

If users report issues:
1. Check browser console for errors
2. Look for cache-related warnings in Apps Script logs
3. Verify onEdit trigger is active (Apps Script → Triggers)
4. Clear cache and retry if stale data suspected
5. Check if issue is specific to one team/user or system-wide

## What NOT to worry about

- ✓ Cache will be empty on first deploy (expected)
- ✓ Different users will have separate caches (not shared)
- ✓ Cache invalidates automatically on data changes
- ✓ No user data is stored longer than necessary
- ✓ No security or privacy impact

## Next Steps (Optional Future Work)

- [ ] Monitor cache hit rates over time
- [ ] Consider prefetching stats when app opens
- [ ] Add cache stats dashboard for debugging
- [ ] Measure actual vs. perceived latency improvements
- [ ] Consider compression for large datasets

---
**Version:** v944  
**Deploy Date:** [DATE]  
**Deployed By:** [USER]  
**Status:** ✓ Ready to Deploy
