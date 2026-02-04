import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SeverityTrendChartProps {
    data: { date: string; severity: number }[];
}

export const SeverityTrendChart: React.FC<SeverityTrendChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <Text style={styles.noDataText}>No trend data available.</Text>;
    }

    return (
        <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>DEFCON Level Trend</Text>
            <View style={styles.webChartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tick={{ fill: '#94A3B8' }} />
                        <YAxis stroke="#94A3B8" domain={[1, 5]} reversed={true} tick={{ fill: '#94A3B8' }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#FFF' }}
                            itemStyle={{ color: '#F43F5E' }}
                        />
                        <Line type="monotone" dataKey="severity" stroke="#F43F5E" strokeWidth={3} dot={{ fill: '#F43F5E', r: 4 }} activeDot={{ r: 6 }} />
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
        width: '100%',
        minHeight: 200,
    },
    noDataText: {
        color: '#94A3B8',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 20,
    }
});
