import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Tile({ title, value, subtitle }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.tileSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function Pill({ label, tone = 'neutral' }) {
  const toneStyle =
    tone === 'success'
      ? styles.pillSuccess
      : tone === 'warning'
        ? styles.pillWarning
        : tone === 'danger'
          ? styles.pillDanger
          : styles.pillNeutral;

  const toneTextStyle =
    tone === 'success'
      ? styles.pillTextSuccess
      : tone === 'warning'
        ? styles.pillTextWarning
        : tone === 'danger'
          ? styles.pillTextDanger
          : styles.pillTextNeutral;

  return (
    <View style={[styles.pill, toneStyle]}>
      <Text style={[styles.pillText, toneTextStyle]}>{label}</Text>
    </View>
  );
}

function normalizePriority(priority) {
  const p = (priority || '').toString().trim().toLowerCase();
  if (p === 'high' || p === 'critical') return { label: 'High', tone: 'danger' };
  if (p === 'medium') return { label: 'Medium', tone: 'warning' };
  if (p === 'low') return { label: 'Low', tone: 'neutral' };
  return { label: priority || 'Priority', tone: 'neutral' };
}

function normalizeStatus(status) {
  const s = (status || '').toString().trim().toLowerCase();
  if (s === 'open') return { label: 'Open', tone: 'neutral' };
  if (s === 'in_progress' || s === 'in progress') return { label: 'In Progress', tone: 'warning' };
  if (s === 'completed' || s === 'done') return { label: 'Completed', tone: 'success' };
  if (s === 'cancelled' || s === 'canceled') return { label: 'Cancelled', tone: 'danger' };
  return { label: status || 'Status', tone: 'neutral' };
}

export default function OverviewScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [dueTodayOpen, setDueTodayOpen] = useState(false);
  const [dueTodayLoading, setDueTodayLoading] = useState(false);
  const [dueTodayError, setDueTodayError] = useState('');
  const [dueTodayItems, setDueTodayItems] = useState([]);

  const openDueToday = useCallback(() => {
    setDueTodayOpen(true);
  }, []);

  const closeDueToday = useCallback(() => {
    setDueTodayOpen(false);
  }, []);

  const openWorkOrder = useCallback(
    (workOrderId) => {
      if (!workOrderId) return;
      setDueTodayOpen(false);
      navigation.navigate('WorkOrderDetail', { workOrderId });
    },
    [navigation]
  );

  const loadDueToday = useCallback(async () => {
    setDueTodayError('');
    setDueTodayLoading(true);
    try {
      const res = await api.get('/work-orders/due-today');
      const items = Array.isArray(res?.data) ? res.data : [];
      setDueTodayItems(items);
    } catch (e) {
      setDueTodayError(e?.message || 'Failed to load work orders');
      setDueTodayItems([]);
    } finally {
      setDueTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dueTodayOpen) return;
    loadDueToday();
  }, [dueTodayOpen, loadDueToday]);

  const dueTodayCount = useMemo(() => {
    return dueTodayItems.length;
  }, [dueTodayItems.length]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topBarSpacer} />
          <Pressable style={styles.switchOrg}>
            <Text style={styles.switchOrgText}>Switch Organization</Text>
            <Text style={styles.switchOrgChevron}>⌄</Text>
          </Pressable>
          <Pressable style={styles.accountWrap}>
            <View style={styles.accountIcon} />
            <Text style={styles.accountLabel}>Account</Text>
          </Pressable>
        </View>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.hello}>Hello{user?.user_name ? `, ${user.user_name}!` : '!'}</Text>
            <Text style={styles.welcome}>Welcome to MNFG-1A</Text>
          </View>
        </View>

      <View style={styles.quickRow}>
        <Pressable style={styles.quickBtn} onPress={openDueToday}>
          <Text style={styles.quickLabel}>Due Today</Text>
          <Text style={styles.quickMeta}>{dueTodayCount}</Text>
        </Pressable>
        <Pressable style={styles.quickBtn}>
          <Text style={styles.quickLabel}>Invite</Text>
          <Text style={styles.quickMeta}>+</Text>
        </Pressable>
        <Pressable style={styles.quickBtn}>
          <Text style={styles.quickLabel}>Scan Code</Text>
          <Text style={styles.quickMeta}>⌁</Text>
        </Pressable>
        <Pressable style={styles.quickBtn}>
          <Text style={styles.quickLabel}>Support</Text>
          <Text style={styles.quickMeta}>?</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>WORK ORDERS STATUS</Text>
      <View style={styles.grid}>
        <Tile title="High Priority Work Orders" value="0" />
        <Tile title="Overdue Work Orders" value="0" />
        <Tile title="Requests Pending Approval" value="0" />
        <Tile title="Completed in the Last 7 days" value="0" />
      </View>

      <Text style={styles.sectionTitle}>TO DO LIST</Text>
      <View style={styles.todoCard}>
        <Text style={styles.todoTitle}>Assigned To Me</Text>
        <Text style={styles.todoSubtitle}>No items</Text>
      </View>

        <View style={{ height: 18 }} />
      </ScrollView>

      <Modal
        visible={dueTodayOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDueToday}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeDueToday} />
        <View style={styles.sheetWrap}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.calendarIcon}>
                  <Text style={styles.calendarIconText}>▦</Text>
                </View>
                <Text style={styles.sheetTitle}>Work Orders Due Today</Text>
              </View>
              <Pressable onPress={closeDueToday} style={styles.sheetClose}>
                <Text style={styles.sheetCloseText}>×</Text>
              </Pressable>
            </View>

            {dueTodayLoading ? (
              <View style={styles.sheetLoading}>
                <ActivityIndicator />
                <Text style={styles.sheetHint}>Loading…</Text>
              </View>
            ) : dueTodayError ? (
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetError}>{dueTodayError}</Text>
                <Pressable onPress={loadDueToday} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : dueTodayItems.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetHint}>No work orders due today.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.sheetList}>
                {dueTodayItems.map((wo) => {
                  const statusMeta = normalizeStatus(wo?.status);
                  const prMeta = normalizePriority(wo?.priority);
                  return (
                    <Pressable
                      key={wo?.id?.toString?.() || String(Math.random())}
                      style={styles.woCard}
                      onPress={() => openWorkOrder(wo?.id)}
                    >
                      <Text style={styles.woTitle} numberOfLines={2}>
                        {wo?.name || 'Work Order'}
                      </Text>
                      <View style={styles.woMetaRow}>
                        <Text style={styles.woId}>#{wo?.id ?? '-'}</Text>
                        <View style={styles.woPills}>
                          <Pill label={statusMeta.label} tone={statusMeta.tone} />
                          {!!wo?.priority && <Pill label={prMeta.label} tone={prMeta.tone} />}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  container: {
    padding: 16,
    paddingBottom: 86,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginBottom: 14,
  },
  topBarSpacer: {
    width: 64,
  },
  switchOrg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchOrgText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  switchOrgChevron: {
    fontSize: 14,
    color: '#2563eb',
    marginTop: -2,
  },
  accountWrap: {
    alignItems: 'center',
    width: 64,
  },
  accountIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563eb',
    marginBottom: 4,
  },
  accountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  hello: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 2,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  quickMeta: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  tile: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  tileSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  todoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  todoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  todoSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
  },
  sheetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: '72%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  calendarIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIconText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '900',
    marginTop: -1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    flex: 1,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: {
    fontSize: 22,
    color: '#6b7280',
    marginTop: -2,
  },
  sheetList: {
    paddingBottom: 8,
    gap: 12,
  },
  sheetLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
  },
  sheetEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 10,
  },
  sheetHint: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  sheetError: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  woCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  woTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  woMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  woId: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
  },
  woPills: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  pillNeutral: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  pillTextNeutral: {
    color: '#111827',
  },
  pillSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  pillTextSuccess: {
    color: '#047857',
  },
  pillWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  pillTextWarning: {
    color: '#92400e',
  },
  pillDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  pillTextDanger: {
    color: '#b91c1c',
  },
});
