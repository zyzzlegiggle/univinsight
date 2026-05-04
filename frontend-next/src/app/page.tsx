'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import Ticker from '@/components/Ticker';
import MapContainer, { geocode } from '@/components/MapContainer';
import MarketModal from '@/components/MarketModal';
import ContextModal from '@/components/ContextModal';
import LoadingScreen from '@/components/LoadingScreen';
import { fetchHeadlines, fetchActivity, fetchTweets, MarketHeadline, RecentTrade, TweetData } from '@/lib/api';
import TradeNotification from '@/components/TradeNotification';
import TweetNotification from '@/components/TweetNotification';
import SocialFeed from '@/components/SocialFeed';

export interface SocialHistoryItem {
  location: string;
  tweet: TweetData;
}

export default function Home() {
  const [markets, setMarkets] = useState<MarketHeadline[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketHeadline | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [selectedTweet, setSelectedTweet] = useState<TweetData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isFeedOpen, setIsFeedOpen] = useState(true);
  const [userManuallyClosedFeed, setUserManuallyClosedFeed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Initializing Map...');
  const [activeTrade, setActiveTrade] = useState<RecentTrade | null>(null);
  const [activeTweet, setActiveTweet] = useState<TweetData | null>(null);
  const [pingMarketId, setPingMarketId] = useState<string | null>(null);
  const [pingLocations, setPingLocations] = useState<string[]>([]);
  const [socialHistory, setSocialHistory] = useState<SocialHistoryItem[]>([]);
  const [lastTweetId, setLastTweetId] = useState<string | null>(null);
  const [teleportCoords, setTeleportCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingText('Fetching all markets...');
        const [mktData, tweetData] = await Promise.all([
          fetchHeadlines(),
          fetchTweets(true)
        ]);
        
        setMarkets(mktData);
        
        if (tweetData && tweetData.length > 0) {
          setLastTweetId(tweetData[0].id);
          const historyItems: SocialHistoryItem[] = [];
          tweetData.forEach(t => {
            t.locations.forEach(loc => historyItems.push({ location: loc, tweet: t }));
          });
          setSocialHistory(historyItems);
        }

        setLoadingText('Resolving locations...');
        setTimeout(() => setIsLoading(false), 600);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLoadingText('Error loading data');
        setTimeout(() => setIsLoading(false), 2000);
      }
    }
    loadData();
  }, []);

  // Poll for global activity
  useEffect(() => {
    if (isLoading) return;
    
    // Delay initial fetch to let main content settle
    const initialDelay = setTimeout(() => {
      const interval = setInterval(async () => {
        try {
          const trades = await fetchActivity();
          if (trades && trades.length > 0) {
            const latest = trades[0];
            setActiveTrade(latest);
            setPingMarketId(latest.market_id);
            setTimeout(() => setPingMarketId(null), 10000);
          }
        } catch (e) {
          console.error('Activity fetch failed', e);
        }
      }, 20000);
      
      return () => clearInterval(interval);
    }, 15000); // 15s delay after loading finishes

    return () => clearTimeout(initialDelay);
  }, [isLoading]);

  // Poll for Twitter updates
  useEffect(() => {
    if (isLoading) return;
    
    const interval = setInterval(async () => {
      try {
        const tweets = await fetchTweets();
        if (tweets && tweets.length > 0) {
          const newest = tweets[0];
          if (newest.id !== lastTweetId) {
            setLastTweetId(newest.id);
            setActiveTweet(newest);
            setPingLocations(newest.locations);
            
            setSocialHistory(prev => {
              const newItems = newest.locations.map(loc => ({ location: loc, tweet: newest }));
              // Filter out duplicates if needed, but here we just append
              return [...prev, ...newItems];
            });

            setTimeout(() => setPingLocations([]), 15000);
          }
        }
      } catch (e) {
        console.error('Twitter fetch failed', e);
      }
    }, 25000); // Check every 25 seconds (Mock Mode)

    return () => clearInterval(interval);
  }, [isLoading, lastTweetId]);

  const handleMarketClick = useCallback((market: MarketHeadline, coords?: [number, number]) => {
    setSelectedMarket(market);
    setSelectedCoords(coords || null);
    setSelectedTweet(null); // Clear tweet if selecting market
    setIsModalOpen(true);
    setIsFeedOpen(false);
  }, []);

  const handleMarketSelect = useCallback(async (market: MarketHeadline) => {
    setSelectedMarket(market);
    setSelectedTweet(null); // Clear tweet if selecting market
    setIsModalOpen(true);
    setIsFeedOpen(false);

    // Try to get coords from the market object if it has them, or geocode
    const loc = market.locations?.[0];
    if (loc) {
       const coords = await geocode(loc);
       setSelectedCoords(coords || null);
    } else {
       setSelectedCoords(null);
    }
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedMarket(null);
    setSelectedCoords(null);
    setSelectedTweet(null);
    setIsModalOpen(false);
    setIsContextOpen(false);
  }, []);

  const handleFeedToggle = useCallback(() => {
    const next = !isFeedOpen;
    setIsFeedOpen(next);
    setUserManuallyClosedFeed(!next);
  }, [isFeedOpen]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setIsContextOpen(false);
    setSelectedMarket(null);
    if (!userManuallyClosedFeed) {
      setIsFeedOpen(true);
    }
  }, [userManuallyClosedFeed]);
  const handleNotificationClick = useCallback((trade: RecentTrade) => {
    const market = markets.find(m => m.condition_id === trade.market_id);
    if (market) {
      handleMarketSelect(market);
    }
  }, [markets, handleMarketSelect]);

  const handleTweetClick = useCallback(async (tweet: TweetData) => {
    if (tweet.locations.length > 0) {
      const loc = tweet.locations[0];
      const coords = await geocode(loc);
      if (coords) {
        setTeleportCoords(coords);
        setSelectedCoords(coords);
        setSelectedTweet(tweet);
        
        // Ensure market detail modal is closed when focused on a tweet
        setSelectedMarket(null);
        setIsModalOpen(false);

        // Reset teleport so same click works again if moved
        setTimeout(() => setTeleportCoords(null), 100);
      }
    }
  }, [markets]);

  const filteredMarkets = markets.filter(m => {
    const matchesSearch = !searchQuery.trim() || m.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check if market matches category normally
    const matchesCategory = !selectedCategory || (m.categories || []).includes(selectedCategory);
    
    // Special handling for 'social' category: include markets with social connections
    if (selectedCategory === 'social') {
      const hasSocialConn = socialConnections.some(conn => conn.market.condition_id === m.condition_id);
      return matchesSearch && (matchesCategory || hasSocialConn);
    }

    return matchesSearch && matchesCategory;
  });

  const uniqueTweets = Array.from(new Map(socialHistory.map(item => [item.tweet.id, item.tweet])).values());

  const socialConnections: { tweet: TweetData; market: MarketHeadline }[] = [];
  if (!selectedCategory || selectedCategory === 'social') {
    socialHistory.forEach(item => {
      markets.forEach(m => {
        if (m.locations?.includes(item.location)) {
          socialConnections.push({ tweet: item.tweet, market: m });
        }
      });
    });
  }

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      <LoadingScreen isVisible={isLoading} text={loadingText} />
      <TradeNotification trade={activeTrade} onClick={handleNotificationClick} />
      <TweetNotification tweet={activeTweet} onClick={handleTweetClick} />
      
      {isFeedOpen && (
        <SocialFeed 
          tweets={uniqueTweets} 
          onTweetClick={handleTweetClick} 
          onClose={() => setIsFeedOpen(false)} 
        />
      )}

      <Header 
        markets={markets} 
        onSearch={setSearchQuery} 
        onMarketSelect={handleMarketSelect}
        onCategoryChange={setSelectedCategory}
        isFeedOpen={isFeedOpen}
        onFeedToggle={handleFeedToggle}
      />
      <Ticker markets={filteredMarkets} />

      <div className="flex-1 relative">
        <MapContainer
          markets={filteredMarkets}
          onMarketClick={handleMarketClick}
          selectedMarketId={selectedMarket?.condition_id || null}
          selectedCoords={selectedCoords}
          pingMarketId={pingMarketId}
          pingLocations={pingLocations}
          persistentSocialHistory={socialHistory}
          teleportCoords={teleportCoords}
          selectedCategory={selectedCategory}
          socialConnections={socialConnections}
          onClearSelection={handleClearSelection}
          selectedTweet={selectedTweet}
          onTweetClick={handleTweetClick}
        />

        <MarketModal
          market={selectedMarket}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onAnalyze={() => setIsContextOpen(true)}
          isContextOpen={isContextOpen}
        />

        <ContextModal
          market={selectedMarket}
          isOpen={isContextOpen}
          relatedTweets={uniqueTweets.filter(t => t.locations.some(loc => selectedMarket?.locations?.includes(loc)))}
        />
      </div>
    </main>
  );
}
