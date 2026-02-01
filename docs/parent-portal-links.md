# Parent Portal Links Integration

## Overview
Parent portal links allow coaches to easily share a read-only view of their team’s information with parents. These links are generated automatically for each team and are accessible from the coach’s site.

## Where to Find Parent Portal Links

### 1. System Settings Page
- Go to the system settings page ("System" or "Settings" in the navigation).
- You will see a section titled **Parent Portal Links**.
- Each team is listed with its unique parent portal link, a copy button, and an open button for convenience.

### 2. Team Settings Page
- Open the settings for any team.
- The **Parent Portal Link** field is displayed, showing the canonical link for that team.
- You can copy the link or open it directly from the modal.

## Link Format
Links are generated using the following format:

    https://hgnc-gameday.pages.dev/teams/[team-slug]

Where `[team-slug]` is based on the team’s name, year, and season using the canonical format: `slugify(teamName) + '-' + year + '-' + slugify(season)`.

## How It Works
- Links are generated dynamically in the UI using the team's canonical slug
- The Parent Portal SPA automatically routes to the correct team page based on the slug
- No manual configuration is required
- Archived teams are excluded from the list
- All teams share the same domain with SPA routing handling team selection

## Sharing
- Use the **Copy** button to copy a link to your clipboard for easy sharing with parents.
- Use the **Open** button to preview the parent portal in a new tab.

## Parent Portal Features

The Parent Portal provides a read-only view with the following features:

### Schedule Tab
- Game list sorted by date (newest first)
- Win/loss/draw color coding on round badges
- Abandoned games show "Abandoned" label
- Tap any game to view details

### Roster Tab
- Player cards showing name, position, and fill-in status
- Tap any player to view their stats modal:
  - Games played, quarters, goals, avg/game
  - Position breakdown with bar chart
  - All games played this season

### Stats Tab
- **Overview:** Hero banner with W-L-D, season metrics, quarter performance, goal scorers
- **Leaders:** Top offensive and defensive players
- **Positions:** Position development tracker grid showing all 7 positions per player
- **Combos:** Attacking and defensive unit combinations

### Game Detail View
- Score card with win/loss badge
- **Lineup tab:** Quarter-by-quarter lineup display
- **Scoring tab:** Accordion view with GS/GA position badges, per-quarter breakdown
- Share buttons for result and lineup images

### Theme
- Dark/light mode toggle in header
- Theme preference saved to localStorage

## Troubleshooting
- If a link does not work, ensure the team's name, year, and season are set correctly in the team settings.
- Only active (non-archived) teams are shown in the system list.

---

For further help, contact the project maintainer or see the main README.
