import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/auth';

function Tile({ title, value, subtitle }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.tileSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function TileButton({ title, value, subtitle, onPress }) {
  return (
    <Pressable style={styles.tileButton} onPress={onPress}>
      <Tile title={title} value={value} subtitle={subtitle} />
    </Pressable>
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
  const { user, setUser } = useAuth();
  const navigation = useNavigation();

  const [dueTodayOpen, setDueTodayOpen] = useState(false);
  const [dueTodayLoading, setDueTodayLoading] = useState(false);
  const [dueTodayError, setDueTodayError] = useState('');
  const [dueTodayItems, setDueTodayItems] = useState([]);

  const [allWorkOrdersLoading, setAllWorkOrdersLoading] = useState(false);
  const [allWorkOrders, setAllWorkOrders] = useState([]);

  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [statusSheetTitle, setStatusSheetTitle] = useState('');
  const [statusSheetItems, setStatusSheetItems] = useState([]);

  const openDueToday = useCallback(() => {
    setDueTodayOpen(true);
  }, []);

  const loadAllWorkOrders = useCallback(async () => {
    setAllWorkOrdersLoading(true);
    try {
      const res = await api.get('/work-orders');
      const items = Array.isArray(res?.data) ? res.data : [];
      setAllWorkOrders(items);
    } catch (e) {
      setAllWorkOrders([]);
    } finally {
      setAllWorkOrdersLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllWorkOrders();
    }, [loadAllWorkOrders])
  );

  const closeDueToday = useCallback(() => {
    setDueTodayOpen(false);
  }, []);

  const closeStatusSheet = useCallback(() => {
    setStatusSheetOpen(false);
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

  const metrics = useMemo(() => {
    const items = Array.isArray(allWorkOrders) ? allWorkOrders : [];
    const norm = (s) => (s || '').toString().trim().toLowerCase();

    const highPriority = items.filter((w) => norm(w?.priority) === 'high' || norm(w?.priority) === 'critical').length;
    const overdue = items.filter((w) => {
      if (!w?.due_date) return false;
      const d = new Date(w.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      return d < today && norm(w?.status) !== 'done' && norm(w?.status) !== 'completed';
    }).length;
    const pendingApproval = 0;
    const completed7 = items.filter((w) => {
      const s = norm(w?.status);
      if (s !== 'done' && s !== 'completed') return false;
      if (!w?.due_date) return false;
      const d = new Date(w.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = (today - d) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }).length;

    return {
      highPriority,
      overdue,
      pendingApproval,
      completed7,
    };
  }, [allWorkOrders]);

  const completedWorkOrders = useMemo(() => {
    const items = Array.isArray(allWorkOrders) ? allWorkOrders : [];
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    return items.filter((w) => {
      const s = norm(w?.status);
      return s === 'done' || s === 'completed';
    });
  }, [allWorkOrders]);

  const doLogout = useCallback(async () => {
    await logout();
    setUser(null);
  }, [setUser]);

  const openStatusSheet = useCallback(
    (title, items) => {
      setStatusSheetTitle(title);
      setStatusSheetItems(Array.isArray(items) ? items : []);
      setStatusSheetOpen(true);
    },
    []
  );

  const onPressHighPriority = useCallback(() => {
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const items = (allWorkOrders || []).filter((w) => {
      const p = norm(w?.priority);
      return p === 'high' || p === 'critical';
    });
    openStatusSheet('High Priority Work Orders', items);
  }, [allWorkOrders, openStatusSheet]);

  const onPressOverdue = useCallback(() => {
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items = (allWorkOrders || []).filter((w) => {
      if (!w?.due_date) return false;
      const d = new Date(w.due_date);
      d.setHours(0, 0, 0, 0);
      const st = norm(w?.status);
      return d < today && st !== 'done' && st !== 'completed';
    });
    openStatusSheet('Overdue Work Orders', items);
  }, [allWorkOrders, openStatusSheet]);

  const onPressPendingApproval = useCallback(() => {
    openStatusSheet('Requests Pending Approval', []);
  }, [openStatusSheet]);

  const onPressCompleted7 = useCallback(() => {
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items = (allWorkOrders || []).filter((w) => {
      const st = norm(w?.status);
      if (st !== 'done' && st !== 'completed') return false;
      if (!w?.due_date) return false;
      const d = new Date(w.due_date);
      d.setHours(0, 0, 0, 0);
      const diffDays = (today - d) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });
    openStatusSheet('Completed in the Last 7 Days', items);
  }, [allWorkOrders, openStatusSheet]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
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
      </View>

      <Text style={styles.sectionTitle}>WORK ORDERS STATUS</Text>
      <View style={styles.grid}>
        <TileButton title="High Priority Work Orders" value={String(metrics.highPriority)} onPress={onPressHighPriority} />
        <TileButton title="Overdue Work Orders" value={String(metrics.overdue)} onPress={onPressOverdue} />
        <TileButton title="Requests Pending Approval" value={String(metrics.pendingApproval)} onPress={onPressPendingApproval} />
        <TileButton title="Completed in the Last 7 days" value={String(metrics.completed7)} onPress={onPressCompleted7} />
      </View>

      <Text style={styles.sectionTitle}>COMPLETED WORK ORDERS</Text>
      <View style={styles.todoCard}>
        {allWorkOrdersLoading ? (
          <Text style={styles.todoSubtitle}>Loading…</Text>
        ) : completedWorkOrders.length === 0 ? (
          <Text style={styles.todoSubtitle}>No completed work orders</Text>
        ) : (
          completedWorkOrders.slice(0, 8).map((wo) => (
            <Pressable key={String(wo?.id)} style={styles.completedRow} onPress={() => openWorkOrder(wo?.id)}>
              <Text style={styles.completedTitle} numberOfLines={1}>
                {wo?.name || 'Work Order'}
              </Text>
              <Text style={styles.completedMeta}>#{wo?.id ?? '-'}</Text>
            </Pressable>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>TO DO LIST</Text>
      <View style={styles.todoCard}>
        <Text style={styles.todoTitle}>Assigned To Me</Text>
        <Text style={styles.todoSubtitle}>No items</Text>
      </View>

      <View style={{ height: 18 }} />

      <Pressable style={styles.logoutBtn} onPress={doLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>

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
              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetList}>
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

      <Modal
        visible={statusSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={closeStatusSheet}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeStatusSheet} />
        <View style={styles.sheetWrap}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.calendarIcon}>
                  <Text style={styles.calendarIconText}>▦</Text>
                </View>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {statusSheetTitle}
                </Text>
              </View>
              <Pressable onPress={closeStatusSheet} style={styles.sheetClose}>
                <Text style={styles.sheetCloseText}>×</Text>
              </Pressable>
            </View>

            {statusSheetItems.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetHint}>No work orders</Text>
              </View>
            ) : (
              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetList}>
                {statusSheetItems.map((wo) => {
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
  tileButton: {
    width: '47%',
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
    width: '100%',
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

  completedRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  completedTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  completedMeta: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },

  logoutBtn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
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
    height: '52%',
    minHeight: '52%',
  },

  sheetScroll: {
    flex: 1,
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
