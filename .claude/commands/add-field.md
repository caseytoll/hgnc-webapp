# Add Team Field

Guided walkthrough for adding a new field to the Team object. This field needs updating in 6+ backend locations and 5+ frontend locations. $ARGUMENTS

## Backend Changes (apps-script/Code.js)

1. **`ensureTeamsSheetStructure()`** — Add column header for the new field
2. **`loadMasterTeamList()`** — Read from the correct row index (0-indexed). Current columns: A(0)=TeamID, B(1)=Year, C(2)=Season, D(3)=TeamName, E(4)=SheetName, F(5)=LadderName, G(6)=LadderApi, H(7)=ResultsApi, I(8)=Archived, J(9)=PlayerCount, K(10)=LastModified, L(11)=PIN, M(12)=PinToken, N(13)=Coach
3. **`getTeams` response** — Include in the `pwaTeams` mapping (handleApiRequest)
4. **`updateTeamSettings()`** — Handle in settings write
5. **`createNewTeam()`** — Include in `appendRow` call (match column order)
6. **`createTeam` API action** — Read from `e.parameter`

## Frontend Changes (apps/coach-app/src/js/app.js)

7. **Initial teams load** (~line 719) — Add default value if needed
8. **Background revalidation `freshTeams` mapping** — Include field with default
9. **Change-detection signature** — Include if field changes should trigger UI refresh
10. **`saveTeamSettings()`** — Read from form, update `state.currentTeam`, `state.currentTeamData` (if applicable), `teamInList`, send to API, AND add to rollback
11. **`openTeamSettings()`** — Add form field to settings modal
12. **`openAddTeamModal()` / `addNewTeam()`** — Add form field and include in API call

## Verification
- Run `npm run test:run` and `cd apps/parent-portal && npm run test:run`
- Build both apps
- Test creating a new team with the field
- Test editing the field in team settings
- Test that background revalidation preserves the field
