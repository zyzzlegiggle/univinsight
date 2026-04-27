'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MarketHeadline } from '@/lib/api';
import { useTheme } from 'next-themes';

interface MapContainerProps {
  markets: MarketHeadline[];
  onMarketClick: (market: MarketHeadline, coords: [number, number]) => void;
  selectedMarketId: string | null;
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// ─── Helpers ─────────────────────────────────────────
function fmtVol(val?: number) {
  const n = Number(val || 0);
  if (!n) return '$0';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function fmtCountdown(d?: string) {
  if (!d) return 'N/A';
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? days + 'd ' + hrs + 'h' : hrs + 'h';
}

function getPopupHTML(p: any): string {
  const vol = p.volume ? fmtVol(Number(p.volume)) : '$0';
  return `
    <div style="padding:12px;max-width:280px;font-family:Inter,sans-serif;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <img src="/polymarket-icon.png" style="height:12px;width:auto;object-fit:contain;border-radius:3px;" alt="Polymarket" />
        <span style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">VOL ${vol}</span>
      </div>
      ${p.image && p.image !== 'null' ? `<img src="${p.image}" style="width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:6px" />` : ''}
      <div style="font-size:13px;font-weight:600;color:#1e293b;line-height:1.4;margin-bottom:6px">${p.title}</div>
      <div style="display:flex;height:4px;border-radius:2px;overflow:hidden;margin-bottom:8px">
        <div style="width:${p.probability || 0}%;background:#22c55e;height:100%"></div>
        <div style="width:${100 - (p.probability || 0)}%;background:#ef4444;height:100%"></div>
      </div>
      <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
        <span style="padding:2px 5px;border-radius:4px;font-size:9px;font-weight:700;background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.2)">
          ${p.top_outcome || 'Yes'} ${p.probability || 0}%
        </span>
        <span style="padding:2px 5px;border-radius:4px;font-size:9px;font-weight:700;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2)">
          No ${Math.round((100 - (p.probability || 0)) * 10) / 10}%
        </span>
        <span style="padding:2px 5px;border-radius:4px;font-size:9px;font-weight:700;background:rgba(148,163,184,0.1);color:#94a3b8;border:1px solid rgba(148,163,184,0.2)">
          ${fmtCountdown(p.end_date)}
        </span>
        <a href="${p.url}" target="_blank" rel="noopener noreferrer" style="margin-left:auto;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;background:#4f46e5;color:#ffffff;text-decoration:none;display:flex;align-items:center;gap:4px;">
          VIEW →
        </a>
      </div>
    </div>
  `;
}

function greatCircleArc(start: [number, number], end: [number, number], steps = 64) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lng1 = toRad(start[0]), lat1 = toRad(start[1]);
  const lng2 = toRad(end[0]), lat2 = toRad(end[1]);
  const dLat = lat2 - lat1, dLng = lng2 - lng1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const d = 2 * Math.asin(Math.sqrt(a));
  if (d < 1e-10) return [start, end];
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    points.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return points;
}

const GEO_CACHE_KEY = 'univinsight_geo_v3';

async function geocode(query: string) {
  try {
    const resp = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=1&types=place,locality,country,region`
    );
    const data = await resp.json();
    if (data.features?.length > 0) return data.features[0].geometry.coordinates;
  } catch { }
  return null;
}

const STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';
const STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12';

// ─── Component ───────────────────────────────────────
export default function MapContainer({ markets, onMarketClick, selectedMarketId }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const hoverPopup = useRef<mapboxgl.Popup | null>(null);
  const pinnedPopup = useRef<mapboxgl.Popup | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  const marketsRef = useRef(markets);
  marketsRef.current = markets;
  const onMarketClickRef = useRef(onMarketClick);
  onMarketClickRef.current = onMarketClick;

  const lastGeoJsonRef = useRef<any>({ type: 'FeatureCollection', features: [] });
  const currentTheme = resolvedTheme || 'light';
  const themeRef = useRef(currentTheme);
  themeRef.current = currentTheme;
  const lastStyleRef = useRef<string>(currentTheme === 'dark' ? STYLE_DARK : STYLE_LIGHT);

  // ─── Ref-based replay function ───
  const replayLayersRef = useRef<(m: mapboxgl.Map) => void>(() => { });
  replayLayersRef.current = (m: mapboxgl.Map) => {
    try {
      if (m.getLayer('connection-lines')) m.removeLayer('connection-lines');
      if (m.getLayer('market-dots')) m.removeLayer('market-dots');
      if (m.getSource('connections')) m.removeSource('connections');
      if (m.getSource('markets')) m.removeSource('markets');

      m.addSource('markets', { type: 'geojson', data: lastGeoJsonRef.current });
      m.addLayer({
        id: 'market-dots',
        type: 'circle',
        source: 'markets',
        paint: {
          'circle-radius': 6,
          'circle-color': '#3b82f6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      m.addSource('connections', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({
        id: 'connection-lines',
        type: 'line',
        source: 'connections',
        paint: { 'line-color': '#4f46e5', 'line-width': 2, 'line-opacity': 0.7 },
      }, 'market-dots');

      const dark = themeRef.current === 'dark';
      m.setFog({
        color: dark ? 'rgb(15, 23, 42)' : 'rgb(255,255,255)',
        'high-color': dark ? 'rgb(30, 41, 59)' : 'rgb(200,230,255)',
        'horizon-blend': 0.05,
        'space-color': dark ? 'rgb(2, 6, 23)' : 'rgb(240,245,255)',
        'star-intensity': dark ? 0.35 : 0,
      });
    } catch (e) {
      console.warn('[Map] replayLayers error:', e);
    }
  };

  // ─── Initialization ───
  useEffect(() => {
    if (!mounted || !mapContainer.current || map.current) return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: currentTheme === 'dark' ? STYLE_DARK : STYLE_LIGHT,
      center: [0, 20],
      zoom: 2,
      antialias: true,
      projection: { name: 'globe' },
    });
    map.current = m;

    m.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    m.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Create two independent popups
    hoverPopup.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 15 });
    pinnedPopup.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, offset: 15 });

    // Hover listeners
    m.on('mouseenter', 'market-dots', (e) => {
      if (!e.features?.length) return;
      m.getCanvas().style.cursor = 'pointer';
      const p = e.features[0].properties as any;
      const c = (e.features[0].geometry as any).coordinates.slice();
      hoverPopup.current?.setLngLat(c).setHTML(getPopupHTML(p)).addTo(m);
    });

    m.on('mouseleave', 'market-dots', () => {
      m.getCanvas().style.cursor = '';
      hoverPopup.current?.remove();
    });

    // Click dot listener
    m.on('click', 'market-dots', (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const coords = (feature.geometry as any).coordinates as [number, number];
      const props = feature.properties as any;
      const mkt = marketsRef.current.find((mk) => mk.title === props.title);
      if (!mkt) return;

      onMarketClickRef.current(mkt, coords);
      m.flyTo({ center: coords, zoom: 4, duration: 1200 });

      // Persistent pinned popup
      pinnedPopup.current?.setLngLat(coords).setHTML(getPopupHTML(props)).addTo(m);
      // Remove hover popup to avoid overlap
      hoverPopup.current?.remove();

      const data = lastGeoJsonRef.current;
      if (data?.features) {
        const siblings = data.features.filter((f: any) => f.properties.market_id === props.market_id);
        const sibCoords = siblings.map((s: any) => s.geometry.coordinates);
        if (sibCoords.length > 1) {
          const lines = sibCoords.slice(1).map((c2: [number, number]) => ({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: greatCircleArc(sibCoords[0], c2) },
          }));
          const connSrc = m.getSource('connections') as mapboxgl.GeoJSONSource;
          if (connSrc) connSrc.setData({ type: 'FeatureCollection', features: lines as any });
        }
      }
    });

    // Click background listener
    m.on('click', (e) => {
      if (!m.getLayer('market-dots')) return;
      const features = m.queryRenderedFeatures(e.point, { layers: ['market-dots'] });
      if (!features.length) {
        pinnedPopup.current?.remove();
        const connSrc = m.getSource('connections') as mapboxgl.GeoJSONSource;
        if (connSrc) connSrc.setData({ type: 'FeatureCollection', features: [] });
      }
    });

    m.on('load', () => {
      replayLayersRef.current(m);
      setIsReady(true);
    });

    return () => {
      hoverPopup.current?.remove();
      pinnedPopup.current?.remove();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // ─── Theme Effect ───
  useEffect(() => {
    if (!map.current || !isReady) return;
    const m = map.current;
    const style = currentTheme === 'dark' ? STYLE_DARK : STYLE_LIGHT;
    if (lastStyleRef.current === style) {
      replayLayersRef.current(m);
      return;
    }
    lastStyleRef.current = style;
    m.once('style.load', () => replayLayersRef.current(m));
    m.setStyle(style);
  }, [currentTheme, isReady]);

  // ─── Data Effect ───
  useEffect(() => {
    if (!isReady || !map.current) return;
    (async () => {
      const cache: Record<string, [number, number]> = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
      let updated = false;
      const uniqueLocs = new Set<string>();
      markets.forEach(m => (m.locations || []).forEach(l => uniqueLocs.add(l)));
      for (const loc of Array.from(uniqueLocs)) {
        if (!cache[loc]) {
          const coords = await geocode(loc);
          if (coords) { cache[loc] = coords; updated = true; }
        }
      }
      if (updated) localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));

      const features: any[] = [];
      let mktId = 0;
      for (const m of markets) {
        const locs = m.locations || [];
        const coordsList = locs.map(l => cache[l]).filter(Boolean);
        if (!coordsList.length) continue;
        const id = `mkt_${mktId++}`;
        const topOutcome = m.outcomes && m.outcomes.length > 2
          ? m.outcomes.reduce((prev, cur) => prev.probability > cur.probability ? prev : cur).title
          : 'Yes';
        for (const coords of coordsList) {
          const jitter = coordsList.length > 1 ? [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3] : [0, 0];
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [coords[0] + jitter[0], coords[1] + jitter[1]] },
            properties: {
              title: m.title, market_id: id, probability: m.probability,
              volume: m.volume, image: m.image, source: m.source,
              end_date: m.end_date, top_outcome: topOutcome,
              url: m.url,
            },
          });
        }
      }
      const geoJson = { type: 'FeatureCollection', features };
      lastGeoJsonRef.current = geoJson;
      const src = map.current?.getSource('markets') as mapboxgl.GeoJSONSource;
      if (src) src.setData(geoJson as any);
      else if (map.current) replayLayersRef.current(map.current);
    })();
  }, [markets, isReady]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainer} className="w-full h-full" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
    </div>
  );
}
