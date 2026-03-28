import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { CATEGORY_COLORS } from '../constants/categories';
import { AppTheme } from '../constants/theme';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subMonths } from 'date-fns';
import GoalsScreen from './GoalsScreen';
import SpendingHeatmapScreen from './SpendingHeatmapScreen';
import CashFlowScreen from './CashFlowScreen';
import BillSplitScreen from './BillSplitScreen';
import PockytLogo from '../components/PockytLogo';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48;
const BAR_WIDTH = CHART_WIDTH - 32;

export default function HomeScreen() {
  const { state } = useApp();
  const theme = useTheme();
  const t = useTranslation();
  const { transactions, currency, budgets, language } = state;
  const goals = state.goals || [];
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [goalsVisible, setGoalsVisible] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [cashFlowVisible, setCashFlowVisible] = useState(false);
  const [billSplitVisible, setBillSplitVisible] = useState(false);
  const styles = useMemo(() => createStyles(theme, state.darkMode), [theme, state.darkMode]);

  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const [now, setNow] = useState(() => new Date());
  // Refresh date at midnight so period calculations stay accurate
  useEffect(() => {
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => setNow(new Date()), msUntilMidnight + 100);
    return () => clearTimeout(timer);
  }, [now]);
  // Stable key that changes when the current month/year changes, used as useMemo dep
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const yearKey = `${now.getFullYear()}`;

  const chartConfig = useMemo(() => ({
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) => `rgba(91, 108, 255, ${opacity})`,
    labelColor: () => theme.colors.textMuted,
    barPercentage: 0.6,
    decimalPlaces: 0,
  }), [theme]);

  const thisMonth = useMemo(
    () =>
      transactions.filter(tx =>
        isWithinInterval(new Date(tx.date), { start: startOfMonth(now), end: endOfMonth(now) })
      ),
    [transactions, monthKey]
  );

  const thisYear = useMemo(
    () =>
      transactions.filter(tx =>
        isWithinInterval(new Date(tx.date), { start: startOfYear(now), end: endOfYear(now) })
      ),
    [transactions, yearKey]
  );

  const activePeriod = period === 'month' ? thisMonth : thisYear;

  const totalIncome = useMemo(
    () => activePeriod.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0),
    [activePeriod]
  );

  const totalExpense = useMemo(
    () => activePeriod.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0),
    [activePeriod]
  );

  const balance = totalIncome - totalExpense;

  const categorySpend = useMemo(() => {
    const map: Record<string, number> = {};
    activePeriod
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      });
    return map;
  }, [activePeriod]);

  const categoryEntries = useMemo(
    () => Object.entries(categorySpend).sort(([, a], [, b]) => b - a),
    [categorySpend]
  );

  const pieData = useMemo(
    () =>
      categoryEntries.map(([name, amount]) => ({
        name: name.length > 12 ? name.slice(0, 12) + '…' : name,
        population: amount,
        color: CATEGORY_COLORS[name] || '#B2BEC3',
        legendFontColor: theme.colors.textMuted,
        legendFontSize: 11,
      })),
    [categoryEntries, theme]
  );

  const barData = useMemo(() => {
    const labels: string[] = [];
    const data: number[] = [];
    const count = period === 'year' ? 12 : 6;
    for (let i = count - 1; i >= 0; i--) {
      const month = subMonths(now, i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const total = transactions
        .filter(tx => tx.type === 'expense' && isWithinInterval(new Date(tx.date), { start, end }))
        .reduce((sum, tx) => sum + tx.amount, 0);
      labels.push(format(month, 'MMM'));
      data.push(total);
    }
    return { labels, datasets: [{ data: data.length > 0 ? data : [0] }] };
  }, [transactions, period, monthKey, yearKey]);

  const hasBarData = barData.datasets[0].data.some(v => v > 0);

  const drillTxs = useMemo(
    () =>
      drillCategory
        ? activePeriod
            .filter(tx => tx.category === drillCategory)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [],
    [drillCategory, activePeriod]
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradients.background}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 1, y: 0.9 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <PockytLogo variant="full" width={220} />
            <TouchableOpacity
              style={styles.periodToggleBtn}
              onPress={() => setPeriod(p => p === 'month' ? 'year' : 'month')}
              activeOpacity={0.8}
            >
              <Text style={styles.periodToggleText}>{t(period === 'month' ? 'thisMonth' : 'thisYear')}</Text>
              <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.bentoGrid}>
            {/* ROW 1: BALANCE */}
            <View style={styles.bentoRow}>
              <View style={[styles.bentoBlock, styles.bentoBalance]}>
                <View style={styles.bentoHeader}>
                  <Text style={styles.bentoLabel}>{t('netBalance')}</Text>
                  <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
                </View>
                <Text
                  style={[styles.bentoBalanceVal, { color: balance > 0 ? theme.colors.success : balance < 0 ? theme.colors.danger : theme.colors.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {fmt(balance)}
                </Text>
              </View>
            </View>

            {/* ROW 2: INCOME/EXPENSE SQUARES */}
            <View style={styles.bentoRow}>
              <View style={[styles.bentoBlock, styles.bentoSquare, { marginRight: 12 }]}>
                <Ionicons name="arrow-down-outline" size={28} color={theme.colors.success} style={{ marginBottom: 16 }} />
                <Text style={styles.bentoLabel}>{t('income')}</Text>
                <Text style={[styles.bentoSubVal, { color: theme.colors.success }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(totalIncome)}</Text>
              </View>
              <View style={[styles.bentoBlock, styles.bentoSquare]}>
                <Ionicons name="arrow-up-outline" size={28} color={theme.colors.danger} style={{ marginBottom: 16 }} />
                <Text style={styles.bentoLabel}>{t('expenses')}</Text>
                <Text style={[styles.bentoSubVal, { color: theme.colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(totalExpense)}</Text>
              </View>
            </View>

            {/* ROW 3: GOALS & TOOLS */}
            <View style={styles.bentoRow}>
              <TouchableOpacity
                style={[styles.bentoBlock, { flex: 2, marginRight: 12, justifyContent: 'space-between' }]}
                onPress={() => setGoalsVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.bentoHeader}>
                  <Text style={styles.bentoLabel}>{t('savingsGoals')}</Text>
                  <Ionicons name="trophy-outline" size={22} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.bentoHugeMetric}>
                    {goals.length > 0 ? Math.round((goals.reduce((s, g) => s + g.savedAmount, 0) / Math.max(1, goals.reduce((s, g) => s + g.targetAmount, 0))) * 100) + '%' : '0%'}
                  </Text>
                  <Text style={styles.bentoSubLabel}>{goals.filter(g => g.savedAmount >= g.targetAmount).length} {t('completed')}</Text>
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1, gap: 12 }}>
                <TouchableOpacity style={[styles.bentoBlock, styles.bentoTool]} onPress={() => setHeatmapVisible(true)} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.bentoToolLabel}>{t('heatmap')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.bentoBlock, styles.bentoTool]} onPress={() => setCashFlowVisible(true)} activeOpacity={0.8}>
                  <Ionicons name="trending-up-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.bentoToolLabel}>{t('cashFlow')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ROW 4: TOP CATEGORY & BILL SPLIT */}
            <View style={styles.bentoRow}>
              {categoryEntries.length > 0 ? (
                <TouchableOpacity
                  style={[styles.bentoBlock, { flex: 2, marginRight: 12 }]}
                  onPress={() => setDrillCategory(categoryEntries[0][0])}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bentoLabel}>{t('topSpending')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 }}>
                    <View style={[styles.catHugeDot, { backgroundColor: CATEGORY_COLORS[categoryEntries[0][0]] || theme.colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.topCatName} numberOfLines={1}>{categoryEntries[0][0]}</Text>
                      <Text style={styles.topCatAmt} numberOfLines={1}>{fmt(categoryEntries[0][1])}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.bentoBlock, { flex: 2, marginRight: 12, justifyContent: 'center', alignItems: 'center', gap: 8 }]}>
                  <Ionicons name="receipt-outline" size={28} color={theme.colors.textFaint} />
                  <Text style={styles.bentoLabel}>{t('noSpending')}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.bentoBlock, styles.bentoTool]}
                onPress={() => setBillSplitVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.bentoToolLabel}>{t('split')}</Text>
              </TouchableOpacity>
            </View>

            {/* ROW 5: CHART */}
            <View style={styles.bentoRow}>
              <View style={[styles.bentoBlock, { flex: 1, paddingHorizontal: 0, paddingBottom: 0, overflow: 'hidden' }]}>
                <View style={[styles.bentoHeader, { paddingHorizontal: 20 }]}>
                  <Text style={styles.bentoLabel}>{period === 'year' ? t('annualExpenses') : t('monthlyExpenses')}</Text>
                </View>
                {hasBarData ? (
                  <BarChart
                    data={barData}
                    width={SCREEN_WIDTH - 32}
                    height={180}
                    chartConfig={chartConfig}
                    style={{ marginTop: 16, marginLeft: -16 }}
                    showValuesOnTopOfBars={false}
                    fromZero
                    yAxisLabel=""
                    yAxisSuffix=""
                  />
                ) : (
                  <View style={styles.chartEmpty}>
                    <PockytLogo variant="mascot" width={60} />
                    <Text style={styles.chartEmptyText}>{t('noExpenseData')}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

      <GoalsScreen visible={goalsVisible} onClose={() => setGoalsVisible(false)} />
      <SpendingHeatmapScreen visible={heatmapVisible} onClose={() => setHeatmapVisible(false)} />
      <CashFlowScreen visible={cashFlowVisible} onClose={() => setCashFlowVisible(false)} />
      <BillSplitScreen visible={billSplitVisible} onClose={() => setBillSplitVisible(false)} />

      {/* Category drill-down modal */}
      <Modal
        visible={drillCategory !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setDrillCategory(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDrillCategory(null)}>
          <Pressable style={{ flex: 0 }} onPress={e => e.stopPropagation()}>
          <BlurView intensity={60} tint={state.darkMode ? 'dark' : 'light'} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.catDot,
                    { backgroundColor: CATEGORY_COLORS[drillCategory || ''] || '#B2BEC3' },
                  ]}
                />
                <Text style={styles.modalTitle}>{drillCategory}</Text>
              </View>
              <TouchableOpacity onPress={() => setDrillCategory(null)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.drillTotal}>
              {fmt(drillCategory ? categorySpend[drillCategory] || 0 : 0)}
            </Text>
            <FlatList
              data={drillTxs}
              keyExtractor={item => item.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <View style={styles.drillRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.drillNote}>{item.note || item.category}</Text>
                    <Text style={styles.drillDate}>{format(new Date(item.date), 'MMM d, yyyy')}</Text>
                  </View>
                  <Text
                    style={[
                      styles.drillAmt,
                      { color: item.type === 'income' ? theme.colors.success : theme.colors.danger },
                    ]}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {fmt(item.amount)}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.drillEmpty}>{t('noTransactions')}</Text>
              }
            />
          </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

