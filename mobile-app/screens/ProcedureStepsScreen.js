import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../services/api';

function FieldRow({ index, field, value, onChange }) {
  const label = field?.label || 'Step';
  const required = !!field?.required;
  const type = (field?.field_type || '').toString().trim().toLowerCase();

  const isComplete = useMemo(() => {
    if (type === 'checkbox' || type === 'check') return value === true;
    if (type === 'photo' || type === 'image') return !!value;
    const s = (value ?? '').toString().trim();
    return s.length > 0;
  }, [type, value]);

  const renderControl = () => {
    if (type === 'checkbox' || type === 'check') {
      const checked = !!value;
      return (
        <Pressable onPress={() => onChange(!checked)} style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </Pressable>
      );
    }

    if (type === 'number' || type === 'numeric') {
      return (
        <TextInput
          value={value ?? ''}
          onChangeText={(t) => onChange(t)}
          keyboardType="numeric"
          placeholder="Enter number"
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />
      );
    }

    if (type === 'photo' || type === 'image') {
      return (
        <Pressable
          onPress={() => Alert.alert('Photo', 'Photo capture/upload is not implemented yet.')}
          style={styles.photoBtn}
        >
          <Text style={styles.photoBtnText}>{value ? 'Photo Added' : 'Add Photo'}</Text>
        </Pressable>
      );
    }

    return (
      <TextInput
        value={value ?? ''}
        onChangeText={(t) => onChange(t)}
        placeholder="Enter response"
        placeholderTextColor="#9ca3af"
        style={styles.input}
      />
    );
  };

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIndex}>
        <Text style={styles.stepIndexText}>{index}</Text>
      </View>
      <View style={styles.stepBody}>
        <View style={styles.stepHeaderRow}>
          <Text style={styles.stepLabel} numberOfLines={2}>
            {label}
          </Text>
          {isComplete ? (
            <View style={styles.stepDoneBadge}>
              <Text style={styles.stepDoneText}>✓</Text>
            </View>
          ) : null}
        </View>
        {!!required && <Text style={styles.stepRequired}>Required</Text>}
        <View style={styles.controlWrap}>{renderControl()}</View>
      </View>
    </View>
  );
}

