import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../services/api';
import { showAlert } from '../../utils/alerts';
import { useAuthStore } from '../../store';

const SECTION_TITLE = 'Packing Section';
const SECTION_KEY = 'packing_section';

interface WeeklyTasks { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string; saturday: string; sunday: string; }
interface ChecklistItem { id: string; label: string; notes_when: 'checked' | 'unchecked'; notes_placeholder: string; }
interface StaffMember { id: string; name: string; is_active: boolean; }

export default function PackingSectionTasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.admin_access_level === 'full';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<string[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTasks>({ monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' });
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [tasksResponse, staffResponse] = await Promise.all([
        apiService.getSectionTasks(SECTION_KEY),
        apiService.getSectionStaff(SECTION_KEY)
      ]);
      setDailyTasks(tasksResponse.daily_tasks || []);
      setWeeklyTasks(tasksResponse.weekly_tasks || { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' });
      setChecklistItems(tasksResponse.checklist_items || []);
      setStaffList(staffResponse.staff || []);
    } catch (error) { showAlert('Error', 'Failed to load tasks'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.updateSectionTasks(SECTION_KEY, { daily_tasks: dailyTasks, weekly_tasks: weeklyTasks, checklist_items: checklistItems });
      showAlert('Success', 'Tasks updated successfully'); setEditMode(false);
    } catch (error: any) { showAlert('Error', error.response?.data?.detail || 'Failed to save changes'); }
    finally { setSaving(false); }
  };

  const addDailyTask = () => setDailyTasks([...dailyTasks, '']);
  const updateDailyTask = (index: number, value: string) => { const u = [...dailyTasks]; u[index] = value; setDailyTasks(u); };
  const removeDailyTask = (index: number) => setDailyTasks(dailyTasks.filter((_, i) => i !== index));
  const updateWeeklyTask = (day: keyof WeeklyTasks, value: string) => setWeeklyTasks({ ...weeklyTasks, [day]: value });

  // Checklist item CRUD
  const addChecklistItem = () => {
    const newItem: ChecklistItem = { id: `item_${Date.now()}`, label: '', notes_when: 'unchecked', notes_placeholder: 'Please specify...' };
    setChecklistItems([...checklistItems, newItem]);
  };
  const updateChecklistItem = (index: number, field: keyof ChecklistItem, value: string) => {
    const updated = [...checklistItems]; updated[index] = { ...updated[index], [field]: value }; setChecklistItems(updated);
  };
  const removeChecklistItem = (index: number) => setChecklistItems(checklistItems.filter((_, i) => i !== index));
  const toggleNotesWhen = (index: number) => {
    const updated = [...checklistItems];
    updated[index] = { ...updated[index], notes_when: updated[index].notes_when === 'checked' ? 'unchecked' : 'checked' };
    setChecklistItems(updated);
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim()) { showAlert('Error', 'Please enter staff name'); return; }
    setAddingStaff(true);
    try { const response = await apiService.addSectionStaff(SECTION_KEY, newStaffName.trim()); setStaffList([...staffList, response.member]); setNewStaffName(''); showAlert('Success', 'Staff member added'); }
    catch (error: any) { showAlert('Error', error.response?.data?.detail || 'Failed to add staff member'); }
    finally { setAddingStaff(false); }
  };
  const handleRemoveStaff = async (staffId: string, staffName: string) => {
    showAlert('Remove Staff', `Are you sure you want to remove ${staffName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await apiService.removeSectionStaff(SECTION_KEY, staffId); setStaffList(staffList.filter(s => s.id !== staffId)); }
        catch { showAlert('Error', 'Failed to remove staff member'); }
      }}
    ]);
  };

  if (loading) return (<SafeAreaView style={styles.container}><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#8B4513" /></View></SafeAreaView>);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{SECTION_TITLE} Tasks</Text>
        {isAdmin ? (<TouchableOpacity onPress={() => editMode ? handleSave() : setEditMode(true)} style={styles.editButton} disabled={saving}>{saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.editButtonText}>{editMode ? 'Save' : 'Edit'}</Text>}</TouchableOpacity>) : <View style={{ width: 50 }} />}
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isAdmin && (<TouchableOpacity style={styles.staffButton} onPress={() => setShowStaffModal(true)}><Ionicons name="people" size={24} color="#8B4513" /><Text style={styles.staffButtonText}>Manage {SECTION_TITLE} Staff ({staffList.length})</Text><Ionicons name="chevron-forward" size={20} color="#8B4513" /></TouchableOpacity>)}

        {/* Checklist Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}><MaterialCommunityIcons name="checkbox-marked-outline" size={24} color="#8B4513" /><Text style={styles.sectionTitle}>Checklist Items</Text></View>
          <Text style={styles.sectionDesc}>These are the numbered tasks shown on the report page.</Text>
          {checklistItems.map((item, index) => (
            <View key={item.id} style={styles.checklistEditItem}>
              {editMode ? (
                <View>
                  <View style={styles.editTaskRow}>
                    <Text style={styles.itemNumber}>{index + 1}.</Text>
                    <TextInput style={styles.taskInput} value={item.label} onChangeText={(v) => updateChecklistItem(index, 'label', v)} placeholder="Task label..." />
                    <TouchableOpacity onPress={() => removeChecklistItem(index)} style={styles.removeButton}><Ionicons name="trash-outline" size={20} color="#f44336" /></TouchableOpacity>
                  </View>
                  <View style={styles.notesWhenRow}>
                    <Text style={styles.notesWhenLabel}>Show notes when:</Text>
                    <TouchableOpacity onPress={() => toggleNotesWhen(index)} style={styles.notesWhenToggle}>
                      <Text style={styles.notesWhenValue}>{item.notes_when === 'checked' ? 'Checked' : 'Unchecked'}</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput style={styles.placeholderInput} value={item.notes_placeholder} onChangeText={(v) => updateChecklistItem(index, 'notes_placeholder', v)} placeholder="Notes placeholder text..." />
                </View>
              ) : (
                <View style={styles.taskRow}><Text style={styles.itemNumber}>{index + 1}.</Text><Text style={styles.taskText}>{item.label}</Text><Text style={styles.notesWhenBadge}>{item.notes_when === 'checked' ? 'notes when checked' : 'notes when unchecked'}</Text></View>
              )}
            </View>
          ))}
          {editMode && <TouchableOpacity style={styles.addButton} onPress={addChecklistItem}><Ionicons name="add-circle-outline" size={20} color="#8B4513" /><Text style={styles.addButtonText}>Add Checklist Item</Text></TouchableOpacity>}
          {checklistItems.length === 0 && !editMode && <Text style={styles.emptyText}>No checklist items. Tap Edit to add.</Text>}
        </View>

        {/* Daily Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}><MaterialCommunityIcons name="calendar-today" size={24} color="#8B4513" /><Text style={styles.sectionTitle}>Daily Tasks</Text></View>
          {dailyTasks.map((task, index) => (
            <View key={index} style={styles.taskItem}>{editMode ? (
              <View style={styles.editTaskRow}><TextInput style={styles.taskInput} value={task} onChangeText={(v) => updateDailyTask(index, v)} multiline placeholder="Enter task..." /><TouchableOpacity onPress={() => removeDailyTask(index)} style={styles.removeButton}><Ionicons name="trash-outline" size={20} color="#f44336" /></TouchableOpacity></View>
            ) : (<View style={styles.taskRow}><Text style={styles.bullet}>•</Text><Text style={styles.taskText}>{task}</Text></View>)}</View>
          ))}
          {editMode && <TouchableOpacity style={styles.addButton} onPress={addDailyTask}><Ionicons name="add-circle-outline" size={20} color="#8B4513" /><Text style={styles.addButtonText}>Add Task</Text></TouchableOpacity>}
          {dailyTasks.length === 0 && !editMode && <Text style={styles.emptyText}>No daily tasks. Tap Edit to add.</Text>}
        </View>

        {/* Weekly Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}><MaterialCommunityIcons name="calendar-week" size={24} color="#8B4513" /><Text style={styles.sectionTitle}>Weekly Deep Cleaning</Text></View>
          {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const).map((day) => (
            <View key={day} style={styles.weeklyItem}><Text style={styles.dayLabel}>{day.charAt(0).toUpperCase() + day.slice(1)}:</Text>{editMode ? <TextInput style={styles.weeklyInput} value={weeklyTasks[day]} onChangeText={(v) => updateWeeklyTask(day, v)} placeholder="Enter task..." /> : <Text style={styles.weeklyTask}>{weeklyTasks[day] || '-'}</Text>}</View>
          ))}
        </View>

        {editMode && (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setEditMode(false); fetchData(); }}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}</TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={showStaffModal} animationType="slide" transparent onRequestClose={() => setShowStaffModal(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Manage {SECTION_TITLE} Staff</Text><TouchableOpacity onPress={() => setShowStaffModal(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity></View>
          <View style={styles.addStaffRow}><TextInput style={styles.staffInput} value={newStaffName} onChangeText={setNewStaffName} placeholder="Enter staff name" /><TouchableOpacity style={styles.addStaffButton} onPress={handleAddStaff} disabled={addingStaff}>{addingStaff ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={24} color="#fff" />}</TouchableOpacity></View>
          <ScrollView style={styles.staffList}>{staffList.map((staff) => (<View key={staff.id} style={styles.staffItem}><Text style={styles.staffName}>{staff.name}</Text><TouchableOpacity onPress={() => handleRemoveStaff(staff.id, staff.name)}><Ionicons name="trash-outline" size={20} color="#f44336" /></TouchableOpacity></View>))}{staffList.length === 0 && <Text style={styles.noStaffText}>No staff members added yet</Text>}</ScrollView>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' }, loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#8B4513', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { padding: 8 }, headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  editButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, minWidth: 50, alignItems: 'center' },
  editButtonText: { color: '#fff', fontWeight: '600' }, content: { flex: 1 }, contentContainer: { padding: 16, paddingBottom: 32 },
  staffButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#8B4513' },
  staffButtonText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#8B4513', marginLeft: 12 },
  section: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B4513', marginLeft: 10 },
  sectionDesc: { fontSize: 12, color: '#999', marginBottom: 12, fontStyle: 'italic' },
  taskItem: { marginBottom: 8 }, taskRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bullet: { fontSize: 16, color: '#8B4513', marginRight: 8, marginTop: 2 }, taskText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  editTaskRow: { flexDirection: 'row', alignItems: 'center' }, taskInput: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: '#ddd', minHeight: 40 },
  removeButton: { padding: 10, marginLeft: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, borderColor: '#8B4513', borderStyle: 'dashed', borderRadius: 6, marginTop: 8 },
  addButtonText: { color: '#8B4513', fontWeight: '600', marginLeft: 6 },
  weeklyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dayLabel: { width: 100, fontSize: 14, fontWeight: '600', color: '#8B4513' }, weeklyTask: { flex: 1, fontSize: 14, color: '#333' },
  weeklyInput: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#ddd' },
  // Checklist edit styles
  checklistEditItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemNumber: { fontSize: 16, fontWeight: 'bold', color: '#8B4513', marginRight: 8, width: 28 },
  notesWhenRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 36 },
  notesWhenLabel: { fontSize: 12, color: '#666', marginRight: 8 },
  notesWhenToggle: { backgroundColor: '#FFF8DC', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#8B4513' },
  notesWhenValue: { fontSize: 12, color: '#8B4513', fontWeight: '600' },
  notesWhenBadge: { fontSize: 10, color: '#999', backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  placeholderInput: { marginTop: 6, marginLeft: 36, backgroundColor: '#f9f9f9', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#eee', fontSize: 12 },
  emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  editActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#999', alignItems: 'center', marginRight: 8 },
  cancelButtonText: { color: '#666', fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#8B4513', alignItems: 'center', marginLeft: 8 },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  addStaffRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  staffInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  addStaffButton: { backgroundColor: '#8B4513', borderRadius: 8, width: 44, justifyContent: 'center', alignItems: 'center' },
  staffList: { padding: 16 }, staffItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  staffName: { fontSize: 16, color: '#333' }, noStaffText: { textAlign: 'center', color: '#999', fontStyle: 'italic', paddingVertical: 20 },
});
