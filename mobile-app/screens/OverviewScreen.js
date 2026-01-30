import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/auth';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../services/api';
import { useAppReload } from '../context/AppReloadContext';

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

function getWorkOrderLocationText(wo) {
  if (!wo) return '—';
  if (wo.location && typeof wo.location === 'string') return wo.location;
  if (wo.location_name && typeof wo.location_name === 'string') return wo.location_name;
  if (wo.location?.name && typeof wo.location.name === 'string') return wo.location.name;
  if (wo.location_id !== undefined && wo.location_id !== null && String(wo.location_id).length > 0) {
    return `Location #${wo.location_id}`;
  }
  return '—';
}

export default function OverviewScreen() {
  const { user, setUser } = useAuth();
  const { mode, colors, toggleMode } = useTheme();
  const navigation = useNavigation();
  const { reloadApp } = useAppReload();

  const pollingIntervalRef = useRef(null);
  const sseRef = useRef(null);
  const sseAbortRef = useRef(null);

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
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      loadAllWorkOrders();
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }, [loadAllWorkOrders])
  );

  useFocusEffect(
    useCallback(() => {
      let closed = false;

      const closeSse = () => {
        if (sseRef.current && typeof sseRef.current.close === 'function') {
          try {
            sseRef.current.close();
          } catch (e) {
          }
        }
        sseRef.current = null;
        if (sseAbortRef.current) {
          try {
            sseAbortRef.current.abort();
          } catch (e) {
          }
        }
        sseAbortRef.current = null;
      };

      const startFetchSse = async () => {
        closeSse();
        const controller = new AbortController();
        sseAbortRef.current = controller;

        let token = null;
        try {
          token = await AsyncStorage.getItem('auth_token');
        } catch (e) {
          token = null;
        }

        const res = await fetch(`${API_BASE_URL}/events/work-orders`, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });

        if (!res?.body || typeof res.body.getReader !== 'function') {
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (!closed) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            const lines = rawEvent.split('\n');
            let eventName = '';
            for (const line of lines) {
              if (line.startsWith('event:')) eventName = line.slice(6).trim();
            }
            if (eventName === 'work_order') {
              loadAllWorkOrders();
            }
          }
        }
      };

      const start = async () => {
        if (!user?.id) return;
        try {
          if (typeof global?.EventSource === 'function') {
            closeSse();
            const es = new global.EventSource(`${API_BASE_URL}/events/work-orders`);
            sseRef.current = es;
            es.addEventListener('work_order', () => {
              loadAllWorkOrders();
            });
          } else {
            await startFetchSse();
          }
        } catch (e) {
        }
      };

      start();

      return () => {
        closed = true;
        closeSse();
      };
    }, [loadAllWorkOrders, user?.id])
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

      const wo = (Array.isArray(allWorkOrders) ? allWorkOrders : []).find((w) => String(w?.id) === String(workOrderId)) || null;
      const meId = user?.id;
      const role = (user?.role || '').toString().trim().toLowerCase();
      const isAdmin = role === 'admin';
      const assignedId = wo?.assigned_user_id ?? wo?.assignedUserId ?? wo?.assignee_id;
      const isAssignedToMe = meId && assignedId !== undefined && assignedId !== null && String(assignedId) === String(meId);

      if (!isAdmin && (!wo || !assignedId || !isAssignedToMe)) {
        Alert.alert('No access', 'You have no access to this info');
        return;
      }

      setDueTodayOpen(false);
      navigation.navigate('WorkOrderDetail', { workOrderId });
    },
    [allWorkOrders, navigation, user?.id, user?.role]
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
    const completedTotal = items.filter((w) => {
      const s = norm(w?.status);
      return s === 'done' || s === 'completed';
    }).length;
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
      completedTotal,
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

  const assignedToMe = useMemo(() => {
    const items = Array.isArray(allWorkOrders) ? allWorkOrders : [];
    const meId = user?.id;
    if (!meId) return [];
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    return items
      .filter((w) => String(w?.assigned_user_id || '') === String(meId))
      .filter((w) => {
        const s = norm(w?.status);
        return s !== 'done' && s !== 'completed' && s !== 'cancelled' && s !== 'canceled';
      });
  }, [allWorkOrders, user?.id]);

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

  const onPressCompletedWorkOrders = useCallback(() => {
    openStatusSheet('Completed Work Orders', completedWorkOrders);
  }, [completedWorkOrders, openStatusSheet]);

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

  const onReloadApp = useCallback(async () => {
    setDueTodayOpen(false);
    setStatusSheetOpen(false);
    reloadApp();
  }, [reloadApp]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.hello, { color: colors.mutedText }]}>Hello{user?.user_name ? `, ${user.user_name}!` : '!'}</Text>
            <Text style={[styles.welcome, { color: colors.text }]}>Welcome to MNFG-1A</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: '800' }}>Dark</Text>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggleMode}
              trackColor={{ false: '#d1d5db', true: '#2563eb' }}
              thumbColor={mode === 'dark' ? '#ffffff' : '#ffffff'}
            />
          </View>
        </View>

      <View style={styles.quickRow}>
        <Pressable style={styles.quickBtn} onPress={openDueToday}>
          <Text style={styles.quickLabel}>Due Today</Text>
          <Text style={styles.quickMeta}>{dueTodayCount}</Text>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={onReloadApp}>
          <Text style={styles.quickLabel}>Reload</Text>
          <Text style={styles.quickMeta}>↻</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>WORK ORDERS STATUS</Text>
      <View style={styles.grid}>
        <TileButton title="High Priority Work Orders" value={String(metrics.highPriority)} onPress={onPressHighPriority} />
        <TileButton title="Overdue Work Orders" value={String(metrics.overdue)} onPress={onPressOverdue} />
        <TileButton title="Completed Work Orders" value={String(metrics.completedTotal)} onPress={onPressCompletedWorkOrders} />
        <TileButton title="Completed in the Last 7 days" value={String(metrics.completed7)} onPress={onPressCompleted7} />
      </View>

      <Text style={styles.sectionTitle}>TO DO LIST</Text>
      <View style={[styles.todoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.todoTitle, { color: colors.text }]}>Assigned To Me</Text>
        {allWorkOrdersLoading ? (
          <Text style={[styles.todoSubtitle, { color: colors.mutedText }]}>Loading…</Text>
        ) : assignedToMe.length === 0 ? (
          <Text style={[styles.todoSubtitle, { color: colors.mutedText }]}>No items</Text>
        ) : (
          assignedToMe.slice(0, 8).map((wo) => (
            <Pressable key={String(wo?.id)} style={styles.completedRow} onPress={() => openWorkOrder(wo?.id)}>
              <Text style={[styles.completedTitle, { color: colors.text }]} numberOfLines={1}>
                {wo?.name || 'Work Order'}
              </Text>
              <Text style={[styles.completedMeta, { color: colors.mutedText }]}>#{wo?.id ?? '-'}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={{ height: 18 }} />

      <Pressable style={[styles.logoutBtn, { backgroundColor: mode === 'dark' ? '#111827' : '#111827' }]} onPress={doLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>

      </ScrollView>

      <Modal
        visible={dueTodayOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDueToday}
      >
        <Pressable style={[styles.sheetBackdrop, { backgroundColor: colors.overlay }]} onPress={closeDueToday} />
        <View style={styles.sheetWrap}>
          <View style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.calendarIcon, { backgroundColor: mode === 'dark' ? '#111827' : '#eff6ff' }]}>
                  <Text style={styles.calendarIconText}>▦</Text>
                </View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Work Orders Due Today</Text>
              </View>
              <Pressable onPress={closeDueToday} style={styles.sheetClose}>
                <Text style={[styles.sheetCloseText, { color: colors.mutedText }]}>×</Text>
              </Pressable>
            </View>

            {dueTodayLoading ? (
              <View style={styles.sheetLoading}>
                <ActivityIndicator />
                <Text style={[styles.sheetHint, { color: colors.mutedText }]}>Loading…</Text>
              </View>
            ) : dueTodayError ? (
              <View style={styles.sheetEmpty}>
                <Text style={[styles.sheetError, { color: colors.dangerText }]}>{dueTodayError}</Text>
                <Pressable onPress={loadDueToday} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : dueTodayItems.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <Text style={[styles.sheetHint, { color: colors.mutedText }]}>No work orders due today.</Text>
              </View>
            ) : (
              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetList}>
                {dueTodayItems.map((wo) => {
                  const statusMeta = normalizeStatus(wo?.status);
                  const prMeta = normalizePriority(wo?.priority);
                  const locationText = getWorkOrderLocationText(wo);
                  return (
                    <Pressable
                      key={wo?.id?.toString?.() || String(Math.random())}
                      style={[styles.woCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => openWorkOrder(wo?.id)}
                    >
                      <Text style={styles.woTitle} numberOfLines={2}>
                        {wo?.name || 'Work Order'}
                      </Text>
                      <Text style={[styles.woSub, { color: colors.mutedText }]} numberOfLines={1}>
                        {locationText}
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
        <Pressable style={[styles.sheetBackdrop, { backgroundColor: colors.overlay }]} onPress={closeStatusSheet} />
        <View style={styles.sheetWrap}>
          <View style={[styles.sheetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.calendarIcon, { backgroundColor: mode === 'dark' ? '#111827' : '#eff6ff' }]}>
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
                <Text style={[styles.sheetHint, { color: colors.mutedText }]}>No work orders</Text>
              </View>
            ) : (
              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetList}>
                {statusSheetItems.map((wo) => {
                  const statusMeta = normalizeStatus(wo?.status);
                  const prMeta = normalizePriority(wo?.priority);
                  const locationText = getWorkOrderLocationText(wo);
                  return (
                    <Pressable
                      key={wo?.id?.toString?.() || String(Math.random())}
                      style={[styles.woCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => openWorkOrder(wo?.id)}
                    >
                      <Text style={styles.woTitle} numberOfLines={2}>
                        {wo?.name || 'Work Order'}
                      </Text>
                      <Text style={[styles.woSub, { color: colors.mutedText }]} numberOfLines={1}>
                        {locationText}
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
  woSub: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
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
