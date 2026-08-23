// src/screens/HistoryScreen.tsx
// Screen for viewing past scenarios and predictions

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {ScenarioCard, Button} from '../components';
import {colors, spacing, typography, borderRadius} from '../styles';
import {useAppSelector, useAppDispatch} from '../redux/hooks';
import {deleteScenario} from '../redux/slices/scenarioSlice';

interface HistoryScreenProps {
  navigation: any;
}

const FILTER_OPTIONS = [
  'All',
  'Business',
  'Personal',
  'Finance',
  'Health',
  'Education',
  'Other',
];

const HistoryScreen: React.FC<HistoryScreenProps> = ({navigation}) => {
  const dispatch = useAppDispatch();
  const scenarios = useAppSelector(state => state.scenarios.scenarios);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch =
      scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scenario.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      selectedFilter === 'All' || scenario.category === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = useCallback(
    (id: string) => {
      dispatch(deleteScenario(id));
    },
    [dispatch],
  );

  const renderScenario = ({item}: {item: (typeof scenarios)[0]}) => (
    <ScenarioCard
      id={item.id}
      title={item.title}
      description={item.description}
      probability={item.probability}
      createdAt={new Date(item.createdAt).toLocaleDateString()}
      category={item.category}
      onPress={() => navigation.navigate('Results', {scenarioId: item.id})}
      onDelete={() => handleDelete(item.id)}
      style={styles.scenarioCard}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search scenarios..."
          placeholderTextColor={colors.light.textMuted}
        />
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_OPTIONS}
          keyExtractor={item => item}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedFilter === item && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter(item)}>
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === item && styles.filterTextActive,
                ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredScenarios.length} scenario
          {filteredScenarios.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Scenarios List */}
      {filteredScenarios.length > 0 ? (
        <FlatList
          data={filteredScenarios}
          keyExtractor={item => item.id}
          renderItem={renderScenario}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No scenarios found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || selectedFilter !== 'All'
              ? 'Try adjusting your search or filters'
              : 'Create your first scenario to get started'}
          </Text>
          {!searchQuery && selectedFilter === 'All' && (
            <Button
              title="Create Scenario"
              onPress={() => navigation.navigate('NewScenario')}
              variant="primary"
              style={{marginTop: spacing.lg}}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  searchContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: typography.fontSize.md,
    color: colors.light.textPrimary,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  filterContainer: {
    paddingVertical: spacing.sm,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.light.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    color: colors.light.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  resultsHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultsCount: {
    fontSize: typography.fontSize.sm,
    color: colors.light.textMuted,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  scenarioCard: {
    marginBottom: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.fontSize.md,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
});

export default HistoryScreen;
