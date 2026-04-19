// js/main.js
import { loadData, getItemsInLevelRange, isLoaded, onProgress } from './data.js';
import { searchCharacter, fetchCharacterJobs, extractCharacterIdFromUrl, fetchItemStats } from './api.js';
import { getLevelRange, filterItems, sortByStat } from './search.js';
import { JOB_IDS, JOB_IDS_BY_GROUP } from './constants.js';
import * as ui from './ui.js';

const state = {
  jobs:          {},
  charName:      null,
  uid:           null,        // Firebase UID from Teamcraft import; null if Lodestone-only
  activeGroup:   'doh',
  activeJobId:   null,        // single selected job ID for any group
  activeStat:    null,
  activeGearType: null,
  statsCache:    {},
  gearsets:      null,        // Map<jobId, gearset> or null — populated after Teamcraft import
};

let _searchSeq = 0;

async function runSearch() {
  const seq = ++_searchSeq;

  if (!isLoaded()) {
    ui.renderEmptyState('Loading recipe data...', 'Please wait a moment.');
    return;
  }

  const jobId = state.activeJobId;
  if (!jobId) {
    ui.renderEmptyState('Select a job', 'Pick a job from the dropdown to search.');
    return;
  }

  const jobLevel = state.jobs[jobId]?.level ?? 1;
  const { min, max } = getLevelRange(jobLevel);
  const jobAbbr = JOB_IDS[jobId]?.abbr ?? '?';
  ui.renderLevelDisplay(jobAbbr, jobLevel, min, max);

  let items = getItemsInLevelRange(min, max);

  const uncachedIds = items.map(i => i.id).filter(id => !state.statsCache[id]);
  if (uncachedIds.length > 0) {
    try {
      const fetched = await fetchItemStats(uncachedIds);
      Object.assign(state.statsCache, fetched);
    } catch {}
  }

  if (seq !== _searchSeq) return;

  items = items.map(item => ({
    ...item,
    ...(state.statsCache[item.id] ?? {}),
    stats: state.statsCache[item.id]?.stats ?? {},
  }));

  const filtered = filterItems(items, {
    levelMin: min, levelMax: max,
    stat: state.activeStat,
    gearType: state.activeGearType,
  });

  const sorted = sortByStat(filtered, state.activeStat);
  ui.renderResultsHeader(sorted.length, state.activeStat, state.activeGearType, jobAbbr, jobLevel);
  ui.renderResults(sorted, state.activeStat);
}

async function handleImportUrl() {
  const url = document.getElementById('lodestone-url').value.trim();
  try {
    const id = extractCharacterIdFromUrl(url);
    ui.showImportStatus('loading', 'Importing character...');
    const { name, server, jobs } = await fetchCharacterJobs(id);
    state.jobs = jobs;
    state.charName = name;
    state.uid = null;
    ui.showImportStatus('success', 'Imported ' + name);
    ui.showCharInfo(name, server);
    // Re-init the current group's dropdown with updated levels
    const groupIds = JOB_IDS_BY_GROUP[state.activeGroup];
    const defaultJobId = groupIds.find(id => (state.jobs[id]?.level ?? 1) > 1) ?? groupIds[0];
    state.activeJobId = defaultJobId;
    ui.initJobSelect(groupIds, state.jobs, id => { state.activeJobId = id; runSearch(); });
    runSearch();
  } catch (err) {
    ui.showImportStatus('error', err.message);
  }
}

async function handleCharacterSearch() {
  const name = document.getElementById('char-name').value.trim();
  const server = document.getElementById('char-server').value.trim();
  if (!name) { ui.showImportStatus('error', 'Enter a character name.'); return; }
  ui.showImportStatus('loading', 'Searching...');
  try {
    const results = await searchCharacter(name, server);
    ui.renderCharSearchResults(results);
    ui.hideImportStatus();
  } catch (err) {
    ui.showImportStatus('error', err.message);
  }
}

