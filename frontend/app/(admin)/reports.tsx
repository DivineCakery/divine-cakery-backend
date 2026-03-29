import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import apiService from '../../services/api';
import { useAuthStore } from '../../store';
import { showAlert } from '../../utils/alerts';

// Department-to-dough mapping (hardcoded per requirements)
const DEPARTMENTS = [
  { key: 'dough_section', label: 'Dough Section' },
  { key: 'top_room', label: 'Top Room' },
  { key: 'angels_section', label: 'Angels Section' },
];

const DEPARTMENT_DOUGHS: Record<string, string[]> = {
  top_room: [
    'Multigrain dough', 'Egg bun dough', 'Milk bun dough', 'Pizza dough',
    'Fruity dough', 'Lavash', 'Grissini', 'Bread roll dough', 'Potato bun dough',
    'Red burger dough', 'Black burger dough', 'Ciabatta', 'French baguette',
    'Croissants', 'Puffs dough', 'Cookies/biscotti',
    'Burger Dough', // Burger Dough included for Top Room (only specific items)
  ],
  dough_section: [
    'Milk dough', 'Brioche Dough', 'Burger Dough', 'White Dough', 'Brown Dough',
    'Pav Dough', 'Sweet dough', 'Butter bread dough', 'Butter brioche dough',
  ],
  angels_section: ['Crumbs dough'],
};

// Items from Burger Dough that belong to Top Room in Prep Report only
const TOP_ROOM_BURGER_ITEMS = [
  'hot hotdog bun*4', 'lul samoon seeded*4', 'hotdog buns- 8in',
  'lul hotdog bun 3s', 'sandwich buns- 6in*4',
];

// Staff section key mapping for "Reported by" dropdown
const DEPT_STAFF_KEY: Record<string, string> = {
  top_room: 'top_room',
  dough_section: 'dough_section',
  angels_section: 'angels_prep',
};

