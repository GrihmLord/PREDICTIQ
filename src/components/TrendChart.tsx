// src/components/TrendChart.tsx
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  {name: 'Jan', value: 4000},
  {name: 'Feb', value: 3000},
  {name: 'Mar', value: 2000},
  {name: 'Apr', value: 2780},
  {name: 'May', value: 1890},
  {name: 'Jun', value: 2390},
  {name: 'Jul', value: 3490},
];

export const TrendChart: React.FC = () => {
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Market Confidence Trend</Text>
      <View style={styles.webChartWrapper}>
        {/* Recharts renders to DOM, so we need a DOM-like container */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94A3B8" />
            <YAxis stroke="#94A3B8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                borderColor: '#334155',
                color: '#FFF',
              }}
              itemStyle={{color: '#8B5CF6'}}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={{fill: '#8B5CF6'}}
            />
          </LineChart>
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
    // Helper to ensure web content takes space
    width: '100%',
    minHeight: 200,
  },
});
