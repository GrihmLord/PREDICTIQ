import { EventEmitter } from 'events';

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  category: 'GEOPOLITICAL' | 'CYBER' | 'MARKET' | 'BIO' | 'CIVIL UNREST';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: number;
  isLive: boolean;
}

class FeedService extends EventEmitter {
  private isConnected: boolean = false;
  private intervalId: any = null;
  private isLiveMode: boolean = true;
  private seenUrls: Set<string> = new Set();

  private readonly GDELT_API =
    'https://api.gdeltproject.org/api/v2/doc/doc?query=(protest%20OR%20riot%20OR%20conflict%20OR%20terror%20OR%20diplomatic)&mode=ArtList&maxrecords=15&format=json&timespan=60min&trans=googtrans';

  // GKG GeoJSON API (Last 24 hours of conflict data)
  private readonly GDELT_GEO_API =
    'https://api.gdeltproject.org/api/v1/gkg_geojson?QUERY=(conflict%20OR%20protest)%20sourcecountry:US%20minus:sourcecountry:US&TIMESPAN=1440';

  private readonly MOCK_HEADLINES = [
    { t: 'OPEC+ Announces Surprise Production Cut', c: 'MARKET', s: 'MEDIUM' },
    {
      t: 'Massive DDoS Attack Hits European Banking Sector',
      c: 'CYBER',
      s: 'HIGH',
    },
    {
      t: 'New Strain of Avian Flu Detected in Southeast Asia',
      c: 'BIO',
      s: 'MEDIUM',
    },
    {
      t: 'Diplomatic Talks Breakdown in South China Sea',
      c: 'GEOPOLITICAL',
      s: 'HIGH',
    },
    { t: 'Tech Stocks Rally on AI Breakthroughs', c: 'MARKET', s: 'LOW' },
    { t: 'Global Supply Chain Disruptions Expected', c: 'MARKET', s: 'MEDIUM' },
    {
      t: 'Ransomware Group Targets Critical Infrastructure',
      c: 'CYBER',
      s: 'CRITICAL',
    },
    {
      t: 'Peace Treaty Signed in Emerging Conflict Zone',
      c: 'GEOPOLITICAL',
      s: 'LOW',
    },
  ];

  connect() {
    if (this.isConnected) {
      return;
    }
    this.isConnected = true;
    console.log('[FeedService] Connecting to global frequency...');

    // Initial fetch
    this.fetchLiveFeed();

    // Poll every 60 seconds (GDELT updates every 15m, but 60s is good for catching drift)
    this.intervalId = setInterval(() => {
      this.fetchLiveFeed();
    }, 60000);
  }

  disconnect() {
    if (!this.isConnected) {
      return;
    }
    this.isConnected = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.log('[FeedService] Disconnected.');
  }

