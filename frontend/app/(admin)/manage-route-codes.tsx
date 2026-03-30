import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '../../services/api';

export default function ManageRouteCodes() {
  const router = useRouter();
  const [routeCodes, setRouteCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editLabel, setEditLabel] = useState('');

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') { window.alert(`${title}: ${message}`); }
    else { Alert.alert(title, message); }
  };

  const fetchRouteCodes = useCallback(async () => {
    try {
      const data = await apiService.getRouteCodes();
      setRouteCodes(data);
    } catch (error) {
      console.error('Error fetching route codes:', error);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRouteCodes(); }, []);

  const handleAdd = async () => {
    if (!newCode.trim()) { showAlert('Error', 'Route code is required'); return; }
    try {
      const result = await apiService.createRouteCode(newCode.trim(), newLabel.trim() || newCode.trim());
      setRouteCodes(prev => [...prev, result].sort((a, b) => a.code.localeCompare(b.code)));
      setNewCode('');
      setNewLabel('');
    } catch (error: any) {
      showAlert('Error', error?.response?.data?.detail || 'Failed to add route code');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editCode.trim()) { showAlert('Error', 'Route code is required'); return; }
    try {
      await apiService.updateRouteCode(id, { code: editCode.trim(), label: editLabel.trim() || editCode.trim() });
      setRouteCodes(prev => prev.map(rc => rc.id === id ? { ...rc, code: editCode.trim().toUpperCase(), label: editLabel.trim() || editCode.trim() } : rc));
      setEditingId(null);
    } catch (error: any) {
      showAlert('Error', error?.response?.data?.detail || 'Failed to update');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    const doDelete = async () => {
      try {
        await apiService.deleteRouteCode(id);
        setRouteCodes(prev => prev.filter(rc => rc.id !== id));
      } catch (error) {
        showAlert('Error', 'Failed to delete route code');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete route code "${code}"?`)) doDelete();
    } else {
      Alert.alert('Delete', `Delete route code "${code}"?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }]);
    }
  };

  const renderItem = ({ item }: any) => {
    if (editingId === item.id) {
      return (
        <View style={styles.editRow}>
          <TextInput style={[styles.input, { flex: 1 }]} value={editCode} onChangeText={setEditCode} placeholder="Code" autoCapitalize="characters" />
          <TextInput style={[styles.input, { flex: 2, marginLeft: 8 }]} value={editLabel} onChangeText={setEditLabel} placeholder="Label" />
          <TouchableOpacity style={styles.saveBtn} onPress={() => handleUpdate(item.id)}>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingId(null)}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.row}>
        <View style={styles.codeTag}><Text style={styles.codeTagText}>{item.code}</Text></View>
        <Text style={styles.labelText}>{item.label}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => { setEditingId(item.id); setEditCode(item.code); setEditLabel(item.label); }}>
          <Ionicons name="create-outline" size={18} color="#8B4513" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.code)}>
          <Ionicons name="trash-outline" size={18} color="#c00" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Route Codes</Text>
      </View>

      <View style={styles.addRow}>
        <TextInput style={[styles.input, { flex: 1 }]} value={newCode} onChangeText={setNewCode} placeholder="Code (e.g. R1)" autoCapitalize="characters" />
        <TextInput style={[styles.input, { flex: 2, marginLeft: 8 }]} value={newLabel} onChangeText={setNewLabel} placeholder="Label (e.g. North Zone)" />
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8B4513" style={{ marginTop: 40 }} />
      ) : routeCodes.length === 0 ? (
        <Text style={styles.emptyText}>No route codes yet. Add one above.</Text>
      ) : (
        <FlatList
          data={routeCodes}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f5f0', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  addRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fff' },
  addBtn: { backgroundColor: '#8B4513', borderRadius: 8, padding: 10, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  editRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbe6', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e6d9a0' },
  codeTag: { backgroundColor: '#8B4513', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginRight: 12 },
  codeTagText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  labelText: { flex: 1, fontSize: 15, color: '#333' },
  editBtn: { padding: 8 },
  deleteBtn: { padding: 8 },
  saveBtn: { backgroundColor: '#4CAF50', borderRadius: 8, padding: 10, marginLeft: 8 },
  cancelBtn: { backgroundColor: '#999', borderRadius: 8, padding: 10, marginLeft: 4 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
