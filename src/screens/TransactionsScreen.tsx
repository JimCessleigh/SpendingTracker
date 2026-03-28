import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { Transaction, RecurringFrequency, Card, MerchantRule } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/categories';
import { AppTheme } from '../constants/theme';
import { format } from 'date-fns';
import PockytLogo from '../components/PockytLogo';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const PAGE_SIZE = 40;

// ── Cashback optimizer ──────────────────────────────────────────────────────
function bestCardForCategory(cards: Card[], category: string): { card: Card; rate: number } | null {
  let best: { card: Card; rate: number } | null = null;
  for (const card of cards) {
    const rate = card.cashbackRates?.[category] ?? card.defaultCashback ?? 0;
    if (!best || rate > best.rate) best = { card, rate };
  }
  return best && best.rate > 0 ? best : null;
}

// ── Undo toast ─────────────────────────────────────────────────────────────
function UndoToast({
  visible,
  message,
  onUndo,
  theme,
}: {
  visible: boolean;
  message: string;
  onUndo: () => void;
  theme: AppTheme;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View style={[{
      position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 999,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.colors.text, borderRadius: 12, padding: 14, paddingHorizontal: 18,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 8,
    }, { opacity }]}>
      <Text style={{ color: theme.colors.background, fontSize: 14, fontWeight: '500', flex: 1 }}>{message}</Text>
      <TouchableOpacity onPress={onUndo} style={{ marginLeft: 16 }}>
        <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '700' }}>Undo</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Transaction item ───────────────────────────────────────────────────────
