import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { AppTheme } from '../constants/theme';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  isWithinInterval,
  getDaysInMonth,
} from 'date-fns';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function monthData(transactions: any[], offset: number) {
  const now = new Date();
  const ref = subMonths(now, offset);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  const txs = transactions.filter(t =>
    isWithinInterval(new Date(t.date), { start, end })
  );
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense, month: ref, txs };
}

export default function CashFlowScreen({ visible, onClose }: Props) {
  const { state } = useApp();
  const theme = useTheme();
  const t = useTranslation();
  const { transactions, currency, language, recurringTransactions, subscriptions } = state;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);

  // Historical data for last 6 months
  const history = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => monthData(transactions, 5 - i));
  }, [transactions]);

  // Forecast: average income and expense from last 3 months
  // Recurring transactions are already reflected in historical data via processRecurring,
  // so we only use the historical averages to avoid double-counting.
  const forecast = useMemo(() => {
    const last3 = history.slice(3);
    const avgIncome = last3.reduce((s, m) => s + m.income, 0) / 3;
    const avgExpense = last3.reduce((s, m) => s + m.expense, 0) / 3;

    return Array.from({ length: 3 }, (_, i) => ({
      month: addMonths(new Date(), i + 1),
      income: avgIncome,
      expense: avgExpense,
      net: avgIncome - avgExpense,
      isForecast: true,
    }));
  }, [history]);

  const allMonths = [...history, ...forecast];
  const maxVal = Math.max(...allMonths.map(m => Math.max(m.income, m.expense)), 1);

  // Running balance starting from current balance
  const currentNet = history.reduce((s, m) => s + m.net, 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient
          colors={theme.gradients.background}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('cashFlowForecast')}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Current balance summary */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{t('sixMonthNet')}</Text>
            <Text style={[styles.balanceValue, { color: currentNet >= 0 ? theme.colors.success : theme.colors.danger }]}>
              {currentNet >= 0 ? '+' : ''}{fmt(currentNet)}
            </Text>
          </View>

          {/* Bar chart */}
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                <Text style={styles.legendText}>{t('incomeLabel')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
                <Text style={styles.legendText}>{t('expenseLabel')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.primary, opacity: 0.4 }]} />
                <Text style={[styles.legendText, { opacity: 0.7 }]}>{t('forecastLabel')}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 160 }}>
                {allMonths.map((m, i) => {
                  const incomeH = Math.max(4, (m.income / maxVal) * 140);
                  const expenseH = Math.max(4, (m.expense / maxVal) * 140);
                  const isForecast = (m as any).isForecast;
                  return (
                    <View key={i} style={{ alignItems: 'center', gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                        <View style={[styles.bar, { height: incomeH, backgroundColor: isForecast ? theme.colors.success + '55' : theme.colors.success }]} />
                        <View style={[styles.bar, { height: expenseH, backgroundColor: isForecast ? theme.colors.danger + '55' : theme.colors.danger }]} />
                      </View>
                      <Text style={[styles.barLabel, isForecast && { color: theme.colors.primary }]}>
                        {format(m.month, 'MMM')}
                      </Text>
                      {isForecast && <Text style={styles.forecastTag}>{t('estTag')}</Text>}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Monthly breakdown */}
          <Text style={styles.sectionTitle}>{t('monthlyBreakdown')}</Text>
          {allMonths.map((m, i) => {
            const isForecast = (m as any).isForecast;
            return (
              <View key={i} style={[styles.monthRow, isForecast && styles.monthRowForecast]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.monthName}>
                    {format(m.month, 'MMMM yyyy')}{isForecast ? t('estSuffix') : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <Text style={[styles.monthFigure, { color: theme.colors.success }]}>+{fmt(m.income)}</Text>
                    <Text style={[styles.monthFigure, { color: theme.colors.danger }]}>-{fmt(m.expense)}</Text>
                  </View>
                </View>
                <Text style={[styles.monthNet, { color: m.net >= 0 ? theme.colors.success : theme.colors.danger }]}>
                  {m.net >= 0 ? '+' : ''}{fmt(m.net)}
                </Text>
              </View>
            );
          })}

          {/* Upcoming known expenses */}
          {((recurringTransactions || []).length > 0 || (subscriptions || []).length > 0) && (
            <>
              <Text style={styles.sectionTitle}>{t('knownUpcoming')}</Text>
              {(recurringTransactions || [])
                .filter(r => r.type === 'expense')
                .map(r => (
                  <View key={r.id} style={styles.upcomingRow}>
                    <Ionicons name="repeat-outline" size={16} color={theme.colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.upcomingName}>{r.category}{r.note ? ` · ${r.note}` : ''}</Text>
                      <Text style={styles.upcomingDetail}>{r.frequency}</Text>
                    </View>
                    <Text style={[styles.upcomingAmt, { color: theme.colors.danger }]}>-{fmt(r.amount)}</Text>
                  </View>
                ))}
              {(subscriptions || []).map(sub => (
                <View key={sub.id} style={styles.upcomingRow}>
                  <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.upcomingName}>{sub.name}</Text>
                    <Text style={styles.upcomingDetail}>{sub.billingCycle} · due {sub.nextDueDate}</Text>
                  </View>
                  <Text style={[styles.upcomingAmt, { color: theme.colors.danger }]}>-{fmt(sub.amount)}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, borderBottomWidth: 1, borderBottomColor: theme.glass.border,
    },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.glass.border },
    title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    balanceCard: {
      backgroundColor: theme.glass.background, borderRadius: 24, padding: 24,
      alignItems: 'center', marginBottom: 20, ...theme.shadow.card,
      borderWidth: 1, borderColor: theme.glass.border,
    },
    balanceLabel: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 8 },
    balanceValue: { fontSize: 36, fontWeight: '300' },
    chartSection: { 
      backgroundColor: theme.glass.background, borderRadius: 24, padding: 20, marginBottom: 20, ...theme.shadow.card,
      borderWidth: 1, borderColor: theme.glass.border,
    },
    chartHeader: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: theme.colors.textMuted },
    bar: { width: 20, borderRadius: 4 },
    barLabel: { fontSize: 10, color: theme.colors.textFaint, fontWeight: '600' },
    forecastTag: { fontSize: 9, color: theme.colors.primary, fontWeight: '700' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
    monthRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: theme.glass.background,
      borderRadius: 16, padding: 16, marginBottom: 10, ...theme.shadow.card,
      borderWidth: 1, borderColor: theme.glass.border,
    },
    monthRowForecast: { opacity: 0.7, borderWidth: 1, borderColor: theme.colors.primary + '44', borderStyle: 'dashed' },
    monthName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    monthFigure: { fontSize: 13, fontWeight: '600' },
    monthNet: { fontSize: 18, fontWeight: '500' },
    upcomingRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: theme.glass.background,
      borderRadius: 16, padding: 16, marginBottom: 10, ...theme.shadow.card,
      borderWidth: 1, borderColor: theme.glass.border,
    },
    upcomingName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    upcomingDetail: { fontSize: 12, color: theme.colors.textMuted },
    upcomingAmt: { fontSize: 15, fontWeight: '700' },
  });
}
