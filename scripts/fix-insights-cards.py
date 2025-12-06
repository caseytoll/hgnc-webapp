#!/usr/bin/env python3
import io
import os

root = os.path.dirname(os.path.dirname(__file__))
index_html = os.path.join(root, 'index.html')

print('Fixing insights menu cards in', index_html)

with io.open(index_html, 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = '<!-- Team Performance Dashboard Button (inlined via server-side data URL) -->'
end_marker = '<!-- TEAM PERFORMANCE DASHBOARD SUB-VIEW -->'

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Could not find expected start/end markers. Aborting.')
    raise SystemExit(1)

# Keep text up to the comment, then insert the clean cards, then append from the sub-view marker
prefix = text[:start_idx]
suffix = text[end_idx:]

replacement = '''<!-- Team Performance Button (clean) -->
          <div class="insights-menu-card" onclick="showView('insights-team-performance-view')" tabindex="0" role="button" aria-label="View team performance dashboard" data-team-icon="<?!= teamPerformanceIconDataUrl || '/assets/team-performance-icon.png' ?>">
            <div class="insights-menu-card-content">
              <h3 class="insights-menu-card-title">Team Performance</h3>
            </div>
          </div>

          <!-- Offensive Leaders Button (clean) -->
          <div class="insights-menu-card" onclick="showView('insights-offensive-leaders-view')" tabindex="0" role="button" aria-label="View offensive leaders" data-offensive-icon="<?!= offensiveLeadersIconDataUrl || '/assets/offensive-leaders-icon.png' ?>">
            <div class="insights-menu-card-content">
              <h3 class="insights-menu-card-title">Offensive Leaders</h3>
            </div>
          </div>

          <!-- Defensive Wall Button (clean) -->
          <div class="insights-menu-card" onclick="showView('insights-defensive-wall-view')" tabindex="0" role="button" aria-label="View defensive wall" data-defensive-icon="<?!= defensiveWallIconDataUrl || '/assets/defensive-wall-icon.png' ?>">
            <div class="insights-menu-card-content">
              <h3 class="insights-menu-card-title">Defensive Wall</h3>
            </div>
          </div>

          <!-- Player Analysis Button (clean) -->
          <div class="insights-menu-card" onclick="showView('insights-player-analysis-view')" tabindex="0" role="button" aria-label="View player analysis" data-pa-icon="<?!= playerAnalysisIconDataUrl || '/assets/player-analysis-icon.webp' ?>">
            <div class="insights-menu-card-content">
              <h3 class="insights-menu-card-title">Player Analysis</h3>
            </div>
          </div>
'''

new_text = prefix + replacement + suffix

# backup
backup = index_html + '.pre-replace4'
with io.open(backup, 'w', encoding='utf-8') as f:
    f.write(text)
print('Backup written to', backup)

with io.open(index_html, 'w', encoding='utf-8') as f:
    f.write(new_text)
print('index.html updated (insights menu cards replaced).')
