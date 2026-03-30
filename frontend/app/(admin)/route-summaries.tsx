import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import apiService from '../../services/api';

const ROUTE_TYPES = [
  { key: 'lulu', label: 'Lulu Trip', codes: 'LULU1' },
  { key: 'short', label: 'Short Route', codes: 'SR1, SR2' },
  { key: 'long', label: 'Long Route', codes: 'LR1, LR2' },
  { key: 'onsite', label: 'Onsite', codes: 'ONS' },
];

export default function RouteSummaries() {
  const router = useRouter();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [driverName, setDriverName] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  const fetchSummary = useCallback(async (routeType: string) => {
    setLoading(true);
    setData(null);
    try {
      const result = await apiService.getRouteSummary(routeType, selectedDate);
      setData(result);
    } catch (error: any) {
      console.error('Error fetching route summary:', error);
      showAlert('Error', error?.response?.data?.detail || 'Failed to fetch route summary');
    } finally { setLoading(false); }
  }, [selectedDate]);

  const handleRouteSelect = (routeKey: string) => {
    setSelectedRoute(routeKey);
    fetchSummary(routeKey);
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const newDate = d.toISOString().split('T')[0];
    setSelectedDate(newDate);
    if (selectedRoute) {
      setLoading(true);
      setData(null);
      apiService.getRouteSummary(selectedRoute, newDate).then(setData).catch(() => {}).finally(() => setLoading(false));
    }
  };

  const generateHtml = () => {
    if (!data || data.customers.length === 0) return '';
    const routeLabel = ROUTE_TYPES.find(r => r.key === selectedRoute)?.label || '';
    const dateStr = new Date(data.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const customers = data.customers;
    const items = data.items;
    const matrix = data.matrix;

    const thCols = customers.map((c: any) => `<th class="cust">${c.name}</th>`).join('');
    let rows = '';
    items.forEach((item: string) => {
      const cells = customers.map((c: any) => {
        const qty = matrix[item]?.[c.id] || '';
        return `<td class="qty">${qty}</td>`;
      }).join('');
      rows += `<tr><td class="item">${item}</td>${cells}</tr>`;
    });

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4 landscape; margin: 6mm; }
      * { box-sizing: border-box; }
      html, body { height: auto; overflow: visible; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 0; }
      .hdr { font-size: 16px; font-weight: bold; margin: 0 0 2px; }
      .sub { font-size: 12px; margin: 0 0 4px; color: #555; }
      table { width: 100%; border-collapse: collapse; margin-top: 2px; }
      th { background: #333; color: #fff; padding: 4px 3px; font-size: 9px; text-align: center; white-space: nowrap; }
      th.item-hdr { text-align: left; min-width: 140px; }
      th.cust { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); min-width: 28px; max-width: 40px; height: 120px; font-size: 8px; padding: 4px 2px; }
      td { padding: 2px 3px; border: 1px solid #ccc; font-size: 10px; }
      td.item { font-weight: bold; white-space: nowrap; }
      td.qty { text-align: center; min-width: 24px; }
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
    </style></head><body>
      <div class="hdr">${routeLabel}</div>
      <div class="sub">${dateStr}${driverName ? ' | Driver: ' + driverName : ''}</div>
      <table>
        <thead><tr><th class="item-hdr">Item</th>${thCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;
  };

  const handlePrint = () => {
    if (!data || data.customers.length === 0) { showAlert('Error', 'No data to print'); return; }
    const html = generateHtml();
    if (Platform.OS === 'web') {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '0';
      iframe.style.top = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open(); doc.write(html); doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 2000);
        }, 500);
      }
    } else {
      Print.printAsync({ html, orientation: Print.Orientation.landscape });
    }
  };

  const routeLabel = ROUTE_TYPES.find(r => r.key === selectedRoute)?.label || '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Route Summaries</Text>
      </View>

      {/* Date Picker */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={22} color="#8B4513" />
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={22} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {/* Driver Input */}
      <View style={styles.driverRow}>
        <Text style={styles.label}>Driver:</Text>
        <TextInput
          style={styles.driverInput}
          placeholder="Enter driver name"
          value={driverName}
          onChangeText={setDriverName}
        />
      </View>

      {/* Route Type Buttons */}
      <View style={styles.routeGrid}>
        {ROUTE_TYPES.map(rt => (
          <TouchableOpacity
            key={rt.key}
            style={[styles.routeBtn, selectedRoute === rt.key && styles.routeBtnActive]}
            onPress={() => handleRouteSelect(rt.key)}
          >
            <Ionicons name="car-outline" size={20} color={selectedRoute === rt.key ? '#fff' : '#8B4513'} />
            <Text style={[styles.routeBtnText, selectedRoute === rt.key && styles.routeBtnTextActive]}>{rt.label}</Text>
            <Text style={[styles.routeBtnCodes, selectedRoute === rt.key && { color: '#ddd' }]}>{rt.codes}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color="#8B4513" style={{ marginTop: 30 }} />
      ) : data ? (
        <ScrollView style={styles.tableContainer}>
          {data.customers.length === 0 ? (
            <Text style={styles.emptyText}>No orders found for {routeLabel} on this date.</Text>
          ) : (
            <>
              <Text style={styles.summaryText}>{routeLabel} - {data.customers.length} customers, {data.items.length} items</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  {/* Table Header */}
                  <View style={styles.tRow}>
                    <View style={[styles.tCell, styles.tItemCell]}><Text style={styles.tHeaderText}>Item</Text></View>
                    {data.customers.map((c: any) => (
                      <View key={c.id} style={[styles.tCell, styles.tCustCell]}>
                        <Text style={styles.tCustText} numberOfLines={2}>{c.name}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Table Body */}
                  {data.items.map((item: string, idx: number) => (
                    <View key={item} style={[styles.tRow, idx % 2 === 0 && styles.tRowAlt]}>
                      <View style={[styles.tCell, styles.tItemCell]}><Text style={styles.tItemText}>{item}</Text></View>
                      {data.customers.map((c: any) => (
                        <View key={c.id} style={[styles.tCell, styles.tQtyCell]}>
                          <Text style={styles.tQtyText}>{data.matrix[item]?.[c.id] || ''}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Print Button */}
              <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
                <Ionicons name="print" size={20} color="#fff" />
                <Text style={styles.printBtnText}>Print / Save PDF</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>Select a route above to view the summary.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f5f0', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  dateArrow: { padding: 8 },
  dateText: { fontSize: 16, fontWeight: '600', color: '#333', marginHorizontal: 12 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginRight: 8 },
  driverInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fff' },
  routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  routeBtn: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#8B4513' },
  routeBtnActive: { backgroundColor: '#8B4513' },
  routeBtnText: { fontSize: 14, fontWeight: 'bold', color: '#8B4513', marginTop: 4 },
  routeBtnTextActive: { color: '#fff' },
  routeBtnCodes: { fontSize: 11, color: '#999', marginTop: 2 },
  tableContainer: { flex: 1 },
  summaryText: { fontSize: 13, color: '#555', marginBottom: 8, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30, fontSize: 15 },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd' },
  tRowAlt: { backgroundColor: '#faf8f5' },
  tCell: { padding: 6, justifyContent: 'center' },
  tItemCell: { width: 180, borderRightWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f0ea' },
  tCustCell: { width: 70, borderRightWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#8B4513', paddingVertical: 8 },
  tQtyCell: { width: 70, borderRightWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  tHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  tCustText: { fontSize: 9, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  tItemText: { fontSize: 11, fontWeight: '600', color: '#333' },
  tQtyText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B4513', borderRadius: 8, padding: 14, marginTop: 16, marginBottom: 30, gap: 8 },
  printBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
