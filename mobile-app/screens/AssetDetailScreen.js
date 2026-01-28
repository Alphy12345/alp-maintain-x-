import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

function Row({ label, value }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.mutedText }]}>{value ?? '—'}</Text>
    </View>
  );
}

export default function AssetDetailScreen({ route, navigation }) {
  const assetId = route?.params?.assetId;
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [asset, setAsset] = useState(null);

  const load = useCallback(async () => {
    if (!assetId) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.get(`/assets/${assetId}`);
      setAsset(res?.data || null);
    } catch (e) {
      setAsset(null);
      setError(e?.message || 'Failed to load asset');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    load();
  }, [load]);

  const title = useMemo(() => {
    if (asset?.asset_name) return asset.asset_name;
    if (assetId) return `Asset #${assetId}`;
    return 'Asset';
  }, [asset?.asset_name, assetId]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={[styles.hint, { color: colors.mutedText }]}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.error, { color: colors.dangerText }]}>{error}</Text>
          <Pressable onPress={load} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.title, { color: colors.text }]}>{asset?.asset_name || '—'}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>Asset Details</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Row label="Status" value={asset?.status} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row label="Location" value={asset?.location} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row label="Criticality" value={asset?.criticality} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row label="Type" value={asset?.asset_type} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row label="Manufacturer" value={asset?.manufacturer} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row label="Model" value={asset?.model} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row label="Serial No" value={asset?.model_serial_no} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row label="Year" value={asset?.year != null ? String(asset.year) : '—'} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row label="Description" value={asset?.description} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f7fb' },
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
  headerBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
  headerBtnText: { color: '#2563eb', fontSize: 14, fontWeight: '800' },
  headerTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  hint: { color: '#6b7280', fontSize: 12, fontWeight: '700' },
  error: { color: '#b91c1c', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  container: { padding: 14, paddingBottom: 30, gap: 12 },
  title: { color: '#111827', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#6b7280', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  divider: { height: 1, backgroundColor: '#eef2f7', marginVertical: 12 },
  row: { gap: 6 },
  rowLabel: { color: '#111827', fontSize: 12, fontWeight: '900' },
  rowValue: { color: '#374151', fontSize: 13, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
});
