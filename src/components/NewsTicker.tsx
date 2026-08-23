import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {feedService, NewsItem} from '../services/FeedService';
import {colors} from '../styles/colors';

const MAX_ITEMS = 10;
const ROTATE_INTERVAL_MS = 6000;

export const NewsTicker: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentHeadline, setCurrentHeadline] = useState<NewsItem | null>(null);

  // Subscribe exactly once. The previous version depended on currentHeadline,
  // so it tore down and re-attached the feed listener on every headline change.
  useEffect(() => {
    const handleNews = (item: NewsItem) => {
      setNews(prev => {
        const deduped = [item, ...prev].filter(
          (entry, index, all) =>
            all.findIndex(other => other.id === entry.id) === index,
        );
        return deduped.slice(0, MAX_ITEMS);
      });

      // A critical item interrupts the rotation; anything else waits its turn.
      setCurrentHeadline(current =>
        !current || item.severity === 'CRITICAL' ? item : current,
      );
    };

    return feedService.on('news', handleNews);
  }, []);

  // Rotation reads the latest list through the state updater, so the interval
  // does not need to be rebuilt whenever a headline arrives.
  useEffect(() => {
    if (news.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentHeadline(current => {
        if (news.length === 0) {
          return current;
        }
        const index = current
          ? news.findIndex(item => item.id === current.id)
          : -1;
        return news[(index + 1) % news.length];
      });
    }, ROTATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [news]);

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
            !currentHeadline.isLive && {color: colors.warning.high},
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
            {color: getSeverityColor(currentHeadline.severity)},
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
