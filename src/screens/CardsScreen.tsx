import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { Card } from '../types';
import { CARD_COLORS } from '../constants/categories';
import { detectBankDomain, logoUrl, KNOWN_BANKS, getBankInfo } from '../constants/banks';
import { AppTheme } from '../constants/theme';
import PockytLogo from '../components/PockytLogo';
import {
  setupNotificationChannel,
  requestNotificationPermissions,
  scheduleCardReminder,
  cancelCardReminder,
} from '../notifications/notifications';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function ordinal(day: number): string {
  if ([11, 12, 13].includes(day)) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

function parseDueDay(dueDate: string): number {
  const parts = dueDate.split('-').map(Number);
  return parts[parts.length - 1];
}

function daysUntilDue(dueDate: string): number {
  const day = parseDueDay(dueDate);
  const today = new Date();
  let due = new Date(today.getFullYear(), today.getMonth(), day);
  if (due <= today) due = new Date(today.getFullYear(), today.getMonth() + 1, day);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatAnniversary(date: string): string {
  const [month, day] = date.split('-').map(Number);
  return `${MONTHS[month - 1]} ${ordinal(day)}`;
}

function BankBadge({ domain, size = 36 }: { domain: string; size?: number }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const info = getBankInfo(domain);
  const bgColor = info?.color ?? '#6C5CE7';
  const initials = (info?.name ?? domain.split('.')[0]).slice(0, 2).toUpperCase();
  const imgSize = Math.round(size * 0.78);
  const offset = Math.round((size - imgSize) / 2);

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {(!imgLoaded || imgFailed) && (
        <Text style={{ color: '#fff', fontWeight: '700', letterSpacing: 0.5, fontSize: size * 0.32 }}>{initials}</Text>
      )}
      {!imgFailed && (
        <Image
          source={{ uri: logoUrl(domain) }}
          style={{
            width: imgSize,
            height: imgSize,
            position: 'absolute',
            top: offset,
            left: offset,
            borderRadius: imgSize / 2,
          }}
          resizeMode="cover"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgFailed(true)}
        />
      )}
    </View>
  );
}

