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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { Card } from '../types';
import { CARD_COLORS } from '../constants/categories';
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

function daysUntilDue(dueDate: string): number {
  const [month, day] = dueDate.split('-').map(Number);
  const today = new Date();
  let due = new Date(today.getFullYear(), month - 1, day);
  if (due <= today) due = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueDate(dueDate: string): string {
  const [month, day] = dueDate.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

function CardItem({
  card,
  spent,
  currency,
  onDelete,
  onToggleReminder,
}: {
  card: Card;
  spent: number;
  currency: string;
  onDelete: (id: string) => void;
  onToggleReminder: (card: Card) => void;
}) {
  const t = useTranslation();
  const days = daysUntilDue(card.dueDate);
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

  return (
    <View style={[styles.cardItem, { backgroundColor: card.color }]}>
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
            {formatDueDate(card.dueDate)} · {days === 0 ? t('todayDue') : `${days}${t('daysLeft')}`}
          </Text>
        </View>
        {spent > 0 && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardDueLabel}>{t('cardSpent')}</Text>
            <Text style={styles.cardDueText}>{fmt(spent)}</Text>
          </View>
        )}
      </View>

      {card.benefits ? (
        <View style={styles.benefitsRow}>
          <Ionicons name="gift-outline" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={styles.benefitsText} numberOfLines={2}>{card.benefits}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CardsScreen() {
  const { state, dispatch } = useApp();
  const t = useTranslation();
  const { cards, transactions, currency } = state;

  const scrollViewRef = useRef<ScrollView>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [benefits, setBenefits] = useState('');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);

  useEffect(() => {
    setupNotificationChannel();
  }, []);

  // Total spending per card (all time)
  const cardSpending = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense' && tx.cardId)
      .forEach(tx => {
        map[tx.cardId!] = (map[tx.cardId!] || 0) + tx.amount;
      });
    return map;
  }, [transactions]);

  async function handleToggleReminder(card: Card) {
    const willEnable = !card.reminderEnabled;
    if (willEnable) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(t('billReminders'), t('notifPermissionDenied'));
        return;
      }
      await scheduleCardReminder(card);
    } else {
      await cancelCardReminder(card.id);
    }
    dispatch({ type: 'TOGGLE_CARD_REMINDER', payload: card.id });
  }

  function handleAdd() {
    if (!name.trim()) { Alert.alert(t('nameRequired')); return; }
    if (!/^\d{4}$/.test(lastFour)) { Alert.alert(t('enterLastFour')); return; }

    const card: Card = {
      id: generateId(),
      name: name.trim(),
      lastFour,
      dueDate: `${selectedMonth}-${selectedDay}`,
      benefits: benefits.trim(),
      color: selectedColor,
    };
    dispatch({ type: 'ADD_CARD', payload: card });
    setName(''); setLastFour(''); setBenefits('');
    setSelectedMonth(1); setSelectedDay(1);
    setSelectedColor(CARD_COLORS[0]);
    setModalVisible(false);
  }

  function handleDelete(id: string) {
    Alert.alert(t('deleteCard'), t('removeCard'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          cancelCardReminder(id);
          dispatch({ type: 'DELETE_CARD', payload: id });
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>{t('myCards')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={cards}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CardItem
            card={item}
            spent={cardSpending[item.id] || 0}
            currency={currency}
            onDelete={handleDelete}
            onToggleReminder={handleToggleReminder}
          />
        )}
        contentContainerStyle={cards.length === 0 ? styles.emptyContainer : { padding: 16, gap: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={56} color="#B2BEC3" />
            <Text style={styles.emptyText}>{t('noCardsYet')}</Text>
            <Text style={styles.emptyHint}>{t('addCardsHint')}</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('addCard')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#636E72" />
              </TouchableOpacity>
            </View>

            <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput style={styles.input} placeholder={t('cardNamePlaceholder')} value={name} onChangeText={setName} />
              <TextInput
                style={styles.input}
                placeholder={t('lastFourDigits')}
                keyboardType="number-pad"
                maxLength={4}
                value={lastFour}
                onChangeText={setLastFour}
              />

              <Text style={styles.inputLabel}>{t('paymentDueDate')}</Text>
              <View style={styles.pickerRow}>
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerHeader}>{t('month')}</Text>
                  <Picker
                    selectedValue={selectedMonth}
                    onValueChange={(v) => setSelectedMonth(v)}
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
                    selectedValue={selectedDay}
                    onValueChange={(v) => setSelectedDay(v)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {DAYS.map(d => (
                      <Picker.Item key={d} label={String(d)} value={d} />
                    ))}
                  </Picker>
                </View>
              </View>

              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder={t('benefitsPlaceholder')}
                multiline
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

              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>{t('addCard')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  header: { fontSize: 28, fontWeight: '700', color: '#2D3436' },
  addBtn: {
    backgroundColor: '#6C5CE7',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardItem: {
    borderRadius: 20,
    padding: 20,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  cardActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  actionBtn: { padding: 2 },
  cardNumber: { fontSize: 16, color: 'rgba(255,255,255,0.8)', letterSpacing: 2, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardDueLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  cardDueText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  benefitsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  benefitsText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#636E72', marginTop: 16 },
  emptyHint: { fontSize: 13, color: '#B2BEC3', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#2D3436' },
  input: {
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
  },
  inputMulti: { height: 72, textAlignVertical: 'top' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#636E72', marginBottom: 6 },
  pickerRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerCol: { flex: 1 },
  pickerHeader: { textAlign: 'center', fontSize: 12, color: '#636E72', paddingTop: 8 },
  pickerDivider: { width: 1, backgroundColor: '#DFE6E9', marginVertical: 8 },
  picker: { height: 120 },
  pickerItem: { fontSize: 16, height: 120 },
  colorRow: { marginBottom: 20 },
  colorDot: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  saveBtn: { backgroundColor: '#6C5CE7', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
