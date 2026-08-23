import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import Globe from 'react-globe.gl';
import {feedService, GeoPoint} from '../services/FeedService';
import {storageService} from '../services/storageService';
import {colors} from '../styles/colors';

/**
 * The earth texture is served from the app's own bundle. It was previously
 * fetched from unpkg.com on every launch, which broke the offline-first
 * promise and put a third-party CDN in the load path of a tool that claims to
 * work air-gapped. The starfield backdrop is drawn as a flat colour rather than
 * shipping a second multi-megabyte image.
 */
const EARTH_TEXTURE = 'assets/globe/earth-night.jpg';
const GLOBE_HEIGHT = 350;
const MIN_WIDTH = 280;

export const GlobeCard: React.FC = () => {
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const globeEl = useRef<any>(null);

  const reducedMotion = storageService.getSettings().reducedMotion;

  useEffect(() => {
    let cancelled = false;

    feedService
      .fetchGeoMetricData()
      .then(data => {
        if (!cancelled) {
          setPoints(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Auto-rotation is applied once the Globe has actually mounted, which only
   * happens after the container reports a width. The previous version set this
   * in a mount effect, where the ref was still null, so rotation never started.
   */
  const isMounted = width >= MIN_WIDTH && !failed;
  useEffect(() => {
    const instance = globeEl.current;
    if (!isMounted || !instance || typeof instance.controls !== 'function') {
      return;
    }
    const controls = instance.controls();
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.5;
  }, [isMounted, reducedMotion]);

  // Measured from the container instead of the window, so the globe fits the
  // card at any window size rather than assuming the screen width minus padding.
  const handleLayout = (event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    if (measured > 0 && measured !== width) {
      setWidth(measured);
    }
  };

  const isDesktopSurface =
    Platform.OS === 'web' ||
    Platform.OS === 'windows' ||
    Platform.OS === 'macos';

  if (!isDesktopSurface) {
    return (
      <View style={styles.card}>
        <Text style={styles.fallbackText}>
          The 3D globe is available on desktop.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card} onLayout={handleLayout}>
      <View style={styles.header}>
        <Text style={styles.title}>GLOBAL CONFLICT TRACKER</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>3D VIEW</Text>
        </View>
      </View>

      <View style={[styles.globeContainer, {height: GLOBE_HEIGHT}]}>
        {isMounted ? (
          /* @ts-ignore react-globe.gl is a DOM component with a loose prop surface */
          <Globe
            ref={globeEl}
            width={width}
            height={GLOBE_HEIGHT}
            globeImageUrl={EARTH_TEXTURE}
            backgroundColor="rgba(0,0,0,0)"
            hexBinPointsData={points}
            hexBinPointWeight="value"
            hexBinResolution={4}
            hexTopColor={() => '#ef4444'}
            hexSideColor={() => '#b91c1c'}
            hexBinMerge={true}
            hexAltitude={(d: any) => Math.min(0.6, d.sumWeight * 0.15)}
            atmosphereColor={'#3b82f6'}
            atmosphereAltitude={0.15}
          />
        ) : (
          <Text style={styles.fallbackText}>
            {failed ? 'Conflict data unavailable.' : 'Preparing globe…'}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {points.length} TRACKED ZONES • GDELT GKG • VOLUMETRIC ANALYSIS
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.surface,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  header: {
    position: 'absolute',
    top: 15,
    left: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: colors.dark.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  badge: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 10,
  },
  badgeText: {color: '#FFF', fontSize: 10, fontWeight: 'bold'},
  globeContainer: {
    backgroundColor: '#02040a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: colors.dark.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
    padding: 24,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  footerText: {
    color: colors.dark.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 1,
  },
});