function CardItem({
  card,
  spent,
  currency,
  locale,
  theme,
  styles,
  onDelete,
  onEdit,
  onToggleReminder,
}: {
  card: Card;
  spent: number;
  currency: string;
  locale: string;
  theme: AppTheme;
  styles: any;
  onDelete: (id: string) => void;
  onEdit: (card: Card) => void;
  onToggleReminder: (card: Card) => void;
}) {
  const t = useTranslation();
  const days = daysUntilDue(card.dueDate);
  const dueDay = parseDueDay(card.dueDate);
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onEdit(card)}
      onLongPress={() => onDelete(card.id)}
    >
      <LinearGradient
        colors={[card.color, card.color + 'aa', card.color + '66']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardItem}
      >
        <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{card.name}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onToggleReminder(card)} style={styles.actionBtn}>
            <Ionicons
              name={card.reminderEnabled ? 'notifications' : 'notifications-outline'}
              size={18}
              color={card.reminderEnabled ? '#fff' : 'rgba(255,255,255,0.55)'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(card)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={18} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(card.id)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.55)" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.cardNumber}>•••• •••• •••• {card.lastFour}</Text>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardDueLabel}>{t('paymentDue')}</Text>
          <Text style={styles.cardDueText}>
            {t('monthlyOn')} {ordinal(dueDay)} · {days === 0 ? t('todayDue') : `${days}${t('daysLeft')}`}
          </Text>
        </View>
        {spent > 0 && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardDueLabel}>{t('cardSpent')} ({t('thisMonth')})</Text>
            <Text style={styles.cardDueText}>{fmt(spent)}</Text>
          </View>
        )}
      </View>

      {(card.annualFee || card.anniversaryDate || card.benefits) ? (
        <View style={styles.extraRow}>
          {card.annualFee ? (
            <View style={styles.extraItem}>
              <Ionicons name="cash-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.extraText}>{t('annualFee')}: {fmt(card.annualFee)}</Text>
            </View>
          ) : null}
          {card.anniversaryDate ? (
            <View style={styles.extraItem}>
              <Ionicons name="star-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.extraText}>{t('anniversary')}: {formatAnniversary(card.anniversaryDate)}</Text>
            </View>
          ) : null}
          {card.benefits ? (
            <View style={styles.extraItem}>
              <Ionicons name="gift-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.extraText} numberOfLines={3}>{card.benefits}</Text>
            </View>
          ) : null}
        </View>
      ) : <View style={{ flex: 1 }} />}

      {card.bankDomain ? (
        <View style={styles.cardLogoCorner}>
          <BankBadge domain={card.bankDomain} size={64} />
        </View>
      ) : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function CardsScreen() {
  const { state, dispatch } = useApp();
  const theme = useTheme();
  const t = useTranslation();
  const { cards, transactions, currency, language } = state;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';

  const scrollViewRef = useRef<ScrollView>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [selectedDay, setSelectedDay] = useState(1);
  const [benefits, setBenefits] = useState('');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [annualFee, setAnnualFee] = useState('');
  const [anniversaryMonth, setAnniversaryMonth] = useState(1);
  const [anniversaryDay, setAnniversaryDay] = useState(1);
  const [hasAnniversary, setHasAnniversary] = useState(false);
  const [bankDomain, setBankDomain] = useState('');
  const [showBankList, setShowBankList] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  useEffect(() => {
    setupNotificationChannel();
  }, []);

  const cardSpending = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const map: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense' && tx.cardId && tx.date.startsWith(monthPrefix))
      .forEach(tx => { map[tx.cardId!] = (map[tx.cardId!] || 0) + tx.amount; });
    return map;
  }, [transactions]);

  function openAddModal() {
    setEditingCard(null);
    setName(''); setLastFour(''); setBenefits('');
    setSelectedDay(1); setSelectedColor(CARD_COLORS[0]);
    setAnnualFee(''); setAnniversaryMonth(1); setAnniversaryDay(1);
    setHasAnniversary(false);
    setBankDomain(''); setBankSearch(''); setShowBankList(false);
    setModalVisible(true);
  }

  function openEditModal(card: Card) {
    setEditingCard(card);
    setName(card.name);
    setLastFour(card.lastFour);
    setSelectedDay(parseDueDay(card.dueDate));
    setBenefits(card.benefits || '');
    setSelectedColor(card.color);
    setAnnualFee(card.annualFee ? String(card.annualFee) : '');
    if (card.anniversaryDate) {
      const [m, d] = card.anniversaryDate.split('-').map(Number);
      setAnniversaryMonth(m);
      setAnniversaryDay(d);
      setHasAnniversary(true);
    } else {
      setAnniversaryMonth(1); setAnniversaryDay(1);
      setHasAnniversary(false);
    }
    setBankDomain(card.bankDomain || ''); setBankSearch(''); setShowBankList(false);
    setModalVisible(true);
  }

  function buildCard(id: string, reminderEnabled?: boolean): Card {
    return {
      id,
      name: name.trim(),
      lastFour,
      dueDate: String(selectedDay),
      benefits: benefits.trim(),
      color: selectedColor,
      reminderEnabled,
      annualFee: annualFee.trim() ? Math.max(0, parseFloat(annualFee)) : undefined,
      anniversaryDate: hasAnniversary ? `${anniversaryMonth}-${anniversaryDay}` : undefined,
      bankDomain: bankDomain || undefined,
    };
  }

  function handleSave() {
    if (!name.trim()) { Alert.alert(t('nameRequired')); return; }
    if (!/^\d{4}$/.test(lastFour)) { Alert.alert(t('enterLastFour')); return; }
    if (annualFee.trim() && (isNaN(parseFloat(annualFee)) || parseFloat(annualFee) < 0)) {
      Alert.alert(t('invalidAmount'));
      return;
    }

    if (editingCard) {
      const updated = buildCard(editingCard.id, editingCard.reminderEnabled);
      dispatch({ type: 'UPDATE_CARD', payload: updated });
      if (editingCard.reminderEnabled) scheduleCardReminder(updated, language);
    } else {
      dispatch({ type: 'ADD_CARD', payload: buildCard(generateId()) });
    }
    setModalVisible(false);
  }

  async function handleToggleReminder(card: Card) {
    const willEnable = !card.reminderEnabled;
    if (willEnable) {
      const granted = await requestNotificationPermissions();
      if (!granted) { Alert.alert(t('billReminders'), t('notifPermissionDenied')); return; }
      await scheduleCardReminder(card, language);
    } else {
      await cancelCardReminder(card.id);
    }
    dispatch({ type: 'TOGGLE_CARD_REMINDER', payload: card.id });
  }

  function handleDelete(id: string) {
    Alert.alert(t('deleteCard'), t('removeCard'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => { cancelCardReminder(id); dispatch({ type: 'DELETE_CARD', payload: id }); },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradients.background}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PockytLogo variant="card" width={48} />
          <Text style={styles.header}>{t('myCards')}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <FlatList
          data={cards}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
          contentContainerStyle={cards.length === 0 ? styles.emptyContainer : { paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2, gap: 16 }}
          renderItem={({ item }) => (
            <CardItem
              card={item}
              spent={cardSpending[item.id] || 0}
              currency={currency}
              locale={locale}
              theme={theme}
              styles={styles}
              onDelete={handleDelete}
              onEdit={openEditModal}
              onToggleReminder={handleToggleReminder}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <PockytLogo variant="card" width={110} />
              <Text style={styles.emptyText}>{t('noCardsYet')}</Text>
              <Text style={styles.emptyHint}>{t('addCardsHint')}</Text>
            </View>
          }
        />
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint={state.darkMode ? 'dark' : 'light'} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCard ? t('editCard') : t('addCard')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder={t('cardNamePlaceholder')}
                placeholderTextColor={theme.colors.textFaint}
                value={name}
                onChangeText={v => {
                  setName(v);
                  if (!bankDomain) {
                    const detected = detectBankDomain(v);
                    if (detected) setBankDomain(detected);
                  }
                }}
              />

              {bankDomain ? (
                <View style={styles.bankPreviewRow}>
                  <BankBadge domain={bankDomain} size={36} />
                  <Text style={styles.bankPreviewText}>{bankDomain}</Text>
                  <TouchableOpacity onPress={() => setBankDomain('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textFaint} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.bankPickerBtn}
                onPress={() => { setBankSearch(''); setShowBankList(v => !v); }}
              >
                <Ionicons name="business-outline" size={15} color={theme.colors.primary} />
                <Text style={[styles.bankPickerBtnText, { color: theme.colors.primary }]}>{bankDomain ? t('changeBank') : t('selectBank')}</Text>
                <Ionicons name={showBankList ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.primary} />
              </TouchableOpacity>

              {showBankList && (
                <View style={styles.bankListContainer}>
                  <TextInput
                    style={styles.bankSearchInput}
                    placeholder={t('searchBank')}
                    placeholderTextColor={theme.colors.textFaint}
                    value={bankSearch}
                    onChangeText={setBankSearch}
                    clearButtonMode="while-editing"
                  />
                  {KNOWN_BANKS
                    .filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()))
                    .map(item => (
                      <TouchableOpacity
                        key={item.domain}
                        style={styles.bankRow}
                        onPress={() => {
                          setBankDomain(item.domain);
                          setShowBankList(false);
                          setBankSearch('');
                        }}
                      >
                          <BankBadge domain={item.domain} size={38} />
                        <Text style={styles.bankRowName}>{item.name}</Text>
                        {bankDomain === item.domain && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                      </TouchableOpacity>
                    ))
                  }
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder={t('lastFourDigits')}
                placeholderTextColor={theme.colors.textFaint}
                keyboardType="number-pad"
                maxLength={4}
                value={lastFour}
                onChangeText={setLastFour}
              />

              <Text style={styles.inputLabel}>{t('monthlyDueDay')}</Text>
              <View style={styles.pickerSingle}>
                <Picker
                  selectedValue={selectedDay}
                  onValueChange={(v) => setSelectedDay(v)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {DAYS.map(d => (
                    <Picker.Item key={d} label={ordinal(d)} value={d} />
                  ))}
                </Picker>
              </View>

              <TextInput
                style={styles.input}
                placeholder={t('annualFeePlaceholder')}
                placeholderTextColor={theme.colors.textFaint}
                keyboardType="decimal-pad"
                value={annualFee}
                onChangeText={setAnnualFee}
              />

              <TouchableOpacity style={styles.toggleRow} onPress={() => setHasAnniversary(v => !v)}>
                <Text style={styles.inputLabel}>{t('anniversaryDate')}</Text>
                <Ionicons name={hasAnniversary ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
              {hasAnniversary && (
                <View style={styles.pickerRow}>
                  <View style={styles.pickerCol}>
                    <Text style={styles.pickerHeader}>{t('month')}</Text>
                    <Picker
                      selectedValue={anniversaryMonth}
                      onValueChange={(v) => setAnniversaryMonth(v)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {MONTHS.map((m, i) => (
                        <Picker.Item key={m} label={m} value={i + 1} />
                      ))}
                    </Picker>
                  </View>
                  <View style={styles.pickerDivider} />
                  <View style={styles.pickerCol}>
                    <Text style={styles.pickerHeader}>{t('day')}</Text>
                    <Picker
                      selectedValue={anniversaryDay}
                      onValueChange={(v) => setAnniversaryDay(v)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {DAYS.map(d => (
                        <Picker.Item key={d} label={String(d)} value={d} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder={t('benefitsPlaceholder')}
                placeholderTextColor={theme.colors.textFaint}
                multiline
                maxLength={200}
                value={benefits}
                onChangeText={setBenefits}
                onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)}
              />

              <Text style={styles.inputLabel}>{t('cardColor')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
                {CARD_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                    onPress={() => setSelectedColor(c)}
                  />
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editingCard ? t('saveChanges') : t('addCard')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </BlurView>
        </KeyboardAvoidingView>
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 16,
    },
    header: { fontSize: 28, fontWeight: '400', color: theme.colors.text },
    addBtn: {
      backgroundColor: theme.colors.primary,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardItem: {
      width: CARD_WIDTH,
      height: CARD_WIDTH * 1.45,
      borderRadius: 40,
      padding: 28,
      justifyContent: 'space-between',
      ...theme.shadow.card,
      shadowRadius: 24,
      elevation: 12,
      overflow: 'hidden',
    },
    cardLogoCorner: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      opacity: 0.2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    cardName: { fontSize: 28, fontWeight: '400', color: '#fff', flex: 1, letterSpacing: 0 },
    cardActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    actionBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 20 },
    cardNumber: { fontSize: 24, color: 'rgba(255,255,255,0.9)', letterSpacing: 2, fontWeight: '400', marginVertical: 20 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' },
    cardDueLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
    cardDueText: { fontSize: 18, color: '#fff', fontWeight: '500' },
    extraRow: {
      marginTop: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.2)',
      gap: 12,
    },
    extraItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    extraText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', flex: 1, fontWeight: '600' },
    emptyContainer: { flex: 1, justifyContent: 'center', width: SCREEN_WIDTH },
    empty: { alignItems: 'center', paddingHorizontal: 32 },
    emptyText: { fontSize: 20, fontWeight: '500', color: theme.colors.textMuted, marginTop: 16 },
    emptyHint: { fontSize: 14, color: theme.colors.textFaint, marginTop: 8, textAlign: 'center' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingBottom: 24 },
    modalSheet: {
      backgroundColor: theme.glass.background,
      borderColor: theme.glass.border,
      borderWidth: 1,
      borderRadius: 32,
      padding: 24,
      paddingBottom: 40,
      maxHeight: '92%',
      overflow: 'hidden',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '500', color: theme.colors.text },
    input: {
      borderWidth: 1,
      borderColor: theme.glass.border,
      borderRadius: 16,
      padding: 16,
      fontSize: 16,
      marginBottom: 16,
      backgroundColor: 'rgba(0,0,0,0.08)',
      color: theme.colors.text,
    },
    inputMulti: { height: 100, textAlignVertical: 'top' },
    inputLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 8 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    pickerSingle: {
      borderWidth: 1,
      borderColor: theme.glass.border,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.08)',
      marginBottom: 12,
      overflow: 'hidden',
    },
    pickerRow: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: theme.glass.border,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.08)',
      marginBottom: 12,
      overflow: 'hidden',
    },
    pickerCol: { flex: 1 },
    pickerHeader: { textAlign: 'center', fontSize: 12, color: theme.colors.textMuted, paddingTop: 8 },
    pickerDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 8 },
    picker: { height: 120, color: theme.colors.text },
    pickerItem: { fontSize: 16, height: 120, color: theme.colors.text },
    colorRow: { marginBottom: 20 },
    colorDot: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
    colorDotSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    saveBtn: { backgroundColor: theme.colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    bankPreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(0,0,0,0.08)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.glass.border,
    },
    bankPreviewText: { flex: 1, fontSize: 14, color: theme.colors.textMuted },
    bankPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: 10,
      marginBottom: 8,
    },
    bankPickerBtnText: { fontSize: 14, fontWeight: '600', flex: 1 },
    bankListContainer: {
      borderWidth: 1,
      borderColor: theme.glass.border,
      borderRadius: 16,
      backgroundColor: theme.glass.background,
      marginBottom: 16,
      overflow: 'hidden',
    },
    bankSearchInput: {
      borderBottomWidth: 1,
      borderBottomColor: theme.glass.border,
      padding: 14,
      fontSize: 15,
      backgroundColor: 'rgba(0,0,0,0.08)',
      color: theme.colors.text,
    },
    bankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    bankRowName: { flex: 1, fontSize: 14, color: theme.colors.text },
  });
}
