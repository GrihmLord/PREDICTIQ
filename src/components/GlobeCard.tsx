import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import Globe from 'react-globe.gl';
import { feedService } from '../services/FeedService';
import { colors } from '../styles/colors';

// Globe component is a React component, but react-native-web handling can be tricky.
// We wrap it in a div-like container for web/electron (Platform-specific code would usually go in .web.tsx)

interface GeoPoint {
    lat: number;
    lng: number;
    value: number;
}

export const GlobeCard: React.FC = () => {
    const [points, setPoints] = useState<GeoPoint[]>([]);
    const [dimensions, setDimensions] = useState({ width: 0, height: 300 });
    const globeEl = useRef<any>();

    useEffect(() => {
        loadData();

        // Auto-rotate
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.5;
        }

        // Window resize handler (Electron/Browser)
        const updateSize = () => {
            // Basic responsive width - in a real app better to use Layout measurements from View
            const screenW = Dimensions.get('window').width;
            setDimensions({ width: screenW - 40, height: 350 }); // Minus padding
        };

        // Initial size
        updateSize();

        // @ts-ignore - window resize event
        window.addEventListener('resize', updateSize);
        return () => {
            // @ts-ignore
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    const loadData = async () => {
        const data = await feedService.fetchGeoMetricData();
        setPoints(data);
    };


    if (
        Platform.OS !== 'web' &&
        Platform.OS !== 'windows' &&
        Platform.OS !== 'macos'
    ) {
        return (
            <View>
                <Text>3D Globe is Desktop Only</Text>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>GLOBAL CONFLICT TRACKER</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>3D VIEW</Text>
                </View>
            </View>

            <View style={styles.globeContainer}>
                {/* @ts-ignore - Globe is a web component */}
                <Globe
                    ref={globeEl}
                    width={dimensions.width}
                    height={dimensions.height}
                    globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
                    backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
                    // Hex Bin Layer (for clustering data)
                    hexBinPointsData={points}
                    hexBinPointWeight="value"
                    hexBinResolution={4}
                    hexTopColor={() => '#ef4444'}
                    hexSideColor={() => '#b91c1c'}
                    hexBinMerge={true}
                    hexAltitude={(d: any) => d.sumWeight * 0.15} // Height based on intensity
                    // Atmosphere
                    atmosphereColor={'#3b82f6'}
                    atmosphereAltitude={0.15}
                />
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    DATA SOURCE: GDELT PROJECT (GKG) • VOLUMETRIC ANALYSIS
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.dark.surface,
        borderRadius: 12,
        margin: 20,
        marginBottom: 10,
        padding: 0,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.dark.border,
        alignItems: 'center',
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
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    badge: {
        backgroundColor: colors.primary.main,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 10,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    globeContainer: {
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
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
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
});
