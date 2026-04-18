// js/main.js
import { loadData, getItemsInLevelRange, isLoaded, onProgress } from './data.js';
import { searchCharacter, fetchCharacterJobs, extractCharacterIdFromUrl, fetchItemStats } from './api.js';
import { getGroupAverage, getLevelRange, filterItems, sortByStat } from './search.js';
import { DOH_JOB_IDS, DOL_JOB_IDS, COMBAT_JOB_IDS } from './constants.js';
import * as ui from './ui.js';

const state = {
  jobs: {},
  charName: null,
  activeGroup: 'doh',
  activeCombatJobId: null,
  activeStat: null,
  activeGearType: null,
  statsCache: {},
};

async function runSearch() {
  if (!isLoaded()) {
    ui.renderEmptyState('Loading recipe data...', 'Please wait a moment.');
    return;
  }

  const jobIds = state.activeGroup === 'doh' ? DOH_JOB_IDS
               : state.activeGroup === 'dol' ? DOL_JOB_IDS
               : state.activeCombatJobId ? [state.activeCombatJobId] : [];

  const avg = getGroupAverage(state.jobs, jobIds);
  const { min, max } = getLevelRange(avg);
  ui.renderLevelDisplay(state.activeGroup, avg, min, max);

  let items = getItemsInLevelRange(min, max);

  const uncachedIds = items.map(i => i.id).filter(id => !state.statsCache[id]);
  if (uncachedIds.length > 0) {
    try {
      const fetched = await fetchItemStats(uncachedIds);
      Object.assign(state.statsCache, fetched);
    } catch {
      // Non-fatal: items render without stats
    }
  }

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
  ui.renderResultsHeader(sorted.length, state.activeStat, state.activeGearType, state.activeGroup, avg);
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
    ui.showImportStatus('success', 'Imported ' + name);
    ui.showCharInfo(name, server);
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
    ui.showImportStatus('success', 'Imported ' + name);
    ui.showCharInfo(name, server);
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

  ui.initGroupPills(state.activeGroup, group => {
    state.activeGroup = group;
    const isCombat = group === 'combat';
    ui.showCombatJobSelect(isCombat);
    if (isCombat && !state.activeCombatJobId) {
      state.activeCombatJobId = ui.initCombatJobSelect(state.jobs, id => {
        state.activeCombatJobId = id;
        runSearch();
      });
    }
    state.activeStat = null;
    ui.renderStatPills(group, null, stat => { state.activeStat = stat; runSearch(); });
    runSearch();
  });

  ui.showCombatJobSelect(false);
  ui.renderStatPills('doh', null, stat => { state.activeStat = stat; runSearch(); });
  ui.renderGearTypePills(null, type => { state.activeGearType = type; runSearch(); });
  ui.renderLevelDisplay('doh', 1, 1, 6);
}

async function init() {
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
