'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import Ticker from '@/components/Ticker';
import MapContainer from '@/components/MapContainer';
import MarketModal from '@/components/MarketModal';
import ContextModal from '@/components/ContextModal';
import LoadingScreen from '@/components/LoadingScreen';
import { fetchHeadlines, MarketHeadline } from '@/lib/api';

export default function Home() {
  const [markets, setMarkets] = useState<MarketHeadline[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketHeadline | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Initializing Map...');

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingText('Fetching all markets...');
        const data = await fetchHeadlines();
        setMarkets(data);
        setLoadingText('Resolving locations...');
        setTimeout(() => setIsLoading(false), 600);
      } catch (error) {
        console.error('Failed to fetch markets:', error);
        setLoadingText('Error loading data');
        setTimeout(() => setIsLoading(false), 2000);
      }
    }
    loadData();
  }, []);

  const handleMarketClick = useCallback((market: MarketHeadline, coords?: [number, number]) => {
    setSelectedMarket(market);
    setSelectedCoords(coords || null);
    setIsModalOpen(true);
  }, []);

  const handleMarketSelect = useCallback((market: MarketHeadline) => {
    setSelectedMarket(market);
    setSelectedCoords(null);
    setIsModalOpen(true);
  }, []);

  const filteredMarkets = searchQuery.trim()
    ? markets.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : markets;

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      <LoadingScreen isVisible={isLoading} text={loadingText} />
      <Header markets={markets} onSearch={setSearchQuery} onMarketSelect={handleMarketSelect} />
      <Ticker markets={markets} />

      <div className="flex-1 relative">
        <MapContainer
          markets={filteredMarkets}
          onMarketClick={handleMarketClick}
          selectedMarketId={selectedMarket?.condition_id || null}
          selectedCoords={selectedCoords}
        />

        <MarketModal
          market={selectedMarket}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedMarket(null); }}
        />

        <ContextModal
          market={selectedMarket}
          isOpen={isModalOpen}
        />
      </div>
    </main>
  );
}