export default function ProcedureStepsScreen({ route, navigation }) {
  const workOrderId = route?.params?.workOrderId;
  const initialProcedureId = route?.params?.procedureId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [silentSaving, setSilentSaving] = useState(false);
  const [error, setError] = useState('');
  const [procedure, setProcedure] = useState(null);
  const [values, setValues] = useState({});

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
      const proc = procRes?.data || null;
      setProcedure(proc);

      if (workOrderId) {
        const savedRes = await api.get(`/procedures/saved-values/${workOrderId}`, { params: { procedure_id: procedureId } });
        const saved = savedRes?.data?.values || {};

        const nextValues = {};
        const sections = proc?.sections || [];
        for (const s of sections) {
          for (const f of s?.fields || []) {
            const raw = saved?.[String(f?.id)];
            if (raw === undefined) continue;
            const t = (f?.field_type || '').toString().trim().toLowerCase();
            if (t === 'checkbox' || t === 'check') {
              nextValues[f.id] = String(raw).toLowerCase() === 'true' || String(raw) === '1' || String(raw).toLowerCase() === 'yes';
            } else {
              nextValues[f.id] = String(raw);
            }
          }
        }
        setValues((prev) => ({ ...nextValues, ...prev }));
      }
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

  const setFieldValue = useCallback((fieldId, nextValue) => {
    if (!fieldId) return;
    setValues((prev) => ({ ...prev, [fieldId]: nextValue }));
  }, []);

  const save = useCallback(async () => {
    if (!workOrderId) return;
    if (saving) return;

    setSaving(true);
    try {
      const payload = {
        work_order_id: workOrderId,
        procedure_id: procedure?.id,
        status: 'in_progress',
        values: Object.entries(values || {}).map(([fieldId, v]) => {
          let valueStr = '';
          if (v === null || v === undefined) valueStr = '';
          else if (typeof v === 'boolean') valueStr = v ? 'true' : 'false';
          else valueStr = String(v);
          return { field_id: Number(fieldId), value: valueStr };
        }),
      };

      const res = await api.post('/procedures/save', payload);
      const saved = res?.data?.saved;

      try {
        const progRes = await api.get(`/work-orders/${workOrderId}/procedure-progress`);
        const completed = Number.isFinite(progRes?.data?.completed) ? progRes.data.completed : 0;
        const total = Number.isFinite(progRes?.data?.total) ? progRes.data.total : 0;

        if (total > 0 && completed >= total) {
          Alert.alert('Procedure Completed', 'Do you want to end this work order?', [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'End Work Order',
              style: 'default',
              onPress: async () => {
                try {
                  await api.patch(`/work-orders/${workOrderId}`, { status: 'done' });
                  Alert.alert('Completed', 'Work order marked as done.');
                  navigation.goBack();
                } catch (e) {
                  Alert.alert('Failed', e?.message || 'Failed to end work order');
                }
              },
            },
          ]);
        } else {
          Alert.alert('Saved', typeof saved === 'number' ? `Saved ${saved} fields.` : 'Procedure saved.');
        }
      } catch (e) {
        Alert.alert('Saved', typeof saved === 'number' ? `Saved ${saved} fields.` : 'Procedure saved.');
      }
    } catch (e) {
      Alert.alert('Save failed', e?.message || 'Failed to save procedure');
    } finally {
      setSaving(false);
    }
  }, [procedure?.id, saving, values, workOrderId]);

  const silentSave = useCallback(
    async (nextValues) => {
      if (!workOrderId) return;
      if (!procedure?.id) return;
      if (saving || silentSaving) return;

      setSilentSaving(true);
      try {
        const payload = {
          work_order_id: workOrderId,
          procedure_id: procedure.id,
          status: 'in_progress',
          values: Object.entries(nextValues || {}).map(([fieldId, v]) => {
            let valueStr = '';
            if (v === null || v === undefined) valueStr = '';
            else if (typeof v === 'boolean') valueStr = v ? 'true' : 'false';
            else valueStr = String(v);
            return { field_id: Number(fieldId), value: valueStr };
          }),
        };
        await api.post('/procedures/save', payload);
      } catch (e) {
      } finally {
        setSilentSaving(false);
      }
    },
    [procedure?.id, saving, silentSaving, workOrderId]
  );

  useEffect(() => {
    if (loading) return;
    if (!procedure?.id) return;
    if (!workOrderId) return;

    const t = setTimeout(() => {
      silentSave(values);
    }, 800);

    return () => clearTimeout(t);
  }, [loading, procedure?.id, silentSave, values, workOrderId]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {procedure?.name || 'Procedure'}
        </Text>
        <Pressable onPress={save} disabled={saving || loading} style={[styles.headerBtn, (saving || loading) && styles.headerBtnDisabled]}>
          <Text style={styles.headerBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
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
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title} numberOfLines={2}>
              {procedure?.name}
            </Text>
            <Text style={styles.subtitle}>{stepsCount} Steps</Text>

            {(procedure?.sections || []).map((section) => (
              <View key={String(section?.id)} style={styles.card}>
                <Text style={styles.cardTitle}>{section?.title || 'Section'}</Text>
                {!!section?.description && <Text style={styles.cardSub}>{section.description}</Text>}

                {(section?.fields || []).map((field, idx) => (
                  <FieldRow
                    key={String(field?.id)}
                    index={idx + 1}
                    field={field}
                    value={values?.[field?.id]}
                    onChange={(next) => setFieldValue(field?.id, next)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.bottomBtnPrimary, (saving || loading || !!error) && styles.bottomBtnDisabled]}
          onPress={save}
          disabled={saving || loading || !!error}
        >
          <Text style={styles.bottomBtnPrimaryText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },

  body: {
    flex: 1,
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
  headerBtnDisabled: {
    opacity: 0.6,
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
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  stepLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  stepDoneBadge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepDoneText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '900',
    marginTop: -1,
  },
  stepRequired: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  controlWrap: {
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  checkboxTick: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: -1,
  },
  photoBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  photoBtnText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '900',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  bottomBtnPrimary: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bottomBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  bottomBtnDisabled: {
    opacity: 0.7,
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
