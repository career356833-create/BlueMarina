import type { LayerSpecification, SourceSpecification, StyleSpecification } from 'maplibre-gl';
import type { BasemapId } from './basemaps';

export type BasemapBundle = { glyphs: string; sources: Record<string, SourceSpecification>; layers: LayerSpecification[] };
export type BasemapLoader = (choice: BasemapId, key: string, signal: AbortSignal) => Promise<BasemapBundle>;

/** Only checked-in styles and the authorized provider host can receive the browser key. */
export function prepareMapDetailStyle(raw: StyleSpecification, key: string): BasemapBundle {
  if (raw.version !== 8 || !raw.sources || !Array.isArray(raw.layers) || !raw.glyphs || raw.sprite) throw new Error('Invalid map style');
  function url(value: string) {
    if (!value.startsWith('https://api.maptiler.com/') || !value.includes('{MAPTILER_KEY}')) throw new Error('Unapproved map resource');
    return value.replaceAll('{MAPTILER_KEY}',encodeURIComponent(key.trim()));
  }
  const sources = structuredClone(raw.sources);
  for (const source of Object.values(sources)) {
    if (source.type !== 'vector' && source.type !== 'raster' && source.type !== 'raster-dem') throw new Error('Unsupported map source');
    if ('url' in source && source.url) source.url = url(source.url);
    if ('tiles' in source && source.tiles) source.tiles = source.tiles.map(url);
    source.attribution = '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">© MapTiler</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>';
  }
  return {glyphs:url(raw.glyphs),sources,layers:structuredClone(raw.layers)};
}
export const loadMapDetailStyle: BasemapLoader = async (choice,key,signal) => {
  if (!['ocean','satellite','night'].includes(choice)) throw new Error('Invalid background');
  const response = await fetch(`/map-styles/navigation/${choice}-v1.json`,{signal});
  if (!response.ok) throw new Error('Map style unavailable');
  return prepareMapDetailStyle(await response.json(),key);
};