async function handleImportById(id) {
  ui.showImportStatus('loading', 'Importing character...');
  try {
    const { name, server, jobs } = await fetchCharacterJobs(id);
    state.jobs = jobs;
    state.charName = name;
    state.uid = null;
    ui.showImportStatus('success', 'Imported ' + name);
    ui.showCharInfo(name, server);
    // Re-init the current group's dropdown with updated levels
    const groupIds = JOB_IDS_BY_GROUP[state.activeGroup];
    const defaultJobId = groupIds.find(id => (state.jobs[id]?.level ?? 1) > 1) ?? groupIds[0];
    state.activeJobId = defaultJobId;
    ui.initJobSelect(groupIds, state.jobs, id => { state.activeJobId = id; runSearch(); });
    runSearch();
  } catch (err) {
    ui.showImportStatus('error', err.message);
  }
}

function initSidebar() {
  ui.initImportTabs();

  document.getElementById('btn-import-url').addEventListener('click', handleImportUrl);
  document.getElementById('btn-search-char').addEventListener('click', handleCharacterSearch);
  document.addEventListener('import-character-id', e => handleImportById(e.detail.id));
  ui.initServerDropdowns();

  ui.initGroupPills(state.activeGroup, group => {
    state.activeGroup = group;
    state.activeStat = null;
    const groupIds = JOB_IDS_BY_GROUP[group];
    const defaultJobId = groupIds.find(id => (state.jobs[id]?.level ?? 1) > 1) ?? groupIds[0];
    state.activeJobId = defaultJobId;
    ui.initJobSelect(groupIds, state.jobs, id => {
      state.activeJobId = id;
      runSearch();
    });
    ui.showJobSelect(true);
    ui.renderStatPills(group, null, stat => { state.activeStat = stat; runSearch(); });
    runSearch();
  });

  // Initialise DoH group as default
  const initialIds = JOB_IDS_BY_GROUP['doh'];
  state.activeJobId = initialIds[0];
  ui.initJobSelect(initialIds, state.jobs, id => {
    state.activeJobId = id;
    runSearch();
  });
  ui.showJobSelect(true);
  ui.renderStatPills('doh', null, stat => { state.activeStat = stat; runSearch(); });
  ui.renderGearTypePills(null, type => { state.activeGearType = type; runSearch(); });
  ui.renderLevelDisplay('CRP', 1, 1, 1);
}

function refreshUpgradePage() {
  ui.renderUpgradePage([], JOB_IDS[state.activeJobId]?.abbr ?? '?', true);
}

async function init() {
  document.querySelectorAll('.main-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.main-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const panel = tab.dataset.panel;
      document.getElementById('finder-panel').hidden = panel !== 'finder';
      document.getElementById('upgrade-panel').hidden = panel !== 'upgrade';
      if (panel === 'upgrade') refreshUpgradePage();
    });
  });

  document.getElementById('btn-open-lists').addEventListener('click', () => {
    document.getElementById('list-panel').hidden = false;
  });
  document.getElementById('btn-close-lists').addEventListener('click', () => {
    document.getElementById('list-panel').hidden = true;
  });

  initSidebar();
  ui.renderEmptyState(
    'Import your character',
    'Use the sidebar to import from Lodestone, then select a stat to search.'
  );

  onProgress(msg => {
    if (msg === 'Ready') {
      ui.showDataLoadingBar(false);
    } else if (msg.startsWith('error:')) {
      ui.showDataLoadingBar(false);
      const errMsg = msg.slice(6);
      const grid = document.getElementById('results-grid');
      grid.textContent = '';
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const title = document.createElement('span');
      title.className = 'empty-title';
      title.textContent = 'Failed to load recipe data';
      const detail = document.createTextNode(errMsg);
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn-primary';
      retryBtn.style.cssText = 'width:auto;padding:8px 20px;margin-top:12px';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', () => loadData());
      empty.appendChild(title);
      empty.appendChild(document.createElement('br'));
      empty.appendChild(detail);
      empty.appendChild(document.createElement('br'));
      empty.appendChild(retryBtn);
      grid.appendChild(empty);
      document.getElementById('results-header').textContent = '';
    } else {
      ui.showDataLoadingBar(true);
    }
  });

  await loadData();
}

init();
