// Generate pinned, key-free map styles from downloaded MapTiler style JSON.
// Usage: node tools/navigation/build-map-detail-styles.cjs <sanitized-input-directory>
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const input = process.argv[2];
if (!input) throw new Error('Provide a directory containing key-free upstream style JSON');
const out = path.resolve('public/map-styles/navigation');
fs.mkdirSync(out, { recursive: true });
const read = id => JSON.parse(fs.readFileSync(path.join(input, id + '.json'), 'utf8'));
const streets = read('streets-v4');
const geographic = new Set(['Island labels','Archipelago labels','Place labels','Village labels','Town labels','City labels','Capital city labels','State labels z9','State labels z7','State labels z2','Country labels','Disputed country labels','Ferry labels','Ferry terminal','Road labels','Pathway labels','Military label']);
const name = ['coalesce', ['get','name:ko'], ['get','name'], ['get','name:en'], ''];
function label(layer, dark) {
  const l = structuredClone(layer);
  l.layout ??= {};
  for (const key of Object.keys(l.layout)) if (key.startsWith('icon-')) delete l.layout[key];
  for (const key of Object.keys(l.paint ?? {})) if (key.startsWith('icon-')) delete l.paint[key];
  if (/name/.test(JSON.stringify(l.layout['text-field']))) l.layout['text-field'] = name;
  l.layout['text-font'] = ['Noto Sans Regular'];
  l.layout['text-pitch-alignment'] = 'viewport';
  l.layout['text-rotation-alignment'] = ['line','line-center'].includes(l.layout['symbol-placement']) ? 'viewport-glyph' : 'viewport';
  l.layout['text-letter-spacing'] = 0;
  l.layout['text-transform'] = 'none';
  l.layout['text-allow-overlap'] = false;
  l.layout['text-ignore-placement'] = false;
  l.paint = { ...l.paint, 'text-color': dark ? '#edf8ff' : '#15394a', 'text-halo-color': dark ? '#061924' : '#ffffff', 'text-halo-width': 1.5, 'text-halo-blur': 0.5 };
  if (l.id === 'Island labels') {
    delete l.maxzoom;
    l.layout['text-size'] = ['interpolate',['linear'],['zoom'],5,11,10,13,15,16];
    l.paint['text-opacity'] = 1;
    // Keep all provider-ranked islands/islets at detail zoom instead of suppressing rank 13/14.
  }
  if (l.id === 'Ferry terminal') { l.minzoom = 12; l.paint['text-opacity'] = 1; }
  return l;
}
const common = streets.layers.filter(l => geographic.has(l.id) || l['source-layer']?.includes('border') || l['source-layer'] === 'ferry');
const manifest = { version: 1, capturedAt: '2026-10-31', provider: 'MapTiler / OpenStreetMap', sourceStyleHashes: {}, styles: {} };
for (const id of ['streets-v4','ocean-v4','ocean-v4-dark','hybrid-v4']) manifest.sourceStyleHashes[id] = crypto.createHash('sha256').update(JSON.stringify(read(id))).digest('hex');
for (const [choice, id] of [['ocean','ocean-v4'],['night','ocean-v4-dark'],['satellite','hybrid-v4']]) {
  const upstream = read(id), dark = choice !== 'ocean';
  // Ocean keeps bathymetry, coastlines, water labels and depth labels. Satellite retains its imagery/roads/water labels.
  const base = upstream.layers.filter(l => !geographic.has(l.id) && !l['source-layer']?.includes('border') && l['source-layer'] !== 'ferry' && l['source-layer'] !== 'ferry_label');
  const extras = common.map(l => ({...structuredClone(l), source:'maptiler_planet_v4'}));
  for (const sl of ['country_border','country_border_disputed','sub_border']) extras.push({id:'Marine '+sl, type:'line', source:'maptiler_planet_v4', 'source-layer':sl, minzoom:4, filter:['all',['==',['geometry-type'],'LineString'],['==',['get','maritime'],true]], paint:{'line-color':dark?'#d9a5f5':'#85549d','line-width':sl==='sub_border'?1.2:1.8,'line-opacity':0.85, ...(sl!=='country_border'?{'line-dasharray':[4,2]}:{})}});
  const all = [...base,...extras];
  // Text stays above geographic lines; navigation/GPS/KHOA remain above this entire bundle.
  const layers = [...all.filter(l=>l.type!=='symbol'),...all.filter(l=>l.type==='symbol')].map(l=>l.type==='symbol'?label(l,dark):l);
  for (const l of layers) if (l['source-layer']==='ferry') l.paint={...l.paint,'line-color':dark?'#72e1ff':'#146d9a','line-width':['interpolate',['linear'],['zoom'],6,1.4,14,2.2]};
  const sources = {...upstream.sources,maptiler_planet_v4:streets.sources.maptiler_planet_v4};
  const used = new Set(layers.map(l=>l.source).filter(Boolean));
  for (const id of Object.keys(sources)) if (!used.has(id)) delete sources[id];
  const result = {version:8, name:'Blue Marina '+choice+' Korean marine details', glyphs:'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key={MAPTILER_KEY}', sources, layers};
  const raw=JSON.stringify(result,null,2)+'\n';
  if (/key=(?!\{MAPTILER_KEY\})/.test(raw)) throw new Error('Refusing credential-bearing artifact');
  fs.writeFileSync(path.join(out,choice+'-v1.json'),raw);
  manifest.styles[choice]={upstream:id,layers:layers.length,sources:Object.keys(sources),sha256:crypto.createHash('sha256').update(raw).digest('hex')};
}
fs.writeFileSync(path.join(out,'provenance-v1.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Generated three key-free styles and provenance');