  private async fetchLiveFeed() {
    if (!this.isConnected) {
      return;
    }

    try {
      console.log('[FeedService] Fetching GDELT data...');
      const response = await fetch(this.GDELT_API);

      if (!response.ok) {
        throw new Error(`GDELT API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.articles && data.articles.length > 0) {
        this.isLiveMode = true;
        this.processGdeltArticles(data.articles);
      } else {
        console.warn(
          '[FeedService] No articles returned. Reverting to simulation.',
        );
        this.isLiveMode = false;
        this.emitMockNews();
      }
    } catch (error) {
      console.error(
        '[FeedService] Connection failed. Using simulation fallback.',
        error,
      );
      this.isLiveMode = false;
      this.emitMockNews();
    }
  }

  private processGdeltArticles(articles: any[]) {
    let newItemsCount = 0;

    // Reverse to emit oldest first if multiple new ones come in
    articles.reverse().forEach(article => {
      if (this.seenUrls.has(article.url)) {
        return;
      }

      this.seenUrls.add(article.url);
      // Cap seen set to prevent memory leak
      if (this.seenUrls.size > 500) {
        const first = this.seenUrls.values().next().value;
        if (first) {
          this.seenUrls.delete(first);
        }
      }

      const news: NewsItem = {
        id: this.generateId(article.url),
        headline: this.cleanHeadline(article.title),
        source: article.domain || 'Unknown Agencies',
        category: this.mapCategory(article.title),
        severity: this.calculateSeverity(article.title),
        timestamp: Date.now(), // GDELT timestamps are often delayed, using 'now' ensures it shows as 'LIVE'
        isLive: true,
      };

      this.emit('news', news);
      newItemsCount++;
    });

    if (newItemsCount === 0 && !this.isLiveMode) {
      // If live mode is off/failed, emit a mock item
      this.emitMockNews();
    }
  }

  private generateId(str: string): string {
    // Simple hash replacement for Buffer (web compatible)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 16);
  }

  private emitMockNews() {
    const item =
      this.MOCK_HEADLINES[
      Math.floor(Math.random() * this.MOCK_HEADLINES.length)
      ];
    const news: NewsItem = {
      id: Date.now().toString(),
      headline: item.t,
      source: 'SIMULATION',
      category: item.c as any,
      severity: item.s as any,
      timestamp: Date.now(),
      isLive: false,
    };
    this.emit('news', news);
  }

  private cleanHeadline(title: string): string {
    // Remove trailing source names often found in titles "Headline - Source"
    return title.split(' - ')[0].trim();
  }

  private mapCategory(title: string): NewsItem['category'] {
    const t = title.toLowerCase();
    if (t.includes('cyber') || t.includes('hack') || t.includes('data')) {
      return 'CYBER';
    }
    if (t.includes('market') || t.includes('stock') || t.includes('oil')) {
      return 'MARKET';
    }
    if (t.includes('virus') || t.includes('outbreak') || t.includes('flu')) {
      return 'BIO';
    }
    if (t.includes('protest') || t.includes('riot')) {
      return 'CIVIL UNREST';
    }
    return 'GEOPOLITICAL';
  }

  private calculateSeverity(title: string): NewsItem['severity'] {
    const t = title.toLowerCase();
    if (
      t.includes('war') ||
      t.includes('kill') ||
      t.includes('dead') ||
      t.includes('critical')
    ) {
      return 'CRITICAL';
    }
    if (t.includes('attack') || t.includes('crisis') || t.includes('breach')) {
      return 'HIGH';
    }
    if (t.includes('tension') || t.includes('warns')) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  // --- Geo-Spatial Data ---

  async fetchGeoMetricData(): Promise<
    { lat: number; lng: number; value: number }[]
  > {
    try {
      console.log('[FeedService] Fetching GeoJSON...');
      // Note: Since GDELT GeoJSON can be heavy, we might want to cache or simplify.
      // For this demo, we'll try to fetch or fallback to mock points.

      const response = await fetch(this.GDELT_GEO_API);
      if (!response.ok) {
        throw new Error('GeoJSON fetch failed');
      }

      const data = await response.json();

      if (data && data.features) {
        return data.features
          .map((f: any) => {
            // features.geometry.coordinates is [lng, lat]
            // features.properties.count (if available) or default to 1
            return {
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
              value: Math.random() * 0.5, // Random intensity for visual "spikes"
            };
          })
          .slice(0, 500); // Cap at 500 points for performance
      }
      return this.getMockGeoPoints();
    } catch (error) {
      console.warn('[FeedService] GeoJSON failed, using mock points.', error);
      return this.getMockGeoPoints();
    }
  }

  private getMockGeoPoints() {
    // Fallback: Mock conflict zones (Ukraine, Gaza, Sudan, Taiwan Strait)
    return [
      { lat: 48.3794, lng: 31.1656, value: 0.8 }, // Ukraine
      { lat: 31.5, lng: 34.4667, value: 0.9 }, // Gaza
      { lat: 12.8628, lng: 30.2176, value: 0.7 }, // Sudan
      { lat: 23.6978, lng: 120.9605, value: 0.5 }, // Taiwan
      { lat: 33.2232, lng: 43.6793, value: 0.6 }, // Iraq
      { lat: 15.5527, lng: 48.5164, value: 0.6 }, // Yemen
      // Random noise
      ...Array.from({ length: 20 }).map(() => ({
        lat: Math.random() * 180 - 90,
        lng: Math.random() * 360 - 180,
        value: Math.random() * 0.3,
      })),
    ];
  }
}

export const feedService = new FeedService();
