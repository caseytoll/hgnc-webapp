# CHANGELOG

## [Unreleased]
- Fleshed out README.md with comprehensive project overview, setup instructions, and usage guide.

## v767 — 2025-12-06
- Fix: Owner-mode UI determinism: ensure add-player button visible for owners across view switches
- Fix: Call applyOwnerModeUI after showing players-view and fixture-view to guarantee owner buttons appear
- Add: Owner-mode runtime checks in CI workflow on PRs and pushes
- Add: applyOwnerModeUI call in runtime-check.js owner-mode test for extra reliability

## v742 — 2025-12-06
- Fix: Show team edit toggle for owners (Team edit button not visible in some cases)
- Fix: Ladder view: auto-fetch data when cache empty to avoid blank screens
- Fix: Stats page images: sanitize bare base64 tokens (e.g. PHN2Zy) and prefix with proper data: URIs to avoid 404s
- Add: Runtime smoke tests and Puppeteer checks to validate team edit, ladder rendering, and image fallbacks
- Add: Pre-deploy checks to detect bare base64 URIs and url('PHN2Zy') patterns; added pre-commit hook
- Add: Audit script for icon partials and added <noscript> fallback to canonical partials
- Add: Visual regression artifacts and daily runtime smoke CI job

## v741 — 2025-12-05
- Style: Improve Ladder and related tables by adding responsive wrappers, improved spacing, and numeric column alignment
- Style: Highlight top 3 ladder rows with medal tint backgrounds
- Add: Accessibility improvements: captions and role attributes on dynamic tables
- Add: Generic table CSS for consistent table styling across the app

## v730 — 2025-12-05
- Deploy: Efficient deployment to Google Apps Script (clasp) using filePushOrder to push only changed files
- Fix: Ensure Insights dashboard cards display icons even when deployed with missing script-hosted assets; added runtime fallback `ensureInsightsCardImages()` and CSS fallback for player-analysis
- Add: Optimized player analysis assets (WebP, 2x WebP & small PNG), updated `Code.js` to provide server fallback when inline data URIs missing
- Add: `scripts/efficient-deploy.sh` and `scripts/deploy_and_test.sh` for safer deploys and quick runtime sanity checks

## v619 — 2025-11-28
- UI: Align Team Manager heading to the left on teams page


## v618 — 2025-11-28
- v617 - Fixed spreadsheet access for webapps


## v616 — 2025-11-28
- v616 - Fixed spreadsheet access for anonymous users


## v615 — 2025-11-28
- v615 - Fixed empty icon files and added debug logging


## v614 — 2025-11-28
- v614 - Fix redirect with USER_DEPLOYING


## v613 — 2025-11-28
- v613 - Fix 404 error


## v612 — 2025-11-28
- v612 - Fix sharing with USER_ACCESSING


## v611 — 2025-11-28
- v611 - Enable sharing with parents


## v610 — 2025-11-28
- v609 - Temporarily restrict access to owner only to test functionality


## v608 — 2025-11-28
- v608 - Redeploy to ensure USER_DEPLOYING permissions are active


## v607 — 2025-11-28
- v607 - Change execution mode back to USER_DEPLOYING for owner access


## v606 — 2025-11-28
- v606 - Change execution mode to USER_ACCESSING to fix 403 permission error


## v605 — 2025-11-28
- v605 - Fix webapp permissions for public access


## v604 — 2025-11-28
- v604 - Rename Team Performance Dashboard button to Team Performance


## v604 — 2025-11-28
- v604 - Rename "Team Performance Dashboard" button to "Team Performance"


## v603 — 2025-11-28
- v603 - Optimize stats page icon grid for mobile


## v603 — 2025-11-28
- Optimize stats page icon grid: reduce height (400px→320px), increase width (200px→180px), smaller icons (280px→220px) for better mobile fit


## v602 — 2025-11-28
- v602 - Increase stats page icon sizes to 280px


## v602 — 2025-11-28
- Increase stats page icon sizes from 80px to 280px (3.5x larger) and adjust card height for better visibility


## v601 — 2025-11-28
- v601 - Add base64-encoded icon assets for stats page


## v601 — 2025-11-28
- Add base64-encoded icon assets for stats page (team performance, offensive leaders, defensive wall, player analysis)
- Optimize icon file sizes and implement direct data URL embedding
- Add debug logging for icon display troubleshooting


## v600 — 2025-11-28
- Remove debugging to fix app loading


## v599 — 2025-11-28
- Fix syntax error in console.log statements


## v598 — 2025-11-28
- Add debugging to check template replacement


## v597 — 2025-11-28
- Remove debug logging and finalize icon fixes


## v596 — 2025-11-28
- Adjust icon sizing and positioning for better visibility


## v595 — 2025-11-28
- Replace large PNG with smaller SVG for team performance icon


## v594 — 2025-11-28
- Add console logging to debug icon loading issues


## v593 — 2025-11-28
- Fix CSS background property to allow inline background-image styles


## v592 — 2025-11-28
- Update stats page to use new icon template variables


## v591 — 2025-11-28
- Add new icon assets and asset management system


## v590 — 2025-11-28
- Fix team performance dashboard appearing unexpectedly


## v589 — 2025-11-28
- Remove references to non-existent netball-results-view


## v588 — 2025-11-28
- Remove verbose validation logging and remaining debug logs


## v587 — 2025-11-28
- Clean up redundant console logging - remove verbose debug messages


## v586 — 2025-11-28
- Fix teams page navigation - add missing team-selector-view handling in showView function


## v585 — 2025-11-28
- Fix app crash when navigating from stats to teams page by properly hiding insights-player-analysis-view


## v584 — 2025-11-28
- Remove descriptions from stats page buttons to prevent text overlap with images


## v583 — 2025-11-28
- Fix mobile 2x2 grid to fit iPhone 15 Pro screen dimensions


## v582 — 2025-11-28
- Change stats page buttons to 2x2 grid layout


## v581 — 2025-11-28
- Add Player Analysis button to stats page with individual player performance metrics


## v580 — 2025-11-28
- Center stats page buttons on mobile view


## v579 — 2025-11-28
- Add mobile responsive styling to make stats page buttons 33% larger on phones


## v578 — 2025-11-28
- Use high-resolution 2048x2048 source PNG instead of 72x72 version to fix blurriness


## v577 — 2025-11-28
- Fix image blurriness by using fixed 120x120px background-size instead of contain scaling


## v576 — 2025-11-28
- Change to 4:7 ratio buttons (200x280px) with single column layout and image-dominant design


## v575 — 2025-11-28
- Position text beneath image with solid background at bottom of square buttons


## v574 — 2025-11-28
- Change buttons to square shape with text below image and remove image fading


## v573 — 2025-11-28
- Change button background-size to contain and increase height to show entire images


## v572 — 2025-11-28
- Make icon images the background for entire buttons with text overlay


## v571 — 2025-11-28
- Redesign insights menu cards as larger vertical buttons with text above icons


## v570 — 2025-11-28
- Remove duplicate background-image from Team Performance icon to fix layered display


## v569 — 2025-11-28
- Fix truncated base64 data URL in team-performance-icon-code.html


## v568 — 2025-11-28
- Manual redeploy: restore canonical team icon


## v566 — 2025-11-28
- Automated: run-all-scripts sequence


## v565 — 2025-11-28
- Automated: centralize team-performance partial and switch to server-served data URL


## v564 — 2025-11-28
- Quick: centralize team-performance partial and push


## v562 — 2025-11-28
- Embed Team Performance icon inline


## v561 — 2025-11-28
- Update insights menu icons to netball-themed SVGs


## v560 — 2025-11-28
- Fix: defensive checks in renderInsightsOffensiveLeaders to avoid TypeError


## v559 — 2025-11-28
- Make dashboard selection robust and force visibility when rendering stats


## v558 — 2025-11-28
- Revert dashboard selector to previous version for stats page (v553 behavior)


## v557 — 2025-11-28
- Fix dashboard selector to target the visible view's dashboard instead of the first one in DOM


