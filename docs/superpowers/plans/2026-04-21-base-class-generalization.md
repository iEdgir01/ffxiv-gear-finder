# Base Class Generalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize ARCA/ROG base-class handling so all 9 FFXIV base classes (GLA, PGL, MRD, LNC, ARC, CNJ, THM, ARCA, ROG) work identically through a data-driven `promotedJobIds` field — no hardcoded per-class checks.

**Architecture:** Add `promotedJobIds: number[]` to base-class entries in `JOB_IDS`. Every downstream system (equip filtering, level synthesis, name resolution, sidebar display) reads this field. No special cases anywhere.

**Tech Stack:** Vanilla ES Modules (no build step). Node.js test runner (`node --test`). Worktree: `d:/Nextcloud/Dev/ffxiv-gear-finder/.worktrees/job-progression-tabs`, branch `wip/job-progression-tabs`.

**Run tests from worktree root:**
```bash
cd "d:/Nextcloud/Dev/ffxiv-gear-finder/.worktrees/job-progression-tabs"
npm test
```

---

### Task 1: Update `constants.js` data model

**Files:**
- Modify: `js/constants.js`
- Test: `tests/constants.test.js`

- [ ] **Step 1: Write failing tests**

Open `tests/constants.test.js`. Replace/update the following tests:

```js
// Replace the 'DOW + DOM cover all combat jobs' describe block:
describe('DOW + DOM cover all combat jobs', () => {
  it('union of DOW and DOM includes all combat-role jobs', () => {
    const all = new Set([...DOW_JOB_IDS, ...DOM_JOB_IDS]);
    for (const id of [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49]) {
      assert.ok(all.has(id), `job ${id} missing from DOW+DOM`);
    }
    assert.equal(all.size, 31);
  });
});

// Add a new describe block at the end of the file:
describe('isBaseClass', () => {
  it('returns true for all 9 base-class ids', () => {
    for (const id of [41, 42, 43, 44, 45, 46, 47, 48, 49]) {
      assert.ok(isBaseClass(id), `isBaseClass(${id}) should be true`);
    }
  });
  it('returns false for promoted jobs', () => {
    for (const id of [19, 20, 21, 22, 23, 24, 25, 26, 27, 28]) {
      assert.ok(!isBaseClass(id), `isBaseClass(${id}) should be false`);
    }
  });
  it('returns false for DoH/DoL', () => {
    assert.ok(!isBaseClass(8));
    assert.ok(!isBaseClass(16));
  });
});

describe('promotedJobIds', () => {
  it('GLA (43) promotes to PLD (19)', () => assert.deepEqual(JOB_IDS[43].promotedJobIds, [19]));
  it('PGL (44) promotes to MNK (20)', () => assert.deepEqual(JOB_IDS[44].promotedJobIds, [20]));
  it('MRD (45) promotes to WAR (21)', () => assert.deepEqual(JOB_IDS[45].promotedJobIds, [21]));
  it('LNC (46) promotes to DRG (22)', () => assert.deepEqual(JOB_IDS[46].promotedJobIds, [22]));
  it('ARC (47) promotes to BRD (23)', () => assert.deepEqual(JOB_IDS[47].promotedJobIds, [23]));
  it('CNJ (48) promotes to WHM (24)', () => assert.deepEqual(JOB_IDS[48].promotedJobIds, [24]));
  it('THM (49) promotes to BLM (25)', () => assert.deepEqual(JOB_IDS[49].promotedJobIds, [25]));
  it('ARCA (41) promotes to SMN (26) only — not SCH', () => assert.deepEqual(JOB_IDS[41].promotedJobIds, [26]));
  it('ROG (42) promotes to NIN (28)', () => assert.deepEqual(JOB_IDS[42].promotedJobIds, [28]));
  it('PLD (19) has no promotedJobIds', () => assert.equal(JOB_IDS[19].promotedJobIds, undefined));
});

// Also update these two existing tests to new counts:
// 'All Classes maps to all 33 jobs' → change 34 to 42
// 'union of DOW and DOM' → already replaced above
// 'covers all 33 jobs' in PRIMARY_STAT_BY_JOB → no change needed (test uses spread of DOH+DOL+DOW+DOM which will auto-include new ids once added)
```

