import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
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

interface ShortageItem {
  item: string;
  stock: number;
  demand_sr1: number;
  demand_sr2: number;
  demand_lr1: number;
  total_demand: number;
  short_by: number;
}

interface ShiftableCustomer {
  customer_id: string;
  customer_name: string;
  current_route: string;
  shift_to_options: string[];
  item_count: number;
}

export default function RouteSummaries() {
  const router = useRouter();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [drivers, setDrivers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Shortage popup state
  const [shortageModal, setShortageModal] = useState(false);
  const [shortages, setShortages] = useState<ShortageItem[]>([]);
  const [shiftableCustomers, setShiftableCustomers] = useState<ShiftableCustomer[]>([]);
  const [shiftSelections, setShiftSelections] = useState<Record<string, string>>({});
  const [shortageLoading, setShortageLoading] = useState(false);
  const [shifting, setShifting] = useState<string | null>(null);
  const [shortageChecked, setShortageChecked] = useState(false);

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${msg}`);
    else Alert.alert(title, msg);
  };

  // Auto-check shortages when page loads
  useEffect(() => {
    checkShortages();
  }, [selectedDate]);

  const checkShortages = async () => {
    setShortageLoading(true);
    try {
      const result = await apiService.checkShortages(selectedDate);
      setShortages(result.shortages || []);
      setShiftableCustomers(result.shiftable_customers || []);
      setShiftSelections({});
      if ((result.shortages || []).length > 0 && !shortageChecked) {
        setShortageModal(true);
      }
      setShortageChecked(true);
    } catch (error) {
      console.error('Error checking shortages:', error);
    } finally {
      setShortageLoading(false);
    }
  };

  const handleShift = async (customer: ShiftableCustomer) => {
    const newRoute = shiftSelections[customer.customer_id];
    if (!newRoute) {
      showAlert('Select Route', 'Please select a route to shift to');
      return;
    }
    setShifting(customer.customer_id);
    try {
      await apiService.shiftCustomerRoute(customer.customer_id, selectedDate, newRoute);
      showAlert('Shifted', `${customer.customer_name} moved from ${customer.current_route} to ${newRoute}`);
      // Remove from shiftable list
      setShiftableCustomers(prev => prev.filter(c => c.customer_id !== customer.customer_id));
      // Refresh current route data if loaded
      if (selectedRoute) fetchSummary(selectedRoute);
      // Re-check shortages
      checkShortages();
    } catch (error: any) {
      showAlert('Error', error?.response?.data?.detail || 'Failed to shift customer');
    } finally {
      setShifting(null);
    }
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
    setShortageChecked(false);
    if (selectedRoute) {
      setLoading(true);
      setData(null);
      apiService.getRouteSummary(selectedRoute, newDate).then(setData).catch(() => {}).finally(() => setLoading(false));
    }
  };

  const setDriver = (code: string, name: string) => {
    setDrivers(prev => ({ ...prev, [code]: name }));
  };

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
    const maxItemLength = Math.max(...items.map(i => i.length), 10);
    const itemColWidth = isLulu ? Math.min(maxItemLength * 8 + 10, 140) : Math.min(maxItemLength * 7 + 10, 160);
    const driverLines = (rt?.codes || []).map(code => {
      const d = drivers[code] || '';
      return d ? `${code}: ${d}` : '';
    }).filter(Boolean).join(' &nbsp;|&nbsp; ');
    let headerRow = '<th class="item-hdr">Item</th>';
    for (const g of groups) {
      headerRow += `<th class="total-hdr">${g.code}<br/>Total</th>`;
      for (const c of g.customers) {
        headerRow += `<th class="cust">${c.name}</th>`;
      }
    }
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
    const pageStyle = isLulu
      ? `@page { size: A4 portrait; margin: 8mm; }`
      : `@page { size: A4 landscape; margin: 6mm; }`;
    const custHeaderStyle = isLulu
      ? `th.cust { min-width: 50px; max-width: 70px; height: auto; font-size: 11px; padding: 4px 2px; writing-mode: horizontal-tb; text-orientation: initial; transform: none; word-wrap: break-word; }`
      : `th.cust { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); min-width: 28px; max-width: 40px; height: 110px; font-size: 11px; padding: 3px 2px; }`;
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
      th.total-hdr { min-width: 44px; border: 2.5px solid #000; }
      ${custHeaderStyle}
      td { }
      td.item { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      td.total-cell { text-align: center; font-weight: bold; background: #999; color: #000; min-width: 44px; border-left: 2.5px solid #000; border-right: 2.5px solid #000; }
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Route Summaries</Text>
        {shortages.length > 0 && (
          <TouchableOpacity onPress={() => setShortageModal(true)} style={styles.shortageIndicator}>
            <Ionicons name="warning" size={18} color="#fff" />
            <Text style={styles.shortageIndicatorText}>{shortages.length}</Text>
          </TouchableOpacity>
        )}
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

      {/* Driver Inputs */}
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
        <ScrollView style={styles.tableContainer} contentContainerStyle={{ paddingBottom: 200 }} showsVerticalScrollIndicator>
          {data.customers.length === 0 ? (
            <Text style={styles.emptyText}>No orders found for {rt?.label} on this date.</Text>
          ) : (
            <>
              <Text style={styles.summaryText}>
                {rt?.label} - {data.customers.length} customers, {data.items.length} items
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
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

      {/* Shortage & Shift Modal */}
      <Modal visible={shortageModal} transparent animationType="slide">
        <View style={ms.overlay}>
          <View style={ms.modal}>
            <View style={ms.modalHeader}>
              <View style={ms.modalTitleRow}>
                <Ionicons name="warning" size={22} color="#e65100" />
                <Text style={ms.modalTitle}>Shortage & Route Shift</Text>
              </View>
              <TouchableOpacity onPress={() => setShortageModal(false)} style={ms.closeBtn}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={ms.scrollBody} showsVerticalScrollIndicator>
              {/* Part 1: Shortage Warnings */}
              <Text style={ms.sectionTitle}>
                <Ionicons name="alert-circle" size={16} color="#d32f2f" /> Shortage Warnings ({shortages.length} items)
              </Text>
              {shortages.length === 0 ? (
                <View style={ms.noShortage}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={ms.noShortageText}>No shortages detected</Text>
                </View>
              ) : (
                <View style={ms.shortageTable}>
                  {/* Table header */}
                  <View style={ms.stRow}>
                    <Text style={[ms.stCell, ms.stHeader, { flex: 2 }]}>Item</Text>
                    <Text style={[ms.stCell, ms.stHeader]}>Stock</Text>
                    <Text style={[ms.stCell, ms.stHeader]}>SR1</Text>
                    <Text style={[ms.stCell, ms.stHeader]}>SR2</Text>
                    <Text style={[ms.stCell, ms.stHeader]}>LR1</Text>
                    <Text style={[ms.stCell, ms.stHeader]}>Total</Text>
                    <Text style={[ms.stCell, ms.stHeader, { color: '#d32f2f' }]}>Short</Text>
                  </View>
                  {shortages.map((s, i) => (
                    <View key={i} style={[ms.stRow, i % 2 === 0 && ms.stRowAlt]}>
                      <Text style={[ms.stCell, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>{s.item}</Text>
                      <Text style={[ms.stCell, { color: '#2e7d32' }]}>{s.stock}</Text>
                      <Text style={ms.stCell}>{s.demand_sr1 || '-'}</Text>
                      <Text style={ms.stCell}>{s.demand_sr2 || '-'}</Text>
                      <Text style={ms.stCell}>{s.demand_lr1 || '-'}</Text>
                      <Text style={[ms.stCell, { fontWeight: '700' }]}>{s.total_demand}</Text>
                      <Text style={[ms.stCell, { color: '#d32f2f', fontWeight: '700' }]}>-{s.short_by}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Part 2: Route Shifting */}
              <Text style={[ms.sectionTitle, { marginTop: 20 }]}>
                <Ionicons name="swap-horizontal" size={16} color="#1565c0" /> Shift Customers to Later Route
              </Text>
              <Text style={ms.shiftHint}>
                Move customers from early routes (SR1/SR2/LR1) to later routes for more prep time.
              </Text>

              {shiftableCustomers.length === 0 ? (
                <Text style={ms.noCustomersText}>No customers available to shift.</Text>
              ) : (
                shiftableCustomers.map((cust) => (
                  <View key={cust.customer_id} style={ms.shiftCard}>
                    <View style={ms.shiftCardTop}>
                      <View style={ms.shiftCardInfo}>
                        <Text style={ms.shiftCustName}>{cust.customer_name}</Text>
                        <View style={ms.routeBadge}>
                          <Text style={ms.routeBadgeText}>{cust.current_route}</Text>
                        </View>
                        <Text style={ms.itemCountText}>{cust.item_count} items</Text>
                      </View>
                    </View>
                    <View style={ms.shiftCardBottom}>
                      <Text style={ms.shiftToLabel}>Shift to:</Text>
                      {cust.shift_to_options.map(opt => (
                        <TouchableOpacity
                          key={opt}
                          style={[
                            ms.shiftOption,
                            shiftSelections[cust.customer_id] === opt && ms.shiftOptionSelected,
                          ]}
                          onPress={() => setShiftSelections(prev => ({ ...prev, [cust.customer_id]: opt }))}
                        >
                          <Text style={[
                            ms.shiftOptionText,
                            shiftSelections[cust.customer_id] === opt && ms.shiftOptionTextSelected,
                          ]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[ms.shiftBtn, !shiftSelections[cust.customer_id] && ms.shiftBtnDisabled]}
                        onPress={() => handleShift(cust)}
                        disabled={!shiftSelections[cust.customer_id] || shifting === cust.customer_id}
                      >
                        {shifting === cust.customer_id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={ms.shiftBtnText}>Shift</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Modal styles
const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 16, width: '92%', maxWidth: 600, maxHeight: '85%', elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeBtn: { padding: 4 },
  scrollBody: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  noShortage: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, backgroundColor: '#e8f5e9', borderRadius: 8 },
  noShortageText: { fontSize: 14, color: '#2e7d32', fontWeight: '600' },
  shortageTable: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  stRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  stRowAlt: { backgroundColor: '#fafafa' },
  stCell: { flex: 1, padding: 8, fontSize: 12, textAlign: 'center', color: '#333' },
  stHeader: { fontWeight: 'bold', backgroundColor: '#f5f5f5', fontSize: 11, color: '#555' },
  shiftHint: { fontSize: 12, color: '#777', marginBottom: 12, lineHeight: 18 },
  noCustomersText: { fontSize: 13, color: '#999', textAlign: 'center', padding: 16 },
  shiftCard: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' },
  shiftCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  shiftCardInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  shiftCustName: { fontSize: 14, fontWeight: '700', color: '#333' },
  routeBadge: { backgroundColor: '#e65100', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  routeBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  itemCountText: { fontSize: 12, color: '#777' },
  shiftCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  shiftToLabel: { fontSize: 13, color: '#555', fontWeight: '600' },
  shiftOption: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6, borderWidth: 1.5, borderColor: '#1565c0', backgroundColor: '#fff' },
  shiftOptionSelected: { backgroundColor: '#1565c0' },
  shiftOptionText: { fontSize: 13, fontWeight: '600', color: '#1565c0' },
  shiftOptionTextSelected: { color: '#fff' },
  shiftBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginLeft: 'auto' as any },
  shiftBtnDisabled: { backgroundColor: '#bbb' },
  shiftBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f5f0', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', flex: 1 },
  shortageIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e65100', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  shortageIndicatorText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
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
