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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useAuthStore } from '../../store';
import { showAlert } from '../../utils/alerts';

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
  const [activeTab, setActiveTab] = useState<'daily' | 'preparation'>(isReportsOnly ? 'preparation' : 'daily');
  const isFetchingRef = React.useRef(false);

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
    }, [activeTab, selectedDate, selectedDoughType])
  );

  const fetchDoughTypes = async () => {
    try {
      const data = await apiService.getDoughTypes();
      setDoughTypes(data);
    } catch (error) {
      console.error('Error fetching dough types:', error);
      // Don't show error - dough types are optional
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
      } else {
        const data = await apiService.getPreparationListReport(dateStr, selectedDoughType || undefined);
        console.log('✅ Preparation List Data:', JSON.stringify(data, null, 2));
        setPreparationList(data);
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
            Preparation List
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
        ) : (
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
        )}
      </View>

      {/* Dough Type Dropdown Modal */}
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
});
