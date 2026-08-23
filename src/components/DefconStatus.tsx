import React, {useEffect} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import {colors} from '../styles/colors';

interface DefconStatusProps {
  level: 1 | 2 | 3 | 4 | 5;
  description?: string;
}

export const DefconStatus: React.FC<DefconStatusProps> = ({
  level,
  description,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (level <= 2) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true, // Native driver supported for opacity
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1); // Reset
    }
  }, [level]);

  const getDefconColor = (l: number) => {
    switch (l) {
      case 1:
        return colors.danger.high; // Red
      case 2:
        return colors.chart.orange; // Orange
      case 3:
        return colors.warning.high; // Yellow/Amber
      case 4:
        return colors.success.high; // Green
      case 5:
        return colors.chart.blue; // Blue
      default:
        return colors.chart.blue;
    }
  };

  const activeColor = getDefconColor(level);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>GLOBAL RISK MONITOR</Text>
        <View style={styles.liveIndicator}>
          <View style={[styles.dot, {backgroundColor: activeColor}]} />
          <Text style={[styles.liveText, {color: activeColor}]}>LIVE</Text>
        </View>
      </View>

      <View style={styles.defconContainer}>
        {[5, 4, 3, 2, 1].map(lvl => {
          const isActive = level === lvl;
          const color = getDefconColor(lvl);

          return (
            <View
              key={lvl}
              style={[
                styles.levelBlock,
                {
                  backgroundColor: isActive ? color : colors.dark.surface,
                  borderColor: isActive ? color : colors.dark.surfaceAlt,
                  opacity: isActive ? 1 : 0.3,
                },
              ]}>
              <Text
                style={[
                  styles.levelText,
                  {color: isActive ? '#FFF' : colors.dark.textMuted},
                ]}>
                {lvl}
              </Text>
            </View>
          );
        })}
      </View>

      <Animated.View
        style={[
          styles.descriptionBox,
          {
            borderColor: activeColor,
            opacity: pulseAnim,
          },
        ]}>
        <Text style={[styles.defconTitle, {color: activeColor}]}>
          DEFCON {level}
        </Text>
        <Text style={styles.descriptionText}>
          {description || 'AWAITING EXPERT ASSESSMENT...'}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  defconContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  levelBlock: {
    flex: 1,
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 20,
    fontWeight: '900',
  },
  descriptionBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.5)', // Keep semitransparent background
    alignItems: 'center',
  },
  defconTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 1,
  },
  descriptionText: {
    color: colors.dark.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