Also add `isBaseClass` to the import at the top:
```js
import {
  JOB_IDS, DOH_JOB_IDS, DOL_JOB_IDS, DOW_JOB_IDS, DOM_JOB_IDS,
  STATS_BY_GROUP, CLASSJOB_CATEGORY_TO_JOBS, PRIMARY_STAT_BY_JOB,
  isBaseClass,
} from '../js/constants.js';
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test 2>&1 | grep -A 2 "fail\|Error\|isBaseClass\|promotedJobIds"
```

Expected: multiple failures — `isBaseClass is not exported`, `JOB_IDS[43] is undefined`, count mismatches.

- [ ] **Step 3: Update `js/constants.js`**

**3a. Add the 7 new entries and `promotedJobIds` to existing ARCA/ROG in `JOB_IDS`:**

```js
// Replace lines 35-36 (ARCA and ROG entries) and add after them:
  41: { abbr: 'ARCA', name: 'Arcanist',    group: 'dom', promotedJobIds: [26] },
  42: { abbr: 'ROG',  name: 'Rogue',       group: 'dow', promotedJobIds: [28] },
  43: { abbr: 'GLA',  name: 'Gladiator',   group: 'dow', promotedJobIds: [19] },
  44: { abbr: 'PGL',  name: 'Pugilist',    group: 'dow', promotedJobIds: [20] },
  45: { abbr: 'MRD',  name: 'Marauder',    group: 'dow', promotedJobIds: [21] },
  46: { abbr: 'LNC',  name: 'Lancer',      group: 'dow', promotedJobIds: [22] },
  47: { abbr: 'ARC',  name: 'Archer',      group: 'dow', promotedJobIds: [23] },
  48: { abbr: 'CNJ',  name: 'Conjurer',    group: 'dom', promotedJobIds: [24] },
  49: { abbr: 'THM',  name: 'Thaumaturge', group: 'dom', promotedJobIds: [25] },
```

**3b. Update `DOW_JOB_IDS` and `DOM_JOB_IDS`:**

```js
export const DOW_JOB_IDS = [19, 20, 21, 22, 23, 28, 29, 30, 32, 35, 36, 37, 39, 42, 43, 44, 45, 46, 47];
export const DOM_JOB_IDS = [24, 25, 26, 27, 31, 33, 34, 38, 40, 41, 48, 49];
```

**3c. Update `PRIMARY_STAT_BY_JOB` — add the 7 new entries (same stat as promoted job):**

```js
  // Base classes
  43: 'Vitality',    // GLA → PLD
  44: 'Strength',    // PGL → MNK
  45: 'Vitality',    // MRD → WAR
  46: 'Strength',    // LNC → DRG
  47: 'Dexterity',   // ARC → BRD
  48: 'Mind',        // CNJ → WHM
  49: 'Intelligence',// THM → BLM
```

**3d. Update `CLASSJOB_NAME_TO_ID` — add base-class names:**

After the existing `Arcanist: 41, Rogue: 42` lines, add:
```js
  Gladiator: 43, Pugilist: 44, Marauder: 45,
  Lancer: 46, Archer: 47, Conjurer: 48, Thaumaturge: 49,
```

**3e. Update `CLASSJOB_CATEGORY_TO_JOBS`:**

