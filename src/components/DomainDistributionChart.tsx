import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DomainDistributionChartProps {
    data: { name: string; count: number }[];
}

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

export const DomainDistributionChart: React.FC<DomainDistributionChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <Text style={styles.noDataText}>No domain data available.</Text>;
    }

    return (
        <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Threat Distribution by Domain</Text>
            <View style={styles.webChartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#94A3B8" hide={true} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            stroke="#94A3B8"
                            width={100}
                            tick={{ fontSize: 11, fill: '#CBD5E1' }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#FFF' }}
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
    noDataText: {
        color: '#94A3B8',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 20,
    }
});
