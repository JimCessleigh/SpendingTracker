import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AppTheme } from '../constants/theme';
import { BillSplit, BillParticipant } from '../types';
import { format } from 'date-fns';
import PockytLogo from '../components/PockytLogo';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BillSplitScreen({ visible, onClose }: Props) {
  const { state, dispatch } = useApp();
  const theme = useTheme();
  const { currency, language } = state;
  const billSplits = state.billSplits || [];
  const styles = useMemo(() => createStyles(theme), [theme]);
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);

  const [addVisible, setAddVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [participants, setParticipants] = useState<{ name: string; amount: string }[]>([
    { name: '', amount: '' },
    { name: '', amount: '' },
  ]);

  function resetForm() {
    setDescription('');
    setTotalAmount('');
    setParticipants([{ name: '', amount: '' }, { name: '', amount: '' }]);
    setAddVisible(false);
  }

  function addParticipant() {
    setParticipants(prev => [...prev, { name: '', amount: '' }]);
  }

  function removeParticipant(i: number) {
    setParticipants(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateParticipant(i: number, field: 'name' | 'amount', value: string) {
    setParticipants(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  function splitEvenly() {
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0) return;
    const count = participants.filter(p => p.name.trim()).length || participants.length;
    const each = (total / count).toFixed(2);
    setParticipants(prev => prev.map(p => ({ ...p, amount: each })));
  }

  function handleSave() {
    const desc = description.trim();
    if (!desc) { Alert.alert('Enter a description'); return; }
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0) { Alert.alert('Enter a valid total amount'); return; }

    const validParts = participants.filter(p => p.name.trim() && parseFloat(p.amount) > 0);
    if (validParts.length < 1) { Alert.alert('Add at least one participant with a name and amount'); return; }

    const parts: BillParticipant[] = validParts.map(p => ({
      name: p.name.trim(),
      amount: parseFloat(p.amount),
      settled: false,
    }));

    const split: BillSplit = {
      id: generateId(),
      transactionId: '',
      totalAmount: total,
      description: desc,
      date: new Date().toISOString(),
      participants: parts,
    };
    dispatch({ type: 'ADD_BILL_SPLIT', payload: split });
    resetForm();
  }

  function handleSettle(splitId: string, participantName: string) {
    dispatch({ type: 'SETTLE_PARTICIPANT', payload: { splitId, participantName } });
  }

  function handleDelete(id: string) {
    Alert.alert('Delete split', 'Remove this bill split?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_BILL_SPLIT', payload: id }) },
    ]);
  }

  const totalOwed = billSplits.reduce((s, split) =>
    s + split.participants.filter(p => !p.settled).reduce((ps, p) => ps + p.amount, 0), 0
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.title}>Bill Splitting</Text>
          <TouchableOpacity onPress={() => setAddVisible(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {totalOwed > 0 && (
          <View style={styles.summaryBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.warning} />
            <Text style={[styles.summaryText, { color: theme.colors.warning }]}>
              {fmt(totalOwed)} total outstanding
            </Text>
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {billSplits.length === 0 ? (
            <View style={styles.empty}>
              <PockytLogo variant="mascot" width={110} />
              <Text style={styles.emptyText}>No bill splits yet</Text>
              <Text style={styles.emptyHint}>Tap + to split a bill with friends</Text>
            </View>
          ) : (
            billSplits.map(split => {
              const pending = split.participants.filter(p => !p.settled);
              const settled = split.participants.filter(p => p.settled);
              const pendingAmt = pending.reduce((s, p) => s + p.amount, 0);
              return (
                <View key={split.id} style={styles.splitCard}>
                  <View style={styles.splitHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.splitDesc}>{split.description}</Text>
                      <Text style={styles.splitDate}>{format(new Date(split.date), 'MMM d, yyyy')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.splitTotal}>{fmt(split.totalAmount)}</Text>
                      {pendingAmt > 0 && (
                        <Text style={[styles.splitPending, { color: theme.colors.danger }]}>
                          {fmt(pendingAmt)} owed
                        </Text>
                      )}
                    </View>
                  </View>

                  {pending.length > 0 && (
                    <View style={styles.participantSection}>
                      <Text style={styles.participantSectionLabel}>Pending</Text>
                      {pending.map(p => (
                        <View key={p.name} style={styles.participantRow}>
                          <Ionicons name="person-outline" size={14} color={theme.colors.textMuted} />
                          <Text style={styles.participantName}>{p.name}</Text>
                          <Text style={[styles.participantAmt, { color: theme.colors.danger }]}>{fmt(p.amount)}</Text>
                          <TouchableOpacity onPress={() => handleSettle(split.id, p.name)} style={styles.settleBtn}>
                            <Text style={styles.settleBtnText}>Settled</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {settled.length > 0 && (
                    <View style={styles.participantSection}>
                      <Text style={[styles.participantSectionLabel, { color: theme.colors.success }]}>Settled</Text>
                      {settled.map(p => (
                        <View key={p.name} style={[styles.participantRow, { opacity: 0.5 }]}>
                          <Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.success} />
                          <Text style={styles.participantName}>{p.name}</Text>
                          <Text style={[styles.participantAmt, { color: theme.colors.success }]}>{fmt(p.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity onPress={() => handleDelete(split.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.textFaint} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Add split modal */}
        <Modal visible={addVisible} animationType="slide" transparent onRequestClose={resetForm}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Bill Split</Text>
                <TouchableOpacity onPress={resetForm}>
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <TextInput
                  style={styles.input}
                  placeholder="Description (e.g. Dinner at Nobu)"
                  placeholderTextColor={theme.colors.textFaint}
                  value={description}
                  onChangeText={setDescription}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Total amount"
                    placeholderTextColor={theme.colors.textFaint}
                    keyboardType="decimal-pad"
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                  />
                  <TouchableOpacity style={styles.splitEvenBtn} onPress={splitEvenly}>
                    <Text style={styles.splitEvenText}>Split Evenly</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Participants</Text>
                {participants.map((p, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 2, marginBottom: 0 }]}
                      placeholder={`Name ${i + 1}`}
                      placeholderTextColor={theme.colors.textFaint}
                      value={p.name}
                      onChangeText={v => updateParticipant(i, 'name', v)}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="Amount"
                      placeholderTextColor={theme.colors.textFaint}
                      keyboardType="decimal-pad"
                      value={p.amount}
                      onChangeText={v => updateParticipant(i, 'amount', v)}
                    />
                    {participants.length > 2 && (
                      <TouchableOpacity onPress={() => removeParticipant(i)} style={{ justifyContent: 'center' }}>
                        <Ionicons name="close-circle-outline" size={22} color={theme.colors.textFaint} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                <TouchableOpacity onPress={addParticipant} style={styles.addParticipantBtn}>
                  <Ionicons name="add" size={18} color={theme.colors.primary} />
                  <Text style={styles.addParticipantText}>Add Participant</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>Save Split</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
    summaryBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: 12, paddingHorizontal: 16, backgroundColor: theme.colors.surface,
      borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    summaryText: { fontSize: 14, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, color: theme.colors.textMuted, fontWeight: '500', marginTop: 16 },
    emptyHint: { fontSize: 13, color: theme.colors.textFaint, marginTop: 4 },
    splitCard: {
      backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, ...theme.shadow.card,
    },
    splitHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    splitDesc: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    splitDate: { fontSize: 12, color: theme.colors.textFaint, marginTop: 2 },
    splitTotal: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    splitPending: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    participantSection: { marginTop: 8 },
    participantSectionLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    participantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    participantName: { flex: 1, fontSize: 14, color: theme.colors.text },
    participantAmt: { fontSize: 14, fontWeight: '600' },
    settleBtn: { backgroundColor: theme.colors.success + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    settleBtnText: { fontSize: 12, color: theme.colors.success, fontWeight: '600' },
    deleteBtn: { alignSelf: 'flex-end', padding: 8, marginTop: 4 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalSheet: {
      backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40, maxHeight: '90%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
    input: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14,
      fontSize: 15, marginBottom: 12, backgroundColor: theme.colors.surfaceMuted, color: theme.colors.text,
    },
    inputLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 8 },
    splitEvenBtn: {
      backgroundColor: theme.colors.primary + '22', borderRadius: 12, padding: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    splitEvenText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
    addParticipantBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10,
      borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 12,
      justifyContent: 'center', marginBottom: 16, borderStyle: 'dashed',
    },
    addParticipantText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
    saveBtn: { backgroundColor: theme.colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
