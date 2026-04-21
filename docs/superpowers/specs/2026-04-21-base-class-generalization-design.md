# Base Class Generalization Design

**Date:** 2026-04-21
**Branch:** wip/job-progression-tabs
**Status:** Approved

## Problem

The current codebase handles Arcanist (ARCA, id 41) and Rogue (ROG, id 42) as hardcoded special cases throughout `constants.js`, `search.js`, `gearsets.js`, and `main.js`. All other FFXIV base classes (Gladiator, Pugilist, Marauder, Lancer, Archer, Conjurer, Thaumaturge) have no support at all. The system must be generalized so that all 9 base classes are handled identically through a data-driven approach — no hardcoded per-class checks anywhere.

## Requirements

1. All 9 FFXIV base classes are fully supported: GLA, PGL, MRD, LNC, ARC, CNJ, THM, ARCA, ROG.
2. Base-class tabs appear in the **Upgrades tab** when a Teamcraft gearset exists for that class.
3. Base-class entries appear in the **Gear Finder sidebar** only when an explicit Teamcraft gearset for that class is synced.
4. When no gearsets are synced at all, the sidebar shows **all jobs including all base classes** so anonymous users can manually pick a job, enter a level, and get gear results.
5. If a job appears in the sidebar but has no gearset, the Upgrades tab shows: *"No gearset found on Teamcraft — please sync this gearset to see available upgrades."*
6. No hardcoded per-class checks (`isArcana`, `isRogue`, etc.) anywhere in the codebase. All base-class behavior is driven by the `promotedJobIds` field.

## Design

### Data model (`constants.js`)

Add `promotedJobIds: number[]` to base-class entries in `JOB_IDS`. Promoted-job IDs are the `JOB_IDS` IDs of the jobs this class promotes into. Regular jobs have no `promotedJobIds` field.

```js
// Existing — add promotedJobIds
41: { abbr: 'ARCA', name: 'Arcanist',   group: 'dom', promotedJobIds: [26] },    // → SMN only (not SCH)
42: { abbr: 'ROG',  name: 'Rogue',      group: 'dow', promotedJobIds: [28] },    // → NIN

// New synthetic IDs (continuing from 42)
43: { abbr: 'GLA',  name: 'Gladiator',  group: 'dow', promotedJobIds: [19] },    // → PLD
44: { abbr: 'PGL',  name: 'Pugilist',   group: 'dow', promotedJobIds: [20] },    // → MNK
45: { abbr: 'MRD',  name: 'Marauder',   group: 'dow', promotedJobIds: [21] },    // → WAR
46: { abbr: 'LNC',  name: 'Lancer',     group: 'dow', promotedJobIds: [22] },    // → DRG
47: { abbr: 'ARC',  name: 'Archer',     group: 'dow', promotedJobIds: [23] },    // → BRD
48: { abbr: 'CNJ',  name: 'Conjurer',   group: 'dom', promotedJobIds: [24] },    // → WHM
49: { abbr: 'THM',  name: 'Thaumaturge',group: 'dom', promotedJobIds: [25] },    // → BLM
```

**ARCA→SMN only (not SCH):** Arcanist uses Casting gear (Intelligence path). Scholar-only gear (Healing path) must not match. Existing tests confirm this behavior and must be preserved.

**Other additions to `constants.js`:**
- `DOW_JOB_IDS`: add 42 (ROG), 43, 44, 45, 46, 47
- `DOM_JOB_IDS`: add 41 (ARCA), 48, 49
- `COMBAT_JOB_IDS`: derived from `[...DOW_JOB_IDS, ...DOM_JOB_IDS]` — no manual change needed
- `PRIMARY_STAT_BY_JOB`: add entries 41–49 using same stat as promoted job
- `CLASSJOB_NAME_TO_ID`: add all base-class name variants (e.g. `Gladiator: 43`, `Pugilist: 44`, etc.)
- `CLASSJOB_CATEGORY_TO_JOBS`: add single-abbr entries for each new class (`'Gladiator': ['GLA']`, etc.) and update `'Disciple of War'` / `'Disciple of Magic'` and `'All Classes'` lists
- Export `isBaseClass(jobId)` helper: `!!JOB_IDS[jobId]?.promotedJobIds`

### Equip category filtering (`search.js`)

Remove `isArcana` and `isRogue` hardcoded checks. Replace with:

```js
const promoted = JOB_IDS[jobId]?.promotedJobIds;
if (promoted?.length) {
  // Base class: can equip anything any promoted job can equip
  return promoted.some(pid => jobCanEquipCategory(pid, categoryName));
}
```

