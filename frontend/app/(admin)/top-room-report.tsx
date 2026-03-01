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
  Modal,
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

interface CleaningTask {
  id: number;
  task: string;
  completed: boolean;
}

export default function TopRoomReportScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.admin_access_level === 'full';
  
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [dailyTasks, setDailyTasks] = useState<CleaningTask[]>([]);
  
  // Form state
  const [filledBy, setFilledBy] = useState('');
  const [workedStaff, setWorkedStaff] = useState<string[]>([]);
  const [absentStaff, setAbsentStaff] = useState<string[]>([]);
  
  // Completion checkboxes
  const [dailyProductionCompleted, setDailyProductionCompleted] = useState(false);
  const [dailyProductionNotes, setDailyProductionNotes] = useState('');
  
  const [weeklyCleaningCompleted, setWeeklyCleaningCompleted] = useState(false);
  const [weeklyCleaningNotes, setWeeklyCleaningNotes] = useState('');
  
  const [wastageReported, setWastageReported] = useState(false);
  const [wastageNotes, setWastageNotes] = useState('');
  
  // Dropdown states
  const [showFilledByDropdown, setShowFilledByDropdown] = useState(false);
  const [showWorkedDropdown, setShowWorkedDropdown] = useState(false);
  const [showAbsentDropdown, setShowAbsentDropdown] = useState(false);
  
  // Staff management modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffResponse, tasksResponse] = await Promise.all([
        apiService.getStaffList(),
        apiService.getCleaningTasks()
      ]);
      setStaffList(staffResponse.staff || []);
      
      // Convert daily tasks to tracked tasks with serial numbers
      const tasks = (tasksResponse.daily_tasks || []).map((task: string, index: number) => ({
        id: index + 1,
        task: task,
        completed: false
      }));
      setDailyTasks(tasks);
    } catch (error) {
      console.error('Error fetching data:', error);
      showAlert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = (taskId: number) => {
    setDailyTasks(dailyTasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const toggleStaffSelection = (staffName: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(staffName)) {
      setList(list.filter(name => name !== staffName));
    } else {
      setList([...list, staffName]);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim()) {
      showAlert('Error', 'Please enter staff name');
      return;
    }
    
    setAddingStaff(true);
    try {
      const response = await apiService.addStaffMember(newStaffName.trim());
      setStaffList([...staffList, response.member]);
      setNewStaffName('');
      showAlert('Success', 'Staff member added');
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to add staff member');
    } finally {
      setAddingStaff(false);
    }
  };

  const handleRemoveStaff = async (staffId: string, staffName: string) => {
    showAlert(
      'Remove Staff',
      `Are you sure you want to remove ${staffName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.removeStaffMember(staffId);
              setStaffList(staffList.filter(s => s.id !== staffId));
            } catch (error) {
              showAlert('Error', 'Failed to remove staff member');
            }
          }
        }
      ]
    );
  };

  const allDailyTasksCompleted = dailyTasks.every(task => task.completed);
  const incompleteTasks = dailyTasks.filter(task => !task.completed);

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
    
    report += `\n🧹 *Daily Cleaning Tasks:* ${allDailyTasksCompleted ? '✅ All Completed' : '⚠️ Some Incomplete'}\n`;
    dailyTasks.forEach(task => {
      report += `   ${task.id}. ${task.completed ? '✅' : '❌'} ${task.task}\n`;
    });
    
    report += `\n🧽 *Weekly Deep Cleaning:* ${weeklyCleaningCompleted ? '✅ Completed' : '❌ Not Completed'}\n`;
    if (!weeklyCleaningCompleted && weeklyCleaningNotes) {
      report += `   Tasks not completed: ${weeklyCleaningNotes}\n`;
    }
    
    report += `\n🗑️ *Wastage Reported:* ${wastageReported ? '✅ Yes' : '❌ No'}\n`;
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

    if (!allDailyTasksCompleted) {
      const incompleteList = incompleteTasks.map(t => `${t.id}. ${t.task}`).join('\n');
      showAlert(
        'Incomplete Tasks',
        `Please complete all daily cleaning tasks before submitting:\n\n${incompleteList}`
      );
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
      <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
        <View style={styles.dropdownOverlay}>
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
                <Text style={styles.noStaffText}>No staff members added yet.</Text>
              )}
            </ScrollView>
            {multiSelect && (
              <TouchableOpacity style={styles.dropdownDoneBtn} onPress={onClose}>
                <Text style={styles.dropdownDoneBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        {/* Staff Management Button (Admin Only) */}
        {isAdmin && (
          <TouchableOpacity 
            style={styles.staffManageButton}
            onPress={() => setShowStaffModal(true)}
          >
            <Ionicons name="people" size={20} color="#fff" />
            <Text style={styles.staffManageButtonText}>Manage Staff List ({staffList.length})</Text>
          </TouchableOpacity>
        )}

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

        {/* Daily Cleaning Tasks with Serial Numbers */}
        <View style={styles.tasksSection}>
          <View style={styles.tasksSectionHeader}>
            <MaterialCommunityIcons name="broom" size={20} color="#8B4513" />
            <Text style={styles.tasksSectionTitle}>Daily Cleaning Tasks</Text>
            <Text style={styles.tasksProgress}>
              {dailyTasks.filter(t => t.completed).length}/{dailyTasks.length}
            </Text>
          </View>
          {dailyTasks.map((task) => (
            <TouchableOpacity 
              key={task.id}
              style={styles.taskItem}
              onPress={() => toggleTaskCompletion(task.id)}
            >
              <View style={[styles.taskCheckbox, task.completed && styles.taskCheckboxChecked]}>
                {task.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.taskNumber}>{task.id}.</Text>
              <Text style={[styles.taskText, task.completed && styles.taskTextCompleted]}>
                {task.task}
              </Text>
            </TouchableOpacity>
          ))}
          {!allDailyTasksCompleted && (
            <Text style={styles.warningText}>
              ⚠️ Complete all tasks to submit report
            </Text>
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
          <Text style={styles.viewTasksButtonText}>View Full Cleaning Schedule</Text>
          <Ionicons name="chevron-forward" size={20} color="#8B4513" />
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[
            styles.submitButton,
            !allDailyTasksCompleted && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
        >
          <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          <Text style={styles.submitButtonText}>Submit via WhatsApp</Text>
        </TouchableOpacity>

        {/* Extra space for bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Dropdowns */}
      {renderDropdown(
        showFilledByDropdown,
        () => setShowFilledByDropdown(false),
        filledBy ? [filledBy] : [],
        (name) => setFilledBy(name),
        false
      )}
      
      {renderDropdown(
        showWorkedDropdown,
        () => setShowWorkedDropdown(false),
        workedStaff,
        (name) => toggleStaffSelection(name, workedStaff, setWorkedStaff),
        true
      )}
      
      {renderDropdown(
        showAbsentDropdown,
        () => setShowAbsentDropdown(false),
        absentStaff,
        (name) => toggleStaffSelection(name, absentStaff, setAbsentStaff),
        true
      )}

      {/* Staff Management Modal */}
      <Modal
        visible={showStaffModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStaffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Staff List</Text>
              <TouchableOpacity onPress={() => setShowStaffModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.addStaffRow}>
              <TextInput
                style={styles.staffInput}
                value={newStaffName}
                onChangeText={setNewStaffName}
                placeholder="Enter staff name"
              />
              <TouchableOpacity 
                style={styles.addStaffButton}
                onPress={handleAddStaff}
                disabled={addingStaff}
              >
                {addingStaff ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="add" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.staffList}>
              {staffList.map((staff) => (
                <View key={staff.id} style={styles.staffItem}>
                  <Text style={styles.staffName}>{staff.name}</Text>
                  <TouchableOpacity 
                    onPress={() => handleRemoveStaff(staff.id, staff.name)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#f44336" />
                  </TouchableOpacity>
                </View>
              ))}
              {staffList.length === 0 && (
                <Text style={styles.noStaffModalText}>No staff members added yet</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 120,
  },
  staffManageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B4513',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  staffManageButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
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
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '60%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dropdownList: {
    maxHeight: 250,
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
  tasksSection: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tasksSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    marginLeft: 8,
    flex: 1,
  },
  tasksProgress: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  taskCheckboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  taskNumber: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '600',
    marginRight: 6,
    width: 20,
  },
  taskText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  taskTextCompleted: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  warningText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  viewTasksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
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
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addStaffRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  staffInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addStaffButton: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffList: {
    padding: 16,
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  staffName: {
    fontSize: 16,
    color: '#333',
  },
  noStaffModalText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});
