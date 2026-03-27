import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AppTheme } from '../constants/theme';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  subMonths,
  addMonths,
  isSameDay,
} from 'date-fns';

const CELL_SIZE = Math.floor((Dimensions.get('window').width - 48 - 6 * 6) / 7);

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SpendingHeatmapScreen({ visible, onClose }: Props) {
  const { state } = useApp();
  const theme = useTheme();
  const { transactions, currency, language } = state;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);

  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { days, maxAmount, dailyTotals } = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const days = eachDayOfInterval({ start, end });

    const dailyTotals: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const key = tx.date.slice(0, 10);
      if (key >= format(start, 'yyyy-MM-dd') && key <= format(end, 'yyyy-MM-dd')) {
        dailyTotals[key] = (dailyTotals[key] || 0) + tx.amount;
      }
    });

    const max = Math.max(...Object.values(dailyTotals), 1);
    return { days, maxAmount: max, dailyTotals };
  }, [transactions, viewMonth]);

  const selectedTxs = useMemo(() => {
    if (!selectedDay) return [];
    return transactions
      .filter(tx => tx.date.slice(0, 10) === selectedDay)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedDay]);

  // Padding cells for alignment (week starts Sunday)
  const firstDayOfWeek = getDay(days[0]);
  const paddingCells = Array(firstDayOfWeek).fill(null);

  function getIntensity(amount: number): string {
    if (amount === 0) return theme.colors.surfaceMuted;
    const ratio = amount / maxAmount;
    if (ratio < 0.25) return '#BBD4FF';
    if (ratio < 0.5) return '#7BAAF7';
    if (ratio < 0.75) return '#4285F4';
    return '#1A56DB';
  }

  const totalExpense = Object.values(dailyTotals).reduce((s, v) => s + v, 0);
  const avgDaily = days.length > 0 ? totalExpense / days.length : 0;
  const activeDays = Object.keys(dailyTotals).length;
  const peakDay = Object.entries(dailyTotals).sort(([, a], [, b]) => b - a)[0];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.title}>Spending Heatmap</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Month navigator */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => setViewMonth(m => subMonths(m, 1))} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
            <TouchableOpacity onPress={() => setViewMonth(m => addMonths(m, 1))} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day of week headers */}
          <View style={styles.weekRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <Text key={d} style={styles.weekDayLabel}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {paddingCells.map((_, i) => <View key={`pad-${i}`} style={styles.cell} />)}
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const amount = dailyTotals[key] || 0;
              const selected = selectedDay === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.cell,
                    { backgroundColor: amount > 0 ? getIntensity(amount) : theme.colors.surfaceMuted },
                    selected && styles.cellSelected,
                  ]}
                  onPress={() => setSelectedDay(selected ? null : key)}
                >
                  <Text style={[styles.dayNum, amount > 0 && styles.dayNumActive]}>
                    {format(day, 'd')}
                  </Text>
                  {amount > 0 && (
                    <Text style={styles.dayAmount} numberOfLines={1}>
                      {Math.round(amount)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendLabel}>Low</Text>
            {['#BBD4FF', '#7BAAF7', '#4285F4', '#1A56DB'].map(c => (
              <View key={c} style={[styles.legendDot, { backgroundColor: c }]} />
            ))}
            <Text style={styles.legendLabel}>High</Text>
          </View>

          {/* Summary stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{fmt(totalExpense)}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{fmt(avgDaily)}</Text>
              <Text style={styles.statLabel}>Daily avg</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeDays}</Text>
              <Text style={styles.statLabel}>Active days</Text>
            </View>
          </View>

          {peakDay && (
            <View style={styles.peakCard}>
              <Ionicons name="trending-up-outline" size={16} color={theme.colors.danger} />
              <Text style={[styles.statLabel, { color: theme.colors.textMuted, marginLeft: 6 }]}>
                Peak: {peakDay[0]} · {fmt(peakDay[1])}
              </Text>
            </View>
          )}

          {/* Selected day transactions */}
          {selectedDay && (
            <View style={styles.dayDetail}>
              <Text style={styles.dayDetailTitle}>{format(new Date(selectedDay + 'T12:00:00'), 'MMMM d, yyyy')}</Text>
              {selectedTxs.length === 0 ? (
                <Text style={styles.noTx}>No transactions</Text>
              ) : (
                selectedTxs.map(tx => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txCat}>{tx.category}</Text>
                      {tx.note ? <Text style={styles.txNote}>{tx.note}</Text> : null}
                    </View>
                    <Text style={[styles.txAmt, { color: tx.type === 'income' ? theme.colors.success : theme.colors.danger }]}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    navBtn: { padding: 8 },
    monthLabel: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    weekRow: { flexDirection: 'row', marginBottom: 6 },
    weekDayLabel: { width: CELL_SIZE, textAlign: 'center', fontSize: 11, color: theme.colors.textFaint, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    cell: {
      width: CELL_SIZE, height: CELL_SIZE, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    cellSelected: { borderWidth: 2, borderColor: theme.colors.primary },
    dayNum: { fontSize: 12, fontWeight: '600', color: theme.colors.textFaint },
    dayNumActive: { color: '#fff' },
    dayAmount: { fontSize: 9, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, justifyContent: 'center' },
    legendDot: { width: 16, height: 16, borderRadius: 4 },
    legendLabel: { fontSize: 11, color: theme.colors.textFaint },
    statsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    statCard: {
      flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14,
      alignItems: 'center', ...theme.shadow.card,
    },
    statValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    statLabel: { fontSize: 11, color: theme.colors.textFaint, marginTop: 2 },
    peakCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
      borderRadius: 10, padding: 12, marginTop: 10, ...theme.shadow.card,
    },
    dayDetail: {
      backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, marginTop: 20, ...theme.shadow.card,
    },
    dayDetailTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
    noTx: { color: theme.colors.textFaint, fontSize: 14 },
    txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    txCat: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    txNote: { fontSize: 12, color: theme.colors.textMuted },
    txAmt: { fontSize: 15, fontWeight: '700' },
  });
}
