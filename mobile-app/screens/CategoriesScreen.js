import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';

export default function CategoriesScreen({ route, navigation }) {
  const categories = route?.params?.categories;
  const title = route?.params?.title;
  const { mode, colors } = useTheme();

  const list = useMemo(() => {
    const cats = Array.isArray(categories) ? categories : [];
    return cats
      .map((c) => ({ id: c?.id, name: c?.name }))
      .filter((c) => !!c.name);
  }, [categories]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title || 'Categories'}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Categories</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>{list.length} Total</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {list.length === 0 ? (
            <Text style={[styles.cardSub, { color: colors.mutedText }]}>No categories assigned.</Text>
          ) : (
            list.map((c) => (
              <View key={String(c.id ?? c.name)} style={[styles.catRow, { borderTopColor: mode === 'dark' ? colors.border : '#eef2f7' }]}>
                <Text style={[styles.catText, { color: colors.text }]}>{c.name}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  cardSub: { color: '#6b7280', fontSize: 12, fontWeight: '700' },
  catRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  catText: { color: '#111827', fontSize: 13, fontWeight: '900' },
});