Update `'All Classes'` to include all new abbrs (add after 'ARCA'):
```js
  'All Classes': ['CRP','BSM','ARM','GSM','LTW','WVR','ALC','CUL','MIN','BTN','FSH','PLD','MNK','WAR','DRG','BRD','WHM','BLM','SMN','SCH','NIN','MCH','DRK','AST','SAM','RDM','BLU','GNB','DNC','RPR','SGE','VPR','PCT','ARCA','ROG','GLA','PGL','MRD','LNC','ARC','CNJ','THM'],
```

Update `'Disciple of War'` to include base-class DoW entries:
```js
  'Disciple of War': ['PLD','MNK','WAR','DRG','BRD','NIN','MCH','DRK','SAM','GNB','DNC','RPR','VPR','ROG','GLA','PGL','MRD','LNC','ARC'],
```

Update `'Disciple of Magic'` to include base-class DoM entries:
```js
  'Disciple of Magic': ['WHM','BLM','SMN','SCH','AST','RDM','BLU','SGE','PCT','ARCA','CNJ','THM'],
```

Add single-abbr entries for each new base class (after the `'Arcana': ['ARCA']` line):
```js
  'Gladiator':   ['GLA'],
  'Pugilist':    ['PGL'],
  'Marauder':    ['MRD'],
  'Lancer':      ['LNC'],
  'Archer':      ['ARC'],
  'Conjurer':    ['CNJ'],
  'Thaumaturge': ['THM'],
```

**3f. Export `isBaseClass` helper at the bottom of the file:**

```js
export function isBaseClass(jobId) {
  return !!JOB_IDS[jobId]?.promotedJobIds;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test 2>&1 | grep -E "pass|fail|▶|✓|✗"
```

Expected: all constants tests pass.

- [ ] **Step 5: Commit**

```bash
cd "d:/Nextcloud/Dev/ffxiv-gear-finder/.worktrees/job-progression-tabs"
git add js/constants.js tests/constants.test.js
git commit -m "feat(base-classes): add GLA/PGL/MRD/LNC/ARC/CNJ/THM to JOB_IDS with promotedJobIds"
```

---

### Task 2: Update `search.js` equip filtering

**Files:**
- Modify: `js/search.js`
- Test: `tests/search.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/search.test.js` inside the `'jobCanEquipCategory'` describe block (after the existing Arcana tests):

```js
  // Parameterized base-class delegation tests
  const BASE_CLASS_CASES = [
    { id: 43, abbr: 'GLA', promotedAbbr: 'PLD', promotedId: 19, category: 'Paladin',   spaceList: 'GLA MRD PLD WAR DRK GNB' },
    { id: 44, abbr: 'PGL', promotedAbbr: 'MNK', promotedId: 20, category: 'Monk',      spaceList: 'PGL MNK' },
    { id: 45, abbr: 'MRD', promotedAbbr: 'WAR', promotedId: 21, category: 'Warrior',   spaceList: 'GLA MRD PLD WAR DRK GNB' },
    { id: 46, abbr: 'LNC', promotedAbbr: 'DRG', promotedId: 22, category: 'Dragoon',   spaceList: 'LNC DRG' },
    { id: 47, abbr: 'ARC', promotedAbbr: 'BRD', promotedId: 23, category: 'Bard',      spaceList: 'ARC BRD' },
    { id: 48, abbr: 'CNJ', promotedAbbr: 'WHM', promotedId: 24, category: 'White Mage',spaceList: 'CNJ WHM' },
    { id: 49, abbr: 'THM', promotedAbbr: 'BLM', promotedId: 25, category: 'Black Mage',spaceList: 'THM BLM' },
    { id: 42, abbr: 'ROG', promotedAbbr: 'NIN', promotedId: 28, category: 'Ninja',     spaceList: 'ROG NIN' },
  ];

  for (const { id, abbr, category, spaceList } of BASE_CLASS_CASES) {
    it(`${abbr}: can equip '${category}' category`, () => {
      assert.equal(jobCanEquipCategory(id, category), true, `${abbr} should equip ${category}`);
    });
    it(`${abbr}: can equip space-separated list including promoted job`, () => {
      assert.equal(jobCanEquipCategory(id, spaceList), true, `${abbr} should equip list: ${spaceList}`);
    });
    it(`${abbr}: can equip Disciple of War or Magic`, () => {
      const group = [43,44,45,46,47,42].includes(id) ? 'Disciple of War' : 'Disciple of Magic';
      assert.equal(jobCanEquipCategory(id, group), true, `${abbr} should equip ${group}`);
    });
  }

  it('GLA: cannot equip Scholar-only gear (healer path)', () => {
    assert.equal(jobCanEquipCategory(43, 'Scholar'), false);
  });
  it('CNJ: cannot equip Summoner-only gear (caster path)', () => {
    assert.equal(jobCanEquipCategory(48, 'Summoner'), false);
  });
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test 2>&1 | grep -E "GLA|PGL|MRD|LNC|ARC|CNJ|THM|fail"
```

