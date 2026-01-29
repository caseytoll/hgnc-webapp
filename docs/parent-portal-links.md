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

    https://hgnc-gameday-[team-slug].pages.dev/teams/[team-slug]/

Where `[team-slug]` is based on the team’s name, year, and season (all lowercased and hyphenated).

## How It Works
- Links are generated dynamically in the UI using the team’s data.
- No manual configuration is required.
- Archived teams are excluded from the list.

## Sharing
- Use the **Copy** button to copy a link to your clipboard for easy sharing with parents.
- Use the **Open** button to preview the parent portal in a new tab.

## Troubleshooting
- If a link does not work, ensure the team’s name, year, and season are set correctly in the team settings.
- Only active (non-archived) teams are shown in the system list.

---

For further help, contact the project maintainer or see the main README.
