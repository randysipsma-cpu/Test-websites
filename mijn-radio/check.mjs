// Run: node mijn-radio/check.mjs (Node 20+). No dependencies.
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.ok(scripts.length,'Inline app script exists');
for(const [,js] of scripts)new Script(js,{filename:'mijn-radio/index.html'});
const ids=new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(x=>x[1]));
const used=new Set([...html.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]));
for(const id of used)assert.ok(ids.has(id),'Missing DOM element: '+id);
for(const id of ['homeGoHome','homeGoFavorites','homeGoDiscover','homeGoHistory','stations','audio','play','miniPlay','settingsDialog','settingsGeneral','settingsSpotify','settingsDiagnostics','backupExport','backupImport','backupFile'])assert.ok(ids.has(id),'Required UI element missing: '+id);
for(const signature of ['function selectStation(','function render()','function setTab(','function persist()','function updateMediaInfo()','function refreshAlbumArt()','function updateMini()'])assert.ok(html.includes(signature),'Required feature missing: '+signature);
assert.ok(html.includes("localStorage.setItem(KEY,JSON.stringify(saved))"),'Favorites persistence missing');
assert.ok(html.includes("if(tab==='discover'&&!catalog.length)loadCatalog()"),'Discover loading missing');
console.log('Mijn Radio: syntax, UI references, favorites, discover and playback wiring checks passed.');

await import('./metadata-adapters.test.mjs');

await import('./metadata-engine.test.mjs');

await import('./metadata-playlists.test.mjs');

await import('./metadata-hls.test.mjs');

await import('./metadata-ogg.test.mjs');

await import('./metadata-station-api.test.mjs');

await import('./metadata-memory.test.mjs');

await import('./metadata-icy.test.mjs');

for(const [,id] of html.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g))assert.ok(ids.has(id),'Missing direct DOM reference: '+id);
for(const id of ['proTheme','proAccent','proFolder','proFolderAdd','proConnection','proMusicSummary','proStatsPeriod','proAnalytics','proDiagRefresh'])assert.ok(ids.has(id),'Professional UI missing: '+id);
assert.match(html,/const STATS_KEY=['"]mijn-radio-stats-v1['"]/);
const backupKeys=html.match(/const BACKUP_KEYS=\[([^\]]+)\]/)?.[1]||'';
for(const key of ['mijn-radio-pro-folders-v1','mijn-radio-pro-appearance-v1','mijn-radio-stats-v1'])assert.ok(backupKeys.includes(key),'Backup missing '+key);
assert.ok(html.includes("state:x.state||''"),'Regional station data missing');
assert.ok(html.includes("Object.prototype.hasOwnProperty.call(data.preferences,key)"),'Legacy backup compatibility missing');
console.log('Professional Edition: DOM references, analytics persistence, regional data and backup wiring passed.');
