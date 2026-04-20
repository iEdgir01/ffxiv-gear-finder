# FFXIV Gear Finder

A browser-based tool for Final Fantasy XIV. Import a character from the Lodestone, then browse craftable and vendor gear ranked by stats for your current job levels.

**Live:** https://ffxiv-gear-finder.netlify.app

## Features

- Import any character via Lodestone ID or name search
- Filter gear by job, slot, equip level band, and source (craft, GC seals, tomestones, scrips)
- Sort by best overall stats or a specific stat (Craftsmanship, Critical Hit, etc.)
- Upgrades tab: compare your current gearset against the best available items per slot
- Shopping lists with Teamcraft export

## Stack

Plain HTML + CSS + ES modules — no bundler, no backend, no build step. Data is sourced from:

- [XIVAPI](https://xivapi.com) — character and item lookups
- [Garland Tools](https://www.garlandtools.org) — acquisition metadata (cached 7 days in `localStorage`)
- Datamined CSVs from [xivapi/ffxiv-datamining](https://github.com/xivapi/ffxiv-datamining) — GC seal and special vendor data (refreshed weekly via CI)

## Development

```bash
npm test        # run the test suite (Node 22+, no dependencies required)
```

Open `index.html` directly in a browser or serve it with any static server.

## CI

GitHub Actions runs `npm test` on every push and PR. A weekly workflow refreshes the datamined vendor data and commits any changes automatically.