This handles all base classes uniformly. The recursive call re-enters `jobCanEquipCategory` with the promoted job ID, so all existing category-matching logic applies without duplication.

### Gearset name resolution (`gearsets.js`)

Remove hardcoded name checks in `resolveDisplayJobId`. Replace with a data-driven table built from `JOB_IDS` at module init time:

```js
const BASE_CLASS_NAME_TO_ID = {};
for (const [idStr, info] of Object.entries(JOB_IDS)) {
  if (!info.promotedJobIds) continue;
  BASE_CLASS_NAME_TO_ID[info.name.toLowerCase()] = Number(idStr);
  BASE_CLASS_NAME_TO_ID[info.abbr.toLowerCase()] = Number(idStr);
}
// + manual variants: 'arcanist' → 41, 'acn' → 41, etc.
```

`resolveDisplayJobId` iterates `BASE_CLASS_NAME_TO_ID` using `name.includes(key)` match, returning the base-class ID if found. Falls back to parsed `jobId` otherwise.

Remove the hardcoded `warrior`, `summoner`, `scholar`, `ninja` overrides — `resolveGearsetJobId` already handles those correctly.

### Level synthesis (`main.js`)

Replace `withArcanaJob` with `withBaseClassJobLevels`. Loops over all `JOB_IDS` entries where `promotedJobIds` exists, synthesizing level as `max(existing base-class level, ...promoted job levels)`:

```js
function withBaseClassJobLevels(jobs) {
  const out = { ...jobs };
  for (const [idStr, info] of Object.entries(JOB_IDS)) {
    if (!info.promotedJobIds) continue;
    const id = Number(idStr);
    const existing = Number(out[id]?.level ?? 0);
    const promoted = Math.max(...info.promotedJobIds.map(pid => Number(out[pid]?.level ?? 0)));
    const lv = Math.max(existing, promoted);
    if (lv > 0) out[id] = { level: lv };
  }
  return out;
}
```

Replace all `withArcanaJob(...)` call sites with `withBaseClassJobLevels(...)`.

### Sidebar job display (`main.js`)

The sidebar job list currently shows all jobs with levels from character data. Behavior change:

- **No gearsets synced:** show all jobs (all `JOB_IDS` entries including all base classes) so anonymous/unlinked users can manually pick any job and enter a level
- **Gearsets synced:** show all Lodestone jobs + only base-class jobs that have an entry in `gearsetsByJob`; base classes without a gearset are hidden

### Upgrades tab — no-gearset state (`ui.js`)

When `renderUpgradePage` is called for a job that exists in the sidebar but has no gearset entry in `gearsetsByJob`, render:

> *"No gearset found on Teamcraft for [JOB]. Please sync a [JOB] gearset on Teamcraft to see available upgrades."*

This applies to both base-class jobs and regular jobs (e.g. BRD selected but no BRD gearset).

### Upgrade tab job tabs (`main.js` / `ui.js`)

`buildUpgradeTabs` builds tabs from two sources:
1. All gearset entries in `gearsetsByJob` (these always show upgrade results)
2. All Lodestone jobs that have a level but no gearset entry (these show the no-gearset message when selected)

Base-class jobs are never in category 2 — they only appear in the sidebar when a gearset exists, so they are always in category 1.

### Tests

- `tests/constants.test.js`: update counts; add coverage for all 9 base classes in `DOW_JOB_IDS`/`DOM_JOB_IDS`; verify `isBaseClass` helper
- `tests/search.test.js`: add equip-category tests for GLA→PLD, CNJ→WHM, THM→BLM etc.; remove ARCA/ROG-specific test structure in favour of parameterized per-class tests
- `tests/gearsets.test.js`: add name resolution tests for all 9 base-class name variants
- `tests/main.test.js` (new or existing): `withBaseClassJobLevels` synthesis for each class

## Files Changed

| File | Change |
|---|---|
| `js/constants.js` | Add IDs 43–49; add `promotedJobIds` to 41/42; update all derived lists; export `isBaseClass` |
| `js/search.js` | Replace `isArcana`/`isRogue` with generic `promotedJobIds` delegation |
| `js/gearsets.js` | Replace hardcoded `resolveDisplayJobId` with data-driven table; remove warrior/summoner/scholar/ninja overrides |
| `js/main.js` | Rename `withArcanaJob` → `withBaseClassJobLevels`; update sidebar job list logic; update `buildUpgradeTabs` |
| `js/ui.js` | Add no-gearset message state to `renderUpgradePage` |
| `tests/constants.test.js` | Update counts and add base-class coverage |
| `tests/search.test.js` | Parameterized base-class equip tests |
| `tests/gearsets.test.js` | Name resolution tests for all 9 classes |
