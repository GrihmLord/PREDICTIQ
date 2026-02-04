import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { feedService, NewsItem } from '../services/FeedService';
import { colors } from '../styles/colors';

export const NewsTicker: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentHeadline, setCurrentHeadline] = useState<NewsItem | null>(null);

  useEffect(() => {
    const handleNews = (item: NewsItem) => {
      setNews(prev => {
        const unique = [item, ...prev].filter(
          (v, i, a) => a.findIndex(t => t.id === v.id) === i,
        );
        return unique.slice(0, 10); // Keep last 10
      });
      // If it's the first item or a Critical item, show immediately
      if (!currentHeadline || item.severity === 'CRITICAL') {
        setCurrentHeadline(item);
      }
    };

    feedService.on('news', handleNews);
    return () => {
      feedService.off('news', handleNews);
    };
  }, [currentHeadline]);

  // Timer to cycle headlines
  useEffect(() => {
    if (!currentHeadline && news.length > 0) {
      setCurrentHeadline(news[0]);
    }

    const interval = setInterval(() => {
      if (news.length > 0) {
        const idx = currentHeadline
          ? news.findIndex(n => n.id === currentHeadline.id)
          : -1;
        const nextIdx = (idx + 1) % news.length;
        setCurrentHeadline(news[nextIdx]);
      }
    }, 6000); // 6s per headline

    return () => clearInterval(interval);
  }, [news, currentHeadline]);

  if (!currentHeadline) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return colors.danger.high;
      case 'HIGH':
        return colors.warning.high;
      case 'MEDIUM':
        return colors.warning.low;
      default:
        return colors.primary.light;
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.labelContainer,
          !currentHeadline.isLive && styles.simulatedLabel,
        ]}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: currentHeadline.isLive
                ? colors.success.high
                : colors.warning.high,
            },
          ]}
        />
        <Text
          style={[
            styles.labelText,
            !currentHeadline.isLive && { color: colors.warning.high },
          ]}>
          {currentHeadline.isLive ? 'LIVE WIRE' : 'SIMULATION'}
        </Text>
      </View>
      <View style={styles.tickerContainer}>
        <Text style={styles.timestamp}>
          {new Date(currentHeadline.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        <Text style={styles.source}>[{currentHeadline.source}]</Text>

        <Text
          style={[
            styles.headline,
            { color: getSeverityColor(currentHeadline.severity) },
          ]}>
          {currentHeadline.headline}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    height: 32,
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // Green tint
    borderRightWidth: 1,
    borderRightColor: colors.dark.border,
  },
  simulatedLabel: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)', // Amber tint
  },
  labelText: {
    color: colors.success.high,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
    marginLeft: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tickerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  timestamp: {
    color: colors.dark.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    marginRight: 8,
  },
  source: {
    color: colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginRight: 8,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
  },
});