function TransactionItem({
  item,
  currency,
  locale,
  cards,
  theme,
  styles,
  onDelete,
  onEdit,
  onDuplicate,
  selected,
  selectMode,
  onToggleSelect,
}: {
  item: Transaction;
  currency: string;
  locale: string;
  cards: Card[];
  theme: AppTheme;
  styles: any;
  onDelete: (id: string) => void;
  onEdit: (item: Transaction) => void;
  onDuplicate: (item: Transaction) => void;
  selected: boolean;
  selectMode: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  const linkedCard = item.cardId ? cards.find(c => c.id === item.cardId) : undefined;

  function handleLongPress() {
    onToggleSelect(item.id);
  }

  return (
    <TouchableOpacity
      onPress={() => selectMode ? onToggleSelect(item.id) : undefined}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      style={styles.timelineWrapper}
    >
      <View style={styles.timelineAxis}>
        <View style={styles.timelineStem} />
        <View style={[styles.timelineNode, { borderColor: CATEGORY_COLORS[item.category] || theme.colors.primary }]} />
      </View>

      <View style={[styles.item, selected && styles.itemSelected]}>
        {selectMode && (
          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
            {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}
        <View style={[styles.iconBg, { backgroundColor: (CATEGORY_COLORS[item.category] || '#888') + '22' }]}>
          <Ionicons
            name={(CATEGORY_ICONS[item.category] || 'ellipsis-horizontal') as any}
            size={22}
            color={CATEGORY_COLORS[item.category] || theme.colors.textMuted}
          />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemCategory}>{item.category}</Text>
          <Text style={styles.itemNote} numberOfLines={1}>{item.note || format(new Date(item.date), 'MMM d, yyyy')}</Text>
          <View style={styles.itemMeta}>
            {item.note ? <Text style={styles.itemDate}>{format(new Date(item.date), 'MMM d, yyyy')}</Text> : null}
            {linkedCard && (
              <View style={[styles.cardBadge, { backgroundColor: linkedCard.color + '22' }]}>
                <Ionicons name="card-outline" size={10} color={linkedCard.color} />
                <Text style={[styles.cardBadgeText, { color: linkedCard.color }]}>{linkedCard.name}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.itemAmount, { color: item.type === 'income' ? theme.colors.success : theme.colors.danger }]}>
          {item.type === 'income' ? '+' : '-'}{fmt(item.amount)}
        </Text>
        {!selectMode && (
          <>
            <TouchableOpacity onPress={() => onDuplicate(item)} style={styles.actionBtn}>
              <Ionicons name="copy-outline" size={16} color={theme.colors.textFaint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionBtn}>
              <Ionicons name="pencil-outline" size={16} color={theme.colors.textFaint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.textFaint} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const FREQ_OPTIONS: RecurringFrequency[] = ['daily', 'weekly', 'monthly'];

export default function TransactionsScreen() {
  const { state, dispatch } = useApp();
  const theme = useTheme();
  const t = useTranslation();
  const { transactions, currency, categories, cards, language, merchantRules } = state;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);

  // ── Form state ──────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [cardId, setCardId] = useState('');
  const [txDate, setTxDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');

  // ── Filter state ─────────────────────────────────────────────────────────
  const [filterMonth, setFilterMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Pagination ──────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Bulk select ─────────────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCatModalVisible, setBulkCatModalVisible] = useState(false);

  // ── Undo ────────────────────────────────────────────────────────────────
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoTx, setUndoTx] = useState<Transaction | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Card statement view ─────────────────────────────────────────────────
  const [cardStatementVisible, setCardStatementVisible] = useState(false);
  const [statementCardId, setStatementCardId] = useState('');

  // ── Cashback hint in form ───────────────────────────────────────────────
  const cashbackHint = useMemo(() => {
    if (!category || cards.length === 0 || !cardId) return null;
    const best = bestCardForCategory(cards, category);
    if (!best) return null;
    if (best.card.id === cardId) return null; // already using best card
    return `Use ${best.card.name} for ${best.rate}% cashback on ${category}`;
  }, [category, cards, cardId]);

  // ── Filtered & paginated list ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = transactions;
    if (filterMonth) result = result.filter(tx => tx.date.startsWith(filterMonth));
    if (filterCategory) result = result.filter(tx => tx.category === filterCategory);
    if (filterType !== 'all') result = result.filter(tx => tx.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(tx =>
        tx.note.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q)
      );
    }
    if (minAmount.trim()) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) result = result.filter(tx => tx.amount >= min);
    }
    if (maxAmount.trim()) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) result = result.filter(tx => tx.amount <= max);
    }
    if (dateFrom.trim() && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      result = result.filter(tx => tx.date.slice(0, 10) >= dateFrom);
    }
    if (dateTo.trim() && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      result = result.filter(tx => tx.date.slice(0, 10) <= dateTo);
    }
    return result.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterMonth, filterCategory, filterType, searchQuery, minAmount, maxAmount, dateFrom, dateTo]);

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = paginated.length < filtered.length;

  const months = useMemo(() => {
    const set = new Set(transactions.map(tx => tx.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // ── Merchant rule auto-categorize ───────────────────────────────────────
  function applyMerchantRules(noteText: string): string | null {
    if (!merchantRules?.length) return null;
    const lower = noteText.toLowerCase();
    for (const rule of merchantRules) {
      if (lower.includes(rule.keyword.toLowerCase())) return rule.category;
    }
    return null;
  }

  function handleNoteChange(val: string) {
    setNote(val);
    if (!editingTx && !category) {
      const suggested = applyMerchantRules(val);
      if (suggested && categories.includes(suggested)) setCategory(suggested);
    }
  }

  // ── Form helpers ────────────────────────────────────────────────────────
  function resetForm() {
    setAmount('');
    setCategory('');
    setNote('');
    setCardId('');
    setTxDate('');
    setType('expense');
    setEditingTx(null);
    setIsRecurring(false);
    setFrequency('monthly');
    setModalVisible(false);
  }

  function handleEdit(tx: Transaction) {
    setEditingTx(tx);
    setType(tx.type);
    setAmount(tx.amount.toString());
    setCategory(tx.category);
    setNote(tx.note);
    setCardId(tx.cardId || '');
    setTxDate(tx.date.slice(0, 10));
    setModalVisible(true);
  }

  function handleDuplicate(tx: Transaction) {
    const newTx: Transaction = {
      ...tx,
      id: generateId(),
      date: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TRANSACTION', payload: newTx });
  }

  function handleSave() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      Alert.alert(t('invalidAmount'), t('enterValidAmount'));
      return;
    }
    if (!category) {
      Alert.alert(t('selectCategory'), t('pleaseSelectCategory'));
      return;
    }
    const dateValue = txDate && /^\d{4}-\d{2}-\d{2}$/.test(txDate)
      ? new Date(txDate + 'T12:00:00').toISOString()
      : new Date().toISOString();

    if (editingTx) {
      dispatch({
        type: 'UPDATE_TRANSACTION',
        payload: { ...editingTx, amount: parsed, type, category, note, date: dateValue, cardId: cardId || undefined },
      });
    } else {
      const tx: Transaction = {
        id: generateId(),
        amount: parsed,
        type,
        category,
        note,
        date: dateValue,
        cardId: cardId || undefined,
      };
      dispatch({ type: 'ADD_TRANSACTION', payload: tx });
      if (isRecurring) {
        dispatch({
          type: 'ADD_RECURRING',
          payload: { id: generateId(), amount: parsed, type, category, note, frequency, lastAddedDate: new Date().toISOString() },
        });
      }
    }
    resetForm();
  }

  function handleDelete(id: string) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    setUndoTx(tx);
    setUndoVisible(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      setUndoVisible(false);
      setUndoTx(null);
    }, 4000);
  }

  function handleUndo() {
    if (undoTx) {
      dispatch({ type: 'ADD_TRANSACTION', payload: undoTx });
      setUndoVisible(false);
      setUndoTx(null);
      if (undoTimer.current) clearTimeout(undoTimer.current);
    }
  }

  // ── Bulk actions ────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    if (!selectMode) setSelectMode(true);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    Alert.alert(t('deleteTransactions'), t('deleteNTransactions')(selectedIds.size), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive', onPress: () => {
          selectedIds.forEach(id => dispatch({ type: 'DELETE_TRANSACTION', payload: id }));
          exitSelectMode();
        },
      },
    ]);
  }

  function handleBulkRecategorize(newCat: string) {
    selectedIds.forEach(id => {
      const tx = transactions.find(t => t.id === id);
      if (tx) dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...tx, category: newCat } });
    });
    setBulkCatModalVisible(false);
    exitSelectMode();
  }

  // ── Card statement ──────────────────────────────────────────────────────
  const statementData = useMemo(() => {
    if (!statementCardId) return [];
    const cardTxs = transactions
      .filter(tx => tx.cardId === statementCardId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const byMonth: Record<string, Transaction[]> = {};
    cardTxs.forEach(tx => {
      const key = tx.date.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(tx);
    });
    return Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a));
  }, [transactions, statementCardId]);

  const renderItem = ({ item }: { item: Transaction }) => (
    <TransactionItem
      item={item}
      currency={currency}
      locale={locale}
      cards={cards}
      theme={theme}
      styles={styles}
      onDelete={handleDelete}
      onEdit={handleEdit}
      onDuplicate={handleDuplicate}
      selected={selectedIds.has(item.id)}
      selectMode={selectMode}
      onToggleSelect={toggleSelect}
    />
  );

  const activeFilterCount = [filterMonth, filterCategory, minAmount, maxAmount, dateFrom, dateTo].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradients.background}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
      <View style={styles.headerRow}>
        {selectMode ? (
          <>
            <TouchableOpacity onPress={exitSelectMode} style={styles.cancelBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.header}>{t('nSelected')(selectedIds.size)}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setBulkCatModalVisible(true)} disabled={selectedIds.size === 0}>
                <Ionicons name="pricetag-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.danger }]} onPress={handleBulkDelete} disabled={selectedIds.size === 0}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <PockytLogo variant="spending" width={48} />
              <Text style={styles.header}>{t('transactions')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {cards.length > 0 && (
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]} onPress={() => setCardStatementVisible(true)}>
                  <Ionicons name="card-outline" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textFaint} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchTransactions')}
          placeholderTextColor={theme.colors.textFaint}
          value={searchQuery}
          onChangeText={val => { setSearchQuery(val); setPage(1); }}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && Platform.OS === 'android' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textFaint} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setShowAdvancedFilters(v => !v)} style={styles.filterToggleBtn}>
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? theme.colors.primary : theme.colors.textFaint} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Advanced filters */}
      {showAdvancedFilters && (
        <View style={styles.advancedFilters}>
          <Text style={styles.advancedLabel}>{t('amountRange')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <TextInput
              style={[styles.advancedInput, { flex: 1 }]}
              placeholder="Min"
              placeholderTextColor={theme.colors.textFaint}
              keyboardType="decimal-pad"
              value={minAmount}
              onChangeText={val => { setMinAmount(val); setPage(1); }}
            />
            <Text style={{ color: theme.colors.textMuted, alignSelf: 'center' }}>–</Text>
            <TextInput
              style={[styles.advancedInput, { flex: 1 }]}
              placeholder="Max"
              placeholderTextColor={theme.colors.textFaint}
              keyboardType="decimal-pad"
              value={maxAmount}
              onChangeText={val => { setMaxAmount(val); setPage(1); }}
            />
          </View>
          <Text style={styles.advancedLabel}>{t('dateRangeFormat')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.advancedInput, { flex: 1 }]}
              placeholder="From"
              placeholderTextColor={theme.colors.textFaint}
              value={dateFrom}
              onChangeText={val => { setDateFrom(val); setPage(1); }}
              maxLength={10}
            />
            <Text style={{ color: theme.colors.textMuted, alignSelf: 'center' }}>–</Text>
            <TextInput
              style={[styles.advancedInput, { flex: 1 }]}
              placeholder="To"
              placeholderTextColor={theme.colors.textFaint}
              value={dateTo}
              onChangeText={val => { setDateTo(val); setPage(1); }}
              maxLength={10}
            />
          </View>
          {(minAmount || maxAmount || dateFrom || dateTo) && (
            <TouchableOpacity onPress={() => { setMinAmount(''); setMaxAmount(''); setDateFrom(''); setDateTo(''); setPage(1); }} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
              <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600' }}>{t('clearFilters')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Type filter */}
      <View style={styles.typeFilterRow}>
        {(['all', 'expense', 'income'] as const).map(ft => (
          <TouchableOpacity
            key={ft}
            style={[
              styles.typeFilterChip,
              filterType === ft && (
                ft === 'expense' ? styles.typeFilterExpenseActive :
                ft === 'income' ? styles.typeFilterIncomeActive :
                styles.typeFilterAllActive
              ),
            ]}
            onPress={() => { setFilterType(ft); setPage(1); }}
          >
            <Text style={[styles.typeFilterText, filterType === ft && styles.typeFilterTextActive]}>
              {ft === 'all' ? t('all') : ft === 'expense' ? t('expense') : t('incomeType')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Month filter */}
      {months.length > 0 && (
        <>
          <Text style={styles.filterSectionLabel}>{t('month')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
            <TouchableOpacity style={[styles.filterChip, !filterMonth && styles.filterChipActive]} onPress={() => { setFilterMonth(''); setPage(1); }}>
              <Text style={[styles.filterChipText, !filterMonth && styles.filterChipTextActive]}>{t('all')}</Text>
            </TouchableOpacity>
            {months.map(m => (
              <TouchableOpacity key={m} style={[styles.filterChip, filterMonth === m && styles.filterChipActive]} onPress={() => { setFilterMonth(m); setPage(1); }}>
                <Text style={[styles.filterChipText, filterMonth === m && styles.filterChipTextActive]}>
                  {format(new Date(m + '-01'), 'MMM yyyy')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Category filter */}
      <Text style={styles.filterSectionLabel}>{t('category')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity style={[styles.filterChip, !filterCategory && styles.filterChipActive]} onPress={() => { setFilterCategory(''); setPage(1); }}>
          <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>{t('all')}</Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity key={cat} style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]} onPress={() => { setFilterCategory(filterCategory === cat ? '' : cat); setPage(1); }}>
            <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Result count */}
      {filtered.length > 0 && (
        <Text style={styles.resultCount}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} · {fmt(filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))} out · {fmt(filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))} in
        </Text>
      )}

      <FlatList
        data={paginated}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : { padding: 16, gap: 10, paddingBottom: 80 }}
        onEndReached={() => { if (hasMore) setPage(p => p + 1); }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <PockytLogo variant="spending" width={110} />
            <Text style={styles.emptyText}>{t('noTransactions')}</Text>
            <Text style={styles.emptyHint}>{t('tapToAdd')}</Text>
          </View>
        }
        ListFooterComponent={hasMore ? (
          <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setPage(p => p + 1)}>
            <Text style={styles.loadMoreText}>{t('loadMoreN')(filtered.length - paginated.length)}</Text>
          </TouchableOpacity>
        ) : null}
      />

      {/* Undo toast */}
      <UndoToast visible={undoVisible} message={t('transactionDeleted')} onUndo={handleUndo} theme={theme} />

      {/* ── Add/Edit modal ─────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={resetForm}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint={state.darkMode ? 'dark' : 'light'} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTx ? t('editTransaction') : t('addTransaction')}</Text>
              <TouchableOpacity onPress={resetForm}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.typeToggle}>
                <TouchableOpacity style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]} onPress={() => setType('expense')}>
                  <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>{t('expense')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, type === 'income' && styles.typeBtnIncomeActive]} onPress={() => setType('income')}>
                  <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>{t('incomeType')}</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder={t('amount')}
                placeholderTextColor={theme.colors.textFaint}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />

              <TextInput
                style={styles.input}
                placeholder={t('noteOptional')}
                placeholderTextColor={theme.colors.textFaint}
                value={note}
                onChangeText={handleNoteChange}
              />

              <Text style={styles.inputLabel}>{t('transactionDate')}</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={[styles.dateChip, !txDate && styles.dateChipActive]} onPress={() => setTxDate('')}>
                  <Text style={[styles.dateChipText, !txDate && styles.dateChipTextActive]}>{t('today')}</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textFaint}
                  value={txDate}
                  onChangeText={setTxDate}
                  maxLength={10}
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <Text style={styles.inputLabel}>{t('category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, category === cat && { backgroundColor: CATEGORY_COLORS[cat] || theme.colors.primary }]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Cashback hint */}
              {cashbackHint && (
                <View style={styles.cashbackHint}>
                  <Ionicons name="card-outline" size={14} color={theme.colors.success} />
                  <Text style={[styles.cashbackHintText, { color: theme.colors.success }]}>{cashbackHint}</Text>
                </View>
              )}

              {cards.length > 0 && (
                <>
                  <Text style={styles.inputLabel}>{t('cardOptional')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                    <TouchableOpacity style={[styles.catChip, !cardId && styles.noCardChipActive]} onPress={() => setCardId('')}>
                      <Text style={[styles.catChipText, !cardId && styles.catChipTextActive]}>{t('noCard')}</Text>
                    </TouchableOpacity>
                    {cards.map(c => (
                      <TouchableOpacity key={c.id} style={[styles.catChip, cardId === c.id && { backgroundColor: c.color }]} onPress={() => setCardId(c.id)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="card-outline" size={12} color={cardId === c.id ? '#fff' : theme.colors.textMuted} />
                          <Text style={[styles.catChipText, cardId === c.id && styles.catChipTextActive]}>{c.name}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {!editingTx && (
                <>
                  <View style={styles.recurringRow}>
                    <Text style={styles.inputLabel}>{t('recurring')}</Text>
                    <Switch
                      value={isRecurring}
                      onValueChange={setIsRecurring}
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary + '88' }}
                      thumbColor={isRecurring ? theme.colors.primary : theme.colors.textFaint}
                    />
                  </View>
                  {isRecurring && (
                    <View style={styles.freqRow}>
                      {FREQ_OPTIONS.map(f => (
                        <TouchableOpacity key={f} style={[styles.catChip, frequency === f && styles.freqChipActive]} onPress={() => setFrequency(f)}>
                          <Text style={[styles.catChipText, frequency === f && styles.catChipTextActive]}>{t(f as any)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editingTx ? t('updateTransaction') : t('saveTransaction')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Bulk recategorize modal ─────────────────────────────────── */}
      <Modal visible={bulkCatModalVisible} animationType="slide" transparent onRequestClose={() => setBulkCatModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint={state.darkMode ? 'dark' : 'light'} style={[styles.modalSheet, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('recategorizeN')(selectedIds.size)}</Text>
              <TouchableOpacity onPress={() => setBulkCatModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {categories.map(cat => (
                <TouchableOpacity key={cat} style={styles.bulkCatRow} onPress={() => handleBulkRecategorize(cat)}>
                  <View style={[styles.iconBg, { backgroundColor: (CATEGORY_COLORS[cat] || '#888') + '22', width: 32, height: 32 }]}>
                    <Ionicons name={(CATEGORY_ICONS[cat] || 'ellipsis-horizontal') as any} size={16} color={CATEGORY_COLORS[cat] || theme.colors.textMuted} />
                  </View>
                  <Text style={[styles.itemCategory, { marginLeft: 12 }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* ── Card statement modal ───────────────────────────────────── */}
      <Modal visible={cardStatementVisible} animationType="slide" transparent onRequestClose={() => setCardStatementVisible(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint={state.darkMode ? 'dark' : 'light'} style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('cardStatement')}</Text>
              <TouchableOpacity onPress={() => setCardStatementVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            {/* Card selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
              {cards.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catChip, statementCardId === c.id && { backgroundColor: c.color }]}
                  onPress={() => setStatementCardId(c.id)}
                >
                  <Text style={[styles.catChipText, statementCardId === c.id && styles.catChipTextActive]}>{c.name} ···{c.lastFour}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {statementCardId ? (
              <ScrollView style={{ flex: 1 }}>
                {statementData.length === 0 ? (
                  <Text style={{ color: theme.colors.textFaint, textAlign: 'center', padding: 32 }}>{t('noTransactionsForCard')}</Text>
                ) : statementData.map(([month, txs]) => {
                  const total = txs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
                  return (
                    <View key={month}>
                      <View style={styles.statementMonthHeader}>
                        <Text style={styles.statementMonthLabel}>{format(new Date(month + '-01'), 'MMMM yyyy')}</Text>
                        <Text style={[styles.statementMonthTotal, { color: theme.colors.danger }]}>{fmt(total)}</Text>
                      </View>
                      {txs.map(tx => (
                        <View key={tx.id} style={styles.statementRow}>
                          <Text style={styles.statementDate}>{format(new Date(tx.date), 'MMM d')}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemCategory}>{tx.category}</Text>
                            {tx.note ? <Text style={styles.itemNote}>{tx.note}</Text> : null}
                          </View>
                          <Text style={{ color: tx.type === 'income' ? theme.colors.success : theme.colors.danger, fontWeight: '600' }}>
                            {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={{ color: theme.colors.textFaint, textAlign: 'center', padding: 32 }}>{t('selectCardAbove')}</Text>
            )}
          </BlurView>
        </View>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' }, // fallback
    safeArea: { flex: 1 },
    headerRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16,
    },
    header: { fontSize: 28, fontWeight: '400', color: theme.colors.text },
    cancelBtn: { padding: 4 },
    addBtn: {
      backgroundColor: theme.colors.primary, width: 44, height: 44,
      borderRadius: 22, alignItems: 'center', justifyContent: 'center',
      ...theme.shadow.card,
    },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: theme.glass.background,
      marginHorizontal: 16, marginBottom: 10, borderRadius: 16, paddingHorizontal: 16,
      borderWidth: 1, borderColor: theme.glass.border,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 15, paddingVertical: 10, color: theme.colors.text },
    filterToggleBtn: { padding: 6, position: 'relative' },
    filterBadge: {
      position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: 8,
      backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    advancedFilters: {
      marginHorizontal: 16, marginBottom: 10, padding: 16,
      backgroundColor: theme.glass.background, borderRadius: 16,
      borderWidth: 1, borderColor: theme.glass.border,
    },
    advancedLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    advancedInput: {
      borderWidth: 1, borderColor: theme.glass.border, borderRadius: 10, padding: 10,
      fontSize: 14, color: theme.colors.text, backgroundColor: 'rgba(0,0,0,0.1)',
    },
    typeFilterRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
    typeFilterChip: {
      flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.glass.background,
      borderWidth: 1, borderColor: theme.glass.border, alignItems: 'center',
    },
    typeFilterAllActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    typeFilterExpenseActive: { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },
    typeFilterIncomeActive: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
    typeFilterText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
    typeFilterTextActive: { color: '#fff' },
    filterBar: { maxHeight: 44 },
    filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
    filterChip: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
      backgroundColor: theme.glass.background, borderWidth: 1, borderColor: theme.glass.border,
    },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterChipText: { fontSize: 13, color: theme.colors.textMuted },
    filterChipTextActive: { color: '#fff', fontWeight: '600' },
    resultCount: { fontSize: 13, fontWeight: '500', color: theme.colors.textMuted, paddingHorizontal: 16, marginBottom: 12, marginTop: 4 },
    filterSectionLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 6, marginTop: 4 },
    timelineWrapper: { flexDirection: 'row' },
    timelineAxis: { width: 32, alignItems: 'center' },
    timelineStem: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: theme.glass.border },
    timelineNode: { position: 'absolute', top: 32, width: 14, height: 14, borderRadius: 7, borderWidth: 3.5, backgroundColor: theme.colors.background },
    item: {
      flex: 1, backgroundColor: theme.glass.background, borderRadius: 24, padding: 16,
      flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: theme.glass.border,
      ...theme.shadow.card,
      marginBottom: 16,
    },
    itemSelected: { borderWidth: 2, borderColor: theme.colors.primary },
    checkbox: {
      width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.border,
      alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface,
    },
    checkboxSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    itemInfo: { flex: 1 },
    itemCategory: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    itemNote: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    itemDate: { fontSize: 11, color: theme.colors.textFaint, marginTop: 1 },
    itemMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 1 },
    cardBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    },
    cardBadgeText: { fontSize: 10, fontWeight: '700' },
    itemAmount: { fontSize: 18, fontWeight: '500' },
    actionBtn: { padding: 8 },
    cashbackHint: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.success + '18', borderRadius: 8, padding: 8, marginBottom: 12,
    },
    cashbackHintText: { fontSize: 12, fontWeight: '600', flex: 1 },
    loadMoreBtn: {
      alignItems: 'center', padding: 14,
      borderTopWidth: 1, borderTopColor: theme.colors.border,
    },
    loadMoreText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
    emptyContainer: { flex: 1, justifyContent: 'center' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, color: theme.colors.textMuted, fontWeight: '500', marginTop: 12 },
    emptyHint: { fontSize: 13, color: theme.colors.textFaint, marginTop: 4 },
    bulkCatRow: {
      flexDirection: 'row', alignItems: 'center', padding: 14,
      borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    statementMonthHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: theme.colors.border, marginBottom: 4,
    },
    statementMonthLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    statementMonthTotal: { fontSize: 15, fontWeight: '700' },
    statementRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    statementDate: { fontSize: 12, color: theme.colors.textMuted, width: 44 },
    noCardChipActive: { backgroundColor: theme.colors.primary },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingBottom: 24 },
    modalSheet: {
      backgroundColor: theme.glass.background, borderWidth: 1, borderColor: theme.glass.border,
      borderRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%', overflow: 'hidden',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '400', color: theme.colors.text },
    typeToggle: {
      flexDirection: 'row', backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12, padding: 4, marginBottom: 16,
    },
    typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    typeBtnActive: { backgroundColor: theme.colors.danger },
    typeBtnIncomeActive: { backgroundColor: theme.colors.success },
    typeBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
    typeBtnTextActive: { color: '#fff' },
    input: {
      borderWidth: 1, borderColor: theme.glass.border, borderRadius: 16, padding: 16,
      fontSize: 16, marginBottom: 16, backgroundColor: 'rgba(0,0,0,0.08)', color: theme.colors.text,
    },
    inputLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 8 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    dateChip: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.08)', borderWidth: 1, borderColor: theme.glass.border },
    dateChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    dateChipText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
    dateChipTextActive: { color: '#fff' },
    dateInput: { flex: 1, marginBottom: 0 },
    catScroll: { marginBottom: 20 },
    catChip: {
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.08)', marginRight: 8, borderWidth: 1, borderColor: theme.glass.border,
    },
    catChipText: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '500' },
    catChipTextActive: { color: '#fff', fontWeight: '600' },
    recurringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    freqRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    freqChipActive: { backgroundColor: theme.colors.primary },
    saveBtn: { backgroundColor: theme.colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 8 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
