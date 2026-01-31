"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as orderApi from '../orders/api';
import PdfRowOverlayViewer from '@/components/PdfRowOverlayViewer';
import { getAllMachines, addMachine } from '../../AdminUser/machines/api';

// Status badge component
const StatusBadge = ({ status }) => {
  const statusStyles = {
    'In Progress': 'bg-blue-100 text-blue-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-green-100 text-green-800',
    'On Hold': 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

export default function ProductionLinePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const router = useRouter();

  // Current user state
  const [currentUser, setCurrentUser] = useState(null);

  // Machine employees state
  const [machineEmployees, setMachineEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [employeeRowMap, setEmployeeRowMap] = useState({});
  const [showAssignAnotherModal, setShowAssignAnotherModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('machine');

  const [assignedRowKeysSet, setAssignedRowKeysSet] = useState(new Set());
  const [assignedRowToUserMap, setAssignedRowToUserMap] = useState({});

  const [orders, setOrders] = useState([]);
  const [pdfMap, setPdfMap] = useState({});
  const [pdfModalUrl, setPdfModalUrl] = useState(null);
  const [pdfType, setPdfType] = useState('standard');
  const [isRowsLoading, setIsRowsLoading] = useState(false);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [pdfRows, setPdfRows] = useState([]);
  const [partsRows, setPartsRows] = useState([]);
  const [materialRows, setMaterialRows] = useState([]);
  const [selectedSubnestRowNos, setSelectedSubnestRowNos] = useState([]);
  const [selectedPartsRowNos, setSelectedPartsRowNos] = useState([]);
  const [selectedMaterialRowNos, setSelectedMaterialRowNos] = useState([]);
  // Three-checkbox state: always populated only from backend, never pre-filled locally
  const [designerSelectedRowNos, setDesignerSelectedRowNos] = useState([]);
  const [productionSelectedRowNos, setProductionSelectedRowNos] = useState([]);
  const [machineSelectedRowNos, setMachineSelectedRowNos] = useState([]);
  // Parts selection (isolated)
  const [designerPartsSelectedRowNos, setDesignerPartsSelectedRowNos] = useState([]);
  const [productionPartsSelectedRowNos, setProductionPartsSelectedRowNos] = useState([]);
  const [machinePartsSelectedRowNos, setMachinePartsSelectedRowNos] = useState([]);
  const [inspectionPartsSelectedRowNos, setInspectionPartsSelectedRowNos] = useState([]);
  // Material selection (isolated)
  const [designerMaterialSelectedRowNos, setDesignerMaterialSelectedRowNos] = useState([]);
  const [productionMaterialSelectedRowNos, setProductionMaterialSelectedRowNos] = useState([]);
  const [machineMaterialSelectedRowNos, setMachineMaterialSelectedRowNos] = useState([]);
  const [inspectionMaterialSelectedRowNos, setInspectionMaterialSelectedRowNos] = useState([]);
  // rows selected by Machine (read-only)
  const [isSendingToMachine, setIsSendingToMachine] = useState(false);
  const [activePdfTab, setActivePdfTab] = useState('subnest');
  const [toast, setToast] = useState({ message: '', type: '' });
  const [showSelectMachineModal, setShowSelectMachineModal] = useState(false);
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [showMachineEmployeeList, setShowMachineEmployeeList] = useState(false);
  const [showSubnestMachineList, setShowSubnestMachineList] = useState(false);
  const [showPartsMachineList, setShowPartsMachineList] = useState(false);
  const [showMaterialMachineList, setShowMaterialMachineList] = useState(false);
  const [showResultsMachineList, setShowResultsMachineList] = useState(false);
  const [showPlateInfoMachineList, setShowPlateInfoMachineList] = useState(false);
  const [showPartInfoMachineList, setShowPartInfoMachineList] = useState(false);
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [addMachineForm, setAddMachineForm] = useState({
    name: '',
    status: 'Active',
  });
  const [userRole, setUserRole] = useState('PRODUCTION');

  // ===========================
  // ✅ NESTING (PDF-2) UI STATES (additive)
  // ===========================
  const [resultBlocks, setResultBlocks] = useState([]);
  const [plateInfoRows, setPlateInfoRows] = useState([]);
  const [partInfoRows, setPartInfoRows] = useState([]);
  const [activeResultNo, setActiveResultNo] = useState(null);

  const [designerSelectedRowIds, setDesignerSelectedRowIds] = useState([]);
  const [productionSelectedRowIds, setProductionSelectedRowIds] = useState([]);
  const [machineSelectedRowIds, setMachineSelectedRowIds] = useState([]);
  const [inspectionSelectedRowIds, setInspectionSelectedRowIds] = useState([]);

  // ===========================
  // ✅ NESTING HELPERS (copied 1:1 from Design where applicable)
  // ===========================
  const getToken = () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return null;
    try {
      const auth = JSON.parse(raw);
      return auth?.token || null;
    } catch {
      return null;
    }
  };

  const numericOrderId = (orderId) => String(orderId || '').replace(/^SF/i, '');

  const getNestingResultId = (block) => `RESULT-${block?.resultNo}`;
  const getNestingPlateId = (row) => `PLATE-${row?.order}-${row?.plateSize}`;
  const getNestingPartId = (row, idx) => `PART-${row?.order}-${row?.partName}-${idx}`;
  const getNestingResultPartId = (resultNo, partRow, idx) =>
    `RESULTPART-${resultNo}-${partRow?.partName ?? 'PART'}-${idx}`;

  const ThumbnailBox = () => (
    <div className="w-[52px] h-[32px] border border-gray-300 rounded bg-white flex items-center justify-center text-[10px] text-gray-400">
      —
    </div>
  );

  const canEditRole = (role) => userRole === role;

  const isCheckedByRole = (role, id) => {
    if (role === 'DESIGN') return designerSelectedRowIds.includes(id);
    if (role === 'PRODUCTION') return productionSelectedRowIds.includes(id);
    if (role === 'MACHINING') return machineSelectedRowIds.includes(id);
    if (role === 'INSPECTION') return inspectionSelectedRowIds.includes(id);
    return false;
  };

  const toggleRoleRow = (role, id) => {
    if (!canEditRole(role)) return;

    const toggle = (prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

    if (role === 'DESIGN') setDesignerSelectedRowIds(toggle);
    if (role === 'PRODUCTION') setProductionSelectedRowIds(toggle);
    if (role === 'MACHINING') setMachineSelectedRowIds(toggle);
    if (role === 'INSPECTION') setInspectionSelectedRowIds(toggle);
  };

  const activeResultBlock = useMemo(() => {
    if (!activeResultNo) return null;
    return (
      (resultBlocks || []).find((b) => Number(b?.resultNo) === Number(activeResultNo)) || null
    );
  }, [resultBlocks, activeResultNo]);

  const nestingRowIdsForTab = useMemo(() => {
    if (activePdfTab === 'results') return resultBlocks.map((b) => getNestingResultId(b));
    if (activePdfTab === 'plate-info') return plateInfoRows.map((r) => getNestingPlateId(r));
    if (activePdfTab === 'part-info') return partInfoRows.map((r, idx) => getNestingPartId(r, idx));
    return [];
  }, [activePdfTab, resultBlocks, plateInfoRows, partInfoRows]);

  const nestingPartsListRowIds = useMemo(() => {
    if (!activeResultNo) return [];
    return (activeResultBlock?.parts || []).map((p, idx) => getNestingResultPartId(activeResultNo, p, idx));
  }, [activeResultNo, activeResultBlock]);

  const mergeSelectAllIds = (tabIds, partsListIds) => {
    if (activePdfTab !== 'results') return tabIds;
    return [...tabIds, ...partsListIds];
  };

  const isAllSelectedByRole = (role) => {
    const ids = mergeSelectAllIds(nestingRowIdsForTab, nestingPartsListRowIds);
    if (ids.length === 0) return false;

    if (role === 'DESIGN') return ids.every((id) => designerSelectedRowIds.includes(id));
    if (role === 'PRODUCTION') return ids.every((id) => productionSelectedRowIds.includes(id));
    if (role === 'MACHINING') return ids.every((id) => machineSelectedRowIds.includes(id));
    if (role === 'INSPECTION') return ids.every((id) => inspectionSelectedRowIds.includes(id));
    return false;
  };

  const toggleSelectAllByRole = (role) => {
    if (!canEditRole(role)) return;

    const ids = mergeSelectAllIds(nestingRowIdsForTab, nestingPartsListRowIds);
    if (ids.length === 0) return;

    const apply = (prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((x) => !ids.includes(x));
      const set = new Set(prev);
      ids.forEach((id) => set.add(id));
      return Array.from(set);
    };

    if (role === 'DESIGN') setDesignerSelectedRowIds(apply);
    if (role === 'PRODUCTION') setProductionSelectedRowIds(apply);
    if (role === 'MACHINING') setMachineSelectedRowIds(apply);
    if (role === 'INSPECTION') setInspectionSelectedRowIds(apply);
  };

  const resetNestingPdfStates = () => {
    setResultBlocks([]);
    setPlateInfoRows([]);
    setPartInfoRows([]);
    setActiveResultNo(null);
    setDesignerSelectedRowIds([]);
    setProductionSelectedRowIds([]);
    setMachineSelectedRowIds([]);
    setInspectionSelectedRowIds([]);
  };

  const loadThreeCheckboxSelectionNesting = async (orderId) => {
    const token = getToken();
    if (!token) return;

    const numericId = numericOrderId(orderId);
    if (!numericId) return;

    try {
      const res = await fetch(`https://api.metaspark.co.in/pdf/order/${numericId}/three-checkbox-selection`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDesignerSelectedRowIds(Array.isArray(data?.designerSelectedRowIds) ? data.designerSelectedRowIds : []);
      setProductionSelectedRowIds(Array.isArray(data?.productionSelectedRowIds) ? data.productionSelectedRowIds : []);
      setMachineSelectedRowIds(Array.isArray(data?.machineSelectedRowIds) ? data.machineSelectedRowIds : []);
      setInspectionSelectedRowIds(Array.isArray(data?.inspectionSelectedRowIds) ? data.inspectionSelectedRowIds : []);
    } catch {
    }
  };

  const saveThreeCheckboxSelectionNesting = async () => {
    const token = getToken();
    if (!token) return;

    const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
    if (!current) return;
    const [orderId] = current;

    const numericId = numericOrderId(orderId);
    if (!numericId) return;

    const payload = {
      designerSelectedRowIds: [],
      productionSelectedRowIds: [],
      machineSelectedRowIds: [],
      inspectionSelectedRowIds: [],
    };

    if (userRole === 'DESIGN') payload.designerSelectedRowIds = designerSelectedRowIds;
    if (userRole === 'PRODUCTION') payload.productionSelectedRowIds = productionSelectedRowIds;
    if (userRole === 'MACHINING') payload.machineSelectedRowIds = machineSelectedRowIds;
    if (userRole === 'INSPECTION') payload.inspectionSelectedRowIds = inspectionSelectedRowIds;

    try {
      const res = await fetch(`https://api.metaspark.co.in/pdf/order/${numericId}/three-checkbox-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) setToast({ message: 'Selection saved successfully', type: 'success' });
      else setToast({ message: 'Failed to save selection', type: 'error' });
    } catch {
      setToast({ message: 'Error saving selection', type: 'error' });
    }
  };

  // ===========================
  // ✅ MAIN: Detect PDF-2 vs PDF-1 (additive; PDF-1 unchanged)
  // ===========================
  const openPdfModalForAttachment = async (attachmentUrl, orderId) => {
    setPdfModalUrl(attachmentUrl);
    setPdfType('standard');
    setActivePdfTab('subnest');
    resetNestingPdfStates();

    setPdfRows([]);
    setPartsRows([]);
    setMaterialRows([]);
    setDesignerSelectedRowNos([]);
    setProductionSelectedRowNos([]);
    setMachineSelectedRowNos([]);

    setDesignerPartsSelectedRowNos([]);
    setProductionPartsSelectedRowNos([]);
    setMachinePartsSelectedRowNos([]);
    setInspectionPartsSelectedRowNos([]);

    setDesignerMaterialSelectedRowNos([]);
    setProductionMaterialSelectedRowNos([]);
    setMachineMaterialSelectedRowNos([]);
    setInspectionMaterialSelectedRowNos([]);

    setIsRowsLoading(true);
    setIsAnalyzingPdf(true);

    const token = getToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const plateApi = `https://api.metaspark.co.in/api/nesting/plate-info?attachmentUrl=${encodeURIComponent(attachmentUrl)}`;
      const partApi = `https://api.metaspark.co.in/api/nesting/part-info?attachmentUrl=${encodeURIComponent(attachmentUrl)}`;
      const resultApi = `https://api.metaspark.co.in/api/nesting/results?attachmentUrl=${encodeURIComponent(attachmentUrl)}`;

      const [plateRes, partRes, resultRes] = await Promise.all([
        fetch(plateApi, { headers }),
        fetch(partApi, { headers }),
        fetch(resultApi, { headers }),
      ]);

      const plateData = plateRes.ok ? await plateRes.json() : [];
      const partData = partRes.ok ? await partRes.json() : [];
      const resultData = resultRes.ok ? await resultRes.json() : [];

      const hasNesting = Array.isArray(resultData) && resultData.length > 0;

      if (hasNesting) {
        setPdfType('nesting');
        setActivePdfTab('results');

        setPlateInfoRows(Array.isArray(plateData) ? plateData : []);
        setPartInfoRows(Array.isArray(partData) ? partData : []);
        setResultBlocks(Array.isArray(resultData) ? resultData : []);

        const sorted = [...resultData].sort((a, b) => (a?.resultNo || 0) - (b?.resultNo || 0));
        setActiveResultNo(sorted?.[0]?.resultNo ?? null);

        await loadThreeCheckboxSelectionNesting(orderId);

        setIsAnalyzingPdf(false);
        setIsRowsLoading(false);
        return;
      }

      const baseSubnest = `https://api.metaspark.co.in/api/pdf/subnest/by-url?attachmentUrl=${encodeURIComponent(attachmentUrl)}`;
      const baseParts = `https://api.metaspark.co.in/api/pdf/subnest/parts/by-url?attachmentUrl=${encodeURIComponent(attachmentUrl)}`;
      const baseMaterial = `https://api.metaspark.co.in/api/pdf/subnest/material-data/by-url?attachmentUrl=${encodeURIComponent(attachmentUrl)}`;

      const [subnestRes, partsRes, materialRes] = await Promise.all([
        fetch(baseSubnest, { headers }),
        fetch(baseParts, { headers }),
        fetch(baseMaterial, { headers }),
      ]);

      if (subnestRes.ok) {
        const data = await subnestRes.json();
        setPdfRows(Array.isArray(data) ? data : []);
      }
      if (partsRes.ok) {
        const data = await partsRes.json();
        setPartsRows(Array.isArray(data) ? data : []);
      }
      if (materialRes.ok) {
        const data = await materialRes.json();
        setMaterialRows(Array.isArray(data) ? data : []);
      }

      await fetchThreeCheckboxSelection(orderId);
      await fetchPartsSelection(orderId);
      await fetchMaterialSelection(orderId);
    } catch {
    } finally {
      setIsAnalyzingPdf(false);
      setIsRowsLoading(false);
    }
  };

  // Helper function to get current user
  const getCurrentUser = () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return null;
    try {
      const auth = JSON.parse(raw);
      return auth.user || auth;
    } catch {
      return null;
    }
  };

  const fetchProductionAssignments = async (orderId, backendPdfType, scope) => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return;
    const auth = JSON.parse(raw);
    const token = auth?.token;
    if (!token) return;
    if (!orderId || !backendPdfType || !scope) return;

    try {
      const res = await fetch(
        `https://api.metaspark.co.in/orders/${orderId}/production-assignments?pdfType=${encodeURIComponent(backendPdfType)}&scope=${encodeURIComponent(scope)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();

      const nextSet = new Set();
      const nextMap = {};
      const assignments = Array.isArray(data?.assignments) ? data.assignments : [];
      assignments.forEach((a) => {
        const uid = a?.userId;
        const keys = Array.isArray(a?.rowKeys) ? a.rowKeys : [];
        keys.forEach((rk) => {
          const k = String(rk);
          nextSet.add(k);
          if (uid !== undefined && uid !== null) nextMap[k] = uid;
        });
      });

      setAssignedRowKeysSet(nextSet);
      setAssignedRowToUserMap(nextMap);
    } catch {
    }
  };

  // Final step: send order to Machine department for all employees who have at least one assigned row
  const handleSendToMachine = async (orderId) => {
    try {
      setIsSendingToMachine(true);

      const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
      if (!raw) {
        setToast({ message: 'Missing auth token', type: 'error' });
        return;
      }
      const auth = JSON.parse(raw);
      const token = auth?.token;
      if (!token) {
        setToast({ message: 'Missing auth token', type: 'error' });
        return;
      }

      const numericId = numericOrderId(orderId);
      if (!numericId) {
        setToast({ message: 'Invalid order ID', type: 'error' });
        return;
      }

      const backendPdfType = pdfType === 'nesting' ? 'PDF2' : 'PDF1';
      const scope = (() => {
        if (pdfType === 'nesting') {
          if (activePdfTab === 'plate-info') return 'NESTING_PLATE_INFO';
          if (activePdfTab === 'part-info') return 'NESTING_PART_INFO';
          return 'NESTING_RESULTS';
        }
        if (activePdfTab === 'parts') return 'PARTS';
        if (activePdfTab === 'material') return 'MATERIAL';
        return 'SUBNEST';
      })();

      // Fetch assignments to determine which employees have at least one row
      const assignRes = await fetch(
        `https://api.metaspark.co.in/orders/${numericId}/production-assignments?pdfType=${encodeURIComponent(backendPdfType)}&scope=${encodeURIComponent(scope)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!assignRes.ok) {
        setToast({ message: 'Failed to load assignments for order', type: 'error' });
        return;
      }

      const assignData = await assignRes.json();
      const assignments = Array.isArray(assignData?.assignments) ? assignData.assignments : [];

      // Collect unique employee IDs that actually have at least one rowKey
      const employeeIdSet = new Set();
      assignments.forEach((a) => {
        const uid = a?.userId;
        const keys = Array.isArray(a?.rowKeys) ? a.rowKeys : [];
        if (uid != null && keys.length > 0) {
          employeeIdSet.add(uid);
        }
      });

      if (employeeIdSet.size === 0) {
        setToast({ message: 'No assigned employees found for this order', type: 'error' });
        return;
      }

      // Call /users/assign-to-order for each employee to ensure order-level visibility
      for (const employeeId of employeeIdSet) {
        const res = await fetch('https://api.metaspark.co.in/users/assign-to-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderId: Number(numericId),
            userId: employeeId,
            department: 'MACHINING',
          }),
        });

        if (!res.ok) {
          let msg = 'Failed to send order to machine';
          try {
            const errData = await res.json();
            if (errData && errData.message) msg = errData.message;
          } catch {
          }
          setToast({ message: msg, type: 'error' });
          return;
        }
      }

      setToast({ message: 'Order sent to machine successfully', type: 'success' });
    } catch (error) {
      console.error('Error sending order to machine:', error);
      setToast({ message: error?.message || 'Failed to send order to machine', type: 'error' });
    } finally {
      setIsSendingToMachine(false);
    }
  };

  // Helper function to get machine name by ID
  const getMachineName = async (machineId) => {
    if (!machineId) return '';
    
    try {
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;
      
      const response = await fetch(`https://api.metaspark.co.in/machine/getMachine/${machineId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const machine = await response.json();
        return machine.machineName || `Machine ${machineId}`;
      }
    } catch (error) {
      console.error('Error fetching machine name:', error);
    }
    
    return `Machine ${machineId}`;
  };

  // Handle employee selection
  const handleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  // Handle order assignment to selected employees
  const handleAssignToEmployees = async (orderId) => {
    if (selectedEmployees.size === 0) {
      setToast({ message: 'Please select at least one employee', type: 'error' });
      return;
    }

    try {
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;
      if (!token) {
        setToast({ message: 'Missing auth token', type: 'error' });
        return;
      }

      const backendPdfType = pdfType === 'nesting' ? 'PDF2' : 'PDF1';

      const mapActiveTabToScope = () => {
        if (pdfType === 'nesting') {
          if (activePdfTab === 'plate-info') return 'NESTING_PLATE_INFO';
          if (activePdfTab === 'part-info') return 'NESTING_PART_INFO';
          return 'NESTING_RESULTS';
        }
        if (activePdfTab === 'parts') return 'PARTS';
        if (activePdfTab === 'material') return 'MATERIAL';
        return 'SUBNEST';
      };

      const scope = mapActiveTabToScope();

      const selectedRowKeys = (() => {
        if (pdfType === 'nesting') {
          return Array.isArray(productionSelectedRowIds) ? productionSelectedRowIds.map(String) : [];
        }
        if (activePdfTab === 'parts') return (productionPartsSelectedRowNos || []).map(String);
        if (activePdfTab === 'material') return (productionMaterialSelectedRowNos || []).map(String);
        return (productionSelectedRowNos || []).map(String);
      })();

      if (!selectedRowKeys.length) {
        setToast({ message: 'Please select at least one row to assign', type: 'error' });
        return;
      }

      // Convert Set to Array and sort for consistent distribution
      const employeeIds = Array.from(selectedEmployees).sort();
      const selectedRows = [...selectedRowKeys].sort();
      
      // Distribute rows evenly among employees
      const rowsPerEmployee = Math.ceil(selectedRows.length / employeeIds.length);

      const nextEmployeeRowMap = {};
      const assignmentsPayload = [];
      
      for (let i = 0; i < employeeIds.length; i++) {
        const employeeId = employeeIds[i];
        // Get the rows for this employee
        const startIndex = i * rowsPerEmployee;
        const endIndex = Math.min(startIndex + rowsPerEmployee, selectedRows.length);
        const employeeRows = selectedRows.slice(startIndex, endIndex);

        nextEmployeeRowMap[employeeId] = employeeRows;
        assignmentsPayload.push({ userId: employeeId, rowKeys: employeeRows });
        
      }

      // Persist employee-wise assignments (single bulk request)
      setEmployeeRowMap(nextEmployeeRowMap);
      const bulkRes = await fetch(`https://api.metaspark.co.in/orders/${orderId}/production-assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          pdfType: backendPdfType,
          scope,
          assignments: assignmentsPayload,
        }),
      });

      if (!bulkRes.ok) {
        let msg = 'Failed to assign rows';
        try {
          const data = await bulkRes.json();
          if (data?.message) msg = data.message;
        } catch {
        }
        throw new Error(msg);
      }

      setToast({ message: 'Rows assigned successfully', type: 'success' });

      // Refresh assigned rows for green-highlight UI (no full order list refresh)
      await fetchProductionAssignments(orderId, backendPdfType, scope);

      // Clear only the current selection to allow multiple assignment rounds without closing modal
      if (pdfType === 'nesting') {
        setProductionSelectedRowIds([]);
      } else if (activePdfTab === 'parts') {
        setProductionPartsSelectedRowNos([]);
      } else if (activePdfTab === 'material') {
        setProductionMaterialSelectedRowNos([]);
      } else {
        setProductionSelectedRowNos([]);
      }
    } catch (error) {
      console.error('Error assigning employees:', error);
      setToast({ message: error?.message || 'Failed to assign rows', type: 'error' });
    }
  };

  // Fetch orders for the current production user
  const fetchOrders = async () => {
    try {
      // Get current user
      const user = getCurrentUser();
      if (!user) {
        console.log('No current user found');
        setOrders([]);
        return;
      }

      const orders = await orderApi.getAllOrders();

      const sorted = Array.isArray(orders)
        ? orders.slice().sort((a, b) => (b.orderId || 0) - (a.orderId || 0))
        : [];

      // Filter orders for current employee (only production orders assigned to this employee)
      const filteredOrders = sorted.filter(order => {
        // Only show production orders
        const isProductionOrder = (order.department || '').toUpperCase() === 'PRODUCTION' || 
                                 (order.status || '').toUpperCase() === 'PRODUCTION';
        
        if (!isProductionOrder) return false;

        // Check if this order is assigned to the current employee
        // We'll need to check the OrderAssignment table via API
        return true; // For now, we'll filter after getting assigned orders
      });

      // Get assigned orders for current user
      const token = JSON.parse(localStorage.getItem('swiftflow-user'))?.token;
      if (token) {
        try {
          console.log('🔍 [PRODUCTION] Fetching assigned orders for user:', user.id, user.email);
          const assignedOrdersResponse = await fetch('https://api.metaspark.co.in/users/assigned-orders/' + user.id, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (assignedOrdersResponse.ok) {
            const assignedOrderIds = await assignedOrdersResponse.json();
            console.log('🔍 [PRODUCTION] Assigned order IDs for user', user.id, ':', assignedOrderIds);
            console.log('🔍 [PRODUCTION] Available filtered orders:', filteredOrders.map(o => ({ id: o.orderId, name: o.product })));
            
            // Filter to only show orders assigned to this user
            const userOrders = filteredOrders.filter(order => {
              const orderId = order.orderId || parseInt(String(order.id).replace('SF', ''));
              const isAssigned = assignedOrderIds.includes(orderId);
              console.log('🔍 [PRODUCTION] Order', orderId, 'assigned to user', user.id, ':', isAssigned);
              return isAssigned;
            });
            
            console.log('🔍 [PRODUCTION] Final user orders for', user.email, ':', userOrders.map(o => ({ id: o.orderId, name: o.product })));

            const transformed = await Promise.all(userOrders.map(async (order) => {
              const product = (order.products && order.products[0]) || {};

              // Get machine name if user has machine assigned
              let machineName = '';
              if (user.machineId) {
                machineName = await getMachineName(user.machineId);
              }

              return {
                id: `SF${order.orderId}`,
                product: product.productName || product.productCode || 'Unknown Product',
                quantity: order.units || '',
                status: order.status || 'Production',
                startDate: order.dateAdded || '',
                dueDate: '',
                assignedTo: user.fullName || user.email || 'Unknown',
                machine: machineName, // Add machine field
                department: order.department,
              };
            }));

            setOrders(transformed);
          } else {
            // If can't get assigned orders, show empty
            setOrders([]);
          }
        } catch (error) {
          console.error('Error fetching assigned orders:', error);
          setOrders([]);
        }
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders for production line:', err);
      setOrders([]);
    }
  };

  // Fetch all machine employees with their machine details
  const fetchMachineEmployees = async () => {
    try {
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;
      
      console.log('Fetching machine employees...');
      
      const response = await fetch('https://api.metaspark.co.in/users/with-machine-details', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const users = await response.json();
        console.log('All users from API:', users);
        
        // Filter only MACHINING department users who have machines assigned
        const machiningUsers = users.filter(user => 
          user.department === 'MACHINING' && user.machineName
        );
        
        console.log('Filtered machining users:', machiningUsers);
        console.log('Sample machining user:', machiningUsers[0]);
        
        setMachineEmployees(machiningUsers);
      } else {
        console.error('Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('Error fetching machine employees:', error);
    }
  };

  useEffect(() => {
    fetchMachineEmployees();
    fetchOrders();
  }, []);

  useEffect(() => {
    const fetchPdfInfo = async () => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
        if (!raw) return;
        const auth = JSON.parse(raw);
        const token = auth?.token;
        if (!token) return;

        const entries = await Promise.all(
          (orders || []).map(async (order) => {
            const numericId = String(order.id).replace(/^SF/i, '');
            if (!numericId) return [order.id, null];
            try {
              const resp = await fetch(`https://api.metaspark.co.in/status/order/${numericId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!resp.ok) return [order.id, null];
              const history = await resp.json();
              const withPdf = Array.isArray(history)
                ? history
                    .filter(
                      (h) =>
                        h.attachmentUrl &&
                        h.attachmentUrl.toLowerCase().endsWith('.pdf') &&
                        (h.newStatus === 'PRODUCTION' || h.newStatus === 'PRODUCTION_READY')
                    )
                    .sort((a, b) => a.id - b.id)
                    .at(-1)
                : null;
              return [order.id, withPdf ? withPdf.attachmentUrl : null];
            } catch {
              return [order.id, null];
            }
          })
        );

        const map = {};
        entries.forEach(([id, url]) => {
          map[id] = url;
        });
        setPdfMap(map);
      } catch {
      }
    };

    if ((orders || []).length > 0) fetchPdfInfo();
    else setPdfMap({});
  }, [orders]);

  useEffect(() => {
    const run = async () => {
      if (!pdfModalUrl) return;
      const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
      if (!current) return;
      const [orderId] = current;
      const numericId = String(orderId).replace(/^SF/i, '');
      if (!numericId) return;

      const backendPdfType = pdfType === 'nesting' ? 'PDF2' : 'PDF1';
      const scope = (() => {
        if (pdfType === 'nesting') {
          if (activePdfTab === 'plate-info') return 'NESTING_PLATE_INFO';
          if (activePdfTab === 'part-info') return 'NESTING_PART_INFO';
          return 'NESTING_RESULTS';
        }
        if (activePdfTab === 'parts') return 'PARTS';
        if (activePdfTab === 'material') return 'MATERIAL';
        return 'SUBNEST';
      })();

      await fetchProductionAssignments(numericId, backendPdfType, scope);
    };

    run();
  }, [pdfModalUrl, pdfType, activePdfTab, pdfMap]);

  const ensureMachinesLoaded = async () => {
    if (machines.length > 0 || machinesLoading) return;
    try {
      setMachinesLoading(true);
      const data = await getAllMachines();
      setMachines(data || []);
    } catch (err) {
      console.error('Error loading machines for selection:', err);
    } finally {
      setMachinesLoading(false);
    }
  };

  const fetchThreeCheckboxSelection = async (orderId) => {
    // Always start from a clean slate; any ticks come only from backend response
    setDesignerSelectedRowNos([]);
    setProductionSelectedRowNos([]);
    setMachineSelectedRowNos([]);

    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return;
    const auth = JSON.parse(raw);
    const token = auth?.token;
    if (!token) return;

    const numericId = String(orderId).replace(/^SF/i, '');
    if (!numericId) return;

    try {
      const response = await fetch(`https://api.metaspark.co.in/pdf/order/${numericId}/three-checkbox-selection`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDesignerSelectedRowNos((data.designerSelectedRowIds || []).map(Number));
        setProductionSelectedRowNos((data.productionSelectedRowIds || []).map(Number));
        setMachineSelectedRowNos((data.machineSelectedRowIds || []).map(Number));
      }
    } catch (error) {
      console.error('Error fetching three-checkbox selection:', error);
    }
  };

  const fetchPartsSelection = async (orderId) => {
    setDesignerPartsSelectedRowNos([]);
    setProductionPartsSelectedRowNos([]);
    setMachinePartsSelectedRowNos([]);
    setInspectionPartsSelectedRowNos([]);

    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return;
    const auth = JSON.parse(raw);
    const token = auth?.token;
    if (!token) return;

    const numericId = String(orderId).replace(/^SF/i, '');
    if (!numericId) return;

    try {
      const response = await fetch(`https://api.metaspark.co.in/pdf/order/${numericId}/parts-selection`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDesignerPartsSelectedRowNos((data.designerSelectedRowIds || []).map(String));
        setProductionPartsSelectedRowNos((data.productionSelectedRowIds || []).map(String));
        setMachinePartsSelectedRowNos((data.machineSelectedRowIds || []).map(String));
        setInspectionPartsSelectedRowNos((data.inspectionSelectedRowIds || []).map(String));
      }
    } catch (error) {
      console.error('Error fetching parts selection:', error);
    }
  };

  const fetchMaterialSelection = async (orderId) => {
    setDesignerMaterialSelectedRowNos([]);
    setProductionMaterialSelectedRowNos([]);
    setMachineMaterialSelectedRowNos([]);
    setInspectionMaterialSelectedRowNos([]);

    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return;
    const auth = JSON.parse(raw);
    const token = auth?.token;
    if (!token) return;

    const numericId = String(orderId).replace(/^SF/i, '');
    if (!numericId) return;

    try {
      const response = await fetch(`https://api.metaspark.co.in/pdf/order/${numericId}/material-selection`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDesignerMaterialSelectedRowNos((data.designerSelectedRowIds || []).map(Number));
        setProductionMaterialSelectedRowNos((data.productionSelectedRowIds || []).map(Number));
        setMachineMaterialSelectedRowNos((data.machineSelectedRowIds || []).map(Number));
        setInspectionMaterialSelectedRowNos((data.inspectionSelectedRowIds || []).map(Number));
      }
    } catch (error) {
      console.error('Error fetching material selection:', error);
    }
  };

  const handleProductionCheckboxChange = (rowNo, checked) => {
    setProductionSelectedRowNos((prev) =>
      checked ? [...prev, rowNo] : prev.filter((n) => n !== rowNo)
    );
  };

  const handleProductionPartsCheckboxChange = (rowNo, checked) => {
    setProductionPartsSelectedRowNos((prev) =>
      checked ? [...prev, rowNo] : prev.filter((n) => n !== rowNo)
    );
  };

  const handleProductionMaterialCheckboxChange = (rowNo, checked) => {
    setProductionMaterialSelectedRowNos((prev) =>
      checked ? [...prev, rowNo] : prev.filter((n) => n !== rowNo)
    );
  };

  const savePartsSelection = async () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return;
    const auth = JSON.parse(raw);
    const token = auth?.token;
    if (!token) return;

    const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
    if (!current) return;
    const [orderId] = current;
    const numericId = String(orderId).replace(/^SF/i, '');
    if (!numericId) return;

    try {
      const response = await fetch(`https://api.metaspark.co.in/pdf/order/${numericId}/parts-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productionSelectedRowIds: productionPartsSelectedRowNos.map(String),
        }),
      });

      if (response.ok) {
        setToast({ message: 'Parts selection saved successfully', type: 'success' });
      } else {
        setToast({ message: 'Failed to save parts selection', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error saving parts selection', type: 'error' });
    }
  };

  const saveMaterialSelection = async () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return;
    const auth = JSON.parse(raw);
    const token = auth?.token;
    if (!token) return;

    const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
    if (!current) return;
    const [orderId] = current;
    const numericId = String(orderId).replace(/^SF/i, '');
    if (!numericId) return;

    try {
      const response = await fetch(`https://api.metaspark.co.in/pdf/order/${numericId}/material-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productionSelectedRowIds: productionMaterialSelectedRowNos.map(String),
        }),
      });

      if (response.ok) {
        setToast({ message: 'Material selection saved successfully', type: 'success' });
      } else {
        setToast({ message: 'Failed to save material selection', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error saving material selection', type: 'error' });
    }
  };

  const saveThreeCheckboxSelection = async () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return;
    const auth = JSON.parse(raw);
    const token = auth?.token;
    if (!token) return;

    const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
    if (!current) return;
    const [orderId] = current;
    const numericId = String(orderId).replace(/^SF/i, '');
    if (!numericId) return;

    try {
      setIsSendingToMachine(true);
      const response = await fetch(`https://api.metaspark.co.in/pdf/order/${numericId}/three-checkbox-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productionSelectedRowIds: productionSelectedRowNos.map(String),
        }),
      });

      if (response.ok) {
        // After saving production checkboxes, move the order to MACHINING
        const statusPayload = {
          newStatus: 'MACHINING',
          comment: 'Production selection saved and sent to Machining',
          percentage: null,
          attachmentUrl: pdfModalUrl,
        };
        const formData = new FormData();
        formData.append(
          'status',
          new Blob([JSON.stringify(statusPayload)], { type: 'application/json' })
        );

        const statusRes = await fetch(`https://api.metaspark.co.in/status/create/${numericId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!statusRes.ok) {
          let msg = 'Failed to update order status to MACHINING';
          try {
            const data = await statusRes.json();
            if (data && data.message) msg = data.message;
          } catch {}
          setToast({ message: msg, type: 'error' });
          return;
        }

        setToast({ message: 'Production selection saved successfully', type: 'success' });
        setPdfModalUrl(null);
        setPdfRows([]);
        setPartsRows([]);
        setMaterialRows([]);
        setSelectedSubnestRowNos([]);
        // also clear any previous three-checkbox state so no stale ticks show
        setDesignerSelectedRowNos([]);
        setProductionSelectedRowNos([]);
        setMachineSelectedRowNos([]);
      } else {
        setToast({ message: 'Failed to save selection', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error saving selection', type: 'error' });
    } finally {
      setIsSendingToMachine(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders
      // Restrict this screen to PRODUCTION or PRODUCTION_READY department orders
      .filter(order => {
        const dept = (order.department || '').toUpperCase();
        return dept === 'PRODUCTION' || dept === 'PRODUCTION_READY';
      })
      // Then apply search and optional local status filter
      .filter(order => {
        const matchesSearch =
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (order.product || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [orders, searchQuery, statusFilter]);

  const statusOptions = ['All', 'In Progress', 'Pending', 'Completed', 'On Hold'];

  const partsRowNoCounts = useMemo(() => {
    const counts = {};
    (partsRows || []).forEach((r) => {
      const k = r?.rowNo;
      if (k === undefined || k === null) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [partsRows]);

  const getPartsSelectionId = (row, idx) => {
    const rn = row?.rowNo;
    if (rn === undefined || rn === null) return String(idx);
    if ((partsRowNoCounts[rn] || 0) > 1) return `${rn}-${idx}`;
    return String(rn);
  };

  return (
    <div className="w-full p-4 sm:p-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Production Line</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track and manage production orders in real-time
            </p>
          </div>
          
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by order ID or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Production orders table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Machine
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDF
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.product}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.assignedTo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.machine || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {pdfMap[order.id] ? (
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={async () => {
                              const url = pdfMap[order.id];
                              if (!url) return;
                              await openPdfModalForAttachment(url, order.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View
                          </button>
                          <a
                            href={pdfMap[order.id]}
                            download
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Download
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-3xl text-gray-300 mb-2">?</div>
                      <p className="font-medium text-gray-500">No Orders Found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        There are no orders matching your current filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pdfModalUrl && (
        <div className="fixed inset-0 z-50">
          {toast.message && (
            <div
              className={`absolute top-4 right-4 z-[60] px-4 py-2 rounded-md text-sm shadow-lg border flex items-center gap-2 ${
                toast.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <span>{toast.message}</span>
              {/* <button
                type="button"
                onClick={() => setToast({ message: '', type: '' })}
                className="ml-2 text-xs font-semibold hover:underline"
              >
                Close
              </button> */}
            </div>
          )}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setPdfModalUrl(null);
              setPdfRows([]);
              setPartsRows([]);
              setMaterialRows([]);
              setDesignerSelectedRowNos([]);
              setProductionSelectedRowNos([]);
              setMachineSelectedRowNos([]);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl h-[85vh] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">PDF Preview & Designer Selection</h3>
                <button
                  type="button"
                  onClick={() => {
                    setPdfModalUrl(null);
                    setPdfRows([]);
                    setPartsRows([]);
                    setMaterialRows([]);
                    setDesignerSelectedRowNos([]);
                    setProductionSelectedRowNos([]);
                    setMachineSelectedRowNos([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 min-h-0 flex">
                <div className="w-1/2 border-r border-gray-200">
                  <PdfRowOverlayViewer
                    pdfUrl={pdfModalUrl}
                    rows={
                      pdfType === 'nesting'
                        ? []
                        : activePdfTab === 'subnest'
                          ? pdfRows
                          : activePdfTab === 'parts'
                            ? partsRows
                            : materialRows
                    }
                    selectedRowIds={pdfType === 'nesting' ? [] : designerSelectedRowNos}
                    onToggleRow={() => {}}
                    initialScale={1.1}
                    showCheckboxes={false}
                  /> 
                </div>
                <div className="w-1/2 flex flex-col">
                  <div className="border-b border-gray-200 flex items-center justify-between px-3 py-2 text-xs">
                    <div className="flex gap-2">
                      {pdfType === 'standard' ? (
                        <>
                          <button
                            type="button"
                            className={activePdfTab === 'subnest' ? 'font-semibold text-indigo-600' : 'text-gray-600'}
                            onClick={() => setActivePdfTab('subnest')}
                          >
                            SubNest
                          </button>
                          <button
                            type="button"
                            className={activePdfTab === 'parts' ? 'font-semibold text-indigo-600' : 'text-gray-600'}
                            onClick={() => setActivePdfTab('parts')}
                          >
                            Parts
                          </button>
                          <button
                            type="button"
                            className={activePdfTab === 'material' ? 'font-semibold text-indigo-600' : 'text-gray-600'}
                            onClick={() => setActivePdfTab('material')}
                          >
                            Material Data
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={activePdfTab === 'results' ? 'font-semibold text-indigo-600' : 'text-gray-600'}
                            onClick={() => setActivePdfTab('results')}
                          >
                            Results
                          </button>
                          <button
                            type="button"
                            className={activePdfTab === 'plate-info' ? 'font-semibold text-indigo-600' : 'text-gray-600'}
                            onClick={() => setActivePdfTab('plate-info')}
                          >
                            Plate Info
                          </button>
                          <button
                            type="button"
                            className={activePdfTab === 'part-info' ? 'font-semibold text-indigo-600' : 'text-gray-600'}
                            onClick={() => setActivePdfTab('part-info')}
                          >
                            Part Info
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-2 text-xs text-gray-900">
                    {(isAnalyzingPdf || isRowsLoading) && (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
                        <p className="text-sm text-gray-600">
                          {isAnalyzingPdf ? 'Detecting PDF type...' : 'Loading PDF data...'}
                        </p>
                      </div>
                    )}

                    {!isAnalyzingPdf && !isRowsLoading && pdfType === 'nesting' && (
                      <>
                        {activePdfTab === 'results' && (
                          <>
                            <div className="mb-2">
                              <div className="text-[11px] font-semibold text-gray-700 mb-1">
                                Select Result (1..15)
                              </div>

                              <div className="flex gap-2 overflow-x-auto pb-2">
                                {Array.from({ length: 15 }, (_, i) => i + 1).map((no) => {
                                  const exists = resultBlocks.some((b) => Number(b?.resultNo) === no);

                                  return (
                                    <button
                                      key={no}
                                      type="button"
                                      disabled={!exists}
                                      onClick={() => exists && setActiveResultNo(no)}
                                      className={`shrink-0 px-3 py-1 rounded-full border text-[11px] font-semibold transition ${
                                        !exists
                                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                          : activeResultNo === no
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      Result {no}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <table className="min-w-full text-xs border border-gray-200">
                              <thead>
                                <tr className="text-left text-gray-700 border-b border-gray-200">
                                  <th className="px-2 py-1">Result</th>
                                  <th className="px-2 py-1">Thumbnail</th>
                                  <th className="px-2 py-1">Material</th>
                                  <th className="px-2 py-1">Thickness</th>
                                  <th className="px-2 py-1">Plate Size</th>
                                  <th className="px-2 py-1">Proc Time</th>

                                  {[
                                    { label: 'D', role: 'DESIGN' },
                                    { label: 'P', role: 'PRODUCTION' },
                                    { label: 'M', role: 'MACHINING' },
                                    { label: 'I', role: 'INSPECTION' },
                                  ].map((x) => (
                                    <th key={x.role} className="px-2 py-1 text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <span>{x.label}</span>
                                        <input
                                          type="checkbox"
                                          checked={isAllSelectedByRole(x.role)}
                                          disabled={!canEditRole(x.role)}
                                          onChange={() => toggleSelectAllByRole(x.role)}
                                        />
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>

                              <tbody className="text-gray-900 divide-y divide-gray-100">
                                {resultBlocks
                                  .slice()
                                  .sort((a, b) => (a?.resultNo || 0) - (b?.resultNo || 0))
                                  .map((block) => {
                                    const id = getNestingResultId(block);
                                    const active = Number(block?.resultNo) === Number(activeResultNo);

                                    const isAssigned = assignedRowKeysSet.has(String(id));

                                    return (
                                      <tr
                                        key={id}
                                        className={`${active ? 'bg-indigo-50' : ''} ${isAssigned ? 'bg-green-100' : ''}`}
                                        onClick={() => setActiveResultNo(block?.resultNo)}
                                      >
                                        <td className="px-2 py-1 font-semibold">{block.resultNo}</td>
                                        <td className="px-2 py-1">
                                          <ThumbnailBox />
                                        </td>
                                        <td className="px-2 py-1">{block.material}</td>
                                        <td className="px-2 py-1">{block.thickness}</td>
                                        <td className="px-2 py-1">{block.plateSize}</td>
                                        <td className="px-2 py-1">{block.planProcessTime}</td>

                                        {['DESIGN', 'PRODUCTION', 'MACHINING', 'INSPECTION'].map((role) => (
                                          <td
                                            key={role}
                                            className="px-2 py-1 text-center"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isCheckedByRole(role, id)}
                                              disabled={!canEditRole(role) || (role === 'PRODUCTION' && isAssigned)}
                                              onChange={() => toggleRoleRow(role, id)}
                                            />
                                            {role === 'PRODUCTION' && isAssigned && (
                                              <div className="text-[10px] font-medium text-green-700 mt-1">Assigned</div>
                                            )}
                                          </td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>

                            <div className="mt-3 border border-gray-200 rounded">
                              <div className="px-2 py-1 text-[11px] font-semibold text-gray-700 border-b border-gray-200 flex items-center justify-between">
                                <span>
                                  Parts List {activeResultNo ? `(Result ${activeResultNo})` : ''}
                                </span>
                                <span className="text-gray-500 font-normal">
                                  {(activeResultBlock?.parts || []).length} Parts Total
                                </span>
                              </div>

                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-left text-gray-700 border-b border-gray-200">
                                    <th className="px-2 py-1">Thumbnail</th>
                                    <th className="px-2 py-1">Part Name</th>
                                    <th className="px-2 py-1">Size</th>
                                    <th className="px-2 py-1 text-center">Count</th>

                                    {[
                                      { label: 'D', role: 'DESIGN' },
                                      { label: 'P', role: 'PRODUCTION' },
                                      { label: 'M', role: 'MACHINING' },
                                      { label: 'I', role: 'INSPECTION' },
                                    ].map((x) => (
                                      <th key={x.role} className="px-2 py-1 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                          <span>{x.label}</span>
                                          <input
                                            type="checkbox"
                                            checked={isAllSelectedByRole(x.role)}
                                            disabled={!canEditRole(x.role)}
                                            onChange={() => toggleSelectAllByRole(x.role)}
                                          />
                                        </div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100 text-gray-900">
                                  {(activeResultBlock?.parts || []).map((p, idx) => {
                                    const rowId = getNestingResultPartId(activeResultNo, p, idx);
                                    const isAssigned = assignedRowKeysSet.has(String(rowId));

                                    return (
                                      <tr key={rowId} className={isAssigned ? 'bg-green-100' : ''}>
                                        <td className="px-2 py-1">
                                          <ThumbnailBox />
                                        </td>
                                        <td className="px-2 py-1 font-medium">{p.partName}</td>
                                        <td className="px-2 py-1 whitespace-nowrap">{p.size}</td>
                                        <td className="px-2 py-1 text-center">{p.count}</td>

                                        {['DESIGN', 'PRODUCTION', 'MACHINING', 'INSPECTION'].map((role) => (
                                          <td
                                            key={role}
                                            className="px-2 py-1 text-center"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isCheckedByRole(role, rowId)}
                                              disabled={!canEditRole(role) || (role === 'PRODUCTION' && isAssigned)}
                                              onChange={() => toggleRoleRow(role, rowId)}
                                            />
                                            {role === 'PRODUCTION' && isAssigned && (
                                              <div className="text-[10px] font-medium text-green-700 mt-1">Assigned</div>
                                            )}
                                          </td>
                                        ))}
                                      </tr>
                                    );
                                  })}

                                  {(activeResultBlock?.parts || []).length === 0 && (
                                    <tr>
                                      <td className="px-2 py-3 text-center text-gray-400" colSpan={8}>
                                        No Parts List found in this Result.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}

                        {pdfType === 'nesting' && activePdfTab === 'plate-info' && (
                          <table className="min-w-full text-xs border border-gray-200">
                            <thead>
                              <tr className="text-left text-gray-700 border-b border-gray-200">
                                <th className="px-2 py-1">Order</th>
                                {/* <th className="px-2 py-1">Part Name</th> */}
                                <th className="px-2 py-1">Thumbnail</th>
                                <th className="px-2 py-1">Size (mm × mm)</th>
                                <th className="px-2 py-1">Parts Count</th>
                                <th className="px-2 py-1">Cut Total Length</th>
                                <th className="px-2 py-1">Move Total Length</th>
                                <th className="px-2 py-1">Plan Process Time</th>
                                <th className="px-2 py-1">Count</th>

                                {[
                                  { label: 'D', role: 'DESIGN' },
                                  { label: 'P', role: 'PRODUCTION' },
                                  { label: 'M', role: 'MACHINING' },
                                  { label: 'I', role: 'INSPECTION' },
                                ].map((x) => (
                                  <th key={x.role} className="px-2 py-1 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <span>{x.label}</span>
                                      <input
                                        type="checkbox"
                                        checked={isAllSelectedByRole(x.role)}
                                        disabled={!canEditRole(x.role)}
                                        onChange={() => toggleSelectAllByRole(x.role)}
                                      />
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            <tbody className="text-gray-900 divide-y divide-gray-100">
                              {plateInfoRows.map((row, idx) => {
                                const id = getNestingPlateId(row);
                                const isAssigned = assignedRowKeysSet.has(String(id));
                                return (
                                  <tr key={id + idx} className={isAssigned ? 'bg-green-100' : ''}>
                                    <td className="px-2 py-1 font-medium">{row.order}</td>
                                    {/* <td className="px-2 py-1">{row.partName}</td> */}
                                    <td className="px-2 py-1">
                                      <ThumbnailBox />
                                    </td>
                                    <td className="px-2 py-1">{row.plateSize || row.size}</td>
                                    <td className="px-2 py-1 text-center">{row.partsCount}</td>
                                    <td className="px-2 py-1 text-center">{row.cutTotalLength}</td>
                                    <td className="px-2 py-1 text-center">{row.moveTotalLength}</td>
                                    <td className="px-2 py-1 text-center">{row.planProcessTime}</td>
                                    <td className="px-2 py-1 text-center">{row.count}</td>

                                    {['DESIGN', 'PRODUCTION', 'MACHINING', 'INSPECTION'].map((role) => (
                                      <td key={role} className="px-2 py-1 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isCheckedByRole(role, id)}
                                          disabled={!canEditRole(role) || (role === 'PRODUCTION' && isAssigned)}
                                          onChange={() => toggleRoleRow(role, id)}
                                        />
                                        {role === 'PRODUCTION' && isAssigned && (
                                          <div className="text-[10px] font-medium text-green-700 mt-1">Assigned</div>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}

                        {pdfType === 'nesting' && activePdfTab === 'part-info' && (
                          <table className="min-w-full text-xs border border-gray-200">
                            <thead>
                              <tr className="text-left text-gray-700 border-b border-gray-200">
                                <th className="px-2 py-1">Order</th>
                                <th className="px-2 py-1">Part Name</th>
                                <th className="px-2 py-1">Thumbnail</th>
                                <th className="px-2 py-1">Size (mm × mm)</th>
                                <th className="px-2 py-1">Parts Count</th>
                                <th className="px-2 py-1">Nest Count</th>
                                <th className="px-2 py-1">Remain Count</th>
                                <th className="px-2 py-1">Processed</th>

                                {[
                                  { label: 'D', role: 'DESIGN' },
                                  { label: 'P', role: 'PRODUCTION' },
                                  { label: 'M', role: 'MACHINING' },
                                  { label: 'I', role: 'INSPECTION' },
                                ].map((x) => (
                                  <th key={x.role} className="px-2 py-1 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <span>{x.label}</span>
                                      <input
                                        type="checkbox"
                                        checked={isAllSelectedByRole(x.role)}
                                        disabled={!canEditRole(x.role)}
                                        onChange={() => toggleSelectAllByRole(x.role)}
                                      />
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            <tbody className="text-gray-900 divide-y divide-gray-100">
                              {partInfoRows.map((row, idx) => {
                                const id = getNestingPartId(row, idx);
                                const isAssigned = assignedRowKeysSet.has(String(id));
                                return (
                                  <tr key={id} className={isAssigned ? 'bg-green-100' : ''}>
                                    <td className="px-2 py-1 font-medium">{row.order}</td>
                                    <td className="px-2 py-1">{row.partName}</td>
                                    <td className="px-2 py-1">
                                      <ThumbnailBox />
                                    </td>
                                    <td className="px-2 py-1">{row.size}</td>
                                    <td className="px-2 py-1 text-center">{row.partsCount}</td>
                                    <td className="px-2 py-1 text-center">{row.nestCount}</td>
                                    <td className="px-2 py-1 text-center">{row.remainCount}</td>
                                    <td className="px-2 py-1 text-center">{row.processed}</td>

                                    {['DESIGN', 'PRODUCTION', 'MACHINING', 'INSPECTION'].map((role) => (
                                      <td key={role} className="px-2 py-1 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isCheckedByRole(role, id)}
                                          disabled={!canEditRole(role) || (role === 'PRODUCTION' && isAssigned)}
                                          onChange={() => toggleRoleRow(role, id)}
                                        />
                                        {role === 'PRODUCTION' && isAssigned && (
                                          <div className="text-[10px] font-medium text-green-700 mt-1">Assigned</div>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </>
                    )}

                    {!isAnalyzingPdf && !isRowsLoading && pdfType === 'standard' && (
                      <>
                        {activePdfTab === 'subnest' && (
                      <table className="min-w-full border border-gray-200">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="px-2 py-1">No.</th>
                            <th className="px-2 py-1">Size X</th>
                            <th className="px-2 py-1">Size Y</th>
                            <th className="px-2 py-1">Material</th>
                            <th className="px-2 py-1">Thk</th>
                            <th className="px-2 py-1">Time / inst.</th>
                            <th className="px-2 py-1">Total time</th>
                            <th className="px-2 py-1">NC file</th>
                            <th className="px-2 py-1">Qty</th>
                            <th className="px-2 py-1">Area (m²)</th>
                            <th className="px-2 py-1">Eff. %</th>
                            <th className="px-2 py-1 text-center">Designer</th>
                            <th className="px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                disabled={userRole !== 'PRODUCTION'}
                                checked={
                                  userRole === 'PRODUCTION' &&
                                  pdfRows.length > 0 &&
                                  pdfRows.every((row) => productionSelectedRowNos.includes(row.rowNo))
                                }
                                onChange={(e) => {
                                  if (userRole !== 'PRODUCTION') return;
                                  const checked = e.target.checked;
                                  const visibleIds = pdfRows.map((row) => row.rowNo);
                                  if (checked) {
                                    setProductionSelectedRowNos((prev) => {
                                      const next = new Set(prev);
                                      visibleIds.forEach((id) => next.add(id));
                                      return Array.from(next);
                                    });
                                  } else {
                                    setProductionSelectedRowNos((prev) =>
                                      prev.filter((id) => !visibleIds.includes(id))
                                    );
                                  }
                                }}
                                className={userRole === 'PRODUCTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                              />
                            </th>
                            <th className="px-2 py-1 text-center">Machine</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pdfRows.map((row) => {
                            const rowKey = String(row.rowNo);
                            const isAssigned = assignedRowKeysSet.has(rowKey);
                            return (
                            <tr key={row.rowNo} className={isAssigned ? 'bg-green-100' : ''}>
                              <td className="px-2 py-1">{row.rowNo}</td>
                              <td className="px-2 py-1">{row.sizeX}</td>
                              <td className="px-2 py-1">{row.sizeY}</td>
                              <td className="px-2 py-1">{row.material}</td>
                              <td className="px-2 py-1">{row.thickness}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.timePerInstance}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.totalTime}</td>
                              <td className="px-2 py-1">{row.ncFile}</td>
                              <td className="px-2 py-1">{row.qty}</td>
                              <td className="px-2 py-1">{row.areaM2}</td>
                              <td className="px-2 py-1">{row.efficiencyPercent}</td>
                                <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={designerSelectedRowNos.includes(row.rowNo)}
                                  disabled={true}
                                  className="cursor-not-allowed opacity-50"
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={productionSelectedRowNos.includes(row.rowNo)}
                                  onChange={(e) => handleProductionCheckboxChange(row.rowNo, e.target.checked)}
                                  disabled={userRole !== 'PRODUCTION' || isAssigned}
                                  className={userRole === 'PRODUCTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                                />
                                {isAssigned && (
                                  <div className="text-[10px] font-medium text-green-700 mt-1">Assigned</div>
                                )}
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={machineSelectedRowNos.includes(row.rowNo)}
                                  disabled={true}
                                  className="cursor-not-allowed opacity-50"
                                />
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                    )}
                        {activePdfTab === 'parts' && (
                      <table className="min-w-full border border-gray-200">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="px-2 py-1">No.</th>
                            <th className="px-2 py-1">Part name</th>
                            <th className="px-2 py-1">Material</th>
                            <th className="px-2 py-1">Thk</th>
                            <th className="px-2 py-1 text-center">Designer</th>
                            <th className="px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                disabled={userRole !== 'PRODUCTION'}
                                checked={
                                  userRole === 'PRODUCTION' &&
                                  partsRows.length > 0 &&
                                  partsRows.every((row, idx) => productionPartsSelectedRowNos.includes(getPartsSelectionId(row, idx)))
                                }
                                onChange={(e) => {
                                  if (userRole !== 'PRODUCTION') return;
                                  const checked = e.target.checked;
                                  const visibleIds = partsRows.map((row, idx) => getPartsSelectionId(row, idx));
                                  if (checked) {
                                    setProductionPartsSelectedRowNos((prev) => {
                                      const next = new Set(prev);
                                      visibleIds.forEach((id) => next.add(id));
                                      return Array.from(next);
                                    });
                                  } else {
                                    setProductionPartsSelectedRowNos((prev) =>
                                      prev.filter((id) => !visibleIds.includes(id))
                                    );
                                  }
                                }}
                                className={userRole === 'PRODUCTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                              />
                            </th>
                            <th className="px-2 py-1 text-center">Machine</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {partsRows.map((row, idx) => {
                            const rowKey = String(getPartsSelectionId(row, idx));
                            const isAssigned = assignedRowKeysSet.has(rowKey);
                            return (
                            <tr key={getPartsSelectionId(row, idx)} className={isAssigned ? 'bg-green-100' : ''}>
                              <td className="px-2 py-1">{idx + 1}</td>
                              <td className="px-2 py-1">{row.partName}</td>
                              <td className="px-2 py-1">{row.material}</td>
                              <td className="px-2 py-1">{row.thickness}</td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={designerPartsSelectedRowNos.includes(getPartsSelectionId(row, idx))}
                                  disabled={true}
                                  className="cursor-not-allowed opacity-50"
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={productionPartsSelectedRowNos.includes(getPartsSelectionId(row, idx))}
                                  onChange={(e) =>
                                    handleProductionPartsCheckboxChange(getPartsSelectionId(row, idx), e.target.checked)
                                  }
                                  disabled={userRole !== 'PRODUCTION' || isAssigned}
                                  className={userRole === 'PRODUCTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                                />
                                {isAssigned && (
                                  <div className="text-[10px] font-medium text-green-700 mt-1">Assigned</div>
                                )}
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={machinePartsSelectedRowNos.includes(getPartsSelectionId(row, idx))}
                                  disabled={true}
                                  className="cursor-not-allowed opacity-50"
                                />
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                    )}
                        {activePdfTab === 'material' && (
                      <table className="min-w-full border border-gray-200">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="px-2 py-1">Material</th>
                            <th className="px-2 py-1">Thk</th>
                            <th className="px-2 py-1">Size X</th>
                            <th className="px-2 py-1">Size Y</th>
                            <th className="px-2 py-1 text-right">Qty</th>
                            <th className="px-2 py-1 text-center">Designer</th>
                            <th className="px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                disabled={userRole !== 'PRODUCTION'}
                                checked={
                                  userRole === 'PRODUCTION' &&
                                  materialRows.length > 0 &&
                                  materialRows.every((_, idx) => productionMaterialSelectedRowNos.includes(idx))
                                }
                                onChange={(e) => {
                                  if (userRole !== 'PRODUCTION') return;
                                  const checked = e.target.checked;
                                  const visibleIds = materialRows.map((_, idx) => idx);
                                  if (checked) {
                                    setProductionMaterialSelectedRowNos((prev) => {
                                      const next = new Set(prev);
                                      visibleIds.forEach((id) => next.add(id));
                                      return Array.from(next);
                                    });
                                  } else {
                                    setProductionMaterialSelectedRowNos((prev) =>
                                      prev.filter((id) => !visibleIds.includes(id))
                                    );
                                  }
                                }}
                                className={userRole === 'PRODUCTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                              />
                            </th>
                            <th className="px-2 py-1 text-center">Machine</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {materialRows.map((row, idx) => {
                            const rowKey = String(idx);
                            const isAssigned = assignedRowKeysSet.has(rowKey);
                            return (
                            <tr key={`${row?.id ?? 'mat'}-${row?.material ?? ''}-${row?.thickness ?? ''}-${row?.sizeX ?? ''}-${row?.sizeY ?? ''}-${idx}`} className={isAssigned ? 'bg-green-100' : ''}>
                              <td className="px-2 py-1">{row.material}</td>
                              <td className="px-2 py-1">{row.thickness}</td>
                              <td className="px-2 py-1">{row.sizeX}</td>
                              <td className="px-2 py-1">{row.sizeY}</td>
                              <td className="px-2 py-1 text-right">{row.sheetQty}</td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={designerMaterialSelectedRowNos.includes(idx)}
                                  disabled={true}
                                  className="cursor-not-allowed opacity-50"
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={productionMaterialSelectedRowNos.includes(idx)}
                                  onChange={(e) => handleProductionMaterialCheckboxChange(idx, e.target.checked)}
                                  disabled={userRole !== 'PRODUCTION' || isAssigned}
                                  className={userRole === 'PRODUCTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                                />
                                {isAssigned && (
                                  <div className="text-[10px] font-medium text-green-700 mt-1">Assigned</div>
                                )}
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={machineMaterialSelectedRowNos.includes(idx)}
                                  disabled={true}
                                  className="cursor-not-allowed opacity-50"
                                />
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                    )}
                      </>
                    )}
                  </div>
                  {!isAnalyzingPdf && !isRowsLoading && pdfType === 'nesting' && (
                    <div className="p-3 border-t border-gray-200 flex gap-2">
                      <button
                        type="button"
                        onClick={saveThreeCheckboxSelectionNesting}
                        className="flex-1 rounded-md bg-indigo-600 text-white text-xs py-2"
                      >
                        Save Selection (Role)
                      </button>
                      {productionSelectedRowIds.length > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            // Show machine employee list directly in the modal
                            setShowResultsMachineList(!showResultsMachineList);
                          }}
                          className="flex-1 rounded-md bg-indigo-600 text-white text-xs py-2"
                        >
                          {showResultsMachineList ? 'Hide Machine List' : 'Select Machine'}
                        </button>
                      )}
                      
                      {/* Machine Employee List - Show when Select Machine is clicked */}
                      {showResultsMachineList && (
                        <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Select Machine Employees
                          </div>
                          <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
                            {machineEmployees.length > 0 ? (
                              machineEmployees.map((employee) => (
                                <label key={employee.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                                  <input
                                    type="checkbox"
                                    checked={selectedEmployees.has(employee.id)}
                                    onChange={() => handleEmployeeSelection(employee.id)}
                                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                                  />
                                  <div className="flex-1">
                                    <div className="text-xs font-medium text-gray-900">{employee.fullName}</div>
                                    <div className="text-xs text-gray-500">{employee.machineName}</div>
                                  </div>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                    employee.machineStatus === 'Active' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {employee.machineStatus || 'Unknown'}
                                  </span>
                                </label>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-gray-500">
                                No machine employees available
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          {selectedEmployees.size > 0 && (
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
                              <span className="text-xs text-gray-700">
                                {selectedEmployees.size} employee(s) selected
                              </span>
                              <button
                                onClick={() => {
                                  // Get current order from PDF modal
                                  const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
                                  if (!current) return;
                                  const [orderId] = current;
                                  const numericId = String(orderId).replace('SF', '');
                                  handleAssignToEmployees(numericId);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                              >
                                Assign Selected
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {pdfType === 'standard' && (
                  <div className="p-3 border-t border-gray-200 flex items-center justify-end gap-3 text-xs relative">
                    {activePdfTab === 'subnest' && (
                      <>
                        <button
                          type="button"
                          disabled={isSendingToMachine || assignedRowKeysSet.size === 0}
                          onClick={() => {
                            const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
                            if (!current) return;
                            const [orderId] = current;
                            handleSendToMachine(orderId);
                          }}
                          className="rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white py-2 px-4"
                        >
                          {isSendingToMachine ? 'Sending to Machine…' : 'Send to Machine'}
                        </button>
                        <button
                          type="button"
                          disabled={productionSelectedRowNos.length === 0}
                          onClick={async () => {
                            // Show machine employee list directly in the modal
                            setShowSubnestMachineList(!showSubnestMachineList);
                          }}
                          className="rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white py-2 px-4"
                        >
                          {showSubnestMachineList ? 'Hide Machine List' : 'Select Machine'}
                        </button>
                        
                        {/* Machine Employee List - Show when Select Machine is clicked */}
                        {showSubnestMachineList && (
                          <div className="absolute bottom-full left-0 right-0 mb-2 p-3 border border-gray-200 rounded-lg bg-white shadow-lg z-10">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              Select Machine Employees
                            </div>
                            <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
                              {machineEmployees.length > 0 ? (
                                machineEmployees.map((employee) => (
                                  <label key={employee.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                                    <input
                                      type="checkbox"
                                      checked={selectedEmployees.has(employee.id)}
                                      onChange={() => handleEmployeeSelection(employee.id)}
                                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                                    />
                                    <div className="flex-1">
                                      <div className="text-xs font-medium text-gray-900">{employee.fullName}</div>
                                      <div className="text-xs text-gray-500">{employee.machineName}</div>
                                    </div>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                      employee.machineStatus === 'Active' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {employee.machineStatus || 'Unknown'}
                                    </span>
                                  </label>
                                ))
                              ) : (
                                <div className="p-3 text-center text-xs text-gray-500">
                                  No machine employees available
                                </div>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            {selectedEmployees.size > 0 && (
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
                                <span className="text-xs text-gray-700">
                                  {selectedEmployees.size} employee(s) selected
                                </span>
                                <button
                                  onClick={() => {
                                    // Get current order from PDF modal
                                    const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
                                    if (!current) return;
                                    const [orderId] = current;
                                    const numericId = String(orderId).replace('SF', '');
                                    handleAssignToEmployees(numericId);
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                                >
                                  Assign Selected
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {activePdfTab === 'parts' && (
                      <>
                        <button
                          type="button"
                          disabled={userRole !== 'PRODUCTION' || productionPartsSelectedRowNos.length === 0}
                          onClick={savePartsSelection}
                          className="rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white py-2 px-4 mr-2"
                        >
                          Save Parts Selection
                        </button>
                        {productionPartsSelectedRowNos.length > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              // Show machine employee list directly in the modal
                              setShowPartsMachineList(!showPartsMachineList);
                            }}
                            className="rounded-md bg-indigo-600 text-white py-2 px-4"
                          >
                            {showPartsMachineList ? 'Hide Machine List' : 'Select Machine'}
                          </button>
                        )}
                        
                        {/* Machine Employee List - Show when Select Machine is clicked */}
                        {showPartsMachineList && (
                          <div className="absolute bottom-full left-0 right-0 mb-2 p-3 border border-gray-200 rounded-lg bg-white shadow-lg z-10">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              Select Machine Employees
                            </div>
                            <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
                              {machineEmployees.length > 0 ? (
                                machineEmployees.map((employee) => (
                                  <label key={employee.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                                    <input
                                      type="checkbox"
                                      checked={selectedEmployees.has(employee.id)}
                                      onChange={() => handleEmployeeSelection(employee.id)}
                                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                                    />
                                    <div className="flex-1">
                                      <div className="text-xs font-medium text-gray-900">{employee.fullName}</div>
                                      <div className="text-xs text-gray-500">{employee.machineName}</div>
                                    </div>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                      employee.machineStatus === 'Active' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {employee.machineStatus || 'Unknown'}
                                    </span>
                                  </label>
                                ))
                              ) : (
                                <div className="p-3 text-center text-xs text-gray-500">
                                  No machine employees available
                                </div>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            {selectedEmployees.size > 0 && (
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
                                <span className="text-xs text-gray-700">
                                  {selectedEmployees.size} employee(s) selected
                                </span>
                                <button
                                  onClick={() => {
                                    // Get current order from PDF modal
                                    const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
                                    if (!current) return;
                                    const [orderId] = current;
                                    const numericId = String(orderId).replace('SF', '');
                                    handleAssignToEmployees(numericId);
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                                >
                                  Assign Selected
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {activePdfTab === 'material' && (
                      <>
                        <button
                          type="button"
                          disabled={userRole !== 'PRODUCTION' || productionMaterialSelectedRowNos.length === 0}
                          onClick={saveMaterialSelection}
                          className="rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white py-2 px-4 mr-2"
                        >
                          Save Material Selection
                        </button>
                        {productionMaterialSelectedRowNos.length > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              // Show machine employee list directly in the modal
                              setShowMaterialMachineList(!showMaterialMachineList);
                            }}
                            className="rounded-md bg-indigo-600 text-white py-2 px-4"
                          >
                            {showMaterialMachineList ? 'Hide Machine List' : 'Select Machine'}
                          </button>
                        )}
                        
                        {/* Machine Employee List - Show when Select Machine is clicked */}
                        {showMaterialMachineList && (
                          <div className="absolute bottom-full left-0 right-0 mb-2 p-3 border border-gray-200 rounded-lg bg-white shadow-lg z-10">
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              Select Machine Employees
                            </div>
                            <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
                              {machineEmployees.length > 0 ? (
                                machineEmployees.map((employee) => (
                                  <label key={employee.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                                    <input
                                      type="checkbox"
                                      checked={selectedEmployees.has(employee.id)}
                                      onChange={() => handleEmployeeSelection(employee.id)}
                                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                                    />
                                    <div className="flex-1">
                                      <div className="text-xs font-medium text-gray-900">{employee.fullName}</div>
                                      <div className="text-xs text-gray-500">{employee.machineName}</div>
                                    </div>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                      employee.machineStatus === 'Active' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {employee.machineStatus || 'Unknown'}
                                    </span>
                                  </label>
                                ))
                              ) : (
                                <div className="p-3 text-center text-xs text-gray-500">
                                  No machine employees available
                                </div>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            {selectedEmployees.size > 0 && (
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
                                <span className="text-xs text-gray-700">
                                  {selectedEmployees.size} employee(s) selected
                                </span>
                                <button
                                  onClick={() => {
                                    // Get current order from PDF modal
                                    const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
                                    if (!current) return;
                                    const [orderId] = current;
                                    const numericId = String(orderId).replace('SF', '');
                                    handleAssignToEmployees(numericId);
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                                >
                                  Assign Selected
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
      )}

      {/* Select Machine Modal */}
      {pdfModalUrl && showSelectMachineModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/10 backdrop-blur-sm"
            onClick={() => setShowSelectMachineModal(false)}
          />
          <div
            className="relative bg-white rounded-lg w-full max-w-md shadow-lg border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Select Machine</h3>
              <button
                type="button"
                onClick={() => setShowSelectMachineModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Machine</label>
                <button
                  type="button"
                  onClick={() => setShowAddMachineModal(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Add Machine
                </button>
              </div>
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">{machinesLoading ? 'Loading machines…' : 'Select a machine'}</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.machineName} ({m.status})
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={
                    isSendingToMachine ||
                    !selectedMachineId ||
                    (pdfType === 'nesting'
                      ? productionSelectedRowIds.length === 0
                      : productionSelectedRowNos.length === 0)
                  }
                  onClick={async () => {
                    const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
                    if (!current) return;
                    const [orderId] = current;
                    const numericId = String(orderId).replace(/^SF/i, '');
                    if (!numericId) return;

                    const selectedIds =
                      pdfType === 'nesting' ? productionSelectedRowIds : productionSelectedRowNos.map(String);

                    const selectedMachine = machines.find((m) => String(m.id) === String(selectedMachineId));
                    const selectedMachineName = selectedMachine?.machineName ?? selectedMachine?.name;

                    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
                    if (!raw) return;
                    const auth = JSON.parse(raw);
                    const token = auth?.token;
                    if (!token) return;

                    try {
                      setIsSendingToMachine(true);
                      // Save three-checkbox selection first
                      await (pdfType === 'nesting'
                        ? saveThreeCheckboxSelectionNesting()
                        : saveThreeCheckboxSelection());
                      
                      // The /machining-selection endpoint already creates status entries
                      
                      // Then send to machining with machine selection
                      console.log('Sending to machine with data:', {
                        selectedRowIds: selectedIds,
                        machineId: selectedMachineId,
                        ...(pdfType === 'nesting' ? { machineName: selectedMachineName } : {}),
                        attachmentUrl: pdfModalUrl,
                      });
                      const res = await fetch(`https://api.metaspark.co.in/pdf/order/${numericId}/machining-selection`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          selectedRowIds: selectedIds,
                          machineId: selectedMachineId,
                          ...(pdfType === 'nesting' ? { machineName: selectedMachineName } : {}),
                          attachmentUrl: pdfModalUrl,
                        }),
                      });

                      let msg = '';
                      let type = '';

                      if (!res.ok) {
                        msg = 'Failed to send to Machine';
                        try {
                          const errorData = await res.json();
                          console.log('Machining selection error:', errorData);
                          if (errorData && errorData.message) msg = errorData.message;
                        } catch {}
                        type = 'error';
                      } else {
                        const responseData = await res.json();
                        console.log('Machining selection success:', responseData);
                        msg = 'Selection sent to Machine successfully.';
                        type = 'success';
                        setShowSelectMachineModal(false);
                      }

                      setToast({ message: msg, type });
                    } finally {
                      setIsSendingToMachine(false);
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs"
                >
                  {isSendingToMachine ? 'Sending to Machine…' : 'Send to Machine'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Machine Modal (nested) */}
      {pdfModalUrl && showSelectMachineModal && showAddMachineModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/10 backdrop-blur-sm"
            onClick={() => setShowAddMachineModal(false)}
          />
          <div
            className="relative bg-white rounded-lg w-full max-w-md shadow-lg border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Add Machine</h3>
              <button
                type="button"
                onClick={() => setShowAddMachineModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <form
              className="p-4 space-y-4 text-sm"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const newMachine = await addMachine({
                    name: addMachineForm.name,
                    status: addMachineForm.status,
                    dateAdded: new Date().toISOString().split('T')[0],
                  });
                  // Refresh / update machines list
                  setMachines((prev) => {
                    const existing = prev || [];
                    // avoid duplicates by id
                    const without = existing.filter((m) => m.id !== newMachine.id);
                    return [...without, newMachine];
                  });
                  setSelectedMachineId(String(newMachine.id));
                  setAddMachineForm({ name: '', status: 'Active' });
                  setShowAddMachineModal(false);
                } catch (err) {
                  console.error('Error adding machine from production screen:', err);
                  alert('Failed to add machine: ' + (err?.message || 'Unknown error'));
                }
              }}
            >
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Machine Name</label>
                <input
                  type="text"
                  value={addMachineForm.name}
                  onChange={(e) => setAddMachineForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={addMachineForm.status}
                  onChange={(e) => setAddMachineForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMachineModal(false)}
                  className="px-3 py-2 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Add Machine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Another Machine Modal */}
      {showAssignAnotherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAssignAnotherModal(false)}
          />
          <div className="relative bg-white rounded-lg w-full max-w-2xl shadow-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Assign Order to Another Machine</h3>
              <button
                onClick={() => setShowAssignAnotherModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Select additional machine employees to assign Order {currentOrderId}:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {machineEmployees
                  .filter(emp => !selectedEmployees.has(emp.id))
                  .map((employee) => (
                    <label key={employee.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(employee.id)}
                        onChange={() => handleEmployeeSelection(employee.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{employee.fullName}</div>
                        <div className="text-sm text-gray-500">{employee.machineName}</div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.machineStatus === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.machineStatus || 'Unknown'}
                      </span>
                    </label>
                  ))}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAssignAnotherModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (currentOrderId && selectedEmployees.size > 0) {
                      handleAssignToEmployees(currentOrderId);
                      setShowAssignAnotherModal(false);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Assign Selected ({selectedEmployees.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