export default function ReportsScreen() {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [preparationList, setPreparationList] = useState<any>(null);
  const [doughTypes, setDoughTypes] = useState<any[]>([]);
  const [selectedDoughType, setSelectedDoughType] = useState<string | null>(null);
  const [showDoughTypeDropdown, setShowDoughTypeDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { logout, user } = useAuthStore();
  const isFetchingRef = React.useRef(false);
  
  // Check user access level
  const accessLevel = user?.admin_access_level || 'full';
  const isReportsOnly = accessLevel === 'reports';
  
  // For reports-only users, default to preparation tab and don't allow daily items
  const [activeTab, setActiveTab] = useState<'daily' | 'preparation' | 'prepReport'>('preparation');
  
  // Preparation Report state
  const [selectedDepartment, setSelectedDepartment] = useState('dough_section');
  const [reportedBy, setReportedBy] = useState('');
  const [departmentStaff, setDepartmentStaff] = useState<any[]>([]);
  const [prepReportItems, setPrepReportItems] = useState<any[]>([]);
  const [preparedQuantities, setPreparedQuantities] = useState<Record<string, string>>({});
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showReportedByDropdown, setShowReportedByDropdown] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [prepReportText, setPrepReportText] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showViewChoiceModal, setShowViewChoiceModal] = useState(false);
  const [viewChoiceAction, setViewChoiceAction] = useState<'print' | 'pdf'>('print');
  const [whatsappNumbers, setWhatsappNumbers] = useState<{id: string, name: string, phone: string}[]>([]);
  const [showAddNumberModal, setShowAddNumberModal] = useState(false);
  const [newNumberName, setNewNumberName] = useState('');
  const [newNumberPhone, setNewNumberPhone] = useState('');

  // Generate A4 PDF HTML for Preparation Report
  // Helper: calculate adjusted today/tomorrow values (after closing stock reduction)
  const calcAdjustedValues = (item: any) => {
    const stock = item.previous_closing_stock || 0;
    const todayPrep = Math.max(0, item.orders_today - stock);
    const remainingAfterToday = stock - item.orders_today;
    const tomorrowPrep = Math.max(0, item.orders_tomorrow - Math.max(0, remainingAfterToday));
    return { todayPrep, tomorrowPrep };
  };

  const generatePrepReportHtml = (limited: boolean = false) => {
    const deptLabel = DEPARTMENTS.find(d => d.key === selectedDepartment)?.label || '';
    const grouped: Record<string, any[]> = {};
    prepReportItems.forEach((item: any) => {
      const dough = item.dough_type_name || 'Other';
      if (!grouped[dough]) grouped[dough] = [];
      grouped[dough].push(item);
    });

    let tableRows = '';
    Object.entries(grouped).forEach(([dough, items]) => {
      items.forEach((item: any, idx: number) => {
        const key = item.product_name;
        const { todayPrep, tomorrowPrep } = calcAdjustedValues(item);
        const prep = parseFloat(preparedQuantities[key] || '0') || 0;
        const total = todayPrep + tomorrowPrep;
        const notDone = Math.max(0, total - prep);
        tableRows += `<tr>
          <td style="font-weight:${idx === 0 ? 'bold' : 'normal'}">${idx === 0 ? dough : ''}</td>
          <td>${item.product_name}</td>
          <td style="text-align:center">${todayPrep}</td>
          <td style="text-align:center">${tomorrowPrep}</td>
          ${limited ? '' : `<td style="text-align:center">${prep || ''}</td>
          <td style="text-align:center;font-weight:bold;color:${notDone > 0 ? '#c00' : '#333'}">${notDone > 0 ? notDone : '-'}</td>`}
        </tr>`;
      });
    });

    const thCols = limited
      ? `<th>Dough</th><th>Items</th><th style="text-align:center">Today</th><th style="text-align:center">Tmrw</th>`
      : `<th>Dough</th><th>Items</th><th style="text-align:center">Today</th><th style="text-align:center">Tmrw</th><th style="text-align:center">Prepared</th><th style="text-align:center">Not Done</th>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; }
      html, body { height: auto; overflow: visible; }
      body { font-family: Arial, sans-serif; font-size: 20px; color: #333; margin: 0; padding: 0; }
      .header { font-size: 22px; margin: 0 0 6px; }
      .header b { font-size: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 4px; }
      th { background: #333; color: #fff; padding: 5px 6px; font-size: 18px; text-align: left; }
      td { padding: 4px 6px; border-bottom: 1px solid #ccc; font-size: 18px; line-height: 1.3; }
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
      tbody { display: table-row-group; }
    </style></head><body>
      <div class="header"><b>Preparation Report</b> | ${deptLabel} | ${reportedBy || '-'} | ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      <table>
        <thead><tr>${thCols}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body></html>`;
  };

  const printHtml = (html: string) => {
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
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 2000);
        }, 500);
      }
    }
  };

  const handlePrintReport = async (limited: boolean) => {
    if (prepReportItems.length === 0) { showAlert('Error', 'No items to print'); return; }
    try {
      const html = generatePrepReportHtml(limited);
      if (Platform.OS === 'web') {
        printHtml(html);
      } else {
        await Print.printAsync({ html, orientation: Print.Orientation.portrait });
      }
    } catch (error) {
      console.error('Print error:', error);
      showAlert('Error', 'Failed to print. Please try again.');
    }
  };

  const handleSharePdf = async (limited: boolean) => {
    if (prepReportItems.length === 0) { showAlert('Error', 'No items to export'); return; }
    if (!reportedBy) { showAlert('Error', 'Please select who reported'); return; }
    setGeneratingPdf(true);
    try {
      const html = generatePrepReportHtml(limited);
      if (Platform.OS === 'web') {
        printHtml(html);
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Preparation Report' });
      }
    } catch (error) {
      console.error('PDF error:', error);
      showAlert('Error', 'Failed to generate PDF. Please try again.');
    } finally { setGeneratingPdf(false); }
  };
  
  // Update activeTab when user loads (and enforce preparation tab for reports-only users)
  useEffect(() => {
    if (isReportsOnly) {
      setActiveTab('preparation');
    } else if (activeTab === 'preparation' && !isReportsOnly) {
      // For non-reports users, default to daily on first load
      setActiveTab('daily');
    }
  }, [user?.admin_access_level]);

  // Fetch dough types on mount
  useEffect(() => {
    fetchDoughTypes();
  }, []);

  // Refresh data when screen comes into focus or when filters change
  useFocusEffect(
    React.useCallback(() => {
      console.log('Reports screen focused, refreshing data...');
      setLoading(true);
      fetchReports();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedDate, selectedDoughType, selectedDepartment])
  );

  // Fetch department staff when department changes (for Prep Report)
  useEffect(() => {
    if (activeTab === 'prepReport') {
      fetchDepartmentStaff();
      fetchWhatsappNumbers();
    }
  }, [selectedDepartment, activeTab]);

  const fetchDoughTypes = async () => {
    try {
      const data = await apiService.getDoughTypes();
      setDoughTypes(data);
    } catch (error) {
      console.error('Error fetching dough types:', error);
    }
  };

  const fetchDepartmentStaff = async () => {
    try {
      const staffKey = DEPT_STAFF_KEY[selectedDepartment] || selectedDepartment;
      const response = await apiService.getSectionStaff(staffKey);
      setDepartmentStaff(response.staff || []);
      setReportedBy('');
    } catch (error) {
      console.error('Error fetching department staff:', error);
      setDepartmentStaff([]);
    }
  };

  const fetchWhatsappNumbers = async () => {
    try {
      const response = await apiService.getWhatsappNumbers();
      setWhatsappNumbers(response.numbers || []);
    } catch (error) {
      console.error('Error fetching WhatsApp numbers:', error);
    }
  };

  const handleAddWhatsappNumber = async () => {
    if (!newNumberName.trim() || !newNumberPhone.trim()) { showAlert('Error', 'Name and phone required'); return; }
    try {
      const response = await apiService.addWhatsappNumber(newNumberName.trim(), newNumberPhone.trim());
      setWhatsappNumbers(prev => [...prev, response.entry]);
      setNewNumberName('');
      setNewNumberPhone('');
      setShowAddNumberModal(false);
    } catch (error) {
      console.error('Error adding number:', error);
      showAlert('Error', 'Failed to add number');
    }
  };

  const handleDeleteWhatsappNumber = async (numberId: string) => {
    try {
      await apiService.deleteWhatsappNumber(numberId);
      setWhatsappNumbers(prev => prev.filter(n => n.id !== numberId));
    } catch (error) {
      console.error('Error deleting number:', error);
      showAlert('Error', 'Failed to delete number');
    }
  };

  const fetchReports = async () => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      console.log('⏭️ Skipping fetch - already in progress');
      return;
    }

    try {
      isFetchingRef.current = true;
      // Format date in local timezone (YYYY-MM-DD) to avoid UTC conversion issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      console.log(`🔄 Fetching reports for date: ${dateStr}, activeTab: ${activeTab}, doughType: ${selectedDoughType}`);
      if (activeTab === 'daily') {
        const data = await apiService.getDailyItemsReport(dateStr, selectedDoughType || undefined);
        console.log('✅ Daily report data:', JSON.stringify(data, null, 2));
        setReport(data);
      } else if (activeTab === 'preparation') {
        const data = await apiService.getPreparationListReport(dateStr, selectedDoughType || undefined);
        console.log('✅ Preparation List Data:', JSON.stringify(data, null, 2));
        setPreparationList(data);
      } else if (activeTab === 'prepReport') {
        // Fetch full preparation list (no dough filter) and filter client-side by department
        const data = await apiService.getPreparationListReport(dateStr);
        const deptDoughs = DEPARTMENT_DOUGHS[selectedDepartment] || [];
        // Filter items by department dough names with special handling for Burger Dough items
        const filtered = (data.items || []).filter((item: any) => {
          const doughName = (item.dough_type_name || '').toLowerCase();
          const productName = (item.product_name || '').toLowerCase();
          // Use adjusted values (after closing stock) for the hasOrders check
          const stock = item.previous_closing_stock || 0;
          const adjToday = Math.max(0, item.orders_today - stock);
          const remainAfter = stock - item.orders_today;
          const adjTmrw = Math.max(0, item.orders_tomorrow - Math.max(0, remainAfter));
          const hasOrders = (adjToday > 0 || adjTmrw > 0);
          if (!hasOrders) return false;
          
          const isBurgerDough = doughName === 'burger dough';
          const isTopRoomBurgerItem = TOP_ROOM_BURGER_ITEMS.some(name => productName === name);
          
          if (selectedDepartment === 'top_room') {
            // Top Room: include its normal doughs + specific Burger Dough items
            if (isBurgerDough) return isTopRoomBurgerItem;
            return deptDoughs.some(d => d.toLowerCase() === doughName);
          } else if (selectedDepartment === 'dough_section') {
            // Dough Section: include its doughs but EXCLUDE the 4 Top Room Burger items
            if (isBurgerDough && isTopRoomBurgerItem) return false;
            return deptDoughs.some(d => d.toLowerCase() === doughName);
          } else {
            // Other departments: normal matching
            return deptDoughs.some(d => d.toLowerCase() === doughName);
          }
        });
        setPrepReportItems(filtered);
        setPreparedQuantities({});
      }
    } catch (error: any) {
      console.error('❌ Error fetching report:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      if (error.response?.status === 401) {
        showAlert('Session Expired', 'Your session has expired. Please log in again.', [
          {
            text: 'OK',
            onPress: () => {
              logout();
              router.replace('/');
            }
          }
        ]);
      } else {
        const errorMsg = error.response?.data?.detail || error.message || 'Failed to load report';
        showAlert('Error', errorMsg);
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleLogout = () => {
    showAlert(
      'Logout Confirmation',
      'Are you sure you want to logout from admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    setLoading(true);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setLoading(true);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector - Hide Daily Items for reports-only users */}
      <View style={styles.tabContainer}>
        {!isReportsOnly && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
            onPress={() => {
              setActiveTab('daily');
              setLoading(true);
            }}
          >
            <Ionicons name="calendar" size={20} color={activeTab === 'daily' ? '#fff' : '#8B4513'} />
            <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>
              Daily Items
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'preparation' && styles.activeTab, isReportsOnly && styles.fullWidthTab]}
          onPress={() => {
            setActiveTab('preparation');
            setLoading(true);
          }}
        >
          <Ionicons name="list" size={20} color={activeTab === 'preparation' ? '#fff' : '#8B4513'} />
          <Text style={[styles.tabText, activeTab === 'preparation' && styles.activeTabText]}>
            Prep List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prepReport' && styles.activeTab]}
          onPress={() => {
            setActiveTab('prepReport');
            setLoading(true);
          }}
        >
          <Ionicons name="document-text" size={20} color={activeTab === 'prepReport' ? '#fff' : '#8B4513'} />
          <Text style={[styles.tabText, activeTab === 'prepReport' && styles.activeTabText]}>
            Prep Report
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'daily' ? (
          <>
            {/* Compact Controls Row for Daily Items */}
            <View style={styles.compactControlsRow}>
              {/* Compact Date Selector */}
              <View style={styles.compactDateSelector}>
                <TouchableOpacity
                  style={styles.compactDateButton}
                  onPress={() => changeDate(-1)}
                >
                  <Ionicons name="chevron-back" size={20} color="#8B4513" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.compactDateDisplay}
                  onPress={goToToday}
                >
                  <Text style={styles.compactDateText}>
                    {new Date(selectedDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={styles.compactDayText}>{report?.day_name}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.compactDateButton}
                  onPress={() => changeDate(1)}
                >
                  <Ionicons name="chevron-forward" size={20} color="#8B4513" />
                </TouchableOpacity>
              </View>

              {/* Dough Type Dropdown */}
              {doughTypes.length > 0 && (
                <TouchableOpacity
                  style={styles.doughTypeDropdown}
                  onPress={() => setShowDoughTypeDropdown(true)}
                >
                  <Ionicons name="disc" size={16} color="#FF9800" />
                  <Text style={styles.doughTypeDropdownText} numberOfLines={1}>
                    {selectedDoughType 
                      ? doughTypes.find(dt => dt.id === selectedDoughType)?.name || 'Selected'
                      : 'All Dough'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <Ionicons name="receipt" size={32} color="#4CAF50" />
                <Text style={styles.summaryValue}>{report?.total_orders || 0}</Text>
                <Text style={styles.summaryLabel}>Total Orders</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="cash" size={32} color="#2196F3" />
                <Text style={styles.summaryValue}>₹{report?.total_revenue?.toFixed(2) || '0.00'}</Text>
                <Text style={styles.summaryLabel}>Total Revenue</Text>
              </View>
            </View>

            {/* Items List */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items Ordered</Text>
              
              {report?.items && report.items.length > 0 ? (
                report.items.map((item: any, index: number) => (
                  <View key={item.product_id} style={styles.itemCard}>
                    <View style={styles.itemRank}>
                      <Text style={styles.rankText}>#{index + 1}</Text>
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      {item.dough_type_name && (
                        <View style={styles.doughTypeBadge}>
                          <Ionicons name="disc" size={12} color="#FF9800" />
                          <Text style={styles.doughTypeBadgeText}>{item.dough_type_name}</Text>
                        </View>
                      )}
                      <View style={styles.itemStats}>
                        <View style={styles.statItem}>
                          <Ionicons name="cube" size={16} color="#666" />
                          <Text style={styles.statText}>{item.quantity} units</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Ionicons name="cart" size={16} color="#666" />
                          <Text style={styles.statText}>{item.order_count} orders</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.itemRevenue}>
                      <Text style={styles.revenueAmount}>₹{item.revenue.toFixed(2)}</Text>
                      <Text style={styles.revenueLabel}>Revenue</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No items ordered on this date</Text>
                  {selectedDoughType && (
                    <Text style={styles.emptySubtext}>Try removing the dough type filter</Text>
                  )}
                </View>
              )}
            </View>
          </>
        ) : activeTab === 'preparation' ? (
          /* Preparation List View - Compact */
          <View style={styles.preparationSection}>
            {/* Compact Date + Filter Row */}
            <View style={styles.compactControlsRow}>
              {/* Compact Date Selector */}
              <View style={styles.compactDateSelector}>
                <TouchableOpacity
                  style={styles.compactDateButton}
                  onPress={() => changeDate(-1)}
                >
                  <Ionicons name="chevron-back" size={20} color="#8B4513" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.compactDateDisplay}
                  onPress={goToToday}
                >
                  <Text style={styles.compactDateText}>
                    {new Date(selectedDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={styles.compactDayText}>{preparationList?.day_name}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.compactDateButton}
                  onPress={() => changeDate(1)}
                >
                  <Ionicons name="chevron-forward" size={20} color="#8B4513" />
                </TouchableOpacity>
              </View>

              {/* Dough Type Dropdown */}
              {doughTypes.length > 0 && (
                <TouchableOpacity
                  style={styles.doughTypeDropdown}
                  onPress={() => setShowDoughTypeDropdown(true)}
                >
                  <Ionicons name="disc" size={16} color="#FF9800" />
                  <Text style={styles.doughTypeDropdownText} numberOfLines={1}>
                    {selectedDoughType 
                      ? doughTypes.find(dt => dt.id === selectedDoughType)?.name || 'Selected'
                      : 'All Dough'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Preparation List Items */}
            {preparationList?.items && preparationList.items.length > 0 ? (
              <>
                {preparationList.items.map((item: any, index: number) => {
                  // Calculate Today's preparation: orders_today - last_closing_stock (min 0)
                  const todayPrep = Math.max(0, item.orders_today - item.previous_closing_stock);
                  // Calculate Tomorrow's preparation: orders_tomorrow - remaining after today
                  const remainingAfterToday = item.previous_closing_stock - item.orders_today;
                  const tomorrowPrep = Math.max(0, item.orders_tomorrow - Math.max(0, remainingAfterToday));
                  
                  return (
                    <View key={item.product_id} style={styles.preparationCard}>
                      <View style={styles.preparationContent}>
                        <Text style={styles.preparationProductName}>{item.product_name}</Text>
                        {item.dough_type_name && (
                          <View style={styles.doughTypeBadge}>
                            <Ionicons name="disc" size={12} color="#FF9800" />
                            <Text style={styles.doughTypeBadgeText}>{item.dough_type_name}</Text>
                          </View>
                        )}
                        <View style={styles.preparationStatsRow}>
                          <View style={styles.preparationStatItem}>
                            <Text style={styles.preparationStatLabel}>Stock:</Text>
                            <Text style={styles.preparationStatValue}>{item.previous_closing_stock}</Text>
                          </View>
                          <View style={styles.preparationStatItem}>
                            <Text style={styles.preparationStatLabel}>Today:</Text>
                            <Text style={styles.preparationStatValue}>{item.orders_today}</Text>
                          </View>
                          <View style={styles.preparationStatItem}>
                            <Text style={styles.preparationStatLabel}>Tmrw:</Text>
                            <Text style={styles.preparationStatValue}>{item.orders_tomorrow}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.preparationBoxes}>
                        <View style={[styles.preparationBox, styles.preparationBoxToday]}>
                          <Text style={styles.preparationBoxLabel}>Today</Text>
                          <Text style={styles.preparationBoxValue}>{todayPrep}</Text>
                          <Text style={styles.preparationBoxUnit}>{item.unit}</Text>
                        </View>
                        <View style={[styles.preparationBox, styles.preparationBoxTomorrow]}>
                          <Text style={styles.preparationBoxLabel}>Tmrw</Text>
                          <Text style={styles.preparationBoxValue}>{tomorrowPrep}</Text>
                          <Text style={styles.preparationBoxUnit}>{item.unit}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#4CAF50" />
                <Text style={styles.emptyText}>All stock is sufficient!</Text>
                <Text style={styles.emptySubtext}>No items need preparation</Text>
                {selectedDoughType && (
                  <Text style={styles.emptySubtext}>Try removing the dough type filter</Text>
                )}
              </View>
            )}
          </View>
        ) : activeTab === 'prepReport' ? (
          /* Preparation Report View */
          <View style={styles.preparationSection}>
            {/* Department Dropdown */}
            <View style={styles.prepReportField}>
              <Text style={styles.prepReportLabel}>Department:</Text>
              <TouchableOpacity style={styles.prepReportDropdown} onPress={() => setShowDeptDropdown(true)}>
                <Text style={styles.prepReportDropdownText}>{DEPARTMENTS.find(d => d.key === selectedDepartment)?.label || 'Select'}</Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            {/* Reported By Dropdown */}
            <View style={styles.prepReportField}>
              <Text style={styles.prepReportLabel}>Reported by:</Text>
              <TouchableOpacity style={styles.prepReportDropdown} onPress={() => setShowReportedByDropdown(true)}>
                <Text style={reportedBy ? styles.prepReportDropdownText : styles.prepReportDropdownPlaceholder}>{reportedBy || 'Select staff'}</Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Table */}
            {prepReportItems.length > 0 ? (
              <View style={styles.prepTable}>
                {/* Table Header */}
                <View style={styles.prepTableHeader}>
                  <Text style={[styles.prepTableHeaderCell, { flex: 2 }]}>Dough</Text>
                  <Text style={[styles.prepTableHeaderCell, { flex: 3 }]}>Items</Text>
                  <Text style={[styles.prepTableHeaderCell, { flex: 1 }]}>Today</Text>
                  <Text style={[styles.prepTableHeaderCell, { flex: 1 }]}>Tmrw</Text>
                  <Text style={[styles.prepTableHeaderCell, { flex: 1.2 }]}>Prepared</Text>
                  <Text style={[styles.prepTableHeaderCell, { flex: 1.5 }]}>Not Done</Text>
                </View>
                {/* Group items by dough type */}
                {(() => {
                  const grouped: Record<string, any[]> = {};
                  prepReportItems.forEach((item: any) => {
                    const dough = item.dough_type_name || 'Other';
                    if (!grouped[dough]) grouped[dough] = [];
                    grouped[dough].push(item);
                  });
                  return Object.entries(grouped).map(([dough, items]) => (
                    <View key={dough}>
                      {items.map((item: any, idx: number) => {
                        const key = item.product_name;
                        const { todayPrep, tomorrowPrep } = calcAdjustedValues(item);
                        const prepared = parseFloat(preparedQuantities[key] || '0') || 0;
                        const total = todayPrep + tomorrowPrep;
                        const notCompleted = Math.max(0, total - prepared);
                        return (
                          <View key={key} style={[styles.prepTableRow, idx % 2 === 0 && styles.prepTableRowAlt]}>
                            {idx === 0 ? (
                              <Text style={[styles.prepTableCell, styles.prepTableDoughCell, { flex: 2 }]}>{dough}</Text>
                            ) : (
                              <Text style={[styles.prepTableCell, { flex: 2 }]}></Text>
                            )}
                            <Text style={[styles.prepTableCell, { flex: 3 }]}>{item.product_name}</Text>
                            <Text style={[styles.prepTableCell, { flex: 1, textAlign: 'center' }]}>{todayPrep}</Text>
                            <Text style={[styles.prepTableCell, { flex: 1, textAlign: 'center' }]}>{tomorrowPrep}</Text>
                            <View style={{ flex: 1.2 }}>
                              <TextInput
                                style={styles.preparedInput}
                                value={preparedQuantities[key] || ''}
                                onChangeText={(text) => setPreparedQuantities(prev => ({ ...prev, [key]: text }))}
                                keyboardType="numeric"
                                placeholder="0"
                              />
                            </View>
                            <Text style={[styles.prepTableCell, styles.notCompletedCell, { flex: 1.5, textAlign: 'center' }]}>
                              {notCompleted > 0 ? notCompleted : '-'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ));
                })()}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No items for this department</Text>
                <Text style={styles.emptySubtext}>No preparation needed today/tomorrow</Text>
              </View>
            )}

            {/* Action Buttons: Print, Share PDF, WhatsApp */}
            {prepReportItems.length > 0 && (
              <View>
                <View style={styles.prepActionRow}>
                  <TouchableOpacity style={styles.printButton} onPress={() => { setViewChoiceAction('print'); setShowViewChoiceModal(true); }}>
                    <Ionicons name="print" size={20} color="#fff" />
                    <Text style={styles.printButtonText}>Print</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pdfButton, generatingPdf && { opacity: 0.6 }]} onPress={() => { setViewChoiceAction('pdf'); setShowViewChoiceModal(true); }} disabled={generatingPdf}>
                    {generatingPdf ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="document" size={20} color="#fff" />}
                    <Text style={styles.pdfButtonText}>{generatingPdf ? 'Creating...' : 'Share PDF'}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.whatsappSendButton} onPress={() => {
                if (!reportedBy) { showAlert('Error', 'Please select who reported'); return; }
                const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const deptLabel = DEPARTMENTS.find(d => d.key === selectedDepartment)?.label || '';
                let msg = `📋 *PREPARATION REPORT*\n📅 ${today}\n\n`;
                msg += `*Department:* ${deptLabel}\n*Reported by:* ${reportedBy}\n\n`;
                msg += `*Dough | Item | Today | Tmrw | Prepared | Not Done*\n`;
                msg += `─────────────────────────\n`;
                const grouped: Record<string, any[]> = {};
                prepReportItems.forEach((item: any) => {
                  const dough = item.dough_type_name || 'Other';
                  if (!grouped[dough]) grouped[dough] = [];
                  grouped[dough].push(item);
                });
                Object.entries(grouped).forEach(([dough, items]) => {
                  msg += `\n*${dough}*\n`;
                  items.forEach((item: any) => {
                    const key = item.product_name;
                    const { todayPrep, tomorrowPrep } = calcAdjustedValues(item);
                    const prep = parseFloat(preparedQuantities[key] || '0') || 0;
                    const total = todayPrep + tomorrowPrep;
                    const notDone = Math.max(0, total - prep);
                    msg += `  ${item.product_name}: Today=${todayPrep} | Tmrw=${tomorrowPrep} | Prepared=${prep} | Not Done=${notDone}\n`;
                  });
                });
                msg += `\n---\n_Report from Divine Cakery App_`;
                setPrepReportText(msg);
                setShowWhatsAppModal(true);
              }}>
                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                <Text style={styles.whatsappSendButtonText}>Send via WhatsApp</Text>
              </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </View>
      <Modal visible={showDeptDropdown} transparent animationType="fade" onRequestClose={() => setShowDeptDropdown(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowDeptDropdown(false)}>
          <View style={styles.dropdownContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownTitle}>Select Department</Text>
            {DEPARTMENTS.map(dept => (
              <TouchableOpacity key={dept.key} style={[styles.dropdownItem, selectedDepartment === dept.key && styles.dropdownItemActive]}
                onPress={() => { setSelectedDepartment(dept.key); setShowDeptDropdown(false); setLoading(true); }}>
                <Text style={[styles.dropdownItemText, selectedDepartment === dept.key && styles.dropdownItemTextActive]}>{dept.label}</Text>
                {selectedDepartment === dept.key && <Ionicons name="checkmark" size={20} color="#8B4513" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reported By Dropdown Modal */}
      <Modal visible={showReportedByDropdown} transparent animationType="fade" onRequestClose={() => setShowReportedByDropdown(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowReportedByDropdown(false)}>
          <View style={styles.dropdownContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownTitle}>Select Staff</Text>
            {departmentStaff.length > 0 ? departmentStaff.filter((s: any) => s.is_active).map((staff: any) => (
              <TouchableOpacity key={staff.id} style={[styles.dropdownItem, reportedBy === staff.name && styles.dropdownItemActive]}
                onPress={() => { setReportedBy(staff.name); setShowReportedByDropdown(false); }}>
                <Text style={[styles.dropdownItemText, reportedBy === staff.name && styles.dropdownItemTextActive]}>{staff.name}</Text>
                {reportedBy === staff.name && <Ionicons name="checkmark" size={20} color="#8B4513" />}
              </TouchableOpacity>
            )) : (
              <View style={styles.dropdownItem}><Text style={styles.dropdownItemText}>No staff added for this department</Text></View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* View Choice Modal (Limited vs Full) */}
      <Modal visible={showViewChoiceModal} transparent animationType="fade" onRequestClose={() => setShowViewChoiceModal(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowViewChoiceModal(false)}>
          <View style={styles.dropdownContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownTitle}>{viewChoiceAction === 'print' ? 'Print Report' : 'Share PDF'}</Text>
            <TouchableOpacity style={[styles.dropdownItem, { backgroundColor: '#f0f8ff' }]} onPress={() => {
              setShowViewChoiceModal(false);
              if (viewChoiceAction === 'print') handlePrintReport(true); else handleSharePdf(true);
            }}>
              <Ionicons name="eye-off-outline" size={20} color="#555" />
              <Text style={[styles.dropdownItemText, { marginLeft: 8 }]}>Limited View</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: '#999', paddingHorizontal: 16, marginBottom: 8 }}>Only Dough, Items, Today, Tmrw columns</Text>
            <TouchableOpacity style={[styles.dropdownItem, { backgroundColor: '#f0fff0' }]} onPress={() => {
              setShowViewChoiceModal(false);
              if (viewChoiceAction === 'print') handlePrintReport(false); else handleSharePdf(false);
            }}>
              <Ionicons name="eye-outline" size={20} color="#555" />
              <Text style={[styles.dropdownItemText, { marginLeft: 8 }]}>Full View</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: '#999', paddingHorizontal: 16, marginBottom: 8 }}>All columns including Prepared & Not Done</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WhatsApp Send Modal for Prep Report */}
      <Modal visible={showWhatsAppModal} transparent animationType="slide" onRequestClose={() => setShowWhatsAppModal(false)}>
        <View style={styles.whatsAppModalOverlay}>
          <View style={styles.whatsAppModalContent}>
            <View style={styles.whatsAppModalHeader}>
              <Text style={styles.whatsAppModalTitle}>Send Report via WhatsApp</Text>
              <TouchableOpacity onPress={() => setShowWhatsAppModal(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
            </View>
            <Text style={styles.whatsAppModalText}>Send the report to:</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {whatsappNumbers.map(num => (
                <View key={num.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <TouchableOpacity style={[styles.whatsAppButton, { flex: 1, marginBottom: 0 }]} onPress={async () => {
                    const url = `whatsapp://send?phone=${num.phone}&text=${encodeURIComponent(prepReportText)}`;
                    try { const canOpen = await Linking.canOpenURL(url); if (canOpen) await Linking.openURL(url); else await Linking.openURL(`https://wa.me/${num.phone}?text=${encodeURIComponent(prepReportText)}`); }
                    catch { showAlert('Error', 'Could not open WhatsApp'); }
                  }}>
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                    <Text style={styles.whatsAppButtonText}>{num.name} ({num.phone})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: 8, marginLeft: 4 }} onPress={() => handleDeleteWhatsappNumber(num.id)}>
                    <Ionicons name="trash-outline" size={20} color="#c00" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: 8, borderStyle: 'dashed' }}
              onPress={() => setShowAddNumberModal(true)}>
              <Ionicons name="add-circle-outline" size={22} color="#8B4513" />
              <Text style={{ marginLeft: 8, color: '#8B4513', fontWeight: 'bold' }}>Add New Number</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.whatsAppDoneButton} onPress={() => setShowWhatsAppModal(false)}><Text style={styles.whatsAppDoneButtonText}>Done</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add WhatsApp Number Modal */}
      <Modal visible={showAddNumberModal} transparent animationType="fade" onRequestClose={() => setShowAddNumberModal(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowAddNumberModal(false)}>
          <View style={styles.dropdownContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownTitle}>Add WhatsApp Number</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 15 }}
              placeholder="Name (e.g. John)"
              value={newNumberName}
              onChangeText={setNewNumberName}
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 15 }}
              placeholder="Phone with country code (e.g. 919876543210)"
              value={newNumberPhone}
              onChangeText={setNewNumberPhone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={{ backgroundColor: '#8B4513', borderRadius: 8, padding: 14, alignItems: 'center' }} onPress={handleAddWhatsappNumber}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Add Number</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={showDoughTypeDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDoughTypeDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowDoughTypeDropdown(false)}
        >
          <View 
            style={styles.dropdownContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.dropdownTitle}>Select Dough Type</Text>
            <ScrollView 
              style={styles.dropdownScrollView}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              <TouchableOpacity
                style={[styles.dropdownItem, !selectedDoughType && styles.dropdownItemActive]}
                onPress={() => {
                  setSelectedDoughType(null);
                  setShowDoughTypeDropdown(false);
                  setLoading(true);
                }}
              >
                <Text style={[styles.dropdownItemText, !selectedDoughType && styles.dropdownItemTextActive]}>
                  All Dough Types
                </Text>
                {!selectedDoughType && <Ionicons name="checkmark" size={20} color="#8B4513" />}
              </TouchableOpacity>
              {doughTypes.map((dt) => (
                <TouchableOpacity
                  key={dt.id}
                  style={[styles.dropdownItem, selectedDoughType === dt.id && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedDoughType(dt.id);
                    setShowDoughTypeDropdown(false);
                    setLoading(true);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedDoughType === dt.id && styles.dropdownItemTextActive]}>
                    {dt.name}
                  </Text>
                  {selectedDoughType === dt.id && <Ionicons name="checkmark" size={20} color="#8B4513" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
  },
  header: {
    backgroundColor: '#8B4513',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dateButton: {
    padding: 10,
  },
  dateDisplay: {
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  dateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8DC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  todayButtonText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  itemsSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 15,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  itemRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  doughTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 4,
    gap: 4,
  },
  doughTypeBadgeText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
  },
  itemStats: {
    flexDirection: 'row',
    gap: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  itemRevenue: {
    alignItems: 'flex-end',
  },
  revenueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  revenueLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 12,
    padding: 5,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  fullWidthTab: {
    // When there's only one tab (reports-only users), make it look like a header
    backgroundColor: '#8B4513',
  },
  activeTab: {
    backgroundColor: '#8B4513',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
  },
  activeTabText: {
    color: '#fff',
  },
  filterContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    elevation: 2,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  filterChipActive: {
    backgroundColor: '#FF9800',
  },
  filterChipText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  activeFilterText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
  },
  preparationSection: {
    marginTop: 10,
  },
  preparationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  preparationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#FFF8DC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  preparationSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  preparationSummary: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
  },
  preparationSummaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // Compact controls row
  compactControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  compactDateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    elevation: 2,
  },
  compactDateButton: {
    padding: 6,
  },
  compactDateDisplay: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  compactDateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  compactDayText: {
    fontSize: 11,
    color: '#666',
  },
  doughTypeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 2,
    gap: 6,
    flex: 1,
    maxWidth: 160,
  },
  doughTypeDropdownText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    maxHeight: '70%',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 15,
    textAlign: 'center',
  },
  dropdownScrollView: {
    maxHeight: 350,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  dropdownItemActive: {
    backgroundColor: '#FFF8DC',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  dropdownItemTextActive: {
    fontWeight: 'bold',
    color: '#8B4513',
  },
  preparationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  preparationContent: {
    marginBottom: 10,
  },
  preparationProductName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  preparationStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  preparationStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  preparationStatLabel: {
    fontSize: 11,
    color: '#666',
    marginRight: 4,
  },
  preparationStatValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  preparationBoxes: {
    flexDirection: 'row',
    gap: 10,
  },
  preparationBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
  },
  preparationBoxToday: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  preparationBoxTomorrow: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  preparationBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  preparationBoxValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  preparationBoxUnit: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  // Keep legacy styles for compatibility
  preparationRank: {
    backgroundColor: '#8B4513',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  preparationRankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  preparationDetails: {
    flex: 1,
  },
  preparationStats: {
    gap: 6,
  },
  preparationStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preparationStatBold: {
    fontWeight: 'bold',
    color: '#8B4513',
    fontSize: 14,
  },
  preparationNeed: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  preparationNeedValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6F00',
  },
  preparationNeedLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  // Preparation Report styles
  prepReportField: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  prepReportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 110,
  },
  prepReportDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  prepReportDropdownText: {
    fontSize: 14,
    color: '#333',
  },
  prepReportDropdownPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  prepTable: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    marginTop: 8,
  },
  prepTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  prepTableHeaderCell: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  prepTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 36,
  },
  prepTableRowAlt: {
    backgroundColor: '#fafafa',
  },
  prepTableCell: {
    fontSize: 12,
    color: '#333',
    paddingHorizontal: 2,
  },
  prepTableDoughCell: {
    fontWeight: 'bold',
    color: '#8B4513',
    fontSize: 11,
  },
  preparedInput: {
    backgroundColor: '#FFF8DC',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    textAlign: 'center',
    minHeight: 28,
  },
  notCompletedCell: {
    fontWeight: 'bold',
    color: '#f44336',
  },
  whatsappSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
  },
  whatsappSendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  whatsAppModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  whatsAppModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  whatsAppModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  whatsAppModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  whatsAppModalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  whatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  whatsAppButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  whatsAppDoneButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  whatsAppDoneButtonText: {
    color: '#666',
    fontSize: 14,
  },
  prepActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B4513',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  pdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53935',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
