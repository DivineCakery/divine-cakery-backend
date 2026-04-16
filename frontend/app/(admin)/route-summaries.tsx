import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import apiService from '../../services/api';

const ROUTE_TYPES = [
  { key: 'lulu', label: 'Lulu Trip', codes: ['LFT'] },
  { key: 'short', label: 'Short Route', codes: ['SR1', 'SR2', 'SR 3'] },
  { key: 'long', label: 'Long Route', codes: ['LR1', 'LR2'] },
  { key: 'onsite', label: 'Onsite', codes: ['ONS'] },
];

interface CustomerData {
  id: string;
  name: string;
  route_code: string;
}

interface RouteGroup {
  code: string;
  customers: CustomerData[];
}

export default function RouteSummaries() {
  const router = useRouter();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [drivers, setDrivers] = useState<Record<string, string>>({});
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

  const setDriver = (code: string, name: string) => {
    setDrivers(prev => ({ ...prev, [code]: name }));
  };

  // Group customers by route_code and compute totals
  const getGroups = (): RouteGroup[] => {
    if (!data) return [];
    const rt = ROUTE_TYPES.find(r => r.key === selectedRoute);
    if (!rt) return [];
    const groups: RouteGroup[] = [];
    for (const code of rt.codes) {
      const custs = (data.customers || []).filter((c: CustomerData) => c.route_code === code);
      custs.sort((a: CustomerData, b: CustomerData) => a.name.localeCompare(b.name));
      groups.push({ code, customers: custs });
    }
    return groups;
  };

  const getGroupTotal = (item: string, group: RouteGroup): number => {
    let total = 0;
    for (const c of group.customers) {
      total += (data.matrix[item]?.[c.id] || 0);
    }
    return total;
  };

  const generateHtml = () => {
    if (!data || data.customers.length === 0) return '';
    const rt = ROUTE_TYPES.find(r => r.key === selectedRoute);
    const routeLabel = rt?.label || '';
    const dateStr = new Date(data.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const items: string[] = data.items;
    const groups = getGroups();
    const isLulu = selectedRoute === 'lulu';

    // Calculate max item name length for dynamic column width
    const maxItemLength = Math.max(...items.map(i => i.length), 10);
    const itemColWidth = isLulu ? Math.min(maxItemLength * 8 + 10, 140) : Math.min(maxItemLength * 7 + 10, 160);

    // Driver info line
    const driverLines = (rt?.codes || []).map(code => {
      const d = drivers[code] || '';
      return d ? `${code}: ${d}` : '';
    }).filter(Boolean).join(' &nbsp;|&nbsp; ');

    // Build header columns: for each group -> Total col, then customer cols
    let headerRow = '<th class="item-hdr">Item</th>';
    for (const g of groups) {
      headerRow += `<th class="total-hdr">${g.code}<br/>Total</th>`;
      for (const c of g.customers) {
        headerRow += `<th class="cust">${c.name}</th>`;
      }
    }

    // Build data rows
    let rows = '';
    for (const item of items) {
      let cells = `<td class="item">${item}</td>`;
      for (const g of groups) {
        const tot = getGroupTotal(item, g);
        cells += `<td class="total-cell">${tot || ''}</td>`;
        for (const c of g.customers) {
          const qty = data.matrix[item]?.[c.id] || '';
          cells += `<td class="qty">${qty}</td>`;
        }
      }
      rows += `<tr>${cells}</tr>`;
    }

    // Apply compact single-page layout for all routes
    const pageStyle = isLulu
      ? `@page { size: A4 portrait; margin: 8mm; }`
      : `@page { size: A4 landscape; margin: 6mm; }`;

    const custHeaderStyle = isLulu
      ? `th.cust { min-width: 50px; max-width: 70px; height: auto; font-size: 11px; padding: 4px 2px; writing-mode: horizontal-tb; text-orientation: initial; transform: none; word-wrap: break-word; }`
      : `th.cust { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); min-width: 28px; max-width: 40px; height: 110px; font-size: 11px; padding: 3px 2px; }`;

    // Compact styling for all routes to fit single page
    const compactStyles = isLulu ? `
      html, body { max-width: 794px; margin: 0 auto; }
      table { table-layout: auto; width: 100%; page-break-inside: avoid; }
      td.item { font-size: 13px; padding: 3px 4px; min-width: ${itemColWidth}px; max-width: ${itemColWidth}px; }
      td.total-cell { font-size: 14px; padding: 3px; }
      td.qty { font-size: 13px; min-width: 45px; padding: 3px; }
      th.item-hdr { font-size: 14px; padding: 4px; min-width: ${itemColWidth}px; max-width: ${itemColWidth}px; }
      th.total-hdr { font-size: 13px; padding: 4px; background: #999; color: #fff; }
      .hdr { font-size: 20px; margin: 0 0 3px; }
      .sub { font-size: 13px; margin: 0 0 5px; }
    ` : `
      html, body { max-width: 100%; margin: 0 auto; }
      table { table-layout: auto; width: 100%; page-break-inside: avoid; }
      td.item { font-size: 12px; padding: 2px 3px; min-width: ${itemColWidth}px; max-width: ${itemColWidth}px; }
      td.total-cell { font-size: 13px; padding: 2px; }
      td.qty { font-size: 12px; min-width: 28px; padding: 2px; }
      th.item-hdr { font-size: 13px; padding: 3px; min-width: ${itemColWidth}px; max-width: ${itemColWidth}px; }
      th.total-hdr { font-size: 12px; padding: 3px; background: #999; color: #fff; }
      .hdr { font-size: 22px; margin: 0 0 2px; }
      .sub { font-size: 14px; margin: 0 0 4px; }
    `;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      ${pageStyle}
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #000; }
      .hdr { font-weight: bold; }
      .sub { }
      table { border-collapse: collapse; margin-top: 4px; }
      th, td { border: 1px solid #000; }
      th { background: #fff; color: #000; text-align: center; font-weight: bold; }
      th.item-hdr { text-align: left; }
      th.total-hdr { min-width: 44px; }
      ${custHeaderStyle}
      td { }
      td.item { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      td.total-cell { text-align: center; font-weight: bold; background: #ddd; min-width: 44px; }
      td.qty { text-align: center; }
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
      ${compactStyles}
    </style></head><body>
      <div class="hdr">${routeLabel}</div>
      <div class="sub">${dateStr}${driverLines ? ' &nbsp;|&nbsp; Driver: ' + driverLines : ''}</div>
      <table>
        <thead><tr>${headerRow}</tr></thead>
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
      Print.printAsync({ html, orientation: selectedRoute === 'lulu' ? Print.Orientation.portrait : Print.Orientation.landscape });
    }
  };

  const rt = ROUTE_TYPES.find(r => r.key === selectedRoute);
  const groups = getGroups();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-button">
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Route Summaries</Text>
      </View>

      {/* Date Picker */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow} testID="date-prev">
          <Ionicons name="chevron-back" size={22} color="#8B4513" />
        </TouchableOpacity>
        <Text style={styles.dateText} data-testid="date-display">
          {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow} testID="date-next">
          <Ionicons name="chevron-forward" size={22} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {/* Driver Inputs - one per route sub-code */}
      {rt && (
        <View style={styles.driversSection}>
          {rt.codes.map(code => (
            <View key={code} style={styles.driverRow}>
              <Text style={styles.driverLabel}>{code} Driver:</Text>
              <TextInput
                style={styles.driverInput}
                placeholder={`Enter ${code} driver`}
                value={drivers[code] || ''}
                onChangeText={(v) => setDriver(code, v)}
                testID={`driver-input-${code}`}
              />
            </View>
          ))}
        </View>
      )}

      {/* Route Type Buttons */}
      <View style={styles.routeGrid}>
        {ROUTE_TYPES.map(r => (
          <TouchableOpacity
            key={r.key}
            style={[styles.routeBtn, selectedRoute === r.key && styles.routeBtnActive]}
            onPress={() => handleRouteSelect(r.key)}
            testID={`route-btn-${r.key}`}
          >
            <Ionicons name="car-outline" size={20} color={selectedRoute === r.key ? '#fff' : '#8B4513'} />
            <Text style={[styles.routeBtnText, selectedRoute === r.key && styles.routeBtnTextActive]}>{r.label}</Text>
            <Text style={[styles.routeBtnCodes, selectedRoute === r.key && { color: '#ddd' }]}>{r.codes.join(', ')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color="#8B4513" style={{ marginTop: 30 }} />
      ) : data ? (
        <ScrollView 
          style={styles.tableContainer} 
          contentContainerStyle={{ paddingBottom: 200 }}
          showsVerticalScrollIndicator={true}
        >
          {data.customers.length === 0 ? (
            <Text style={styles.emptyText} testID="no-data-msg">No orders found for {rt?.label} on this date.</Text>
          ) : (
            <>
              <Text style={styles.summaryText} testID="summary-text">
                {rt?.label} - {data.customers.length} customers, {data.items.length} items
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  {/* Table Header with grouped columns */}
                  <View style={styles.tRow}>
                    <View style={[styles.tCell, styles.tItemCell]}>
                      <Text style={styles.tHeaderText}>Item</Text>
                    </View>
                    {groups.map(g => (
                      <React.Fragment key={g.code}>
                        <View style={[styles.tCell, styles.tTotalHdrCell]}>
                          <Text style={styles.tTotalHdrText}>{g.code}{'\n'}Total</Text>
                        </View>
                        {g.customers.map(c => (
                          <View key={c.id} style={[styles.tCell, styles.tCustCell]}>
                            <Text style={styles.tCustText} numberOfLines={2}>{c.name}</Text>
                          </View>
                        ))}
                      </React.Fragment>
                    ))}
                  </View>

                  {/* Table Body */}
                  {data.items.map((item: string, idx: number) => (
                    <View key={item} style={[styles.tRow, idx % 2 === 0 && styles.tRowAlt]}>
                      <View style={[styles.tCell, styles.tItemCell]}>
                        <Text style={styles.tItemText}>{item}</Text>
                      </View>
                      {groups.map(g => (
                        <React.Fragment key={g.code}>
                          <View style={[styles.tCell, styles.tTotalCell]}>
                            <Text style={styles.tTotalText}>{getGroupTotal(item, g) || ''}</Text>
                          </View>
                          {g.customers.map(c => (
                            <View key={c.id} style={[styles.tCell, styles.tQtyCell]}>
                              <Text style={styles.tQtyText}>{data.matrix[item]?.[c.id] || ''}</Text>
                            </View>
                          ))}
                        </React.Fragment>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Print Button */}
              <TouchableOpacity style={styles.printBtn} onPress={handlePrint} testID="print-btn">
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
  driversSection: { marginBottom: 14 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  driverLabel: { fontSize: 14, fontWeight: '700', color: '#555', width: 100 },
  driverInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fff' },
  routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  routeBtn: { flex: 1, minWidth: '45%' as any, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#8B4513' },
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
  tTotalHdrCell: { width: 60, borderRightWidth: 2, borderColor: '#333', alignItems: 'center', backgroundColor: '#ddd', paddingVertical: 8 },
  tTotalHdrText: { fontSize: 10, fontWeight: 'bold', color: '#000', textAlign: 'center' },
  tTotalCell: { width: 60, borderRightWidth: 2, borderColor: '#333', alignItems: 'center', backgroundColor: '#f0ece6' },
  tTotalText: { fontSize: 13, fontWeight: 'bold', color: '#000' },
  tCustCell: { width: 70, borderRightWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#555', paddingVertical: 8 },
  tQtyCell: { width: 70, borderRightWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  tHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  tCustText: { fontSize: 9, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  tItemText: { fontSize: 11, fontWeight: '600', color: '#333' },
  tQtyText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B4513', borderRadius: 8, padding: 14, marginTop: 16, marginBottom: 150, gap: 8 },
  printBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
