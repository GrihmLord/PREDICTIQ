// src/screens_web/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
} from 'react-native';
import { globalRiskService } from '../services/GlobalRiskService';
import { ExpertDefinition } from '../services/ExpertVectorService';
import { DefconStatus } from '../components/DefconStatus';
import { DashboardCard } from '../components/DashboardCard';
import { ProbabilityGauge } from '../components/ProbabilityGauge';
import { ExpertSelector } from '../components/ExpertSelector';
import { ExpertActivationChart } from '../components/ExpertActivationChart';
import { storageService } from '../services/storageService';
import { colors } from '../styles/colors';
import { feedService } from '../services/FeedService';
import { NewsTicker } from '../components/NewsTicker';
import { GlobeCard } from '../components/GlobeCard';
import { predictionService } from '../services/PredictionService';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

// Web-specific style helper
const getWebStyle = (style: any) => (Platform.OS === 'web' ? style : {});

export const DashboardScreen: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [defconLevel, setDefconLevel] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [consensusText, setConsensusText] = useState<string>(
    'Monitoring global baselines...',
  );
  const [selectedExperts, setSelectedExperts] = useState<string[]>([]);
  const [availableExperts, setAvailableExperts] = useState<ExpertDefinition[]>(
    [],
  );

  const [expertData, setExpertData] = useState<
    { name: string; severity: number; domain: string }[]
  >([]);

  useEffect(() => {
    setAvailableExperts(globalRiskService.getAvailableExperts());
    feedService.connect();
    return () => feedService.disconnect();
  }, []);

  const toggleExpert = (id: string) => {
    if (selectedExperts.includes(id)) {
      setSelectedExperts(selectedExperts.filter(e => e !== id));
    } else {
      if (selectedExperts.length >= 5) {
        Alert.alert('Council Full', 'Maximum 5 experts allowed.');
        return;
      }
      setSelectedExperts([...selectedExperts, id]);
    }
  };

  const handleRiskAssessment = async () => {
    if (selectedExperts.length < 3) {
      Alert.alert(
        'Insufficent Council',
        'Please select at least 3 experts for a valid quorum.',
      );
      return;
    }

    setIsAnalyzing(true);
    setExpertData([]); // Reset chart

    try {
      // In a full app, this comes from user input. For now, we simulate a scan.
      const scenario =
        'Simulating global baseline scan: checking for recursive AI anomalies, geopolitical shifts, and orbital telemetry variances.';
      const result = await globalRiskService.analyzeGlobalRisk(
        scenario,
        selectedExperts,
      );
      setDefconLevel(result.defconLevel);
      setConsensusText(result.expertConsensus);

      // Map expert opinions to chart data
      const chartData = result.expertOpinions.map(o => {
        const expertDef = availableExperts.find(e => e.id === o.expertId);
        return {
          name: o.expertName,
          severity: o.severity,
          domain: expertDef ? expertDef.domain : 'Unknown',
        };
      });
      setExpertData(chartData);

      // Save to History
      storageService.savePrediction({
        id: Date.now().toString(),
        scenario: 'Global Threat Assessment', // Could make this dynamic later
        probability:
          result.defconLevel === 5 ? 95 : result.defconLevel === 4 ? 80 : 50, // Mock probability based on DEFCON
        confidence: 90, // High confidence in expert consensus
        factors: result.activeThreats.map(t => ({
          name: t,
          impact: 'negative',
          weight: 80,
        })),
        timestamp: new Date(),
        status: 'Verified',
        type: 'Geopolitical',
        defconLevel: result.defconLevel,
        expertConsensus: result.expertConsensus,
        activeThreats: result.activeThreats,
      });

      // No Alert in "Premium" mode, just UI feedback (optional, but let's keep it minimal)
      // Alert.alert(...) - Removing alert for smoother UX, the UI update is feedback enough.
    } catch (error) {
      Alert.alert('Analysis Failed', 'Connection to expert nodes lost.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View style={styles.content}>
      <NewsTicker />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}>
        {/* Background Gradient Layer (Web Only Mockup) */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View
            style={[
              styles.gradientBg,
              getWebStyle({
                backgroundImage: `linear-gradient(160deg, ${colors.dark.background} 0%, #1e1b4b 100%)`,
              }),
            ]}
          />
        </View>

        {/* DEFCON Header */}
        <DefconStatus level={defconLevel} description={consensusText} />

        {/* Expert Selection */}
        <ExpertSelector
          experts={availableExperts}
          selectedIds={selectedExperts}
          onToggle={toggleExpert}
        />

        {/* Main Action Card */}
        <View
          style={[
            styles.actionCard,
            getWebStyle({ backdropFilter: 'blur(10px)' }),
          ]}>
          <View style={styles.actionHeader}>
            <Text style={styles.actionIcon}>☢️</Text>
            <View>
              <Text style={styles.actionTitle}>Global Threat Assessment</Text>
              <Text style={styles.actionSubtitle}>
                Secure Council Consensus Protocol
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              isAnalyzing && styles.actionButtonDisabled,
              selectedExperts.length < 3 && styles.actionButtonInactive,
            ]}
            activeOpacity={0.8}
            onPress={handleRiskAssessment}
            disabled={isAnalyzing}>
            {isAnalyzing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator
                  color={colors.light.textPrimary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.actionButtonText}>
                  Compiling Intelligence...
                </Text>
              </View>
            ) : (
              <Text style={styles.actionButtonText}>
                {selectedExperts.length < 3
                  ? 'Select 3+ Experts to Initialize'
                  : 'INITIALIZE SITREP'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Neural Activation Chart */}
        {/* 3. Global Conflict Map */}
        <GlobeCard />

        {/* 4. Intelligence Grid */}
        <View style={styles.gridContainer}>
          <ExpertActivationChart data={expertData} />
        </View>


        {/* Recent Assessments */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Previous Assessments</Text>
          <TouchableOpacity onPress={() => onNavigate('History')}>
            <Text style={styles.seeAllLink}>Archived Reports</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.card, getWebStyle({ backdropFilter: 'blur(10px)' })]}>
          <View style={styles.activityItem}>
            <Text style={styles.activityEmoji}>🌍</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Routine Geopolitical Scan</Text>
              <Text style={styles.activitySubtext}>
                0800 Hours - No Abnormalities
              </Text>
            </View>
            <View
              style={[
                styles.confidenceBadge,
                { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
              ]}>
              <Text
                style={[styles.confidenceText, { color: colors.success.high }]}>
                DEFCON 5
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.activityItem}>
            <Text style={styles.activityEmoji}>📉</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Economic Stability Index</Text>
              <Text style={styles.activitySubtext}>
                Yesterday - Supply Chain Alert
              </Text>
            </View>
            <View
              style={[
                styles.confidenceBadge,
                { backgroundColor: 'rgba(234, 179, 8, 0.1)' },
              ]}>
              <Text
                style={[styles.confidenceText, { color: colors.warning.high }]}>
                DEFCON 3
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, backgroundColor: colors.dark.background },
  contentContainer: { padding: 20, paddingBottom: 40 },
  gradientBg: { flex: 1, opacity: 0.8 },

  // Action Card
  actionCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)', // Glass effect base
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    shadowColor: colors.danger.high,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  actionIcon: { fontSize: 28, marginRight: 16 },
  actionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.danger.low,
    letterSpacing: -0.5,
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.danger.medium,
    fontWeight: '500',
    marginTop: 2,
  },

  actionButton: {
    backgroundColor: colors.danger.high,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger.medium,
    shadowColor: colors.danger.high,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  actionButtonInactive: {
    backgroundColor: colors.dark.surfaceAlt,
    borderColor: colors.dark.border,
    shadowOpacity: 0,
  },
  actionButtonDisabled: { opacity: 0.8 },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Chart Container
  chartContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark.textPrimary,
  },
  seeAllLink: { color: colors.primary.light, fontSize: 14, fontWeight: '600' },

  // Activity Card
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  activityItem: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  activityEmoji: {
    fontSize: 24,
    marginRight: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    width: 48,
    height: 48,
    textAlign: 'center',
    lineHeight: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityContent: { flex: 1 },
  activityText: {
    fontSize: 16,
    color: colors.dark.textPrimary,
    fontWeight: '600',
  },
  activitySubtext: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    marginTop: 4,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confidenceText: { fontSize: 12, fontWeight: '700' },
  divider: {
    height: 1,
    backgroundColor: colors.dark.border,
    marginLeft: 20,
    marginRight: 20,
  },
});