## v556 — 2025-11-28
- Expose renderNewInsightsDashboard, renderInsightsOffensiveLeaders, and renderInsightsDefensiveWall to window object to fix validation errors


## v555 — 2025-11-28
- Add debug logging to validation to see what functions are found


## v554 — 2025-11-28
- Hide insights menu when showing team performance dashboard


## v553 — 2025-11-28
- Revert dashboard selector to original working version


## v552 — 2025-11-28
- Add debug logging to check if dashboard elements are being found and populated


## v551 — 2025-11-28
- Remove debug message that was overwriting HTML structure - dashboard should now render properly


## v550 — 2025-11-28
- Add comprehensive debug logging to identify dashboard element issues


## v549 — 2025-11-28
- Enhanced debug message to test dashboard element detection


## v548 — 2025-11-28
- Add debug message to test if dashboard rendering is working


## v547 — 2025-11-28
- Fix blank Team Performance Dashboard by updating dashboard selector to target specific view


## v546 — 2025-11-28
- Fixed missing script tags in js-validation.html


## v545 — 2025-11-28
- Fixed HTML entities, cleaned up console.log statements, addressed missing img src attribute


## v544 — 2025-11-28

- Testing for issues


## v543 — 2025-11-28
- Added render call for team performance view in showView


## v542 — 2025-11-28
- Changed insights menu buttons to navigate to full page views instead of sub-views


## v541 — 2025-11-28
- Fixed stats page button error by adding null check for netballResults cached element


## v540 — 2025-11-28
- Updated stats page icons to better sports-themed emoji


## v539 — 2025-11-28
- Removed dashboard content from main insights-view to show only menu buttons


## v538 — 2025-11-28
- Remove team performance dashboard from main insights view and update icons to minimal modern style


## v537 — 2025-11-28
- Fix blank stats page by showing insights-view when data is already loaded


## v536 — 2025-11-28
- Fix blank schedule view by showing fixture-view when selected


## v535 — 2025-11-28
- Add debugging logs to fixture view rendering


## v534 — 2025-11-28
- Fix syntax error in showView function and ensure showAddTeamModal is available


## v533 — 2025-11-28
- Fixed null pointer errors in cachedElements and added missing DOM elements for netball views


## v532 — 2025-11-28
- Restructured insights view with top-level menu and sub-views for Team Performance Dashboard, Offensive Leaders, and Defensive Wall


## v531 — 2025-11-24
- Updated dashboard to show average goals for/against cards for singles and pairs instead of individual top performers


## v530 — 2025-11-24
- Add comprehensive player stats view with Total Goals, Goal Average, and Goals Against Average for singles and pairs


## v529 — 2025-11-24
- Add flip card functionality for Top Scorer and Top Defender cards


## v528 — 2025-11-24
- Fix cleanSheets ReferenceError in season highlights


## v527 — 2025-11-24
- Fixed ReferenceError: cleanSheets variable not found in season highlights


## v526 — 2025-11-24
- Changed Clean Sheets card to Top Defender by average goals against per quarter (min 3 quarters in GD/GK)


## v525 — 2025-11-24
- Consolidated team performance dashboard to 12 smaller cards with offensive/defensive/player impact stats, removed redundant scoring metrics


## v524 — 2025-11-24
- Fix renderNewInsightsDashboard to not overwrite calculated stats


## v523 — 2025-11-24
- Add logging to see if window assignment fails


## v522 — 2025-11-24
- Add debugging to see why stats are null


## v521 — 2025-11-24
- Calculate stats if not saved to sheet


## v520 — 2025-11-24
- Add debugging to stats loading


## v519 — 2025-11-24
- Fix insights view to use already loaded data instead of reloading


## v518 — 2025-11-24
- Fix race condition by loading fresh data when selecting team


## v517 — 2025-11-24
- Fix stats saving - ensure stats are saved after calculation in all game update functions


## v516 — 2025-11-24
- Fix insights view to properly populate allTeamData for rendering


## v515 — 2025-11-24
- Load both team data and stats from server in insights view


## v514 — 2025-11-24
- Simplify stats loading - always load directly from Google Sheet


## v513 — 2025-11-24
- Fix stats loading when navigating directly to insights view


## v365.80 — 2025-11-24 @512
- **Store stats on Google Sheet to eliminate race conditions - stats now load synchronously from server**
  - Root cause: Race condition between UI rendering and async stats calculation caused stats page loading issues
  - Solution: Modified server-side functions to store/load stats in Google Sheets (cell B1), updated client-side to save stats on calculation and load synchronously on team selection
  - Result: Stats are now available immediately when loading team data, eliminating the race condition
  - Applied development-principles.md: Persistent data storage and synchronous loading for critical UI components

## v365.79 — 2025-11-24 @511
- **Fixed HTML validation errors, resolved stats loading race condition with async handling, improved error recovery**
  - Root cause: Stats page showed loading issues requiring app restart due to race condition between UI rendering and async cache loading
  - Solution: Implemented proper async stats loading with Promise-based ensureStatsCalculated(), added error handling with fallbacks
  - Result: Stats page loads reliably without requiring app restart
  - Fixed HTML validation errors: removed extra script tag, added missing alt attribute, resolved duplicate IDs
  - Applied development-principles.md: Comprehensive error handling and validation
  - Deployed to consistent URL for continuity

## v365.78 — 2025-11-24 @510
- **Debug iPhone stats loading issue**
  - Added comprehensive debug logging to diagnose why stats show "No Game Data Yet" on iPhone
  - Debug logs for: allTeamData state, localStorage loading, team data loading, stats calculation
  - Will help identify if issue is localStorage, data loading, or stats calculation on mobile Safari

## v365.77 — 2025-11-24 @509
- **Remove debugging magnifying glass icon**
  - Root cause: Storage diagnostics button (🔍) was added for debugging but is no longer needed
  - Solution: Removed button, diagnostics panel, and associated CSS styles
  - Result: Cleaner UI without unused debugging elements

## v365.76 — 2025-11-24 @508
- **Fix excessive API calls: insights refresh should not fetch fresh ladder/results data**
  - Root cause: refreshInsightsData() was calling loadNetballLadderApi() and loadMatchResultsApi() on pull-to-refresh
  - Solution: Removed API calls from refreshInsightsData, now only clears cache and recalculates stats
  - Result: API only called on manual ladder/results refresh or pull-to-refresh on ladder view
  - Applied development-principles.md: Respect user intent for manual-only API calls

## v365.75 — 2025-11-24 @504
- **Fix script loading order causing allTeamData undefined**
  - Root cause: js-startup.html was loaded last, but initializes allTeamData that other scripts depend on
  - Solution: Moved js-startup include to first position in index.html
  - Result: allTeamData is initialized before render functions try to access it
  - Applied development-principles.md: Ensure proper initialization order for dependencies
- **Remove dead code in renderNewInsightsDashboardContent**
  - Root cause: setTimeout calling undefined recalculateAllStats function
  - Solution: Removed unreachable code since main render function already handles stat calculation waiting
  - Result: Cleaner code, no dead setTimeout loops

## v365.74 — 2025-11-24 @503
- **Fix stats stuck on loading by populating allTeamData**
  - Root cause: renderNewInsightsDashboard expects data in allTeamData, but it wasn't being populated when loading from cache
  - Solution: Initialize allTeamData in startup, update it when team data loads, and update stats when loaded from cache
  - Result: Dashboard can access team data and stats properly, preventing "Loading team data..." hang
  - Applied development-principles.md: Ensure data flows correctly between components

## v365.73 — 2025-11-24 @500
- **Improve server data parsing robustness**
  - Root cause: Potential JSON parsing issues when server returns object instead of string
  - Solution: Added type checking and fallback parsing for serverTeamData
  - Result: More robust handling of server responses, prevents parsing errors
  - Applied development-principles.md: Defensive programming

## v365.72 — 2025-11-24 @497
- **Fix undefined variables in onTeamDataLoaded**
  - Root cause: serverGames/serverPlayers variables only defined inside if block but used outside
  - Solution: Moved variable declarations outside the conditional block
  - Result: Fixed "undefined is not an object (evaluating 'serverGames.length')" error
  - Applied development-principles.md: Validate changes before deploy