Expected: all new base-class tests fail (they check `jobCanEquipCategory(43, ...)` etc. which returns false because there's no delegation yet for IDs 43–49).

- [ ] **Step 3: Update `js/search.js`**

**3a. Replace the hardcoded `isArcana`/`isRogue` block in `jobCanEquipCategory`.**

The current function (lines 45–79) has three parallel `if (isArcana) ... if (isRogue) ...` blocks. Replace the entire function body:

```js
export function jobCanEquipCategory(jobId, categoryName) {
  const cat = (categoryName ?? '').trim();
  if (!cat) return false;
  const abbr = JOB_IDS[jobId]?.abbr;
  if (!abbr) return false;

  // Base class: delegate to promoted job(s). Recursive — promoted jobs go through normal path.
  const promoted = JOB_IDS[jobId]?.promotedJobIds;
  if (promoted?.length) {
    return promoted.some(pid => jobCanEquipCategory(pid, cat));
  }

  const allowed = CLASSJOB_CATEGORY_TO_JOBS[cat];
  if (allowed !== undefined) {
    return allowed.includes(abbr);
  }
  const isJobAbbr = Object.values(JOB_IDS).some(j => j.abbr === cat);
  if (isJobAbbr && cat === abbr) return true;
  // Space-separated abbreviation list from datamining (e.g. "GLA MRD PLD WAR DRK GNB")
  const parts = cat.split(/\s+/);
  if (parts.length > 1 && parts.every(p => /^[A-Z]{2,4}$/.test(p))) {
    return parts.includes(abbr);
  }
  return false;
}
```

**3b. Update the `passesJobFilter` function** (lines 14–22) — it has a fast path via `item.classJobAbbrs` that bypasses `jobCanEquipCategory` and needs delegation too:

```js
function passesJobFilter(equipJobId, item) {
  if (equipJobId == null) return true;
  const abbr = JOB_IDS[equipJobId]?.abbr;
  if (!abbr) return false;
  if (Array.isArray(item.classJobAbbrs) && item.classJobAbbrs.length > 0) {
    if (item.classJobAbbrs.includes(abbr)) return true;
    // Base class: check if any promoted job's abbr is in the list
    const promoted = JOB_IDS[equipJobId]?.promotedJobIds;
    if (promoted?.length) {
      return promoted.some(pid => {
        const pAbbr = JOB_IDS[pid]?.abbr;
        return pAbbr != null && item.classJobAbbrs.includes(pAbbr);
      });
    }
    return false;
  }
  return jobCanEquipCategory(equipJobId, item.classJobCategory);
}
```

**Note:** `passesJobFilter` is not exported so it cannot be unit-tested directly. The `jobCanEquipCategory` tests cover the main delegation logic; the `passesJobFilter` change is mechanical.

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test 2>&1 | grep -E "pass|fail|▶|✓|✗"
```

Expected: all tests pass including all new base-class equip tests.

- [ ] **Step 5: Commit**

```bash
git add js/search.js tests/search.test.js
git commit -m "feat(base-classes): generic promotedJobIds delegation in jobCanEquipCategory and passesJobFilter"
```

---

### Task 3: Update `gearsets.js` name resolution

**Files:**
- Modify: `js/gearsets.js`
- Create: `tests/gearsets.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/gearsets.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGearsetJobId } from '../js/gearsets.js';