function createStyles(theme: AppTheme, darkMode: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    safeArea: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 110 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    periodToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.glass.background,
      borderColor: theme.glass.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    periodToggleText: { fontSize: 13, fontWeight: '500', color: theme.colors.text },
    
    // Bento System
    bentoGrid: { gap: 12 },
    bentoRow: { flexDirection: 'row' },
    bentoBlock: {
      backgroundColor: theme.glass.background,
      borderColor: theme.glass.border,
      borderWidth: 1,
      borderRadius: 24,
      padding: 24,
      ...theme.shadow.card,
    },
    bentoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bentoLabel: { fontSize: 13, fontWeight: '500', color: theme.colors.textMuted },
    
    // Balance
    bentoBalance: { flex: 1, minHeight: 160, justifyContent: 'space-between' },
    bentoBalanceVal: { fontSize: 48, fontWeight: '300', marginTop: 16 },
    
    // Squares
    bentoSquare: { flex: 1, aspectRatio: 1, justifyContent: 'flex-end' },
    bentoSubVal: { fontSize: 24, fontWeight: '400', color: theme.colors.text, marginTop: 4 },
    bentoSmallVal: { fontSize: 20, fontWeight: '400', color: theme.colors.text, marginTop: 4 },
    
    // Goals
    bentoHugeMetric: { fontSize: 44, fontWeight: '300', color: theme.colors.primary, marginTop: 8 },
    bentoSubLabel: { fontSize: 13, fontWeight: '500', color: theme.colors.textMuted, marginTop: 4 },
    
    // Tools
    bentoTool: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 6 },
    bentoToolLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
    
    // Top Cat
    catHugeDot: { width: 40, height: 40, borderRadius: 20 },
    topCatName: { fontSize: 16, fontWeight: '500', color: theme.colors.text },
    topCatAmt: { fontSize: 20, fontWeight: '400', color: theme.colors.text, marginTop: 2, opacity: 0.9 },

    chartEmpty: { alignItems: 'center', paddingVertical: 40 },
    chartEmptyText: { fontSize: 13, color: theme.colors.textFaint, marginTop: 16, fontWeight: '500' },
    
    // Modals
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)', paddingBottom: 24, paddingHorizontal: 8 },
    modalSheet: {
      backgroundColor: theme.glass.background,
      borderColor: theme.glass.border,
      borderWidth: 1,
      borderRadius: 32,
      padding: 24,
      paddingBottom: 40,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    modalTitle: { fontSize: 20, fontWeight: '400', color: theme.colors.text },
    catDot: { width: 14, height: 14, borderRadius: 7 },
    drillTotal: { fontSize: 32, fontWeight: '300', color: theme.colors.text, marginBottom: 16 },
    drillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    drillNote: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
    drillDate: { fontSize: 12, color: theme.colors.textFaint, marginTop: 4 },
    drillAmt: { fontSize: 16, fontWeight: '400' },
    drillEmpty: { textAlign: 'center', color: theme.colors.textFaint, paddingVertical: 24, fontWeight: '500' },
  });
}