## v365.71 — 2025-11-24 @495
- **Syntax fix for IndexedDB removal**
  - Root cause: Missing closing brace in loadCachedStatsFromDB function after removing IndexedDB code
  - Solution: Added missing } to properly close the function
  - Result: Fixed "Unexpected end of script" syntax error
  - Applied development-principles.md: Validate changes before deploy

## v365.70 — 2025-11-24 @493
- **Complete IndexedDB removal**
  - Root cause: IndexedDB complexity causing persistent issues with data loading and loops
  - Solution: Removed all IndexedDB references, deleted js-indexeddb.html and check-team-sizes.html, simplified storage to localStorage only
  - Result: Clean codebase with localStorage-only storage, no IndexedDB dependencies
  - Applied development-principles.md: Feature removal > addition, simplicity compounds

## v365.69 — 2025-11-24 @491
- **Stats caching to localStorage**
  - Root cause: Stats cache still trying to use IndexedDB in fallback mode
  - Solution: Modified loadCachedStatsFromDB to fallback to localStorage; save stats to localStorage in updateAllStats
  - Result: Stats caching works with localStorage only, no IndexedDB dependency
  - Applied development-principles.md: Feature removal > addition, simplicity compounds

## v365.68 — 2025-11-24 @490
- **Fix Stats page render loop**
  - Root cause: renderNewInsightsDashboard setTimeout loops when data/stats not ready
  - Solution: Removed setTimeout, rely on updateAllStatsAndRender to trigger render when ready; update allTeamData on data load
  - Result: No more render loops, Stats page loads properly when stats calculated
  - Applied development-principles.md: Error handling default, validate data shapes

## v365.67 — 2025-11-24 @489
- **Aggressive caching and performance optimization**
  - Implemented 5-minute cache freshness check for team data to reduce server calls
  - Modified localStorage to store data with timestamps for cache validation
  - Ensured allTeamData is populated after masterTeamList load to prevent render loops
  - Updated allTeamData.stats after stat calculations for consistency
  - Result: High-performance loading with minimal server requests, stable rendering
  - Applied development-principles.md: Aggressive caching, performance optimization

## v365.66 — 2025-11-24 @488
- **Fix: Infinite render loop due to allTeamData key mismatch**
  - Root cause: localStorage fallback keyed allTeamData by sheetName, but render used teamID
  - Solution: Modified AppStoragePreloadAll fallback to use masterTeamList for teamID keys and load stats separately
  - Result: allTeamData properly keyed by teamID, breaking render loop, data loads correctly
  - Applied development-principles.md: Validate data shapes, error handling default

## v365.65 — 2025-11-24 @487
- **Revert: Disable IndexedDB, use localStorage only**
  - Root cause: IndexedDB complexity causing data loading issues
  - Solution: Modified initDB to always use localStorage fallback for simplicity
  - Result: All storage operations use localStorage, removing IndexedDB sync/preload complexity
  - Applied development-principles.md: Feature removal > addition, simplicity compounds

## v365.64 — 2025-11-24 @486
- **Fix: Stats not loading due to server overriding cached data**
  - Root cause: Server fetch returns empty data, overwriting cached games/players with empty arrays
  - Solution: Modified onTeamDataLoaded to only update from server if server has data (games.length > 0 or players.length > 0)
  - Result: Cached data is preserved when server is empty, stats load from cache
  - Applied development-principles.md: Error handling default, validate data shapes

## v365.63 — 2025-11-24 @485
- **Fix: Games not loading due to teamID mismatch**
  - Root cause: Games/players stored with "data_" prefixed teamID, but teams without prefix
  - Solution: Updated filters in AppStoragePreloadAll to match both teamID formats (exact + "data_" prefix)
  - Result: Games and players now correctly associated with teams in bulk preload
  - Applied development-principles.md: Validate data shapes, debug front-loaded

## v365.58 — 2025-11-24 @455
- **Fix: Comprehensive Error Handling & Logging per Development Principles**
  - Added try-catch blocks to all major functions (AppStoragePreloadAll, syncMasterTeamListToIndexedDB, onTeamListLoaded)
  - Front-loaded debugging with detailed console logging for inputs/outputs
  - Data shape validation at boundaries (Array.isArray checks for teams)
  - Fixed misplaced syncMasterTeamListToIndexedDB function in js-indexeddb.html
  - Enhanced error messages and fallback handling
  - Applied development-principles.md learnings: error handling default, front-load debugging, validate data shapes

## v365.54 — 2025-11-24 @454
- **Performance: Comprehensive Stats Caching System**
  - Hash-based change detection (games + players)
  - Smart cache invalidation on data mutations only
  - IndexedDB persistence (survives page refresh)
  - Cache metrics: hits, misses, invalidations, hit rate
  - Expected performance: 95%+ of calculations eliminated
  - Cache restore: <1ms vs 50-200ms recalculation
  - Console logging: 📊 Cache HIT/MISS indicators
  - Automatic cleanup on data changes
- **Performance: Static-Until-Game Pattern**
  - Recognition that data only changes weekly (after games)
  - Aggressive caching between games
  - Only recalculate when hash changes
  - Memory cache + IndexedDB persistence
  - Cache validated by data hash, not time
  - Instant stats load on view switch
- **Fix: Stats Cache Scope Issue**
  - Fixed calculatedSeasonStats variable collision
  - Now uses window.calculatedSeasonStats as canonical reference
  - Prevents reading empty initialization object
  - Resolves "No Game Data Yet" race condition
- **Feature: Manual Stats Refresh Button**
  - 🔄 refresh button always visible on Stats view
  - Located outside dashboard container (persists through empty states)
  - Spin animation on click
  - Forces cache invalidation and recalculation
  - Clears auto-retry intervals
  - Console logs cache stats on refresh
- **Fix: Insights View Auto-Refresh**
  - Changed showView('insights-view') to call renderNewInsightsDashboard()
  - Fixed initial render using old renderInsights() function
  - Auto-retry now works correctly when data loads
  - View visibility check prevents background refreshes
- **Fix: Null Element Access Protection**
  - Added null checks for avg-ga, defensive-quarters elements
  - Added null checks for impact position stat elements
  - Wrapped renderNewInsightsDashboardContent in try-catch
  - Prevents TypeError during rapid re-renders
  - Consistent pattern: get element, check if exists, then update
- **Development: Updated Principles Documentation**
  - Added "Static-Until-Game Pattern" as #1 principle
  - Documented cache invalidation strategy
  - Added performance impact metrics
  - Updated version to v365.54 @454
  - Current issues and next steps documented

## v365.61 — 2025-11-24 @463
- **Maintenance: In-app Storage Diagnostics**
  - Added owner-only floating storage diagnostics button (🔍)
  - Diagnostics report `indexedDB.databases()`, opened DB version, object store names and per-store counts
  - Diagnostics run in the exact app context to avoid cross-origin store confusion
- **Deploy: Ensure same production URL**
  - Deployed to canonical Production ID to preserve existing app URL and bookmarks
  - Deployment performed with `clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug`
  - Updated client `appVersion` to `365.61` to force client refresh
  - NOTE: Per Development Principles, always deploy with `-i` to preserve the stable URL

