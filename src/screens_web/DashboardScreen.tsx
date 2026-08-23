// src/screens_web/DashboardScreen.tsx
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import {ExpertDefinition} from '../services/ExpertVectorService';
import {
  globalRiskService,
  DefconLevel,
  ExpertOpinion,
} from '../services/GlobalRiskService';
import {
  predictionService,
  PredictionResult,
} from '../services/predictionService';
import {storageService} from '../services/storageService';
import {feedService} from '../services/FeedService';
import {DefconStatus} from '../components/DefconStatus';
import {ExpertSelector} from '../components/ExpertSelector';
import {ExpertActivationChart} from '../components/ExpertActivationChart';
import {NewsTicker} from '../components/NewsTicker';
import {GlobeCard} from '../components/GlobeCard';
import {colors} from '../styles/colors';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const getWebStyle = (style: any) => (Platform.OS === 'web' ? style : {});

const MIN_COUNCIL = 3;
const MAX_COUNCIL = 5;
const MAX_SCENARIO_CHARS = 2000;
const MAX_LOG_LINES = 60;

export const DashboardScreen: React.FC<DashboardProps> = ({onNavigate}) => {
  const [scenario, setScenario] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [defconLevel, setDefconLevel] = useState<DefconLevel>(5);
  const [consensusText, setConsensusText] = useState(
    'Monitoring global baselines…',
  );
  const [narrative, setNarrative] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [selectedExperts, setSelectedExperts] = useState<string[]>([]);
  const [availableExperts, setAvailableExperts] = useState<ExpertDefinition[]>(
    [],
  );
  const [expertData, setExpertData] = useState<
    {name: string; severity: number; domain: string}[]
  >([]);
  const [roundTableLog, setRoundTableLog] = useState<string[]>([]);
  const [recent, setRecent] = useState<PredictionResult[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setAvailableExperts(globalRiskService.getAvailableExperts());
    setRecent(storageService.getHistory().slice(0, 4));

    feedService.connect();
    return () => {
      feedService.disconnect();
      // An assessment in flight would otherwise keep its pacing timers running
      // after the screen unmounts.
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const toggleExpert = useCallback((id: string) => {
    setSelectedExperts(current => {
      if (current.indexOf(id) !== -1) {
        return current.filter(entry => entry !== id);
      }
      if (current.length >= MAX_COUNCIL) {
        setStatusMessage('A council is capped at ' + MAX_COUNCIL + ' experts.');
        return current;
      }
      setStatusMessage(null);
      return current.concat(id);
    });
  }, []);

  const appendLog = useCallback((line: string) => {
    setRoundTableLog(current => current.concat(line).slice(-MAX_LOG_LINES));
  }, []);

  const handleRiskAssessment = async () => {
    const trimmed = scenario.trim();
    if (trimmed.length === 0) {
      setStatusMessage('Describe the scenario you want assessed.');
      return;
    }
    if (selectedExperts.length < MIN_COUNCIL) {
      setStatusMessage(
        'Select at least ' + MIN_COUNCIL + ' experts for a valid quorum.',
      );
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsAnalyzing(true);
    setStatusMessage(null);
    setExpertData([]);
    setRoundTableLog([]);
    setNarrative(null);

    try {
      const outcome = await predictionService.analyzeScenario({
        scenario: trimmed,
        expertIds: selectedExperts,
        onProgress: appendLog,
        signal: controller.signal,
      });

      setDefconLevel(outcome.result.defconLevel as DefconLevel);
      setConsensusText(outcome.result.expertConsensus);
      setNarrative(outcome.result.narrative || null);
      setExpertData(
        outcome.expertOpinions.map((opinion: ExpertOpinion) => ({
          name: opinion.expertName,
          severity: opinion.severity,
          domain: opinion.domain,
        })),
      );

      await storageService.savePrediction(outcome.result);
      setRecent(storageService.getHistory().slice(0, 4));

      if (outcome.providerError) {
        setStatusMessage(
          'Assessment complete. Provider summary unavailable: ' +
            outcome.providerError,
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'The assessment could not be completed.',
      );
    } finally {
      abortRef.current = null;
      setIsAnalyzing(false);
    }
  };

  const canRun =
    !isAnalyzing &&
    scenario.trim().length > 0 &&
    selectedExperts.length >= MIN_COUNCIL;

  const buttonLabel = (() => {
    if (isAnalyzing) {
      return 'Compiling intelligence…';
    }
    if (scenario.trim().length === 0) {
      return 'Describe a scenario to begin';
    }
    if (selectedExperts.length < MIN_COUNCIL) {
      return 'Select ' + MIN_COUNCIL + '+ experts to initialize';
    }
    return 'Initialize SITREP';
  })();

  return (
    <View style={styles.content}>
      <NewsTicker />
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={styles.contentContainer}>
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

        <DefconStatus level={defconLevel} description={consensusText} />

        {narrative && (
          <View style={styles.narrativeCard}>
            <Text style={styles.narrativeLabel}>PROVIDER SYNTHESIS</Text>
            <Text style={styles.narrativeText}>{narrative}</Text>
          </View>
        )}

        <ExpertSelector
          experts={availableExperts}
          selectedIds={selectedExperts}
          onToggle={toggleExpert}
        />

        {/* Scenario input — the analysis previously ran against a hard-coded
            string, so the console could not actually assess anything. */}
        <View
          style={[
            styles.actionCard,
            getWebStyle({backdropFilter: 'blur(10px)'}),
          ]}>
          <View style={styles.actionHeader}>
            <Text style={styles.actionIcon}>☢️</Text>
            <View style={styles.actionHeaderText}>
              <Text style={styles.actionTitle}>Global Threat Assessment</Text>
              <Text style={styles.actionSubtitle}>
                Secure Council Consensus Protocol
              </Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>SCENARIO UNDER ASSESSMENT</Text>
          <TextInput
            style={styles.scenarioInput}
            multiline
            numberOfLines={4}
            value={scenario}
            onChangeText={text =>
              setScenario(text.slice(0, MAX_SCENARIO_CHARS))
            }
            editable={!isAnalyzing}
            placeholder="e.g. A zero-day exploit in grid SCADA firmware is being traded openly while border tensions escalate."
            placeholderTextColor={colors.dark.textMuted}
            accessibilityLabel="Scenario under assessment"
          />
          <Text style={styles.charCount}>
            {scenario.length} / {MAX_SCENARIO_CHARS}
          </Text>

          {statusMessage && (
            <Text style={styles.statusMessage}>{statusMessage}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              !canRun && styles.actionButtonInactive,
            ]}
            activeOpacity={0.8}
            onPress={handleRiskAssessment}
            disabled={!canRun}
            accessibilityRole="button">
            {isAnalyzing ? (
              <View style={styles.buttonBusy}>
                <ActivityIndicator
                  color={colors.light.textPrimary}
                  style={{marginRight: 8}}
                />
                <Text style={styles.actionButtonText}>{buttonLabel}</Text>
              </View>
            ) : (
              <Text style={styles.actionButtonText}>{buttonLabel}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Round table transcript, streamed as each node reports. */}
        {roundTableLog.length > 0 && (
          <View style={styles.logCard}>
            <Text style={styles.logTitle}>ROUND TABLE TRANSCRIPT</Text>
            {roundTableLog.map((line, index) => (
              <Text
                key={String(index) + line}
                style={styles.logLine}
                numberOfLines={2}>
                {line}
              </Text>
            ))}
          </View>
        )}

        <GlobeCard />

        <View style={styles.gridContainer}>
          <ExpertActivationChart data={expertData} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Previous Assessments</Text>
          <TouchableOpacity
            onPress={() => onNavigate('History')}
            accessibilityRole="button">
            <Text style={styles.seeAllLink}>Archived Reports</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.card, getWebStyle({backdropFilter: 'blur(10px)'})]}>
          {recent.length === 0 ? (
            <View style={styles.activityItem}>
              <Text style={styles.activityEmoji}>🗒️</Text>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  No assessments recorded yet
                </Text>
                <Text style={styles.activitySubtext}>
                  Run a SITREP above and it will be archived here.
                </Text>
              </View>
            </View>
          ) : (
            recent.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.activityItem}>
                  <Text style={styles.activityEmoji}>
                    {defconEmoji(item.defconLevel)}
                  </Text>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText} numberOfLines={1}>
                      {item.scenario}
                    </Text>
                    <Text style={styles.activitySubtext} numberOfLines={1}>
                      {new Date(item.timestamp).toLocaleString()} •{' '}
                      {item.expertConsensus}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.confidenceBadge,
                      {backgroundColor: defconTint(item.defconLevel)},
                    ]}>
                    <Text
                      style={[
                        styles.confidenceText,
                        {color: defconColor(item.defconLevel)},
                      ]}>
                      DEFCON {item.defconLevel}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

function defconColor(level: number): string {
  switch (level) {
    case 1:
      return colors.danger.high;
    case 2:
      return colors.chart.orange;
    case 3:
      return colors.warning.high;
    case 4:
      return colors.success.high;
    default:
      return colors.chart.blue;
  }
}

function defconTint(level: number): string {
  switch (level) {
    case 1:
    case 2:
      return 'rgba(239, 68, 68, 0.1)';
    case 3:
      return 'rgba(234, 179, 8, 0.1)';
    case 4:
      return 'rgba(16, 185, 129, 0.1)';
    default:
      return 'rgba(59, 130, 246, 0.1)';
  }
}

function defconEmoji(level: number): string {
  if (level <= 2) {
    return '🚨';
  }
  if (level === 3) {
    return '⚠️';
  }
  return '🌍';
}

const styles = StyleSheet.create({
  content: {flex: 1, backgroundColor: colors.dark.background},
  contentContainer: {padding: 20, paddingBottom: 40},
  gradientBg: {flex: 1, opacity: 0.8},

  narrativeCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary.main,
    padding: 16,
    marginBottom: 20,
  },
  narrativeLabel: {
    color: colors.primary.light,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  narrativeText: {color: colors.dark.textPrimary, fontSize: 14, lineHeight: 20},

  actionCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    shadowColor: colors.danger.high,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  actionHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
  actionHeaderText: {flex: 1},
  actionIcon: {fontSize: 28, marginRight: 16},
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

  inputLabel: {
    color: colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  scenarioInput: {
    backgroundColor: colors.dark.background,
    color: colors.dark.textPrimary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
    minHeight: 96,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  charCount: {
    color: colors.dark.textMuted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 8,
  },
  statusMessage: {color: colors.warning.high, fontSize: 13, marginBottom: 12},

  actionButton: {
    backgroundColor: colors.danger.high,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger.medium,
  },
  actionButtonInactive: {
    backgroundColor: colors.dark.surfaceAlt,
    borderColor: colors.dark.border,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  buttonBusy: {flexDirection: 'row', alignItems: 'center'},

  logCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 16,
    marginBottom: 24,
  },
  logTitle: {
    color: colors.dark.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  logLine: {
    color: colors.success.medium,
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 17,
  },

  gridContainer: {marginBottom: 24},

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
  seeAllLink: {color: colors.primary.light, fontSize: 14, fontWeight: '600'},

  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  activityItem: {flexDirection: 'row', alignItems: 'center', padding: 20},
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
  activityContent: {flex: 1},
  activityText: {
    fontSize: 15,
    color: colors.dark.textPrimary,
    fontWeight: '600',
  },
  activitySubtext: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginTop: 4,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  confidenceText: {fontSize: 12, fontWeight: '700'},
  divider: {
    height: 1,
    backgroundColor: colors.dark.border,
    marginLeft: 20,
    marginRight: 20,
  },
});