describe('resolveGearsetJobId', () => {
  // Promoted jobs (unchanged behavior)
  it('resolves "Paladin" to 19', () => assert.equal(resolveGearsetJobId('Paladin'), 19));
  it('resolves "summoner" to 26', () => assert.equal(resolveGearsetJobId('summoner'), 26));
  it('resolves "scholar" to 27', () => assert.equal(resolveGearsetJobId('scholar'), 27));
  it('resolves "ninja" to 28', () => assert.equal(resolveGearsetJobId('ninja'), 28));

  // Base classes — must resolve to their synthetic ids
  it('resolves "Arcanist" to 41', () => assert.equal(resolveGearsetJobId('Arcanist'), 41));
  it('resolves "arcana" to 41', () => assert.equal(resolveGearsetJobId('arcana'), 41));
  it('resolves "Rogue" to 42', () => assert.equal(resolveGearsetJobId('Rogue'), 42));
  it('resolves "Gladiator" to 43', () => assert.equal(resolveGearsetJobId('Gladiator'), 43));
  it('resolves "gladiator" to 43', () => assert.equal(resolveGearsetJobId('gladiator'), 43));
  it('resolves "Pugilist" to 44', () => assert.equal(resolveGearsetJobId('Pugilist'), 44));
  it('resolves "Marauder" to 45', () => assert.equal(resolveGearsetJobId('Marauder'), 45));
  it('resolves "Lancer" to 46', () => assert.equal(resolveGearsetJobId('Lancer'), 46));
  it('resolves "Archer" to 47', () => assert.equal(resolveGearsetJobId('Archer'), 47));
  it('resolves "Conjurer" to 48', () => assert.equal(resolveGearsetJobId('Conjurer'), 48));
  it('resolves "Thaumaturge" to 49', () => assert.equal(resolveGearsetJobId('Thaumaturge'), 49));

  // Unknown input
  it('returns null for unknown string', () => assert.equal(resolveGearsetJobId('Heretic'), null));
});
```

Also add `resolveDisplayJobId` tests. Since it's not exported, test it indirectly via `resolveGearsetJobId` name-path. The base-class names above exercise the same code path used by `resolveDisplayJobId` (via `CLASSJOB_NAME_TO_ID`).

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test 2>&1 | grep -E "Gladiator|Pugilist|Marauder|Lancer|Archer|Conjurer|Thaumaturge|fail"
```

Expected: `resolves "Gladiator" to 43` and all other new base-class tests fail (they currently return null since 43–49 don't exist yet — but after Task 1 they do exist; the test will still fail here if `resolveGearsetJobId` doesn't map the name).

Actually, with `CLASSJOB_NAME_TO_ID` updated in Task 1 to include `Gladiator: 43` etc., `resolveGearsetJobId` already resolves these through the existing name-lookup path. Run tests now to confirm.

- [ ] **Step 3: Update `js/gearsets.js` — replace `resolveDisplayJobId`**

The hardcoded `resolveDisplayJobId` function (lines 65–77) currently hardcodes warrior/summoner/scholar/ninja overrides. Replace it with a data-driven version:

```js
// Built once at module load from JOB_IDS — maps lowercase name/abbr keywords to base-class job id.
const BASE_CLASS_NAME_TO_ID = (() => {
  const m = {};
  for (const [idStr, info] of Object.entries(JOB_IDS)) {
    if (!info.promotedJobIds) continue;
    const id = Number(idStr);
    m[info.name.toLowerCase()] = id;
    m[info.abbr.toLowerCase()] = id;
  }
  // Explicit variants not derivable from JOB_IDS name/abbr
  m['arcanist'] = 41;
  m['acn'] = 41;
  return m;
})();

function resolveDisplayJobId({ jobId, gearsetName }) {
  const name = String(gearsetName ?? '').trim().toLowerCase();
  if (name) {
    for (const [key, id] of Object.entries(BASE_CLASS_NAME_TO_ID)) {
      if (name.includes(key)) return id;
    }
  }
  return jobId;
}
```

Also remove the `normalizeGearsetName` function (lines 55–57) since it's only used by the old `resolveDisplayJobId`.

Also update the `displayNames` table inside `resolveGearsetJobId` (lines 40–52) to add all 7 new base classes (and remove the redundant `arcana: 41` / `arcanist: 41` entries since they're now in `CLASSJOB_NAME_TO_ID`):

```js
  const displayNames = {
    paladin: 19, monk: 20, warrior: 21, dragoon: 22, bard: 23,
    whitemage: 24, blackmage: 25, summoner: 26, scholar: 27,
    ninja: 28, machinist: 29, darkknight: 30, astrologian: 31,
    samurai: 32, redmage: 33, bluemage: 34, gunbreaker: 35,
    dancer: 36, reaper: 37, sage: 38, viper: 39, pictomancer: 40,
    carpenter: 8, blacksmith: 9, armorer: 10, goldsmith: 11,
    leatherworker: 12, weaver: 13, alchemist: 14, culinarian: 15,
    miner: 16, botanist: 17, fisher: 18,
  };
```

(Base class names are now handled by `CLASSJOB_NAME_TO_ID` lookup earlier in the function, so they don't need to be in `displayNames`.)

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test 2>&1 | grep -E "pass|fail|▶|✓|✗"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add js/gearsets.js tests/gearsets.test.js
git commit -m "feat(base-classes): data-driven resolveDisplayJobId for all 9 base classes"
```

---

### Task 4: Update `main.js` — level synthesis

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Replace `withArcanaJob` with `withBaseClassJobLevels`**

Find `withArcanaJob` (lines ~94–105) and replace it with:

```js
function withBaseClassJobLevels(jobs) {
  const src = jobs && typeof jobs === 'object' ? jobs : {};
  const out = { ...src };
  for (const [idStr, info] of Object.entries(JOB_IDS)) {
    if (!info.promotedJobIds) continue;
    const id = Number(idStr);
    const existing = Number(out[id]?.level ?? 0);
    const promoted = Math.max(...info.promotedJobIds.map(pid => Number(out[pid]?.level ?? 0)));
    const lv = Math.max(existing, promoted);
    if (Number.isFinite(lv) && lv > 0) out[id] = { level: lv };
  }
  return out;
}
```

- [ ] **Step 2: Replace all `withArcanaJob(` call sites**

There are 6 call sites in `main.js`. Replace every occurrence of `withArcanaJob(` with `withBaseClassJobLevels(`. Run:

```bash
grep -n "withArcanaJob" js/main.js
```

Confirm 0 results after replacing.

- [ ] **Step 3: Add `isBaseClass` to the `constants.js` import**

At line 21:
```js
import { JOB_IDS, JOB_IDS_BY_GROUP, MAX_EQUIP_LEVEL, isBaseClass } from './constants.js';
```

- [ ] **Step 4: Update `buildUpgradeTabs` to include Lodestone jobs without gearsets**

Current `buildUpgradeTabs` (lines ~1051–1063) only reads from `gearsetsByJob`. Replace it:

```js
function buildUpgradeTabs() {
  const tabs = [];
  const seenJobIds = new Set();

  // Category 1: jobs that have a gearset (always show upgrade results)
  const m = state.gearsetsByJob;
  if (m?.size) {
    for (const [key, entry] of m.entries()) {
      const jobId = Number(entry?.jobId);
      if (!Number.isFinite(jobId) || !JOB_IDS[jobId]) continue;
      const abbr = JOB_IDS[jobId].abbr;
      tabs.push({ key, jobId, abbr, title: entry?.name ?? JOB_IDS[jobId].name, hasGearset: true });
      seenJobIds.add(jobId);
    }
  }

  // Category 2: Lodestone jobs with a level but no gearset (show "no gearset" message)
  // Base-class jobs are excluded — they only appear in sidebar when a gearset exists.
  for (const [idStr, info] of Object.entries(JOB_IDS)) {
    const jobId = Number(idStr);
    if (seenJobIds.has(jobId)) continue;
    if (info.promotedJobIds) continue; // skip base classes
    const lv = state.jobs[jobId]?.level;
    if (!lv || !Number.isFinite(lv)) continue;
    const key = String(jobId) + ':' + info.abbr;
    tabs.push({ key, jobId, abbr: info.abbr, title: info.name, hasGearset: false });
  }

  tabs.sort((a, b) => a.jobId - b.jobId || a.abbr.localeCompare(b.abbr));
  return tabs;
}
```

- [ ] **Step 5: Update `refreshUpgradePage` to pass `hasGearset` through to `renderUpgradePage`**

In `refreshUpgradePage` (search for it; it's around line 1265+), find the part where `gearset` is retrieved from `state.gearsetsByJob`:

```js
const gearset = state.gearsetsByJob.get(key)?.slots ?? null;
if (!gearset || Object.keys(gearset).length === 0) {
  if (seq === _upgradeRefreshSeq) {
    ui.renderUpgradePage([], abbr, 'gearset', handleAddToList, lists.getListedItemIdSet());
  }
  return;
}
```

Replace with:

```js
const activeHasGearset = activeTab?.hasGearset ?? true;
if (!activeHasGearset) {
  if (seq === _upgradeRefreshSeq) {
    ui.renderUpgradePage([], abbr, 'no-gearset', handleAddToList, lists.getListedItemIdSet());
  }
  return;
}
const gearset = state.gearsetsByJob?.get(key)?.slots ?? null;
if (!gearset || Object.keys(gearset).length === 0) {
  if (seq === _upgradeRefreshSeq) {
    ui.renderUpgradePage([], abbr, 'gearset', handleAddToList, lists.getListedItemIdSet());
  }
  return;
}
```

- [ ] **Step 6: Update `initSidebar` to filter base classes when gearsets are loaded**

Find the `initGroupPills` callback in `initSidebar` (around line 1017). Change the line:
```js
const groupIds = JOB_IDS_BY_GROUP[group];
```
to:
```js
const groupIds = getVisibleJobIds(group);
```

Add the `getVisibleJobIds` helper function before `initSidebar`:

```js
function getVisibleJobIds(group) {
  const allIds = JOB_IDS_BY_GROUP[group] ?? [];
  const hasGearsets = state.gearsetsByJob?.size > 0;
  if (!hasGearsets) return allIds;
  return allIds.filter(id => {
    if (!isBaseClass(id)) return true;
    const key = String(id) + ':' + (JOB_IDS[id]?.abbr ?? '');
    return state.gearsetsByJob.has(key);
  });
}
```

Also add a call to re-render the active group's job list after gearsets load. Find `syncUpgradeToolbar()` in `handleRefreshGearsets` (called after gearsets load). After `syncUpgradeToolbar()`, add:

```js
// Re-render sidebar job pills so base-class entries appear/disappear based on gearset presence.
if (state.activeGroup) {
  ui.initJobSelect(
    getVisibleJobIds(state.activeGroup),
    state.jobs,
    jid => {
      state.activeJobId = jid;
      clearSearch();
      refreshLevelDisplaySidebar();
      void runSearch();
    },
    { placeholderFirst: true }
  );
}
```

This same block should also be added after gearsets load in `refreshCharacterJobsOnLoad`.

- [ ] **Step 7: Run tests**

```bash
npm test 2>&1 | grep -E "pass|fail|▶|✓|✗"
```

Expected: all tests pass (main.js logic changes are not unit-tested here; covered by search/constants/gearsets tests and manual verification).

- [ ] **Step 8: Commit**

```bash
git add js/main.js
git commit -m "feat(base-classes): withBaseClassJobLevels, buildUpgradeTabs with no-gearset, sidebar filtering"
```

---

### Task 5: Update `ui.js` — no-gearset empty state

**Files:**
- Modify: `js/ui.js`

- [ ] **Step 1: Add `'no-gearset'` case to `renderUpgradePage`**

Find `renderUpgradePage` in `js/ui.js` (around line 1132). After the existing `'gearset'` empty-state block (around line 1150), add:

```js
  if (emptyMode === 'no-gearset') {
    container.appendChild(el('div', { class: 'empty-state' },
      el('span', { class: 'empty-title' }, 'No gearset for ' + jobAbbr + ' on Teamcraft'),
      'Sync a ' + jobAbbr + ' gearset in the Teamcraft app, then click Refresh gearsets to see available upgrades.'
    ));
    return;
  }
```

Also update the JSDoc comment on `renderUpgradePage` to include the new mode:

```js
/**
 * @param {'profile'|'gearsets'|'gearset'|'no-gearset'|null} emptyMode — null means render the upgrades table
 */
```

- [ ] **Step 2: Run tests**

```bash
npm test 2>&1 | grep -E "pass|fail|▶|✓|✗"
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add js/ui.js
git commit -m "feat(base-classes): no-gearset empty state in renderUpgradePage"
```

---

### Task 6: Full test suite verification and cleanup

**Files:**
- Modify: `tests/constants.test.js` (fix count for 'All Classes')
- Verify: all files changed

- [ ] **Step 1: Fix `'All Classes'` count in `constants.test.js`**

The test `'All Classes maps to all 33 jobs'` currently asserts `.length === 34`. After adding 8 new abbrs (ROG, GLA, PGL, MRD, LNC, ARC, CNJ, THM) to `'All Classes'`, the count is 42. Update:

```js
  it('All Classes maps to 42 entries', () => {
    assert.equal(CLASSJOB_CATEGORY_TO_JOBS['All Classes'].length, 42);
  });
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests pass. Note the total test count in the output.

- [ ] **Step 3: Verify no `isArcana` or `isRogue` in the codebase**

```bash
grep -r "isArcana\|isRogue\|withArcanaJob" js/ tests/
```

Expected: no output.

- [ ] **Step 4: Verify `sortedGearsetJobIds` dead code is removed**

```bash
grep -n "sortedGearsetJobIds" js/main.js
```

If it still exists as a stub returning `[]`, remove it entirely (it's unused after Task 4's `buildUpgradeTabs` changes).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(base-classes): cleanup dead code, fix All Classes count test"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| All 9 base classes fully supported | Task 1 (data), Task 2 (equip), Task 3 (name resolution) |
| Base-class tabs in Upgrades when gearset exists | Task 4 (buildUpgradeTabs cat 1) |
| Base classes in sidebar only when gearset synced | Task 4 (getVisibleJobIds) |
| All jobs shown when no gearsets | Task 4 (getVisibleJobIds no-gearsets branch) |
| "No gearset" message for jobs without gearset | Task 4 (refreshUpgradePage), Task 5 (renderUpgradePage) |
| No hardcoded per-class checks | Task 2 (search.js), Task 3 (gearsets.js), Task 4 (main.js) |

**Key invariant:** `passesJobFilter` fast-path (`classJobAbbrs`) is fixed in Task 2 step 3b. Without this, base-class jobs would show zero gear results in the Gear Finder because XIVAPI never returns base-class abbrs in `classJobAbbrs`.