## v365.44 — 2025-11-23 @419
- **Feature: PWA Manifest - Add to Home Screen**
  - Full Progressive Web App support with manifest.json
  - Installable on iPhone and Android home screens
  - Custom app icon with "TM" branding in purple gradient
  - Standalone display mode removes browser chrome
  - Theme color matches app design (#6a0dad)
  - App shortcuts: Quick access to Schedule and Stats
  - iOS-specific meta tags for optimal experience
- **Feature: Network Status Indicator**
  - Real-time online/offline detection
  - Connection quality monitoring (4G, 3G, WiFi)
  - Visual banner shows "Offline - Changes saved locally"
  - Automatic sync when connection returns
  - Triple vibration pattern when reconnecting
  - Better support on Android via Network Information API
- **Feature: Geolocation for Game Venues**
  - "📍 Use current location" button in game form
  - GPS coordinates stored with games
  - Reverse geocoding for readable venue names (via OpenStreetMap)
  - High-accuracy positioning with 10s timeout
  - Permission handling with clear error messages
  - Foundation for future "Directions" feature
- **Feature: Enhanced Clipboard API**
  - Rich text formatting for copied content
  - Copy player stats with formatted layout
  - Copy ladder table with aligned columns
  - Fallback for older browsers (execCommand)
  - Success notifications with haptic feedback
  - Exposed: copyPlayerStats(), copyLadderTable()
- **Feature: Fullscreen Mode**
  - Fullscreen toggle button (⛶) in game detail header
  - Removes browser chrome for immersive scoring
  - Works on iPhone, Android, desktop browsers
  - ESC key to exit (standard behavior)
  - Haptic feedback on enter/exit
  - Cross-browser support (webkit, moz, ms prefixes)
- **Feature: Screen Orientation Detection**
  - Detects portrait/landscape mode changes
  - Body classes: .portrait-mode, .landscape-mode
  - Foundation for responsive layout optimizations
  - Listens to modern screen.orientation API
  - Fallback to orientationchange event (legacy)
- **Feature: Install Prompt Banner**
  - Smart PWA install banner at bottom of screen
  - Shows after 3 seconds on first visit
  - Dismissal remembered for 7 days
  - iOS-specific install instructions (Safari share menu)
  - Android-specific install instructions (browser menu)
  - Celebration animation on successful install
  - Auto-hides if app already installed (standalone mode)

## v365.43 — 2025-11-23 @418
- **Feature: Native iPhone haptic feedback**
  - Added vibration feedback on key actions (add/update player, add/update game)
  - Uses navigator.vibrate() API with 50ms duration
  - Graceful fallback for browsers without vibration support
- **Feature: iPhone safe area insets**
  - Added CSS variables for notch and home indicator spacing
  - Header respects safe-area-inset-top
  - Bottom navigation respects safe-area-inset-bottom
  - Prevents content from being obscured by iPhone system UI
- **Feature: Pull-to-refresh gesture**
  - Swipe down from top of page to refresh current view
  - 100px threshold with triple vibration pattern [50,100,50]
  - View-specific refresh logic (insights recalculates stats, others re-render)
  - Only triggers when scrolled to top (scrollY === 0)
- **Feature: Auto dark mode detection**
  - Automatically detects iOS dark mode preference via media queries
  - Manual toggle overrides system setting (stored in localStorage)
  - Live updates when system preference changes
  - Exposed window.toggleDarkMode() for UI controls
- **Feature: Native iOS Share API**
  - Share button (📤) in game detail header
  - Formats game results with quarter-by-quarter breakdown
  - Uses navigator.share() for native iOS share sheet
  - Clipboard fallback for browsers without Share API
- **Feature: Camera input for team photos**
  - Camera button opens device camera directly
  - 2MB file size limit with validation
  - Base64 encoding for localStorage compatibility
  - Live photo preview in team edit modal
- **Feature: HTML validation pre-commit hook**
  - Git hook validates all staged HTML files with tidy-html5
  - Prevents commits with unclosed tags or malformed attributes
  - Lenient settings for Google Apps Script non-standard HTML
  - Setup documented in .githooks/README.md
- **Feature: Lazy-loaded stats calculations**
  - Promise-based ensureStatsCalculated() wrapper
  - Prevents race condition from v365.9 ("No Game Data Yet" false positives)
  - Stats only calculated when insights view accessed
  - All rendering functions wait for stats completion
- **Feature: IndexedDB migration**
  - Complete IndexedDB wrapper with localStorage fallback
  - Database: NetballAppDB v1 with teams/games/players/settings stores
  - Indexed on teamID for efficient queries
  - Auto-migration from localStorage on first load
  - Removes 5MB localStorage limit for teams with extensive game history
  - Promise-based API: AppStorage.init(), saveTeamData(), loadTeamData()

## v365.42 — 2025-11-23 @417
- **Feature: Swipe-to-go-back navigation for mobile**
  - Added navigation history tracking (max 20 views)
  - Implemented right swipe gesture from left edge to go back
  - Works across all views in the app
  - Fallback to team selector if no history available
- **UX: Enhanced mobile navigation**
  - Bottom navigation: Teams | Schedule | Ladder | Stats
  - Game detail navigation: Back | Availability | Lineup | Score
  - Swipe gestures complement existing tap navigation

## v365.41 — 2025-11-23 @416
- **UI: Consistent top buffer across all pages**
  - Added 24px top margin to all view sections for consistent spacing
  - Previously only team selector had top buffer
- **UI: Simplified Create Team button**
  - Changed "Create New Team" button text to "+" symbol
  - Added aria-label for accessibility
  - Streamlined team selector appearance
- **Feature: NFNL season option**
  - Added NFNL as season option in team setup
  - Previously only had "Winter" and "Summer"
- **UI: Restructured team name display**
  - Team name now prominently displayed as primary text
  - Year and season moved to subtitle/note below name
  - Clearer visual hierarchy in team list
- **Fix: Schedule sort order**
  - Reversed schedule sorting to show most recent games first
  - Previously showed oldest games at top
- **Fix: Quarter breakdown data display**
  - Fixed quarter-by-quarter stats showing no data
  - Verified data structure alignment with rendering code

## v365.40 — 2025-11-23 @413
- **UI: Modern team selector redesign**
  - Added 24px top margin to separate card from header
  - Added gradient purple background
  - Team icons display initials in circular badges
  - Modern gradient buttons with smooth tap animations
  - Larger, cleaner cards

## v365.39 — 2025-11-23 @412
- **UI: Collapsible insights sections**
  - Simplified overwhelming stats page with accordion sections
  - Team Performance Dashboard stays visible
  - All other sections collapsible (Quarter Performance, Leaders, Defense, Lineup, Impact, Analysis)
  - Added localStorage persistence for section states
  - Summary badges show key stats when sections collapsed

## v365.38 — 2025-11-23 @411
- **Fix: Delete game functionality**
  - Fixed executeDeleteGame() to check appState.currentGame.editingId
  - Previously only used global editingGameId which wasn't synced

## v365.37 — 2025-11-23 @410
- **Fix: Navigation null errors**
  - Removed references to deleted navigation buttons
  - Cleaned up show-players-tab and show-netball-results-tab references in showView() and cacheCommonElements()

## v365.36 — 2025-11-23 @409
- **Fix: Logo display with client-side pattern**
  - Switched from server-side template tags to client-side JSON injection
  - Logo data injected via server-data script tag
  - Parsed into window.LOGO_DATA_URL for use across app

## v365.33 — 2025-11-23 @406
- **Fix: Logo display**
  - Fixed regex pattern in getLogoDataUrl() to properly extract full base64 data URL
  - Changed from `/data:image\/[^"]+/` to `/data:image[^\s]*/` to capture entire base64 string
  - Added error handling to return fallback placeholder if match fails

## v365.32 — 2025-11-23 @405
- **Fix: Page title override**
  - Removed JavaScript code that was overwriting page title to "Offensive Analysis Hub"
  - Page now correctly displays "Team Manager" title

## v365.31 — 2025-11-23 @404
- **UI: Remove debug button**
  - Removed DBG toggle button from bottom left of screen
  - Cleaned up debug-related code

## v365.30 — 2025-11-23 @403
- **UI: Modern iPhone navigation redesign**
  - Changed "Home" to "Teams"
  - Consolidated main navigation to 4 buttons: Teams | Schedule | Ladder | Stats
  - Removed Players and Results buttons (redundant with other views)
  - Game detail navigation: Back | Availability | Lineup | Score
  - Modern text-only design with uppercase labels and gradient active states
  - Removed emoji icons for cleaner professional look
  - Increased touch targets to 56px for better mobile usability

## v365.29 — 2025-11-23 @401
- **Feature: Logo implementation**
  - Created server-side getLogoDataUrl() function to load base64 logo from file
  - Renamed "base image code.js" to "base image code.html" to avoid clasp syntax validation
  - Updated index.html and js-navigation.html to use logo function in headers
  - Logo displayed on all relevant pages

## v365.28 — 2025-11-23 @399
- **Fix: Force checkbox appearance**
  - Added appearance: checkbox to restore native checkbox rendering
  - Added max-width/max-height constraints
  - Changed to inline-block display
  - Added explicit border and background

## v365.27 — 2025-11-23 @398
- **Debug: Add logging to availability rendering**
  - Added console logs to diagnose checkbox rendering issue
  - Logs game data, players, and generated HTML

## v365.26 — 2025-11-23 @397
- **Fix: Availability checkboxes not visible**
  - Added explicit CSS to force checkboxes to display
  - Set width/height with !important, added min-width/min-height
  - Added cursor pointer, flex-shrink 0, and visibility overrides

## v365.25 — 2025-11-23 @396
- **Fix: Close flipped cards when navigating**
  - Added logic to close all flipped cards when changing views
  - Prevents flip cards from blocking interactions on other screens

## v365.24 — 2025-11-23 @395
- **Fix: Goal detail views stuck on screen**
  - Added player-goals-detail-view and pair-goals-detail-view to showView hide logic
  - Views now properly hidden when navigating to other screens

## v365.23 — 2025-11-23 @394
- **Fix: Flip card sizing and layout**
  - Increased flipped card width from 420px to 500px
  - Changed overflow from auto to visible
  - Added min-height: 400px for better content display
  - Increased padding to 24px for better spacing
  - Removed scrolling - content now fully visible

## v365.22 — 2025-11-23 @393
- **Fix: Flip card content overflow**
  - Changed overflow from hidden to overflow-y: auto
  - Added max-height: 85vh to allow scrolling
  - Content now visible and scrollable within flip cards

## v365.21 — 2025-11-23 @392
- **Debug: Add error handling and logging to flip cards**
  - Added console logging when populating game details
  - Added error handling for missing game data
  - Shows error message if data not found
  - Will help identify why content isn't rendering

## v365.20 — 2025-11-23 @391
- **Fix: Flip card styling refinements**
  - Added overflow: hidden to card back to properly contain content
  - Reduced padding from 24px/20px to uniform 20px
  - Removed margin-top from mini-grid (handled by parent spacing)
  - Removed margin-bottom from detail title for tighter layout
  - Increased mini-grid gap from 10px to 12px for better spacing
  - All content now properly contained within card boundaries

## v365.19 — 2025-11-23 @390
- **Fix: Flip card back layout**
  - Changed display from flex to block to fix broken layout
  - Added width: 100% to perf-detail-content for proper containment
  - Game header and quarter breakdown now render correctly
  - Fixed text overflow and positioning issues

## v365.18 — 2025-11-23 @389
- **Enhancement: Improved flip card layout and sizing**
  - Added game details header to flipped cards (opponent, result badge, date, score)
  - Increased flipped card width from 380px to 420px for better spacing
  - Increased goal numbers from 18px to 24px for better visibility
  - Added more padding to quarter mini-cards (16px vs 12px)
  - Added border separator between game info and quarter breakdown
  - Pair cards show quarters played and avg/Q in header
  - Much cleaner, more professional appearance

## v365.17 — 2025-11-23 @388
- **Enhancement: Improved flip card readability**
  - Changed card back from transparent purple gradient to solid content background
  - Increased border thickness from 1px to 2px for better definition
  - Changed mini-cards from semi-transparent white to solid background color
  - Better contrast in both light and dark modes
  - Text is now much easier to read on flipped cards

## v365.16 — 2025-11-23 @387
- **Fix: Player and pair goal details now render correctly**
  - Added explicit render function calls after showView
  - showView only switches views but doesn't trigger renders
  - Now calls renderPlayerGoalsDetail() and renderPairGoalsDetail() immediately
  - Data should now appear when clicking player/pair names

## v365.15 — 2025-11-23 @386
- **Debug: Extensive logging for player goals detail**
  - Added console logs for showPlayerGoalsDetail function call
  - Added logs for each game and quarter being checked
  - Added logs for player positions and goal counts
  - This will help identify why data isn't showing

## v365.14 — 2025-11-23 @385
- **Fix: Player goals detail view not showing data**
  - Added missing formatGameDate() helper function
  - Added console logging to debug game data loading
  - Fixed date formatting in player and pair detail views

## v365.13 — 2025-11-23 @384
- **Fix: TypeError in pair goals detail view**
  - Fixed undefined pairKey error when clicking pair names
  - Changed to use item.name instead of non-existent item.pair property
  - Pair detail view now loads correctly

## v365.12 — 2025-11-22 @383
- **Feature: Detailed goal stats for players and pairs in Offensive Hub**
  - Click on any player name in Singles leaderboard to see game-by-game goal breakdown
  - Click on any pair in Pairs leaderboard to see their combined goal stats per game
  - Each game card shows: opponent, date, result, total goals scored
  - Flip any game card to see quarter-by-quarter breakdown with tap animation
  - Player view shows all games where player scored as GS or GA
  - Pair view shows all games where the specific pair played together
  - Back button returns to Offensive Hub
  - Clean, consistent flip card UX matching Team Performance Dashboard style

## v365.11 — 2025-11-22 @382
- **Enhancement: Auto-expand flip cards to fit content**
  - Removed fixed max-height and overflow-y scrolling from flipped cards
  - Cards now automatically expand vertically to show all content
  - Added max-height: 85vh to container to prevent extreme sizes
  - No more scrollbars within flip card details
  - All content visible at once for better readability

## v365.10 — 2025-11-22 @381
- **Fix: TypeError crashes in flip card detail functions**
  - Fixed getBestQuarterDetail() to calculate from quarterDiffs array instead of accessing non-existent .average property
  - Fixed getWorstQuarterDetail() to use same quarterDiffs approach
  - Fixed getQuarterBreakdownDetail() to calculate quarter totals from games array instead of accessing non-existent totalGoals objects
  - Fixed getGoalsForDetail() to calculate quarter totals from game.goalsByQuarter instead of calculatedSeasonStats.totalGoals
  - Fixed getGoalsAgainstDetail() to calculate quarter totals from game.opponentGoalsByQuarter instead of calculatedSeasonStats.totalGoalsAgainst
  - All 13 flip cards now work without TypeError crashes
  - Data structure mismatch resolved: functions now calculate what they need from available game data

## v365.9 — 2025-11-22 @379
- **Fix: Race condition on insights page load**
  - Added check for calculatedSeasonStats before rendering
  - If stats not calculated yet, triggers recalculation automatically
  - Retries render after 100ms to allow stats to populate
  - Prevents "No Game Data Yet" screen when clicking insights quickly
  - Only shows empty state when genuinely no games exist

## v365.8 — 2025-11-22 @378
- **Simplified: Fade transition for performance cards**
  - Replaced complex 3D flip with simple fade in/out transition
  - Front card fades out, back card fades in with scale effect
  - Card expands to center of screen when clicked
  - Smooth 0.3s animation with scale from 0.95 to 1
  - Removed broken rotateY transform causing mirrored text
  - Cleaner, more reliable animation across all browsers
  - Same backdrop and detail styling as before

## v365.7 — 2025-11-22 @377
- **Attempted: Flip animation from original card position** (had issues)
  - Cards were showing mirrored/backwards text
  - Complex 3D transforms not working correctly
  - Replaced in v365.8 with simpler approach

## v365.6 — 2025-11-22 @376
- **Enhancement: Improved flip card detail styling**
  - Increased font sizes (title: 0.85rem, content: 0.9rem)
  - Better spacing on detail rows (8px padding)
  - Added shadow and border-radius to flipped cards
  - Enhanced backdrop with blur effect
  - Improved mini-card styling with borders
  - Max-height 70vh with scroll for long content
  - Increased padding to 20px for better breathing room

## v365.5 — 2025-11-22 @375
- **Fix: Flip card modal positioning and expansion**
  - Changed to fixed positioning centered on screen
  - Card expands to 90vw (max 400px) when flipped
  - Removed max-height constraint for better content display
  - Card floats above backdrop at center of viewport
  - Min-height 200px for consistent flipped card size

## v365.4 — 2025-11-22 @374
- **Enhancement: Zoom and expand animation for flip cards**
  - Flipped cards now scale 1.8x on mobile, 2.2x on wider screens
  - Added smooth zoom-in animation with cubic-bezier easing
  - Dark backdrop overlay (60% opacity) focuses attention on flipped card
  - Only one card can be flipped at a time (auto-closes others)
  - Click backdrop or card again to close
  - Increased back card padding (12px → 14px) and max-height (180px → 200px)
  - More comfortable reading experience for detailed stats

## v365.3 — 2025-11-22 @373
- **Feature: Interactive flip cards for Team Performance Dashboard**
  - Added 13 interactive flip cards with 3D CSS animations
  - Click/tap any metric card to flip and see detailed breakdown
  - Card details include:
    - Record: Last 8 games with W/L/D results
    - Win Rate: Win/Loss/Draw breakdown with percentages
    - Goal Diff: Last 6 games with +/- differentials
    - Form: Last 5 games with opponent and scores
    - Total For/Against: Goals by quarter with percentages
    - Avg For/Against: Top/bottom scoring and defensive games
    - Best/Worst Quarter: Average and total breakdown
    - Highest Score: Full game breakdown with quarters
    - Clean Sheets: List of shutout victories
    - Quarter Breakdown: All 4 quarters with differentials
  - Fixed games data filtering to use correct array access
  - Added keyboard support (Enter/Space) for accessibility
  - Smooth 0.6s rotateY animation with backface-visibility
  - Mobile-optimized with scrollable detail content

## v364 — 2025-11-21 @369
- **Feature: Enhanced Team Performance Dashboard**
  - Added comprehensive 12-metric performance dashboard
  - Metrics: Record, Win Rate, Goal Diff, Form (last 5)
  - Scoring: Total For/Against, Avg For/Against
  - Quarter Analysis: Best/Worst Quarter, Highest Score, Clean Sheets
  - Mobile-first 2x2 grid layout (4 columns on wider screens)
  - Color-coded goal differential (green/red)
  - Moved Generate Season Summary button to bottom of page

## v363 — 2025-11-21 @368
- **Cleanup: Remove RAW/DAP difficulty toggle**
  - Removed difficulty adjustment view toggle from insights page
  - Cleaned up toggle UI, CSS, and JavaScript function
  - Simplified insights header

## v342 — 2025-11-21
- **Fix: Force cache refresh for client-side updates**
  - Updated appVersion to 341 to bust browser cache
  - Ensures users get latest JavaScript updates

## v341 — 2025-11-21
- **Fix: Auto-create Teams sheet columns**
  - Added `ensureTeamsSheetStructure()` function
  - Automatically adds columns G (Ladder API) and H (Results API) if missing
  - Runs on every team list load to ensure compatibility

## v340 — 2025-11-21
- **Debug: Add logging for team API URL loading**
  - Added console logs to `onTeamListLoaded()`
  - Added console logs to `showEditTeamModal()`
  - Helps diagnose API URL persistence issues

## v339 — 2025-11-21
- **Fix: Load API URLs in loadMasterTeamList**
  - Fixed `loadMasterTeamList()` to read columns G and H (ladderApi, resultsApi)
  - Was only reading up to column F, causing URLs to not load
  - Added debug logging throughout team loading process

## v338 — 2025-11-21
- **Fix: Load full team object including API URLs**
  - Fixed `handleSelectTeam()` to load complete team data from masterTeamList
  - Now includes ladderApi and resultsApi in appState.currentTeam
  - Resolves issue where custom APIs weren't used for ladder refresh

## v337 — 2025-11-21
- **Fix: Null safety checks in render functions**
  - Added null checks in `renderQuarterFlow()`
  - Added null checks in `renderSeasonSummary()`
  - Prevents errors when elements don't exist

## v336 — 2025-11-21
- **Feature: MyGameDay HTML parsing support**
  - Added `fetchMyGameDayLadder()` - parses HTML tables for ladder data
  - Added `fetchMyGameDayResults()` - parses HTML for match results
  - Auto-detects MyGameDay URLs (contains 'mygameday.app')
  - Supports Hazel Glen 6 team on MyGameDay platform
  - No JSON API available, uses regex to extract table data

## v335 — 2025-11-21
- **Feature: Per-team API URL configuration**
  - Added "Ladder API URL" field to team settings
  - Added "Results API URL" field to team settings
  - Each team can now have different data sources
  - Supports NetballConnect, MyGameDay, or custom APIs
  - URLs stored in Teams sheet (columns G and H)

## v334 — 2025-11-21
- **Fix: Correct render function names**
  - Fixed `renderGameDetailAvailability` → `renderGameAvailability`
  - Fixed `renderGameDetailScores` → `renderGameDetailScoring`
  - Game detail updates now work correctly

## v333 — 2025-11-21
- **Fix: Add missing updateQuarterValue function**
  - Score stepper buttons (+/-) now work
  - Prevents negative scores
  - Updates total score display after changes

## v332 — 2025-11-21
- **Feature: Game time and court number**
  - Added "Game Time" field to add/edit game modal
  - Added "Court" field to add/edit game modal
  - Time and court display in share lineup view
  - Fields optional and saved with game data

## v331 — 2025-11-21
- **Fix: Function name correction**
  - Fixed `recalculateAllStats` → `updateAllStats`
  - Game updates now trigger stats recalculation correctly

## v330 — 2025-11-21
- **Fix: Add missing game management functions**
  - Added `updateGameCaptain()` - sets captain for a game
  - Added `updatePlayerAvailability()` - toggles player availability
  - Added `updatePlayerPosition()` - updates player position in quarters
  - All game detail interactions now functional

## v329 — 2025-11-21
- **Lineup: UI improvements for suggested lineup**
  - Center-aligned quarter headings with positions
  - Added predicted +/- ratings next to each position
  - Shows historical average performance (green for positive, red for negative)
  - Wider columns (100px) to accommodate ratings

## v328 — 2025-11-21
- **Lineup: Increased bib blocking bonus to 400**
  - Players get +400 bonus for staying in same position as previous quarter
  - Significantly reduces position changes between quarters
  - Helps minimize bib changes during games

## v327 — 2025-11-21
- **Lineup: Fix off quarter counting for unavailable players**
  - Only count players as "Off" if they were available for that game
  - Checks `game.availablePlayerIDs` before counting off quarters
  - More accurate season-long off time tracking
  - Players who weren't available don't get penalized in rotation

## v326 — 2025-11-21
- **Lineup: Increased bib blocking bonus from 50 to 200**
  - Encourages position stability across quarters
  - Reduces unnecessary position changes

## v325 — 2025-11-21
- **Lineup: Massively increased favorite position bonuses**
  - Base favorite position bonus: +150 → +300
  - Post-weak-position reward: +200 → +400
  - Total bonus: +700 (was +350)
  - Should strongly prioritize user-set favorite positions

## v324 — 2025-11-21
- **Fix: Update player button now saves favorite position**
  - Fixed `updatePlayer()` to correctly reference `appState.editing.playerId`
  - Favorite position field now persists when updating existing players

## v323 — 2025-11-21
- **Feature: Favorite Position Field for Players**
  - Added optional "Favorite Position" dropdown to Add/Edit Player modals
  - Options: Auto (best avg +/-), GS, GA, WA, C, WD, GD, GK
  - Lineup algorithm prioritizes favorite position if set
  - Falls back to calculated strongest position (by avg +/-) if not set
  - Saved with player data for persistence

## v322 — 2025-11-21
- **Lineup: Increased strongest position bonuses**
  - Strongest position bonus: +80 → +150
  - Post-weak-position reward: +120 → +200
  - Total bonus after development: +350
  - Helps all players (not just always-on) get rewarded positions

## v321 — 2025-11-21
- **Lineup: Pre-assign always-on player to strongest position in Q3-Q4**
  - Player with most season off time gets development in Q1-Q2
  - Rewarded with strongest position in Q3-Q4 (pre-assigned)
  - Creates progression: weak positions → strong position

## v320 — 2025-11-21
- **Lineup: Lower strongest position threshold from 2 to 1 quarter**
  - Added logging to show each player's strongest position
  - Helps identify best positions for players with limited experience

## v319 — 2025-11-21
- **Lineup: Max 2 quarters in weak positions, reward with strongest**
  - Weak position = <3 quarters historical experience
  - -300 penalty after 2 quarters in weak position
  - +80 bonus for playing strongest position (by avg +/-)
  - +120 extra bonus after playing 1+ weak position quarters
  - Balances development with performance

## v318 — 2025-11-21
- **Lineup: Limit position versatility and compensate weak positions**
  - -200 penalty for playing 3+ different positions in one game
  - +100 bonus for weak position assignments when 3+ experienced players already assigned
  - Prevents spreading weakness across entire court

## v317 — 2025-11-21
- **Critical Fix: Lineup initialization bug**
  - Changed initialization from all "Off" to null
  - Pre-assigned off players explicitly marked
  - Fixed 0 candidates issue - positions now assign correctly

## v316 — 2025-11-21
- **Lineup: Debug logging for candidate count**
  - Added candidateCount tracking to diagnose selection failures

## v315 — 2025-11-21
- **Lineup: Added position assignment loop logging**
  - Shows "Assigning positions to X players" per quarter

## v314 — 2025-11-21
- **Lineup: Debug logging for position assignments**
  - Logs each position assignment with player and score

## v313 — 2025-11-21
- **Lineup: Pre-assign off quarters based on season off time**
  - Phase 1: Pre-assign who sits in which quarters (2 per quarter)
  - Phase 2: Optimize positions for the 7 playing players
  - Player with most season off plays all 4 quarters
  - Remaining 8 players sorted by season off (least to most)
  - Ensures rotation: each sits exactly once, no consecutive quarters

## v312 — 2025-11-21
- **Lineup: Re-added players with 1 off to must-play list**
  - Both always-on player AND players who sat once get +1000 bonus
  - Removed error logging for always-on player not assigned

## v311 — 2025-11-21
- **Lineup: Increased game balance penalty and added bonus for players already off**
  - Game balance penalty: -200 → -500
  - +300 bonus for players who've been off once (to get back on court)

## v310 — 2025-11-21
- **Lineup: Reduced bib blocking bonus (100→50)**
  - Allows game balance penalty to override and rotate players

## v309 — 2025-11-21
- **Lineup: Only always-on player gets must-play, doubled game balance penalty**
  - Removed must-play requirement for players with 1 off
  - Game balance penalty: -100 → -200

## v308 — 2025-11-21
- **Lineup: Debug logging for always-on player selection**
  - Added console logs to diagnose why always-on player still marked as Off

## v307 — 2025-11-21
- **Lineup: Player with most season off time plays all 4 quarters**
  - Identifies player with most totalOffQuarters
  - That player added to must-play list for every quarter
  - Other 8 players rotate through off assignments

## v306 — 2025-11-21
- **Lineup: Fix player rotation with hard constraint**
  - Added +1000 bonus for players who must play this quarter
  - Players who sat once get priority to play remaining quarters

## v305 — 2025-11-21
- **Lineup: Season-long off time balancing**
  - Tracks totalOffQuarters per player across all historical games
  - Dual balancing: -75 penalty for season imbalance, -100 for game imbalance
  - Added season off range display in analytics
  - Player details show both game and season off counts

## v304 — 2025-11-21
- **Lineup: Player-centric layout with bib blocking**
  - Redesigned: players as rows, quarters as columns
  - "Off" displayed in gray italics
  - +100 bonus for keeping same position (minimize bib changes)
  - Analytics: bib changes, off time distribution

## v303 — 2025-11-21
- **Feature: Suggested Lineup Card**
  - Optimization algorithm considering:
    - Team lineup/availability
    - Rotation policy (min 2 quarters per position)
    - Equal court time (game and season)
    - Performance metrics (goals, +/-, pairs)
    - One player per position per quarter
  - Generate and export buttons
  - Initial position-centric view

## v302 — 2025-11-21
- **Fix: +/- Insights rendering**
  - Cleaned up debug logs
  - ES5-compatible renderInsightsPlayerPlusMinus function working

## v296 — 2025-11-21
- **Major Fix: Full API data now cached and displayed**
  - Changed caching from spreadsheet (flattened) to PropertiesService (full JSON)
  - Now caches complete API response with nested objects (venueCourt, team1, team2, etc.)
  - Added `getCachedMatchResults()` function to retrieve full cached data
  - **Court numbers now display**: Shows "NRNC - Court 2" format
  - Venue and date/time displayed on same line with dot separator
  - Updated `loadCachedMatchResultsNoApi()` to use new cache source
  - Spreadsheet archiving still happens for historical tracking


## v295 — 2025-11-21
- Debug: Added server-side logging to inspect full API response structure
- Confirmed API returns venueCourt data but it wasn't being cached


## v294 — 2025-11-21
- **Fix: Removed court display** - API doesn't provide venue/court data in cached results
- Simplified match layout: Team names, date/time, and score only
- Improved date display with dot separator (e.g., "Fri, Nov 22 · 7:30 PM")
- Larger, cleaner score display (1.5em font)
- Removed debug logging


## v293 — 2025-11-21
- Debug: Added logging to check available court data in API response
- Result: Confirmed venueCourt is undefined in cached data


## v292 — 2025-11-21
- **Fix: Corrected Results View Context** - Now shows all division fixtures (not just team's matches)
  - Removed misleading win/loss filter chips (fixtures show entire division)
  - Removed W/L/D badges from round headers
  - Added **court number display** - Shows "Venue - Court Name" (e.g., "PEGS - Court 2")
  - Added **match times** to date display (e.g., "Fri, Nov 22 7:30 PM")
  - Replaced result badges with subtle color-coded borders (green/red/yellow gradients)
  - Added match count badges to round headers (e.g., "8 matches")
  - Simplified header to "Division Fixtures" with round count


## v291 — 2025-11-21
- **Enhanced Results View** - Complete redesign for better readability and navigation
  - Added **collapsible rounds** - click headers to expand/collapse individual rounds
  - Added **"Collapse All/Expand All"** toggle button for quick navigation
  - Added **filter chips** - filter by All Rounds, Wins, Losses, Draws with result counts
  - Added **round badges** showing W/L/D summary (e.g., "2W 1L")
  - Redesigned match cards with:
    - Color-coded left border (green=win, red=loss, yellow=draw)
    - Gradient backgrounds matching result type
    - Improved typography and spacing
    - Match dates (when available)
    - Better mobile responsiveness
  - Smooth animations for expand/collapse transitions
  - Active filter highlighting
  - Hover effects and micro-interactions


## v290 — 2025-11-21
- **FIX: Resolved blank screen bug** - Added 2 missing closing `</div>` tags after insights-view (line 793-794 in index.html)
  - Root cause: `#netball-results-view` was incorrectly nested inside `#insights-view` due to unclosed divs
  - `#insights-view` had `display: none`, causing all child elements to have 0 width/height
  - Verified fix: 140 opening divs now properly matched with 140 closing divs
- Cleanup: Removed all diagnostic console.log statements from renderNetballResults (60+ lines)
- Impact: **Results view now renders correctly** with proper dimensions and visible content


## v285-289 — 2025-11-21
- Debug: Progressive investigation of parent element chain to identify width:0 cascade source
- v289: Added parent element diagnostics - discovered parent is `#insights-view` with `display:none`
- v288: Checked body width (1691px) vs view width (0px) 
- v287: Verified view has width:auto with no constraints
- v286: Confirmed view element has 0x0 dimensions
- v285: Discovered container has 0x0 bounding rect


## v284 — 2025-11-21
- Debug: Add getBoundingClientRect, clientHeight, scrollHeight diagnostics to investigate 0 height issue


## v283 — 2025-11-21
- Fix: Force body min-height: 100vh to prevent height collapse


## v282 — 2025-11-21
- Debug: Check HTML element height and overflow properties


## v281 — 2025-11-21
- Debug: Add line-height, width, and body dimension diagnostics


## v280 — 2025-11-21
- Fix: Add !important to .leaderboard-item flex display to override inline grid styles
- Fix: Comment out grid layout for .leaderboard-item in index.html inline styles


## v279 — 2025-11-21
- Debug: Check font and text rendering properties


## v278 — 2025-11-21
- Debug: Check child element heights and styles


## v277 — 2025-11-21
- Debug: Check section.card element styles


## v276 — 2025-11-21
- Fix: Restore missing card CSS styles (card-subtitle, card-body, card-footer)


## v275 — 2025-11-21
- Debug: Add more detailed CSS diagnostics


## v274 — 2025-11-21
- Debug: Add logging to diagnose blank results screen


## v273 — 2025-11-21
- Fix: Load cached ladder and results data when views are displayed


## v272 — 2025-11-21
- Phase 3: Container queries, advanced animations, scroll effects, tooltips, FAB, accordions, tabs, chips, progressive enhancements


## v271 — 2025-11-21
- Phase 2: Loading skeletons, enhanced cards, toast notifications, empty states, badges, progress bars


## v270 — 2025-11-21
- Phase 1 Design System: Modern tokens, dark mode, micro-interactions, accessibility


## v269 — 2025-11-21
- Performance optimizations: DOM caching, conditional stats updates, debounce utility


## v268 — 2025-11-21
- Clean up debug logging - defensive views working


## v267 — 2025-11-21
- Fix: Keep insights-view visible, hide only dashboard when showing sub-views


## v266 — 2025-11-21
- Debug: Add logging to see view element state


## v265 — 2025-11-21
- Fix defensive views - remove debug code and parent visibility hack


## v264 — 2025-11-21
- Fix: Remove hidden class from parent wrapper DIV


## v263 — 2025-11-21
- Check if main element is hidden


## v262 — 2025-11-21
- Check if body has hidden class applied


## v261 — 2025-11-21
- Move body display fix to start of showInsightsSubView


## v260 — 2025-11-21
- Force body display block to fix hidden content


## v259 — 2025-11-21
- Check parent (body) element dimensions and styles


## v258 — 2025-11-21
- Add obvious test content to defensive view


## v257 — 2025-11-21
- Check view dimensions after rendering content


## v256 — 2025-11-21
- Force view dimensions to make defensive view visible


## v255 — 2025-11-21
- Add computed style and position logging for defensive view


## v254 — 2025-11-21
- Add visual debug styling to defenderContainer


## v253 — 2025-11-21
- Add logging to track render function calls in showInsightsSubView


## v252 — 2025-11-21
- Add logging to confirm view visibility in showInsightsSubView


## v251 — 2025-11-21
- Add detailed logging to track defender rendering


## v250 — 2025-11-21
- Fix const reassignment bug in defensive render functions


## v249 — 2025-11-21
- Add debug logging to defensive render functions


## v248 — 2025-11-21
- Enhanced debug logging for defensive stats calculation

## v247 — 2025-11-21
- Redesigned Defensive Wall section on Insights tab to match Offensive Leaders 2x2 card grid layout
- Made all 8 cards (4 offensive + 4 defensive) clickable with onclick handlers
- Added 20px spacing between all dashboard sections
- Fixed missing closing div tag that caused layout overlap
- Removed orphaned code block causing JavaScript error (isDAP undefined variable)
- Added safety checks in renderInsightsDefense and renderInsightsDefenders to display empty state messages instead of blank screens
- Added debug logging for defensive stats calculation

## v246 — 2025-11-21
- [Internal version - testing fixes]

## v245 — 2025-11-21
- [Internal version - testing fixes]

## v244 — 2025-11-21
- Fix: reserve subtitle spacing to avoid layout jumps when notes show.
- Use `visibility:hidden` (via `.card-subtitle.hidden`) to keep subtitle height consistent across tabs.
- Minor CSS tweak: `.card-subtitle { min-height: 1.25em }` added.
- Committed UI spacing fix and pushed/deployed as v244.

## v243 — 2025-11-21
- Release: v243 - changelog & UI polish
- Updated visible UI labels to `Qtr`/`Qtrs` and finalized leaderboard stacked bracket rows.
- Updated deployment to point the existing webapp URL (`AKfycbwwSgTE...e8og`) to version 243.

**Files changed (high level):**
- `index.html` — server-data injection hardening, UI header labels, owner debug UI placement.
- `js-render.html` — leaderboard header/row markup, ARIA labels, stacked subtext lines, defensive guards.
- `js-core-logic.html` — per-quarter enrichment fixes and mapping clarifications.
- `js-helpers.html` / `styles.html` — small accessibility helpers and CSS grid adjustments.
- `CHANGELOG.md` — new release entry added.

## v242 — 2025-11-21
- Finalized layout polish for leaderboards and insights UI.
- Ensured bracketed quarter info is rendered on its own stacked row.
- Normalized quarter text capitalization to `Qtr`/`Qtrs` across the UI.
- Converted leaderboard header labels to use `Qtrs` where appropriate.
- Added defensive guards in renderers to avoid TypeErrors when stats are missing.
- Deployed live (in-place) to project version 242.

## v241
- Mirrored Singles layout changes to Pairs for parity.
- Added dynamic score header label based on selected sort mode.
- Added aria-labels for pair rows and improved accessibility for leaderboards.
- Fixed data mapping issues to use per-quarter `goals` values for impact calculations.

## v240
- Refactored Offensive Analysis Hub into Singles / Pairs tabbed experience.
- Added Show Top 3 / Show All toggle per tab and persisted state to `localStorage`.
- Introduced 2x2 offensive summary cards with `wireOffenseCard()` wiring to open the hub.
- Wired toast messages to `announce()` for screen-reader politeness.

## v239
- Enriched Singles impact-mode with per-quarter metadata from `calculatedLeaderboardPerQtr`.
- Added header row above leaderboards with rank/player/score columns.
- Implemented a CSS grid for leaderboard rows (rank/player/score) for alignment.
- Began stacking subtext lines (main stat / descriptive label / bracketed Qtrs).

## v238
- Hardened server→client injection by embedding server-data as JSON (`<script id="server-data" type="application/json">`) and parsing defensively.
- Added accessibility helpers: `.sr-only`, polite `#aria-live-region`, `announce()` and `announceAssertive()` helpers.
- Added owner-only floating debug toggle and `DEBUG` badge.

## Notes
- To enable Test Insights for all users, set Script Property `TEST_INSIGHTS_ENABLED` to `true` and optionally set `OWNER_EMAIL`.
- These entries are high-level summaries; if you want file-level details (diffs/commits), I can expand each version with those details.

## v365.65 — 2025-11-24 @468
- **Feature: Automatic masterTeamList sync to IndexedDB**
  - Added function to sync latest masterTeamList to IndexedDB teams store after team list loads
  - Ensures all teams are available for bulk preload and dashboard rendering
  - Runs automatically after each team list update (no manual action required)
- **Fix: Sync logic placement**
  - Moved sync logic into a proper <script> block to ensure execution (not rendered as text)
  - Validated that teams store is populated before bulk preload runs
- **Bulk Preload Reliability**
  - Bulk preload now loads all teams, games, players, and stats at startup
  - Dashboard and stats views use preloaded data, eliminating race conditions
- **Comprehensive Logging**
  - Added detailed logging for all migration, sync, and preload steps
  - Console logs show team sync, preload status, and IndexedDB diagnostics
- **Deployment: Canonical Script URL**
  - All changes pushed and deployed to canonical Apps Script ID
  - URL: AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug
  - Version: v365.65

## v365.66 — 2025-11-24 @469
- **Fix: Sync script placement for masterTeamList auto-sync**
  - Ensured sync logic is inside a <script> block and executes after DOMContentLoaded
  - Final validation of bulk preload and dashboard integration
  - Pushed and deployed to canonical script URL