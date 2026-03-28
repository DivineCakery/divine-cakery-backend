import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Linking, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../services/api';
import { showAlert } from '../../utils/alerts';
import { useAuthStore } from '../../store';

const SECTION_TITLE = 'Packing Section';
const SECTION_KEY = 'packing_section';
const TASKS_ROUTE = '/(admin)/packing-section-tasks';
const WHATSAPP_NUMBERS = ['918075946225', '919544183334'];

interface StaffMember { id: string; name: string; is_active: boolean; }
interface ChecklistItem { id: string; label: string; notes_when: 'checked' | 'unchecked'; notes_placeholder: string; }

export default function PackingSectionReportScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.admin_access_level === 'full';
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [filledBy, setFilledBy] = useState('');
  const [workedStaff, setWorkedStaff] = useState<string[]>([]);
  const [absentStaff, setAbsentStaff] = useState<string[]>([]);
  // Dynamic checklist state: { [itemId]: { completed: boolean, notes: string } }
  const [checklistState, setChecklistState] = useState<Record<string, { completed: boolean; notes: string }>>({});
  const [showFilledByDropdown, setShowFilledByDropdown] = useState(false);
  const [showWorkedDropdown, setShowWorkedDropdown] = useState(false);
  const [showAbsentDropdown, setShowAbsentDropdown] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [generatedReport, setGeneratedReport] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [staffResponse, tasksResponse] = await Promise.all([
        apiService.getSectionStaff(SECTION_KEY),
        apiService.getSectionTasks(SECTION_KEY)
      ]);
      setStaffList(staffResponse.staff || []);
      const items = tasksResponse.checklist_items || [];
      setChecklistItems(items);
      const initialState: Record<string, { completed: boolean; notes: string }> = {};
      items.forEach((item: ChecklistItem) => { initialState[item.id] = { completed: false, notes: '' }; });
      setChecklistState(initialState);
    } catch (error) { showAlert('Error', 'Failed to load data'); }
    finally { setLoading(false); }
  };

  const toggleStaffSelection = (staffName: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(staffName)) setList(list.filter(n => n !== staffName)); else setList([...list, staffName]);
  };
  const toggleChecklist = (itemId: string) => {
    setChecklistState(prev => ({ ...prev, [itemId]: { ...prev[itemId], completed: !prev[itemId]?.completed } }));
  };
  const updateChecklistNotes = (itemId: string, notes: string) => {
    setChecklistState(prev => ({ ...prev, [itemId]: { ...prev[itemId], notes } }));
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

  const generateReport = () => {
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let report = `📋 *${SECTION_TITLE.toUpperCase()} REPORT*\n📅 ${today}\n\n`;
    report += `👤 *Filled by:* ${filledBy || 'Not specified'}\n\n`;
    report += `✅ *Worked:* ${workedStaff.length > 0 ? workedStaff.join(', ') : 'None'}\n`;
    report += `${absentStaff.length > 0 ? '❌' : '✅'} *Absent/Sick:* ${absentStaff.length > 0 ? absentStaff.join(', ') : 'None'}\n\n`;
    report += `*--- CHECKLIST ---*\n\n`;
    const numEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    checklistItems.forEach((item, idx) => {
      const state = checklistState[item.id];
      const emoji = numEmojis[idx] || `${idx+1}.`;
      report += `${emoji} *${item.label}:* ${state?.completed ? '✅ Yes' : '❌ No'}\n`;
      const showNotes = item.notes_when === 'checked' ? state?.completed : !state?.completed;
      if (showNotes && state?.notes) report += `   _${state.notes}_\n`;
      report += '\n';
    });
    report += `---\n_Report generated from Divine Cakery App_`;
    return report;
  };

  const handleSubmit = async () => {
    if (!filledBy) { showAlert('Error', 'Please select who filled this report'); return; }
    for (const item of checklistItems) {
      const state = checklistState[item.id];
      const needsNotes = item.notes_when === 'checked' ? state?.completed : !state?.completed;
      if (needsNotes && !state?.notes?.trim()) {
        showAlert('Error', `Please add notes for "${item.label}"`); return;
      }
    }
    setGeneratedReport(generateReport()); setShowSubmitModal(true);
  };
  const sendToWhatsApp = async (phoneNumber: string) => {
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(generatedReport)}`;
    try { const canOpen = await Linking.canOpenURL(url); if (canOpen) await Linking.openURL(url); else await Linking.openURL(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(generatedReport)}`); }
    catch { showAlert('Error', 'Could not open WhatsApp'); }
  };

  const renderDropdown = (visible: boolean, onClose: () => void, selectedItems: string[], onSelect: (name: string) => void, multiSelect = false) => {
    if (!visible) return null;
    return (
      <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
        <View style={styles.dropdownOverlay}><View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}><Text style={styles.dropdownTitle}>Select Staff</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity></View>
          <ScrollView style={styles.dropdownList}>
            {staffList.filter(s => s.is_active).map((staff) => (
              <TouchableOpacity key={staff.id} style={[styles.dropdownItem, selectedItems.includes(staff.name) && styles.dropdownItemSelected]} onPress={() => { onSelect(staff.name); if (!multiSelect) onClose(); }}>
                <Text style={[styles.dropdownItemText, selectedItems.includes(staff.name) && styles.dropdownItemTextSelected]}>{staff.name}</Text>
                {selectedItems.includes(staff.name) && <Ionicons name="checkmark" size={20} color="#8B4513" />}
              </TouchableOpacity>
            ))}
            {staffList.filter(s => s.is_active).length === 0 && <Text style={styles.noStaffText}>No staff members added yet.</Text>}
          </ScrollView>
          {multiSelect && <TouchableOpacity style={styles.dropdownDoneBtn} onPress={onClose}><Text style={styles.dropdownDoneBtnText}>Done</Text></TouchableOpacity>}
        </View></View>
      </Modal>
    );
  };

  if (loading) return (<SafeAreaView style={styles.container} edges={['top']}><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#8B4513" /></View></SafeAreaView>);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{SECTION_TITLE} Report</Text><View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isAdmin && (<TouchableOpacity style={styles.staffManageButton} onPress={() => setShowStaffModal(true)}><Ionicons name="people" size={20} color="#fff" /><Text style={styles.staffManageButtonText}>Manage Staff List ({staffList.length})</Text></TouchableOpacity>)}
        <View style={styles.section}><Text style={styles.label}>Filled by: *</Text><TouchableOpacity style={styles.dropdown} onPress={() => setShowFilledByDropdown(true)}><Text style={filledBy ? styles.dropdownText : styles.dropdownPlaceholder}>{filledBy || 'Select staff member'}</Text><Ionicons name="chevron-down" size={20} color="#666" /></TouchableOpacity></View>
        <View style={styles.section}><Text style={styles.label}>Worked:</Text><TouchableOpacity style={styles.dropdown} onPress={() => setShowWorkedDropdown(true)}><Text style={workedStaff.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>{workedStaff.length > 0 ? workedStaff.join(', ') : 'Select staff members'}</Text><Ionicons name="chevron-down" size={20} color="#666" /></TouchableOpacity></View>
        <View style={styles.section}><Text style={styles.label}>Absent/Sick:</Text><TouchableOpacity style={styles.dropdown} onPress={() => setShowAbsentDropdown(true)}><Text style={absentStaff.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>{absentStaff.length > 0 ? absentStaff.join(', ') : 'Select staff members'}</Text><Ionicons name="chevron-down" size={20} color="#666" /></TouchableOpacity></View>

        {/* Dynamic Checklist Items */}
        {checklistItems.map((item, idx) => {
          const state = checklistState[item.id] || { completed: false, notes: '' };
          const showNotes = item.notes_when === 'checked' ? state.completed : !state.completed;
          return (
            <View key={item.id} style={styles.checkboxSection}>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleChecklist(item.id)}>
                <Text style={styles.serialNumber}>{idx + 1}.</Text>
                <View style={[styles.checkbox, state.completed && styles.checkboxChecked]}>{state.completed && <Ionicons name="checkmark" size={16} color="#fff" />}</View>
                <Text style={styles.checkboxLabel}>{item.label}</Text>
              </TouchableOpacity>
              {showNotes && <TextInput style={styles.notesInput} placeholder={item.notes_placeholder} value={state.notes} onChangeText={(text) => updateChecklistNotes(item.id, text)} multiline />}
            </View>
          );
        })}
        {checklistItems.length === 0 && <View style={styles.checkboxSection}><Text style={styles.noStaffText}>No checklist items configured. Admin can add them in Tasks page.</Text></View>}

        <TouchableOpacity style={styles.viewTasksButton} onPress={() => router.push(TASKS_ROUTE as any)}><MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#8B4513" /><Text style={styles.viewTasksButtonText}>View/Edit {SECTION_TITLE} Tasks</Text><Ionicons name="chevron-forward" size={20} color="#8B4513" /></TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}><Ionicons name="logo-whatsapp" size={24} color="#fff" /><Text style={styles.submitButtonText}>Submit via WhatsApp</Text></TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>

      {renderDropdown(showFilledByDropdown, () => setShowFilledByDropdown(false), filledBy ? [filledBy] : [], (name) => setFilledBy(name), false)}
      {renderDropdown(showWorkedDropdown, () => setShowWorkedDropdown(false), workedStaff, (name) => toggleStaffSelection(name, workedStaff, setWorkedStaff), true)}
      {renderDropdown(showAbsentDropdown, () => setShowAbsentDropdown(false), absentStaff, (name) => toggleStaffSelection(name, absentStaff, setAbsentStaff), true)}

      <Modal visible={showStaffModal} animationType="slide" transparent onRequestClose={() => setShowStaffModal(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Manage {SECTION_TITLE} Staff</Text><TouchableOpacity onPress={() => setShowStaffModal(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity></View>
          <View style={styles.addStaffRow}><TextInput style={styles.staffInput} value={newStaffName} onChangeText={setNewStaffName} placeholder="Enter staff name" /><TouchableOpacity style={styles.addStaffButton} onPress={handleAddStaff} disabled={addingStaff}>{addingStaff ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={24} color="#fff" />}</TouchableOpacity></View>
          <ScrollView style={styles.staffList}>{staffList.map((staff) => (<View key={staff.id} style={styles.staffItem}><Text style={styles.staffName}>{staff.name}</Text><TouchableOpacity onPress={() => handleRemoveStaff(staff.id, staff.name)}><Ionicons name="trash-outline" size={20} color="#f44336" /></TouchableOpacity></View>))}{staffList.length === 0 && <Text style={styles.noStaffModalText}>No staff members added yet</Text>}</ScrollView>
        </View></View>
      </Modal>

      <Modal visible={showSubmitModal} animationType="slide" transparent onRequestClose={() => setShowSubmitModal(false)}>
        <View style={styles.modalOverlay}><View style={styles.submitModalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Send Report via WhatsApp</Text><TouchableOpacity onPress={() => setShowSubmitModal(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity></View>
          <Text style={styles.submitModalText}>Please send the report to BOTH numbers below:</Text>
          <TouchableOpacity style={styles.whatsappButton} onPress={() => sendToWhatsApp('918075946225')}><Ionicons name="logo-whatsapp" size={24} color="#fff" /><Text style={styles.whatsappButtonText}>Send to Divine Office</Text></TouchableOpacity>
          <TouchableOpacity style={styles.whatsappButton} onPress={() => sendToWhatsApp('919544183334')}><Ionicons name="logo-whatsapp" size={24} color="#fff" /><Text style={styles.whatsappButtonText}>Send to Soman Nair</Text></TouchableOpacity>
          <TouchableOpacity style={styles.doneButton} onPress={() => setShowSubmitModal(false)}><Text style={styles.doneButtonText}>Done</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' }, loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#8B4513', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { padding: 8 }, headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1 }, contentContainer: { padding: 16, paddingBottom: 180 },
  staffManageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B4513', borderRadius: 8, padding: 12, marginBottom: 16 },
  staffManageButtonText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  section: { marginBottom: 16 }, label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, paddingVertical: 14 },
  dropdownText: { fontSize: 14, color: '#333', flex: 1 }, dropdownPlaceholder: { fontSize: 14, color: '#999', flex: 1 },
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  dropdownContainer: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '60%' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownTitle: { fontSize: 16, fontWeight: '600', color: '#333' }, dropdownList: { maxHeight: 250 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownItemSelected: { backgroundColor: '#FFF8DC' }, dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemTextSelected: { color: '#8B4513', fontWeight: '600' },
  dropdownDoneBtn: { backgroundColor: '#8B4513', padding: 16, alignItems: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  dropdownDoneBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  noStaffText: { padding: 16, color: '#666', textAlign: 'center', fontStyle: 'italic' },
  checkboxSection: { marginBottom: 16, backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  serialNumber: { fontSize: 16, fontWeight: 'bold', color: '#8B4513', marginRight: 10, width: 24 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#8B4513', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: '#8B4513' }, checkboxLabel: { fontSize: 14, color: '#333', fontWeight: '500', flex: 1 },
  notesInput: { marginTop: 12, marginLeft: 34, backgroundColor: '#f9f9f9', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: '#eee', minHeight: 60, textAlignVertical: 'top' },
  viewTasksButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#8B4513' },
  viewTasksButtonText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#8B4513', marginLeft: 12 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', borderRadius: 8, padding: 16 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  addStaffRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  staffInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  addStaffButton: { backgroundColor: '#8B4513', borderRadius: 8, width: 44, justifyContent: 'center', alignItems: 'center' },
  staffList: { padding: 16 }, staffItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  staffName: { fontSize: 16, color: '#333' }, noStaffModalText: { textAlign: 'center', color: '#999', fontStyle: 'italic', paddingVertical: 20 },
  submitModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  submitModalText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  whatsappButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', borderRadius: 8, padding: 16, marginBottom: 12 },
  whatsappButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  doneButton: { alignItems: 'center', padding: 16, marginTop: 8 }, doneButtonText: { color: '#666', fontSize: 14 },
});
