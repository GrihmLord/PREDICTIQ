import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ExpertActivationChartProps {
  data: {name: string; severity: number; domain: string}[];
}

export const ExpertActivationChart: React.FC<ExpertActivationChartProps> = ({
  data,
}) => {
  if (!data || data.length === 0) {
    return (
      <View
        style={[
          styles.chartContainer,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        <Text style={styles.placeholderText}>
          Waiting for Neural Activation...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Neural Activation Levels</Text>
      <View style={styles.webChartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{top: 5, right: 30, left: 20, bottom: 5}}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              domain={[0, 10]}
              stroke="#94A3B8"
              hide={true}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#94A3B8"
              width={120}
              tick={{fontSize: 11, fill: '#CBD5E1'}}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                borderColor: '#334155',
                color: '#FFF',
              }}
              cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
              itemStyle={{color: '#E2E8F0'}}
            />
            <Bar
              dataKey="severity"
              radius={[0, 4, 4, 0]}
              barSize={24}
              name="Activation Score">
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.severity > 7
                      ? '#EF4444' // High Risk - Red
                      : entry.severity > 4
                      ? '#EAB308' // Moderate - Yellow
                      : '#10B981' // Low - Green
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    height: 300,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  webChartWrapper: {
    flex: 1,
    width: '100%',
    minHeight: 200,
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
