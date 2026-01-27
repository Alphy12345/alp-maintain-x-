import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../services/api';

function StepRow({ index, label, required }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIndex}>
        <Text style={styles.stepIndexText}>{index}</Text>
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.stepLabel} numberOfLines={2}>
          {label}
        </Text>
        {!!required && <Text style={styles.stepRequired}>Required</Text>}
      </View>
    </View>
  );
}

export default function ProcedureStepsScreen({ route, navigation }) {
  const workOrderId = route?.params?.workOrderId;
  const initialProcedureId = route?.params?.procedureId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [procedure, setProcedure] = useState(null);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);

    try {
      let procedureId = initialProcedureId;
      if (!procedureId && workOrderId) {
        const woRes = await api.get(`/work-orders/${workOrderId}`);
        procedureId = woRes?.data?.procedure_id;
      }

      if (!procedureId) {
        setProcedure(null);
        setError('No procedure assigned to this work order');
        return;
      }

      const procRes = await api.get(`/procedures/${procedureId}`);
      setProcedure(procRes?.data || null);
    } catch (e) {
      setProcedure(null);
      setError(e?.message || 'Failed to load procedure');
    } finally {
      setLoading(false);
    }
  }, [initialProcedureId, workOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  const stepsCount = useMemo(() => {
    const sections = procedure?.sections || [];
    return sections.reduce((acc, s) => acc + (s?.fields?.length || 0), 0);
  }, [procedure?.sections]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {procedure?.name || 'Procedure'}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.hint}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={load} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title} numberOfLines={2}>
            {procedure?.name}
          </Text>
          <Text style={styles.subtitle}>{stepsCount} Steps</Text>

          {(procedure?.sections || []).map((section) => (
            <View key={String(section?.id)} style={styles.card}>
              <Text style={styles.cardTitle}>{section?.title || 'Section'}</Text>
              {!!section?.description && <Text style={styles.cardSub}>{section.description}</Text>}

              {(section?.fields || []).map((field, idx) => (
                <StepRow
                  key={String(field?.id)}
                  index={idx + 1}
                  label={field?.label || 'Step'}
                  required={!!field?.required}
                />
              ))}
            </View>
          ))}
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
  headerTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
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
  container: {
    padding: 14,
    paddingBottom: 30,
    gap: 12,
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  stepIndex: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    color: '#2563eb',
    fontWeight: '900',
    fontSize: 12,
  },
  stepBody: {
    flex: 1,
  },
  stepLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  stepRequired: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
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
});
