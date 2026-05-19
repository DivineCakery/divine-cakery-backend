import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, ScrollView, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '../../services/api';
import { showAlert } from '../../utils/alerts';

export default function ProductCodesScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const data = await apiService.getProductCodes();
      setProducts(data);
      const map: Record<string, string> = {};
      data.forEach((p: any) => {
        if (p.product_code != null) map[p.id] = String(p.product_code);
      });
      setCodeMap(map);
    } catch (e) {
      showAlert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const setCode = (productId: string, value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    if (num && (parseInt(num) < 1 || parseInt(num) > 100)) return;
    setCodeMap(prev => {
      const next = { ...prev };
      if (num === '') delete next[productId];
      else next[productId] = num;
      return next;
    });
    setHasChanges(true);
  };

  const getDuplicates = () => {
    const used: Record<string, string[]> = {};
    Object.entries(codeMap).forEach(([pid, code]) => {
      if (!code) return;
      if (!used[code]) used[code] = [];
      used[code].push(pid);
    });
    const dupes: Record<string, boolean> = {};
    Object.entries(used).forEach(([code, pids]) => {
      if (pids.length > 1) pids.forEach(pid => { dupes[pid] = true; });
    });
    return dupes;
  };

  const handleSave = async () => {
    const dupes = getDuplicates();
    if (Object.keys(dupes).length > 0) {
      showAlert('Duplicate Codes', 'Each product code must be unique. Please fix duplicates (highlighted in red).');
      return;
    }
    setSaving(true);
    try {
      const mappings = Object.entries(codeMap)
        .filter(([_, code]) => code)
        .map(([product_id, code]) => ({ product_id, product_code: parseInt(code) }));
      await apiService.updateProductCodes(mappings);
      setHasChanges(false);
      showAlert('Success', `Saved ${mappings.length} product codes`);
    } catch (e) {
      showAlert('Error', 'Failed to save product codes');
    } finally {
      setSaving(false);
    }
  };

  const dupes = getDuplicates();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const assignedCount = Object.values(codeMap).filter(v => v).length;

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Product Codes</Text>
        <TouchableOpacity
          style={[s.saveBtn, !hasChanges && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.statsBar}>
        <Text style={s.statsText}>{assignedCount} / {products.length} products assigned</Text>
        {hasChanges && <Text style={s.unsavedText}>Unsaved changes</Text>}
      </View>

      <View style={s.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={s.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const isDupe = dupes[item.id];
          return (
            <View style={[s.row, isDupe && s.rowDupe]}>
              <View style={s.rowInfo}>
                <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
              </View>
              <TextInput
                style={[s.codeInput, isDupe && s.codeInputDupe]}
                value={codeMap[item.id] || ''}
                onChangeText={v => setCode(item.id, v)}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="--"
                placeholderTextColor="#ccc"
                data-testid={`code-input-${item.id}`}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.center}><Text style={s.emptyText}>No products found</Text></View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8DC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8DC' },
  header: {
    backgroundColor: '#8B4513', padding: 15, paddingTop: 40,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  saveBtn: {
    backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 6, minWidth: 70, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#999' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  statsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  statsText: { fontSize: 13, color: '#666', fontWeight: '600' },
  unsavedText: { fontSize: 12, color: '#FF6B00', fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 12, marginBottom: 6, paddingHorizontal: 12, borderRadius: 8, elevation: 1,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#333', marginLeft: 8 },
  list: { paddingHorizontal: 12, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 8, padding: 12, marginBottom: 6, elevation: 1,
  },
  rowDupe: { borderWidth: 2, borderColor: '#f44336' },
  rowInfo: { flex: 1, marginRight: 12 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#333' },
  codeInput: {
    width: 60, height: 44, borderWidth: 2, borderColor: '#8B4513', borderRadius: 8,
    textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#8B4513', backgroundColor: '#FFF8DC',
  },
  codeInputDupe: { borderColor: '#f44336', color: '#f44336' },
  emptyText: { fontSize: 16, color: '#999' },
});
