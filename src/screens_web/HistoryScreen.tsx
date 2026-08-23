// src/screens_web/HistoryScreen.tsx
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import {storageService} from '../services/storageService';
import {reportService, summariseDomains} from '../services/ReportService';
import {PredictionResult} from '../services/predictionService';
import {SeverityTrendChart} from '../components/SeverityTrendChart';
import {DomainDistributionChart} from '../components/DomainDistributionChart';
import {colors} from '../styles/colors';

// Web-specific style helper
const getWebStyle = (style: any) => (Platform.OS === 'web' ? style : {});

export const HistoryScreen: React.FC = () => {
  const [history, setHistory] = useState<PredictionResult[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<PredictionResult[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'pptx' | null>(null);

  /**
   * Exports whatever the user is currently looking at. Both report builders
   * return an outcome rather than throwing, so a cancelled save dialog is not
   * reported as a failure.
   */
  const runExport = async (format: 'pdf' | 'pptx') => {
    const data = filteredHistory.length > 0 ? filteredHistory : history;
    if (data.length === 0) {
      setNotice('There is nothing to export.');
      return;
    }

    setExporting(format);
    setNotice(null);
    try {
      const outcome =
        format === 'pdf'
          ? await reportService.generatePDF(data)
          : await reportService.generatePPTX(data);

      if (outcome.error) {
        setNotice(outcome.error);
      } else if (outcome.saved) {
        setNotice('Saved to ' + outcome.path);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The export failed.');
    } finally {
      setExporting(null);
    }
  };

  // KPI State
  const [totalScans, setTotalScans] = useState(0);
  const [avgDefcon, setAvgDefcon] = useState(0);
  const [criticalThreats, setCriticalThreats] = useState(0);
  const [severityTrend, setSeverityTrend] = useState<
    {date: string; severity: number}[]
  >([]);
  const [domainDistribution, setDomainDistribution] = useState<
    {name: string; count: number}[]
  >([]);

  // Declared before the effects that use them. A useCallback dependency array
  // is evaluated during render, so a callback referenced before its own const
  // is initialised would hit the temporal dead zone.
  const calculateKPIs = useCallback((data: PredictionResult[]) => {
    setTotalScans(data.length);

    if (data.length === 0) {
      setAvgDefcon(0);
      setCriticalThreats(0);
      setSeverityTrend([]);
      setDomainDistribution([]);
      return;
    }

    // Avg DEFCON
    const totalDefcon = data.reduce((sum, item) => sum + item.defconLevel, 0);
    setAvgDefcon(Number((totalDefcon / data.length).toFixed(1)));

    // Critical Threats (DEFCON 1 or 2)
    const critical = data.filter(item => item.defconLevel <= 2).length;
    setCriticalThreats(critical);

    // Trend Data
    const trendData = [...data]
      .reverse()
      .slice(-10)
      .map(item => ({
        date: new Date(item.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        severity: item.defconLevel,
      }));
    setSeverityTrend(trendData);

    // Domain distribution comes from the factors the engine recorded, rather
    // than a substring search over the consensus prose — the prose was written
    // by the same engine, so searching it only re-found the wording.
    const domains = summariseDomains(data);
    const activeDomains = domains.labels.map((name, index) => ({
      name,
      count: domains.values[index],
    }));

    setDomainDistribution(
      activeDomains.length > 0
        ? activeDomains
        : [{name: 'General', count: data.length}],
    );
  }, []);

  const loadHistory = useCallback(() => {
    const data = storageService.getHistory();
    setHistory(data);
    calculateKPIs(data);
  }, [calculateKPIs]);

  const filterData = useCallback(() => {
    let filtered = history;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          (item.scenario || '').toLowerCase().includes(lowerQuery) ||
          (item.expertConsensus || '').toLowerCase().includes(lowerQuery) ||
          (item.activeThreats || []).some(t =>
            t.toLowerCase().includes(lowerQuery),
          ),
      );
    }

    if (selectedSeverity) {
      filtered = filtered.filter(item => item.defconLevel === selectedSeverity);
    }

    setFilteredHistory(filtered);
  }, [history, searchQuery, selectedSeverity]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    filterData();
  }, [filterData]);

  const getDefconColor = (level: number) => {
    switch (level) {
      case 1:
        return colors.danger.high; // Red
      case 2:
        return colors.danger.medium; // Orange
      case 3:
        return colors.warning.high; // Yellow
      case 4:
        return colors.success.medium; // Green
      case 5:
        return colors.chart.blue; // Blue
      default:
        return colors.light.textMuted;
    }
  };

  const renderLogItem = ({item}: {item: PredictionResult}) => (
    <View style={styles.logRow}>
      <View
        style={[
          styles.logSeverityIndicator,
          {backgroundColor: getDefconColor(item.defconLevel)},
        ]}
      />
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={styles.logTime}>
            {new Date(item.timestamp).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}{' '}
            •{' '}
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <View
            style={[
              styles.badge,
              {backgroundColor: getDefconColor(item.defconLevel)},
            ]}>
            <Text style={styles.badgeText}>DEFCON {item.defconLevel}</Text>
          </View>
        </View>
        <Text style={styles.logScenario} numberOfLines={2}>
          {item.scenario}
        </Text>
        <Text style={styles.logConsensus} numberOfLines={2}>
          {item.expertConsensus}
        </Text>
        {item.activeThreats && item.activeThreats.length > 0 && (
          <Text style={styles.logThreats} numberOfLines={1}>
            Detected: {item.activeThreats.join(', ')}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      {/* Background Gradient Layer - Matched to DashboardScreen Structural Pattern */}
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

      {/* KPI Section */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Scans</Text>
          <Text style={styles.kpiValue}>{totalScans}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Avg Severity</Text>
          <Text
            style={[
              styles.kpiValue,
              {color: getDefconColor(Math.round(avgDefcon))},
            ]}>
            {avgDefcon}
          </Text>
          <Text style={styles.kpiSubtext}>DEFCON Level</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Critical Alerts</Text>
          <Text style={[styles.kpiValue, {color: colors.danger.high}]}>
            {criticalThreats}
          </Text>
          <Text style={styles.kpiSubtext}>Last 24h</Text>
        </View>
      </View>

      {/* Charts Section */}
      <View style={styles.chartsRow}>
        <View style={styles.chartWrapper}>
          <SeverityTrendChart data={severityTrend} />
        </View>
        <View style={styles.chartWrapper}>
          <DomainDistributionChart data={domainDistribution} />
        </View>
      </View>

      {/* List Header & Filters */}
      <View style={styles.listSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Audit Log</Text>
          <View style={styles.exportActions}>
            <TouchableOpacity
              style={[
                styles.exportBtn,
                exporting === 'pdf' && styles.exportBtnBusy,
              ]}
              disabled={exporting !== null}
              accessibilityRole="button"
              onPress={() => runExport('pdf')}>
              <Text style={styles.exportBtnText}>
                {exporting === 'pdf' ? '⏳ PDF' : '📄 PDF'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.exportBtn,
                exporting === 'pptx' && styles.exportBtnBusy,
              ]}
              disabled={exporting !== null}
              accessibilityRole="button"
              onPress={() => runExport('pptx')}>
              <Text style={styles.exportBtnText}>
                {exporting === 'pptx' ? '⏳ PPTX' : '📊 PPTX'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {notice && <Text style={styles.notice}>{notice}</Text>}

        <View style={styles.filterRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search logs..."
            placeholderTextColor={colors.dark.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {/* Simple Severity Toggles */}
          <View style={styles.severityToggles}>
            {[1, 3, 5].map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.filterChip,
                  selectedSeverity === level && {
                    backgroundColor: getDefconColor(level),
                    borderColor: getDefconColor(level),
                  },
                ]}
                onPress={() =>
                  setSelectedSeverity(selectedSeverity === level ? null : level)
                }>
                <Text
                  style={[
                    styles.filterChipText,
                    selectedSeverity === level && {
                      color: colors.light.textPrimary,
                    },
                  ]}>
                  DEFCON {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Log List */}
        <FlatList
          data={filteredHistory}
          renderItem={renderLogItem}
          keyExtractor={item => item.id}
          scrollEnabled={false} // Let parent ScrollView handle scrolling
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No logs found.</Text>
          }
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1, // ENSURES BACKGROUND FILLS SCREEN EVEN IF CONTENT IS SHORT
  },
  gradientBg: {
    flex: 1,
    opacity: 0.8,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  kpiLabel: {
    color: colors.dark.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  kpiValue: {
    color: colors.dark.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  kpiSubtext: {
    color: colors.dark.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  chartsRow: {
    marginBottom: 24,
  },
  chartWrapper: {
    marginBottom: 16,
  },
  listSection: {
    backgroundColor: colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark.textPrimary,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.dark.background,
    color: colors.dark.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginRight: 12,
  },
  severityToggles: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginLeft: 8,
    backgroundColor: colors.dark.background,
  },
  filterChipText: {
    color: colors.dark.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  logRow: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: colors.dark.background,
    borderRadius: 8,
    overflow: 'hidden',
  },
  logSeverityIndicator: {
    width: 6,
  },
  logContent: {
    flex: 1,
    padding: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  logTime: {
    color: colors.dark.textMuted,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logScenario: {
    color: colors.dark.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  logConsensus: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  logThreats: {
    color: colors.danger.medium,
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyText: {
    color: colors.dark.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exportBtn: {
    backgroundColor: colors.dark.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  exportBtnText: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  exportBtnBusy: {
    opacity: 0.6,
  },
  notice: {
    color: colors.warning.high,
    fontSize: 12,
    marginBottom: 12,
  },
});
