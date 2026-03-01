import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../services/api';
import { showAlert } from '../../utils/alerts';
import { useAuthStore } from '../../store';

const WHATSAPP_NUMBERS = ['918075946225', '919544183334'];

interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
}

export default function TopRoomReportScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  
  // Form state
  const [filledBy, setFilledBy] = useState('');
  const [workedStaff, setWorkedStaff] = useState<string[]>([]);
  const [absentStaff, setAbsentStaff] = useState<string[]>([]);
  
  // Completion checkboxes
  const [dailyProductionCompleted, setDailyProductionCompleted] = useState(false);
  const [dailyProductionNotes, setDailyProductionNotes] = useState('');
  
  const [dailyCleaningCompleted, setDailyCleaningCompleted] = useState(false);
  const [dailyCleaningNotes, setDailyCleaningNotes] = useState('');
  
  const [weeklyCleaningCompleted, setWeeklyCleaningCompleted] = useState(false);
  const [weeklyCleaningNotes, setWeeklyCleaningNotes] = useState('');
  
  const [wastageReported, setWastageReported] = useState(false);
  const [wastageNotes, setWastageNotes] = useState('');
  
  // Dropdown states
  const [showFilledByDropdown, setShowFilledByDropdown] = useState(false);
  const [showWorkedDropdown, setShowWorkedDropdown] = useState(false);
  const [showAbsentDropdown, setShowAbsentDropdown] = useState(false);

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    try {
      const response = await apiService.getStaffList();
      setStaffList(response.staff || []);
    } catch (error) {
      console.error('Error fetching staff list:', error);
      showAlert('Error', 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  const toggleStaffSelection = (staffName: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(staffName)) {
      setList(list.filter(name => name !== staffName));
    } else {
      setList([...list, staffName]);
    }
  };

  const generateReport = () => {
    const today = new Date().toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let report = `📋 *TOP ROOM REPORT*\n`;
    report += `📅 ${today}\n\n`;
    
    report += `👤 *Filled by:* ${filledBy || 'Not specified'}\n\n`;
    
    report += `✅ *Worked:* ${workedStaff.length > 0 ? workedStaff.join(', ') : 'None'}\n`;
    report += `❌ *Absent/Sick:* ${absentStaff.length > 0 ? absentStaff.join(', ') : 'None'}\n\n`;
    
    report += `📦 *Daily Production:* ${dailyProductionCompleted ? '✅ Completed' : '❌ Not Completed'}\n`;
    if (!dailyProductionCompleted && dailyProductionNotes) {
      report += `   Items not completed: ${dailyProductionNotes}\n`;
    }
    
    report += `🧹 *Daily Cleaning:* ${dailyCleaningCompleted ? '✅ Completed' : '❌ Not Completed'}\n`;
    if (!dailyCleaningCompleted && dailyCleaningNotes) {
      report += `   Tasks not completed: ${dailyCleaningNotes}\n`;
    }
    
    report += `🧽 *Weekly Deep Cleaning:* ${weeklyCleaningCompleted ? '✅ Completed' : '❌ Not Completed'}\n`;
    if (!weeklyCleaningCompleted && weeklyCleaningNotes) {
      report += `   Tasks not completed: ${weeklyCleaningNotes}\n`;
    }
    
    report += `🗑️ *Wastage Reported:* ${wastageReported ? '✅ Yes' : '❌ No'}\n`;
    if (wastageReported && wastageNotes) {
      report += `   Items wasted: ${wastageNotes}\n`;
    }
    
    report += `\n---\n_Report generated from Divine Cakery App_`;
    
    return report;
  };

  const handleSubmit = async () => {
    if (!filledBy) {
      showAlert('Error', 'Please select who filled this report');
      return;
    }

    const report = generateReport();
    
    // Send to both WhatsApp numbers
    for (const number of WHATSAPP_NUMBERS) {
      const whatsappUrl = `whatsapp://send?phone=${number}&text=${encodeURIComponent(report)}`;
      
      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          const webUrl = `https://wa.me/${number}?text=${encodeURIComponent(report)}`;
          await Linking.openURL(webUrl);
        }
      } catch (error) {
        console.error('Error opening WhatsApp:', error);
      }
    }

    showAlert('Report Sent', 'Please send the WhatsApp messages to complete submission');
  };

  const renderDropdown = (
    visible: boolean,
    onClose: () => void,
    selectedItems: string[],
    onSelect: (name: string) => void,
    multiSelect: boolean = false
  ) => {
    if (!visible) return null;
    
    return (
      <View style={styles.dropdownContainer}>
        <View style={styles.dropdownHeader}>
          <Text style={styles.dropdownTitle}>Select Staff</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.dropdownList}>
          {staffList.filter(s => s.is_active).map((staff) => (
            <TouchableOpacity
              key={staff.id}
              style={[
                styles.dropdownItem,
                selectedItems.includes(staff.name) && styles.dropdownItemSelected
              ]}
              onPress={() => {
                onSelect(staff.name);
                if (!multiSelect) onClose();
              }}
            >
              <Text style={[
                styles.dropdownItemText,
                selectedItems.includes(staff.name) && styles.dropdownItemTextSelected
              ]}>
                {staff.name}
              </Text>
              {selectedItems.includes(staff.name) && (
                <Ionicons name="checkmark" size={20} color="#8B4513" />
              )}
            </TouchableOpacity>
          ))}
          {staffList.filter(s => s.is_active).length === 0 && (
            <Text style={styles.noStaffText}>No staff members added yet. Admin can add staff from the Cleaning Tasks page.</Text>
          )}
        </ScrollView>
        {multiSelect && (
          <TouchableOpacity style={styles.dropdownDoneBtn} onPress={onClose}>
            <Text style={styles.dropdownDoneBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Room Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Filled By */}
        <View style={styles.section}>
          <Text style={styles.label}>Filled by: *</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowFilledByDropdown(true)}
          >
            <Text style={filledBy ? styles.dropdownText : styles.dropdownPlaceholder}>
              {filledBy || 'Select staff member'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Worked */}
        <View style={styles.section}>
          <Text style={styles.label}>Worked:</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowWorkedDropdown(true)}
          >
            <Text style={workedStaff.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>
              {workedStaff.length > 0 ? workedStaff.join(', ') : 'Select staff members'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Absent/Sick */}
        <View style={styles.section}>
          <Text style={styles.label}>Absent/Sick:</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowAbsentDropdown(true)}
          >
            <Text style={absentStaff.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>
              {absentStaff.length > 0 ? absentStaff.join(', ') : 'Select staff members'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Daily Production */}
        <View style={styles.checkboxSection}>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setDailyProductionCompleted(!dailyProductionCompleted)}
          >
            <View style={[styles.checkbox, dailyProductionCompleted && styles.checkboxChecked]}>
              {dailyProductionCompleted && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Daily Production completed</Text>
          </TouchableOpacity>
          {!dailyProductionCompleted && (
            <TextInput
              style={styles.notesInput}
              placeholder="Items not completed..."
              value={dailyProductionNotes}
              onChangeText={setDailyProductionNotes}
              multiline
            />
          )}
        </View>

        {/* Daily Cleaning */}
        <View style={styles.checkboxSection}>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setDailyCleaningCompleted(!dailyCleaningCompleted)}
          >
            <View style={[styles.checkbox, dailyCleaningCompleted && styles.checkboxChecked]}>
              {dailyCleaningCompleted && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Daily Cleaning completed</Text>
          </TouchableOpacity>
          {!dailyCleaningCompleted && (
            <TextInput
              style={styles.notesInput}
              placeholder="Which task not completed..."
              value={dailyCleaningNotes}
              onChangeText={setDailyCleaningNotes}
              multiline
            />
          )}
        </View>

        {/* Weekly Deep Cleaning */}
        <View style={styles.checkboxSection}>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setWeeklyCleaningCompleted(!weeklyCleaningCompleted)}
          >
            <View style={[styles.checkbox, weeklyCleaningCompleted && styles.checkboxChecked]}>
              {weeklyCleaningCompleted && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Weekly Deep Cleaning completed</Text>
          </TouchableOpacity>
          {!weeklyCleaningCompleted && (
            <TextInput
              style={styles.notesInput}
              placeholder="Which task not completed..."
              value={weeklyCleaningNotes}
              onChangeText={setWeeklyCleaningNotes}
              multiline
            />
          )}
        </View>

        {/* Wastage Reported */}
        <View style={styles.checkboxSection}>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setWastageReported(!wastageReported)}
          >
            <View style={[styles.checkbox, wastageReported && styles.checkboxChecked]}>
              {wastageReported && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Wastage reported</Text>
          </TouchableOpacity>
          {wastageReported && (
            <TextInput
              style={styles.notesInput}
              placeholder="Items wasted..."
              value={wastageNotes}
              onChangeText={setWastageNotes}
              multiline
            />
          )}
        </View>

        {/* View Cleaning Tasks Button */}
        <TouchableOpacity 
          style={styles.viewTasksButton}
          onPress={() => router.push('/(admin)/cleaning-tasks')}
        >
          <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#8B4513" />
          <Text style={styles.viewTasksButtonText}>View Cleaning Tasks</Text>
          <Ionicons name="chevron-forward" size={20} color="#8B4513" />
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          <Text style={styles.submitButtonText}>Submit via WhatsApp</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Dropdowns */}
      {showFilledByDropdown && renderDropdown(
        true,
        () => setShowFilledByDropdown(false),
        filledBy ? [filledBy] : [],
        (name) => setFilledBy(name),
        false
      )}
      
      {showWorkedDropdown && renderDropdown(
        true,
        () => setShowWorkedDropdown(false),
        workedStaff,
        (name) => toggleStaffSelection(name, workedStaff, setWorkedStaff),
        true
      )}
      
      {showAbsentDropdown && renderDropdown(
        true,
        () => setShowAbsentDropdown(false),
        absentStaff,
        (name) => toggleStaffSelection(name, absentStaff, setAbsentStaff),
        true
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8B4513',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dropdownList: {
    backgroundColor: '#fff',
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#FFF8DC',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#8B4513',
    fontWeight: '600',
  },
  dropdownDoneBtn: {
    backgroundColor: '#8B4513',
    padding: 16,
    alignItems: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dropdownDoneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noStaffText: {
    padding: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  checkboxSection: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#8B4513',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  notesInput: {
    marginTop: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  viewTasksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  viewTasksButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    marginLeft: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
