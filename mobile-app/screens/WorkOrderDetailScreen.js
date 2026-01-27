import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { api } from '../services/api';

function TabButton({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatusButton({ label, active, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.statusBtn, active && styles.statusBtnActive, disabled && styles.statusBtnDisabled]}
    >
      <Text style={[styles.statusBtnText, active && styles.statusBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function RowItem({ left, right }) {
  return (
    <View style={styles.rowItem}>
      <Text style={styles.rowLeft}>{left}</Text>
      <Text style={styles.rowRight} numberOfLines={1}>
        {right}
      </Text>
    </View>
  );
}

function RowLink({ left, right, onPress, rightTone = 'muted' }) {
  return (
    <Pressable onPress={onPress} style={styles.rowLink}>
      <Text style={styles.rowLeft}>{left}</Text>
      <View style={styles.rowRightWrap}>
        <Text style={[styles.rowRight, rightTone === 'link' && styles.rowRightLink]} numberOfLines={1}>
          {right}
        </Text>
        <Text style={styles.rowChevron}>›</Text>
      </View>
    </Pressable>
  );
}

export default function WorkOrderDetailScreen({ route, navigation }) {
  const workOrderId = route?.params?.workOrderId;

  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState('');
  const [workOrder, setWorkOrder] = useState(null);
  const [asset, setAsset] = useState(null);
  const [procedureProgress, setProcedureProgress] = useState({ completed: 0, total: 0 });

  const fetchWorkOrder = useCallback(async () => {
    if (!workOrderId) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/work-orders/${workOrderId}`);
      setWorkOrder(res?.data || null);
    } catch (e) {
      setError(e?.message || 'Failed to load work order');
      setWorkOrder(null);
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  useFocusEffect(
    useCallback(() => {
      fetchWorkOrder();
    }, [fetchWorkOrder])
  );

  const loadAsset = useCallback(async (assetId) => {
    if (!assetId) return;
    try {
      const res = await api.get(`/assets/${assetId}`);
      setAsset(res?.data || null);
    } catch (e) {
      setAsset(null);
    }
  }, []);

  useEffect(() => {
    const assetId = workOrder?.asset_id;
    if (!assetId) {
      setAsset(null);
      return;
    }
    loadAsset(assetId);
  }, [workOrder?.asset_id, loadAsset]);

  const loadProcedureProgress = useCallback(async () => {
    if (!workOrderId) return;
    try {
      const res = await api.get(`/work-orders/${workOrderId}/procedure-progress`);
      const completed = Number.isFinite(res?.data?.completed) ? res.data.completed : 0;
      const total = Number.isFinite(res?.data?.total) ? res.data.total : 0;
      setProcedureProgress({ completed, total });
    } catch (e) {
      setProcedureProgress({ completed: 0, total: 0 });
    }
  }, [workOrderId]);

  useFocusEffect(
    useCallback(() => {
      loadProcedureProgress();
    }, [loadProcedureProgress])
  );

  const status = (workOrder?.status || 'open').toString().toLowerCase();

  const title = useMemo(() => {
    return workOrder?.name || `Work Order #${workOrderId}`;
  }, [workOrder?.name, workOrderId]);

  const updateStatus = useCallback(
    async (nextStatus) => {
      if (!workOrderId) return;
      if (savingStatus) return;
      const currentStatus = (workOrder?.status || 'open').toString().toLowerCase();
      if (currentStatus === nextStatus) return;

      setSavingStatus(true);
      setError('');

      const previous = workOrder;
      setWorkOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      try {
        const res = await api.patch(`/work-orders/${workOrderId}`, { status: nextStatus });
        setWorkOrder(res?.data || previous);
      } catch (e) {
        setWorkOrder(previous);
        setError(e?.message || 'Failed to update status');
      } finally {
        setSavingStatus(false);
      }
    },
    [workOrderId, workOrder, savingStatus]
  );

  const assignedTo = workOrder?.assigned_user?.user_name || (workOrder?.assigned_user_id ? `User #${workOrder.assigned_user_id}` : 'Unassigned');

  const dueDateText = useMemo(() => {
    if (!workOrder?.due_date) return '—';
    return workOrder.due_date;
  }, [workOrder?.due_date]);

  const assetName = useMemo(() => {
    if (asset?.asset_name) return asset.asset_name;
    if (workOrder?.asset_id) return `Asset #${workOrder.asset_id}`;
    return '—';
  }, [asset?.asset_name, workOrder?.asset_id]);

  const assetStatusText = useMemo(() => {
    const s = (asset?.status || '').toString().trim().toLowerCase();
    if (!s) return '—';
    return asset?.status;
  }, [asset?.status]);

  const openAsset = useCallback(() => {
    const assetId = workOrder?.asset_id;
    if (!assetId) return;
    navigation.navigate('AssetDetail', { assetId });
  }, [navigation, workOrder?.asset_id]);

  const openCategories = useCallback(() => {
    const categories = Array.isArray(workOrder?.categories) ? workOrder.categories : [];
    navigation.navigate('Categories', { categories, title: 'Categories' });
  }, [navigation, workOrder?.categories]);

  const categoriesText = useMemo(() => {
    const cats = Array.isArray(workOrder?.categories) ? workOrder.categories : [];
    if (cats.length === 0) return '—';
    const first = cats[0]?.name || 'Category';
    if (cats.length === 1) return first;
    return `${first} +${cats.length - 1}`;
  }, [workOrder?.categories]);

  const scheduleText = useMemo(() => {
    if (workOrder?.recurrence) return workOrder.recurrence;
    if (workOrder?.start_date) return `Starts ${workOrder.start_date}`;
    return '—';
  }, [workOrder?.recurrence, workOrder?.start_date]);

  const partsUsed = useMemo(() => {
    const wop = Array.isArray(workOrder?.work_order_parts) ? workOrder.work_order_parts : [];
    return wop
      .map((row) => {
        const name = row?.part?.name || (row?.part_id ? `Part #${row.part_id}` : 'Part');
        const qty = Number.isFinite(row?.quantity) ? row.quantity : parseInt(row?.quantity || '1', 10) || 1;
        return { key: `${row?.part_id || name}-${qty}`, name, qty };
      })
      .filter((x) => !!x.name);
  }, [workOrder?.work_order_parts]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerCenter}>#{workOrderId ?? '-'}</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.hint}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={fetchWorkOrder} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title} numberOfLines={3}>
            {title}
          </Text>

          <View style={styles.tabs}>
            <TabButton label="Details" active={activeTab === 'details'} onPress={() => setActiveTab('details')} />
            <TabButton label="Parts" active={activeTab === 'parts'} onPress={() => setActiveTab('parts')} />
          </View>

          {activeTab === 'parts' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Parts</Text>

              {partsUsed.length === 0 ? (
                <Text style={styles.cardSub}>No parts have been recorded for this work order.</Text>
              ) : (
                <View style={styles.partsList}>
                  {partsUsed.map((p) => (
                    <View key={p.key} style={styles.partRow}>
                      <Text style={styles.partName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <View style={styles.partQtyPill}>
                        <Text style={styles.partQtyText}>x{p.qty}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Status</Text>
                <View style={{ width: 48 }} />
              </View>

              <View style={styles.statusRow}>
                <StatusButton
                  label="Open"
                  active={status === 'open'}
                  disabled={savingStatus}
                  onPress={() => updateStatus('open')}
                />
                <StatusButton
                  label="On Hold"
                  active={status === 'on_hold'}
                  disabled={savingStatus}
                  onPress={() => updateStatus('on_hold')}
                />
                <StatusButton
                  label={savingStatus && status === 'in_progress' ? 'Saving…' : 'In Progress'}
                  active={status === 'in_progress'}
                  disabled={savingStatus}
                  onPress={() => updateStatus('in_progress')}
                />
                <StatusButton
                  label={savingStatus && (status === 'done' || status === 'completed') ? 'Saving…' : 'Done'}
                  active={status === 'done' || status === 'completed'}
                  disabled={savingStatus}
                  onPress={() => updateStatus('done')}
                />
              </View>

              {!!error && <Text style={styles.inlineError}>{error}</Text>}

              <View style={styles.card}>
                <RowItem left="Due Date" right={dueDateText} />
                <View style={styles.divider} />
                <RowItem left="Assigned to" right={assignedTo} />
              </View>

              <View style={styles.cardAccent}>
                <Text style={styles.cardAccentTitle}>Procedure</Text>
                <Text style={styles.cardAccentSub}>
                  {procedureProgress.completed}/{procedureProgress.total} Steps Completed
                </Text>
                <Pressable
                  style={styles.accentBtn}
                  onPress={() => navigation.navigate('ProcedureSteps', { workOrderId, procedureId: workOrder?.procedure_id })}
                >
                  <Text style={styles.accentBtnText}>Start Procedure  ›</Text>
                </Pressable>
              </View>

              <View style={styles.card}>
                <RowItem left="Location" right={workOrder?.location || '—'} />
                <View style={styles.divider} />
                <RowLink left="Asset" right={assetName} onPress={openAsset} />
                <View style={styles.divider} />
                <RowLink left="Asset Status" right={assetStatusText} onPress={openAsset} />
                <View style={styles.divider} />
                <RowLink left="Categories" right={categoriesText} onPress={openCategories} />
                <View style={styles.divider} />
                <RowItem left="Schedule" right={scheduleText} />
                <View style={styles.divider} />
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  headerBtnText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '800',
  },
  headerCenter: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  hint: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  inlineError: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  container: {
    padding: 14,
    paddingBottom: 30,
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  tabs: {
    flexDirection: 'row',
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 14,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#2563eb',
  },
  tabBtnText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '800',
  },
  tabBtnTextActive: {
    color: '#2563eb',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnDisabled: {
    opacity: 0.6,
  },
  statusBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  statusBtnText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '900',
  },
  statusBtnTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 14,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardSub: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLeft: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  rowRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    maxWidth: '62%',
  },
  rowRight: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '800',
    maxWidth: '62%',
  },
  rowRightLink: {
    color: '#2563eb',
  },
  rowChevron: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '900',
    marginTop: -1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  cardAccent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    marginTop: 14,
  },
  cardAccentTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardAccentSub: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  accentBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  accentBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '900',
  },
  primaryBtnWide: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnWideText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  partsList: {
    gap: 10,
    marginTop: 10,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    backgroundColor: '#f9fafb',
  },
  partName: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
  },
  partQtyPill: {
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  partQtyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
});
