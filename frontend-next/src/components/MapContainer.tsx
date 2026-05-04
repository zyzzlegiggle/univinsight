'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MarketHeadline, TweetData } from '@/lib/api';
import { SocialHistoryItem } from '@/app/page';
import { useTheme } from 'next-themes';

interface MapContainerProps {
  markets: MarketHeadline[];
  onMarketClick: (market: MarketHeadline, coords: [number, number]) => void;
  selectedMarketId: string | null;
  selectedCoords?: [number, number] | null;
  pingMarketId?: string | null;
  pingLocations?: string[];
  persistentSocialHistory?: SocialHistoryItem[];
  teleportCoords?: [number, number] | null;
  selectedCategory?: string | null;
  socialConnections?: { tweet: TweetData; market: MarketHeadline }[];
  onClearSelection?: () => void;
  selectedTweet?: TweetData | null;
  onTweetClick?: (tweet: TweetData) => void;
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
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const ms = date.getTime() - Date.now();
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
          ${p.top_outcome || (p.outcomes && p.outcomes.length > 0 ? p.outcomes.reduce((prev: any, cur: any) => prev.probability > cur.probability ? prev : cur).title : 'Yes')} ${p.probability || 0}%
        </span>
        <span style="padding:2px 5px;border-radius:4px;font-size:9px;font-weight:700;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2)">
          No ${Math.round((100 - (p.probability || 0)) * 10) / 10}%
        </span>
        ${fmtCountdown(p.end_date) ? `
        <span style="padding:2px 5px;border-radius:4px;font-size:9px;font-weight:700;background:rgba(148,163,184,0.1);color:#94a3b8;border:1px solid rgba(148,163,184,0.2)">
          ${fmtCountdown(p.end_date)}
        </span>
        ` : ''}
        <a href="${p.url}" target="_blank" rel="noopener noreferrer" style="margin-left:auto;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;background:#4f46e5;color:#ffffff;text-decoration:none;display:flex;align-items:center;gap:4px;">
          VIEW →
        </a>
      </div>
  `;
}

function getTweetPopupHTML(p: any) {
  return `
    <div style="padding:16px;min-width:240px;font-family:inherit;position:relative;">
      <div style="position:absolute;top:16px;right:16px;width:16px;height:16px;background:#000;border-radius:4px;display:flex;align-items:center;justify-content:center;padding:3px;">
        <img src="/x-logo.png" style="width:100%;height:100%;" />
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;border-radius:8px;background:#000;display:flex;items-center;justify-content:center;overflow:hidden;">
          <img src="https://unavatar.io/twitter/polymarket" style="width:100%;height:100%;object-fit:cover;" />
        </div>
        <div>
          <div style="font-size:12px;font-weight:900;color:#0f172a;line-height:1">Polymarket</div>
        </div>
      </div>
      <div style="font-size:13px;font-weight:500;color:#334155;line-height:1.5;margin-bottom:16px">${p.text}</div>
      <div style="display:flex;align-items:center;justify-content:flex-end;">
         <a href="${p.url}" target="_blank" rel="noopener noreferrer" style="padding:6px 12px;border-radius:8px;font-size:11px;font-weight:800;background:#000;color:#ffffff;text-decoration:none;">
          View
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

const GEO_CACHE_KEY = 'univinsight_geo_v4';

export async function geocode(query: string) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    const store = cached ? JSON.parse(cached) : {};
    if (store[q]) return store[q];
  } catch (e) {}

  try {
    const resp = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=1&types=place,locality,country,region`
    );
    const data = await resp.json();
    if (data.features?.length > 0) {
      const coords = data.features[0].geometry.coordinates;
      try {
        const cached = localStorage.getItem(GEO_CACHE_KEY);
        const store = cached ? JSON.parse(cached) : {};
        store[q] = coords;
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(store));
      } catch (e) {}
      return coords;
    }
  } catch { }
  return null;
}

const STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';
const STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v12';

// ─── Component ───────────────────────────────────────
export default function MapContainer({ 
  markets, 
  onMarketClick, 
  selectedMarketId, 
  selectedCoords, 
  pingMarketId, 
  pingLocations,
  persistentSocialHistory,
  teleportCoords,
  selectedCategory,
  socialConnections,
  onClearSelection,
  selectedTweet,
  onTweetClick
}: MapContainerProps) {
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
  const onClearSelectionRef = useRef(onClearSelection);
  onClearSelectionRef.current = onClearSelection;
  const onTweetClickRef = useRef(onTweetClick);
  onTweetClickRef.current = onTweetClick;

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
      if (m.getLayer('market-pulse')) m.removeLayer('market-pulse');
      if (m.getLayer('social-pings')) m.removeLayer('social-pings');
      if (m.getLayer('social-persistent')) m.removeLayer('social-persistent');
      if (m.getLayer('social-connection-lines')) m.removeLayer('social-connection-lines');
      if (m.getSource('connections')) m.removeSource('connections');
      if (m.getSource('social-connections')) m.removeSource('social-connections');
      if (m.getSource('social-pings')) m.removeSource('social-pings');
      if (m.getSource('social-persistent')) m.removeSource('social-persistent');
      if (m.getSource('markets')) m.removeSource('markets');

      m.addSource('markets', { type: 'geojson', data: lastGeoJsonRef.current });
      
      m.addSource('social-pings', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('social-persistent', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      m.addLayer({
        id: 'market-pulse',
        type: 'circle',
        source: 'markets',
        paint: {
          'circle-radius': 12,
          'circle-color': '#4f46e5',
          'circle-opacity': 0.6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
        filter: ['==', 'market_id', pingMarketId || 'none'],
      });

      m.addLayer({
        id: 'social-persistent',
        type: 'circle',
        source: 'social-persistent',
        paint: {
          'circle-radius': 7,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#4f46e5', // Indigo stroke for contrast
        },
      });

      m.addLayer({
        id: 'social-pings',
        type: 'circle',
        source: 'social-pings',
        paint: {
          'circle-radius': 15,
          'circle-color': '#f43f5e',
          'circle-opacity': 0.7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

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

      if (m.getLayer('social-connection-lines')) m.removeLayer('social-connection-lines');
      if (m.getSource('social-connections')) m.removeSource('social-connections');
      
      m.addSource('social-connections', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({
        id: 'social-connection-lines',
        type: 'line',
        source: 'social-connections',
        paint: { 
          'line-color': '#4f46e5', 
          'line-width': 1.5, 
          'line-opacity': 0.5,
          'line-dasharray': [3, 2] 
        },
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
      attributionControl: false, // Disables default attribution control
    });
    map.current = m;

    // We hide the logo and mandatory attribution via CSS for a clean UI

    // Create two independent popups
    hoverPopup.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 15 });
    pinnedPopup.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, offset: 15 });

    // ─── Hover Persistence Logic ───
    const hoverTimeout = { current: null as any };

    const clearHover = () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };

    const scheduleHide = () => {
      clearHover();
      hoverTimeout.current = setTimeout(() => {
        hoverPopup.current?.remove();
      }, 200); // 200ms grace period to move to the popup
    };

    // Attach listeners to popup element once it's in the DOM
    const attachPopupListeners = () => {
      const el = hoverPopup.current?.getElement();
      if (el) {
        el.onmouseenter = clearHover;
        el.onmouseleave = scheduleHide;
      }
    };

    // Hover listeners for markets
    m.on('mouseenter', 'market-dots', (e) => {
      if (!e.features?.length) return;
      clearHover();
      m.getCanvas().style.cursor = 'pointer';
      const p = e.features[0].properties as any;
      const c = (e.features[0].geometry as any).coordinates.slice();
      hoverPopup.current?.setLngLat(c).setHTML(getPopupHTML(p)).addTo(m);
      attachPopupListeners();
    });

    m.on('mouseleave', 'market-dots', () => {
      m.getCanvas().style.cursor = '';
      scheduleHide();
    });

    // Hover listeners for social
    m.on('mouseenter', 'social-persistent', (e) => {
      if (!e.features?.length) return;
      clearHover();
      m.getCanvas().style.cursor = 'pointer';
      const p = e.features[0].properties as any;
      const c = (e.features[0].geometry as any).coordinates.slice();
      hoverPopup.current?.setLngLat(c).setHTML(getTweetPopupHTML(p)).addTo(m);
      attachPopupListeners();
    });

    m.on('mouseleave', 'social-persistent', () => {
      m.getCanvas().style.cursor = '';
      scheduleHide();
    });

    // Click dot listener
    m.on('click', 'market-dots', (e) => {
      if (!e.features?.length) return;

      // Priority to social markers if they overlap
      const social = m.queryRenderedFeatures(e.point, { layers: ['social-persistent'] });
      if (social.length > 0) return;

      const feature = e.features[0];
      const coords = (feature.geometry as any).coordinates as [number, number];
      const props = feature.properties as any;
      const mkt = marketsRef.current.find((mk) => mk.title === props.title);
      if (!mkt) return;

      onMarketClickRef.current(mkt, coords);
      m.flyTo({ center: coords, zoom: 4, duration: 1200 });

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

    // Click social listener
    m.on('click', 'social-persistent', (e) => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      
      const tweet = {
        id: p.id || '',
        text: p.text,
        url: p.url,
        locations: [p.location],
        created_at: new Date().toISOString(),
        author_id: ''
      };
      
      onTweetClickRef.current?.(tweet as any);
    });

    // Click background listener
    m.on('click', (e) => {
      if (!m.getLayer('market-dots')) return;
      const features = m.queryRenderedFeatures(e.point, { layers: ['market-dots', 'social-persistent'] });
      if (!features.length) {
        onClearSelectionRef.current?.();
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

  useEffect(() => {
    if (!isReady || !map.current || !selectedMarketId || !lastGeoJsonRef.current) return;
    
    let targetCoords = selectedCoords;
    let targetFeature = null;

    // 1. Try to find the specific feature if we have coordinates (matches duplicate locations)
    if (targetCoords) {
      targetFeature = lastGeoJsonRef.current.features.find((f: any) => 
        markets.find(m => m.condition_id === selectedMarketId)?.title === f.properties.title &&
        Math.abs(f.geometry.coordinates[0] - targetCoords![0]) < 0.01 &&
        Math.abs(f.geometry.coordinates[1] - targetCoords![1]) < 0.01
      );
    }

    // 2. If no targetCoords or no matching feature found yet, find the first occurrence by title
    if (!targetFeature) {
      targetFeature = lastGeoJsonRef.current.features.find((f: any) => 
        markets.find(m => m.condition_id === selectedMarketId)?.title === f.properties.title
      );
      // Only set targetCoords if we didn't have one (e.g. from search)
      if (!targetCoords && targetFeature && targetFeature.geometry.type === 'Point') {
        targetCoords = targetFeature.geometry.coordinates as [number, number];
      }
    }

    if (targetCoords) {
      map.current.flyTo({
        center: targetCoords,
        zoom: 6,
        pitch: 45,
        duration: 2500,
        essential: true
      });

      // Show pinned popup on teleport
      if (targetFeature) {
        pinnedPopup.current?.setLngLat(targetCoords)
          .setHTML(getPopupHTML(targetFeature.properties))
          .addTo(map.current);
      }
    }
  }, [selectedMarketId, selectedCoords, isReady, markets]);

  // Effect for Category Visibility
  useEffect(() => {
    if (!isReady || !map.current) return;
    const m = map.current;
    
    const showMarkets = !selectedCategory || selectedCategory !== 'social';
    const showSocial = !selectedCategory || selectedCategory === 'social';

    const layers = {
      markets: ['market-dots', 'market-pulse', 'connection-lines'],
      social: ['social-persistent', 'social-pings']
    };

    layers.markets.forEach(l => {
      if (m.getLayer(l)) m.setLayoutProperty(l, 'visibility', showMarkets ? 'visible' : 'none');
    });
    layers.social.forEach(l => {
      if (m.getLayer(l)) m.setLayoutProperty(l, 'visibility', showSocial ? 'visible' : 'none');
    });
  }, [selectedCategory, isReady]);

  useEffect(() => {
    if (!isReady || !map.current) return;
    const m = map.current;
    
    // Handle Market Pings
    if (m.getLayer('market-pulse')) {
      m.setFilter('market-pulse', [
        'any',
        ['==', 'market_id', pingMarketId || 'none'],
        ...(pingLocations || []).map(loc => ['==', 'title', loc])
      ]);
    }

    // Handle Social Pings (Dynamic geocoding for tweets)
    const updateSocialPings = async () => {
      if (pingLocations && pingLocations.length > 0) {
        const features = [];
        for (const loc of pingLocations) {
          const coords = await geocode(loc);
          if (coords) {
            features.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: coords },
              properties: { title: loc }
            });
          }
        }
        const source = m.getSource('social-pings') as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData({ type: 'FeatureCollection', features: features as any });
        }
      } else {
        const source = m.getSource('social-pings') as mapboxgl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features: [] });
      }
    };

    updateSocialPings();
  }, [pingMarketId, pingLocations, isReady]);

  // Effect for Manual Teleportation and Popup Trigger
  useEffect(() => {
    if (!isReady || !map.current) return;
    const m = map.current;

    const handleExternalTrigger = async () => {
      if (teleportCoords) {
        m.flyTo({ center: teleportCoords, zoom: 6, duration: 2000 });
      }

      if (selectedTweet) {
        const coords = selectedCoords || await geocode(selectedTweet.locations[0] || 'Washington D.C.');
        if (coords) {
          pinnedPopup.current?.setLngLat(coords)
            .setHTML(getTweetPopupHTML({
              text: selectedTweet.text,
              url: selectedTweet.url
            }))
            .addTo(m);
          hoverPopup.current?.remove();
        }
        return;
      }

      if (selectedMarketId) {
        const market = markets.find(mk => mk.condition_id === selectedMarketId);
        if (market) {
          // IMPORTANT: Use selectedCoords if provided (map click), otherwise fallback to geocoding (search/sidebar)
          const coords = selectedCoords || await geocode(market.locations?.[0] || 'Washington D.C.');
          if (coords) {
            pinnedPopup.current?.setLngLat(coords)
              .setHTML(getPopupHTML(market))
              .addTo(m);
            
            hoverPopup.current?.remove();
          }
        }
      } else {
        // Selection cleared
        pinnedPopup.current?.remove();
        const connSrc = m.getSource('connections') as mapboxgl.GeoJSONSource;
        if (connSrc) connSrc.setData({ type: 'FeatureCollection', features: [] });
      }
    };

    handleExternalTrigger();
  }, [teleportCoords, selectedMarketId, selectedCoords, selectedTweet, markets, isReady]);

  // Effect for Persistent Social Markers
  useEffect(() => {
    if (!isReady || !map.current) return;
    const m = map.current;
    
    const updatePersistentMarkers = async () => {
      if (!persistentSocialHistory || persistentSocialHistory.length === 0) {
        const source = m.getSource('social-persistent') as mapboxgl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features: [] });
        return;
      }

      const features = [];
      for (const item of persistentSocialHistory) {
        const coords = await geocode(item.location);
        if (coords) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coords },
            properties: { 
              location: item.location,
              text: item.tweet.text,
              url: item.tweet.url,
              id: item.tweet.id
            }
          });
        }
      }
      
      const source = m.getSource('social-persistent') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: features as any });
      }
    };

    updatePersistentMarkers();
  }, [persistentSocialHistory, isReady]);

  // Effect for Social Connections (Arcs between tweets and markets)
  useEffect(() => {
    if (!isReady || !map.current || !socialConnections) return;
    const m = map.current;

    const drawSocialConnections = async () => {
      if (socialConnections.length === 0) {
        const source = m.getSource('social-connections') as mapboxgl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features: [] });
        return;
      }

      const features = [];
      for (const conn of socialConnections) {
        const tLoc = conn.tweet.locations[0] || 'Washington D.C.';
        const mLoc = conn.market.locations?.[0] || 'Washington D.C.';
        
        const [c1, c2] = await Promise.all([geocode(tLoc), geocode(mLoc)]);
        if (c1 && c2) {
          const arc = greatCircleArc(c1, c2);
          features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: arc },
            properties: {}
          });
        }
      }
      
      const source = m.getSource('social-connections') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: features as any });
      }
    };

    drawSocialConnections();
  }, [socialConnections, isReady]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainer} className="w-full h-full" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
    </div>
  );
}
