"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as orderApi from '@/app/ProductionUser/orders/api';
import PdfRowOverlayViewer from '@/components/PdfRowOverlayViewer';

export default function InspectionQueuePage() {
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orders, setOrders] = useState([]);
    const [pdfMap, setPdfMap] = useState({});
    const [pdfModalUrl, setPdfModalUrl] = useState(null);

    const [pdfType, setPdfType] = useState('standard');
    const [isRowsLoading, setIsRowsLoading] = useState(false);
    const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);

    const [pdfRows, setPdfRows] = useState([]);
    const [partsRows, setPartsRows] = useState([]);
    const [materialRows, setMaterialRows] = useState([]);
    const [designerSelectedRowNos, setDesignerSelectedRowNos] = useState([]); // rows selected by Designer (read-only)
    const [productionSelectedRowNos, setProductionSelectedRowNos] = useState([]); // rows selected by Production (read-only)
    const [machineSelectedRowNos, setMachineSelectedRowNos] = useState([]); // rows selected by Machine (read-only)
    const [inspectionSelectedRowNos, setInspectionSelectedRowNos] = useState([]); // local selection by Inspection
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
    const [activePdfTab, setActivePdfTab] = useState('subnest');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState({ message: '', type: '' });
    const [userRole] = useState('INSPECTION');

    // Nesting (PDF-2) state
    const [resultBlocks, setResultBlocks] = useState([]);
    const [plateInfoRows, setPlateInfoRows] = useState([]);
    const [partInfoRows, setPartInfoRows] = useState([]);
    const [activeResultNo, setActiveResultNo] = useState(null);
    const [designerSelectedRowIds, setDesignerSelectedRowIds] = useState([]);
    const [productionSelectedRowIds, setProductionSelectedRowIds] = useState([]);
    const [machineSelectedRowIds, setMachineSelectedRowIds] = useState([]);
    const [inspectionSelectedRowIds, setInspectionSelectedRowIds] = useState([]);

    const getToken = () => {
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
            if (!raw) return null;
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
    const getNestingResultPartId = (resultNo, partRow, idx) => `RESULTPART-${resultNo}-${partRow?.partName}-${idx}`;

    const ThumbnailBox = () => (
        <div className="w-[52px] h-[32px] border border-gray-300 rounded bg-white flex items-center justify-center text-[10px] text-gray-400">
            —
        </div>
    );

    const canEditRole = (role) => {
        if (role === 'INSPECTION') return userRole === 'INSPECTION';
        return false;
    };

    const isCheckedByRole = (role, id) => {
        if (role === 'DESIGN') return designerSelectedRowIds.includes(id);
        if (role === 'PRODUCTION') return productionSelectedRowIds.includes(id);
        if (role === 'MACHINING') return machineSelectedRowIds.includes(id);
        if (role === 'INSPECTION') return inspectionSelectedRowIds.includes(id);
        return false;
    };

    const toggleRoleRow = (role, id) => {
        if (!canEditRole(role)) return;
        if (role === 'INSPECTION') {
            setInspectionSelectedRowIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
        }
    };

    const activeResultBlock = useMemo(() => {
        if (!Array.isArray(resultBlocks) || resultBlocks.length === 0) return null;
        return resultBlocks.find((b) => Number(b?.resultNo) === Number(activeResultNo)) || null;
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

    const mergeSelectAllIds = (current, ids, checked) => {
        const set = new Set(current);
        if (checked) ids.forEach((id) => set.add(id));
        else ids.forEach((id) => set.delete(id));
        return Array.from(set);
    };

    const isAllSelectedByRole = (role) => {
        const ids = [...nestingRowIdsForTab, ...(activePdfTab === 'results' ? nestingPartsListRowIds : [])];
        if (!ids.length) return false;
        if (role === 'DESIGN') return ids.every((id) => designerSelectedRowIds.includes(id));
        if (role === 'PRODUCTION') return ids.every((id) => productionSelectedRowIds.includes(id));
        if (role === 'MACHINING') return ids.every((id) => machineSelectedRowIds.includes(id));
        if (role === 'INSPECTION') return ids.every((id) => inspectionSelectedRowIds.includes(id));
        return false;
    };

    const toggleSelectAllByRole = (role) => {
        if (!canEditRole(role)) return;
        const ids = [...nestingRowIdsForTab, ...(activePdfTab === 'results' ? nestingPartsListRowIds : [])];
        const checked = !isAllSelectedByRole(role);
        if (role === 'INSPECTION') {
            setInspectionSelectedRowIds((prev) => mergeSelectAllIds(prev, ids, checked));
        }
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

        // Nesting flow: always use PDF2 and map active tab to scope
        const scope = (() => {
            if (activePdfTab === 'plate-info') return 'NESTING_PLATE_INFO';
            if (activePdfTab === 'part-info') return 'NESTING_PART_INFO';
            return 'NESTING_RESULTS';
        })();

        try {
            const response = await fetch(
                `http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection?pdfType=PDF2&scope=${encodeURIComponent(scope)}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (!response.ok) return;
            const data = await response.json();

            setDesignerSelectedRowIds(Array.isArray(data?.designerSelectedRowIds) ? data.designerSelectedRowIds.map(String) : []);
            setProductionSelectedRowIds(Array.isArray(data?.productionSelectedRowIds) ? data.productionSelectedRowIds.map(String) : []);
            setMachineSelectedRowIds(Array.isArray(data?.machineSelectedRowIds) ? data.machineSelectedRowIds.map(String) : []);
            setInspectionSelectedRowIds(Array.isArray(data?.inspectionSelectedRowIds) ? data.inspectionSelectedRowIds.map(String) : []);
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

        const payload = {};
        if (userRole === 'INSPECTION') {
            payload.inspectionSelectedRowIds = inspectionSelectedRowIds;
            payload.pdfType = 'PDF2';
            if (activePdfTab === 'plate-info') payload.scope = 'NESTING_PLATE_INFO';
            else if (activePdfTab === 'part-info') payload.scope = 'NESTING_PART_INFO';
            else payload.scope = 'NESTING_RESULTS';
        }

        try {
            setIsSaving(true);
            const res = await fetch(`http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                setToast({ message: 'Failed to save selection', type: 'error' });
                return;
            }
            setToast({ message: 'Selection saved successfully', type: 'success' });
        } catch {
            setToast({ message: 'Failed to save selection', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [requestChangesOpen, setRequestChangesOpen] = useState(false);
    const [detailsHistory, setDetailsHistory] = useState([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [requestTargetStatus, setRequestTargetStatus] = useState('MACHINING');
    const [requestComment, setRequestComment] = useState('');

    const fetchOrders = async () => {
        try {
            const data = await orderApi.getAllOrders();

            const sorted = Array.isArray(data)
                ? data.slice().sort((a, b) => (b.orderId || 0) - (a.orderId || 0))
                : [];

            const transformed = sorted.map((order) => {
                const customer = order.customers && order.customers[0];
                const customerName = customer
                    ? (customer.companyName || customer.customerName || 'Unknown Customer')
                    : 'Unknown Customer';

                const productText = order.customProductDetails ||
                    (order.products && order.products.length > 0
                        ? `${order.products[0].productCode || ''} ${order.products[0].productName || ''}`.trim() || 'No Product'
                        : 'No Product');

                return {
                    id: `SF${order.orderId}`,
                    customer: customerName,
                    products: productText,
                    status: order.status || 'Inspection',
                    department: order.department,
                    date: order.dateAdded || '',
                    raw: order,
                };
            });

            setOrders(transformed);
        } catch {
            setOrders([]);
        }
    };

    useEffect(() => {
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
                    orders.map(async (order) => {
                        const numericId = String(order.id).replace(/^SF/i, '');
                        if (!numericId) return [order.id, null];
                        try {
                            const resp = await fetch(`http://localhost:8080/status/order/${numericId}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            if (!resp.ok) return [order.id, null];
                            const history = await resp.json();

                            // Find the most recent PDF URL from any status
                            const withPdf = Array.isArray(history)
                                ? history
                                    .filter(
                                        (h) =>
                                            h.attachmentUrl &&
                                            h.attachmentUrl.toLowerCase().endsWith('.pdf')
                                    )
                                    .sort((a, b) => b.id - a.id)[0]
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

        if (orders.length > 0) {
            fetchPdfInfo();
        } else {
            setPdfMap({});
        }
    }, [orders]);

    const refreshInspectionQueue = async () => {
        await fetchOrders();
    };

    const fetchStatusHistoryForOrder = async (orderId) => {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
        if (!raw) return [];
        const auth = JSON.parse(raw);
        const token = auth?.token;
        if (!token) return [];

        const numericId = String(orderId).replace(/^SF/i, '');
        if (!numericId) return [];

        try {
            const resp = await fetch(`http://localhost:8080/status/order/${numericId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) return [];
            const history = await resp.json();
            return Array.isArray(history) ? history.slice().sort((a, b) => (b.id || 0) - (a.id || 0)) : [];
        } catch {
            return [];
        }
    };

    const openDetailsModal = async (order) => {
        setSelectedOrder(order);
        setDetailsModalOpen(true);
        setRequestChangesOpen(false);
        setRequestComment('');
        setRequestTargetStatus('MACHINING');
        setDetailsLoading(true);
        try {
            const history = await fetchStatusHistoryForOrder(order.id);
            setDetailsHistory(history);
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetailsModal = () => {
        setDetailsModalOpen(false);
        setRequestChangesOpen(false);
        setSelectedOrder(null);
        setDetailsHistory([]);
        setRequestComment('');
        setRequestTargetStatus('MACHINING');
    };

    const createStatusForOrder = async (orderId, newStatus, comment) => {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
        if (!raw) throw new Error('Not authenticated');
        const auth = JSON.parse(raw);
        const token = auth?.token;
        if (!token) throw new Error('Not authenticated');

        const numericId = String(orderId).replace(/^SF/i, '');
        if (!numericId) throw new Error('Invalid order');

        const statusPayload = {
            newStatus,
            comment: comment || '',
            percentage: null,
            attachmentUrl: pdfMap[orderId] || null,
        };

        const formData = new FormData();
        formData.append('status', new Blob([JSON.stringify(statusPayload)], { type: 'application/json' }));

        const res = await fetch(`http://localhost:8080/status/create/${numericId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        if (!res.ok) {
            let msg = 'Failed to update status';
            try {
                const data = await res.json();
                if (data && data.message) msg = data.message;
            } catch {
            }
            throw new Error(msg);
        }
    };

    const handleApprove = async () => {
        if (!selectedOrder) return;
        try {
            await createStatusForOrder(selectedOrder.id, 'COMPLETED', 'Inspection Approved');
            setToast({ message: 'Inspection Approved', type: 'success' });
            closeDetailsModal();
            await refreshInspectionQueue();
        } catch (e) {
            setToast({ message: e?.message || 'Failed to approve', type: 'error' });
        }
    };

    const handleSaveRequestChanges = async () => {
        if (!selectedOrder) return;
        if (!requestTargetStatus) {
            setToast({ message: 'Select a status', type: 'error' });
            return;
        }
        if (!requestComment || requestComment.trim() === '') {
            setToast({ message: 'Enter issue description', type: 'error' });
            return;
        }
        try {
            await createStatusForOrder(selectedOrder.id, requestTargetStatus, requestComment.trim());
            setToast({ message: 'Changes requested', type: 'success' });
            closeDetailsModal();
            await refreshInspectionQueue();
        } catch (e) {
            setToast({ message: e?.message || 'Failed to request changes', type: 'error' });
        }
    };

    const filtered = useMemo(() => {
        return orders.filter(order => {
            const dept = (order.department || '').toUpperCase();
            return dept === 'INSPECTION';
        });
    }, [orders]);

    const saveInspectionSelection = async () => {
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
            setIsSaving(true);
            const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    inspectionSelectedRowIds: inspectionSelectedRowNos.map(String),
                }),
            });

            if (response.ok) {
                setToast({ message: 'Inspection selection saved successfully', type: 'success' });
                setPdfModalUrl(null);
                setPdfRows([]);
                setPartsRows([]);
                setMaterialRows([]);
                // Don't reset designer, production, and machine selections
                setInspectionSelectedRowNos([]);
            } else {
                setToast({ message: 'Failed to save inspection selection', type: 'error' });
            }
        } catch {
            setToast({ message: 'Error saving inspection selection', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const saveInspectionPartsSelection = async () => {
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
            setIsSaving(true);
            const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/parts-selection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    inspectionSelectedRowIds: inspectionPartsSelectedRowNos.map(String),
                }),
            });

            if (response.ok) {
                setToast({ message: 'Parts selection saved successfully', type: 'success' });
            } else {
                setToast({ message: 'Failed to save parts selection', type: 'error' });
            }
        } catch {
            setToast({ message: 'Error saving parts selection', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const saveInspectionMaterialSelection = async () => {
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
            setIsSaving(true);
            const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/material-selection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    inspectionSelectedRowIds: inspectionMaterialSelectedRowNos.map(String),
                }),
            });

            if (response.ok) {
                setToast({ message: 'Material selection saved successfully', type: 'success' });
            } else {
                setToast({ message: 'Failed to save material selection', type: 'error' });
            }
        } catch {
            setToast({ message: 'Error saving material selection', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const fetchThreeCheckboxSelection = async (orderId) => {
        // Reset only inspection selections; preserve other department selections
        setInspectionSelectedRowNos([]);

        const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
        if (!raw) return;
        const auth = JSON.parse(raw);
        const token = auth?.token;
        if (!token) return;

        const numericId = String(orderId).replace(/^SF/i, '');
        if (!numericId) return;

        // Standard PDF three-checkbox: use PDF1 and map active tab to scope
        const scope = (() => {
            if (activePdfTab === 'parts') return 'PARTS';
            if (activePdfTab === 'material') return 'MATERIAL';
            return 'SUBNEST';
        })();

        try {
            const response = await fetch(
                `http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection?pdfType=PDF1&scope=${encodeURIComponent(scope)}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setDesignerSelectedRowNos(
                    (data.designerSelectedRowIds || [])
                        .map(Number)
                        .filter((n) => !Number.isNaN(n))
                );
                setProductionSelectedRowNos(
                    (data.productionSelectedRowIds || [])
                        .map(Number)
                        .filter((n) => !Number.isNaN(n))
                );
                setMachineSelectedRowNos(
                    (data.machineSelectedRowIds || [])
                        .map(Number)
                        .filter((n) => !Number.isNaN(n))
                );
                setInspectionSelectedRowNos(
                    (data.inspectionSelectedRowIds || [])
                        .map(Number)
                        .filter((n) => !Number.isNaN(n))
                );
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
            const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/parts-selection`, {
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
            const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/material-selection`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setDesignerMaterialSelectedRowNos((data.designerSelectedRowIds || []).map(String));
                setProductionMaterialSelectedRowNos((data.productionSelectedRowIds || []).map(String));
                setMachineMaterialSelectedRowNos((data.machineSelectedRowIds || []).map(String));
                setInspectionMaterialSelectedRowNos((data.inspectionSelectedRowIds || []).map(String));
            }
        } catch (error) {
            console.error('Error fetching material selection:', error);
        }
    };

    const handleInspectionCheckboxChange = (rowNo, checked) => {
        setInspectionSelectedRowNos(prev =>
            checked
                ? [...prev, rowNo]
                : prev.filter(n => n !== rowNo)
        );
    };

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
        if (row?.id !== undefined && row?.id !== null) return String(row.id);
        const rn = row?.rowNo;
        if (rn === undefined || rn === null) return `parts-${idx}`;
        if ((partsRowNoCounts[rn] || 0) > 1) return `${rn}-${idx}`;
        return String(rn);
    };

    const openPdfWithSelections = async (orderId) => {
        const url = pdfMap[orderId];
        if (!url) return;

        setPdfModalUrl(url);
        setPdfType('standard');
        setActivePdfTab('subnest');
        resetNestingPdfStates();

        setPdfRows([]);
        setPartsRows([]);
        setMaterialRows([]);
        setInspectionSelectedRowNos([]);
        setInspectionPartsSelectedRowNos([]);
        setInspectionMaterialSelectedRowNos([]);

        setIsRowsLoading(true);
        setIsAnalyzingPdf(true);

        const token = getToken();
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const plateApi = `http://localhost:8080/api/nesting/plate-info?attachmentUrl=${encodeURIComponent(url)}`;
            const partApi = `http://localhost:8080/api/nesting/part-info?attachmentUrl=${encodeURIComponent(url)}`;
            const resultApi = `http://localhost:8080/api/nesting/results?attachmentUrl=${encodeURIComponent(url)}`;

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

            const baseUrl = `http://localhost:8080/api/pdf/subnest`;
            const attachmentUrl = encodeURIComponent(url);

            const [subnestRes, partsRes, materialRes] = await Promise.all([
                fetch(`${baseUrl}/by-url?attachmentUrl=${attachmentUrl}`, { headers }),
                fetch(`${baseUrl}/parts/by-url?attachmentUrl=${attachmentUrl}`, { headers }),
                fetch(`${baseUrl}/material-data/by-url?attachmentUrl=${attachmentUrl}`, { headers }),
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

            setPdfType('standard');
            setActivePdfTab('subnest');
        } catch {
            setToast({ message: 'Failed to load PDF', type: 'error' });
        } finally {
            setIsAnalyzingPdf(false);
            setIsRowsLoading(false);
        }
    };

    return (
        <div className="p-6">
            {/* Toast notification */}
            {toast.message && (
                <div
                    className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded-md text-sm shadow-lg border flex items-center gap-2 ${
                        toast.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                >
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Inspection Queue</h1>
                <p className="text-gray-600 mt-1">Review and inspect finished products before completion.</p>
            </div>

            {/* Inspection Queue Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Inspection Queue</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product(s)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filtered.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">

                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Link href={`/orders/${order.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                                            {order.id}
                                        </Link>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {order.customer}
                                    </td>

                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <div className="max-w-xs truncate" title={order.products}>
                                            {order.products}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {order.date}
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            {order.status}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {pdfMap[order.id] ? (
                                            <div className="flex items-center gap-2 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => openPdfWithSelections(order.id)}
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

                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button
                                            type="button"
                                            onClick={() => openDetailsModal(order)}
                                            className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inspection Details Modal */}
            {detailsModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDetailsModal} />
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900">Order {selectedOrder.id} Details</h3>
                                <button
                                    type="button"
                                    onClick={closeDetailsModal}
                                    className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="p-4 space-y-5 text-sm text-gray-900">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900 mb-3">Customer Information</div>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-xs text-gray-500">Customer:</div>
                                                <div className="text-sm text-gray-900">{selectedOrder.customer}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500">Order Date:</div>
                                                <div className="text-sm text-gray-900">{selectedOrder.date || '—'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-sm font-semibold text-gray-900 mb-3">Product Details</div>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-xs text-gray-500">Product(s):</div>
                                                <div className="text-sm text-gray-900">{selectedOrder.products}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500">Status:</div>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    {selectedOrder.status || 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-semibold text-gray-900 mb-3">Address Information</div>

                                    <div className="space-y-3">
                                        <div className="border border-gray-200 rounded-md overflow-hidden">
                                            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                                                <div className="text-xs font-semibold text-gray-600 tracking-wide">BILLING ADDRESS</div>
                                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-700">Billing</span>
                                            </div>
                                            <div className="px-4 py-4 text-sm text-gray-700">
                                                {selectedOrder.raw?.billingAddress
                                                    || selectedOrder.raw?.billing_address
                                                    || selectedOrder.raw?.billing
                                                    || '—'}
                                            </div>
                                        </div>

                                        <div className="border border-gray-200 rounded-md overflow-hidden">
                                            <div className="px-4 py-3 bg-blue-50 flex items-center justify-between">
                                                <div className="text-xs font-semibold text-blue-700 tracking-wide">SHIPPING ADDRESS</div>
                                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">Shipping</span>
                                            </div>
                                            <div className="px-4 py-4 text-sm text-gray-700">
                                                {selectedOrder.raw?.shippingAddress
                                                    || selectedOrder.raw?.shipping_address
                                                    || selectedOrder.raw?.shipping
                                                    || '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-4 py-3 border-t border-gray-200 bg-white">
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleApprove}
                                        className="px-5 py-2 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
                                    >
                                        Approve Inspection
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRequestChangesOpen(true)}
                                        className="px-5 py-2 rounded-md bg-gray-200 text-gray-800 text-xs font-semibold hover:bg-gray-300"
                                    >
                                        Request Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Changes Modal */}
            {detailsModalOpen && requestChangesOpen && selectedOrder && (
                <div className="fixed inset-0 z-[70]">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRequestChangesOpen(false)} />
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900">Request Changes</h3>
                                <button
                                    type="button"
                                    onClick={() => setRequestChangesOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="p-4 space-y-4 text-sm">
                                <div>
                                    <div className="text-xs font-medium text-gray-700 mb-1">Send back to</div>
                                    <select
                                        value={requestTargetStatus}
                                        onChange={(e) => setRequestTargetStatus(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="DESIGN">DESIGN</option>
                                        <option value="PRODUCTION">PRODUCTION</option>
                                        <option value="MACHINING">MACHINING</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-gray-700 mb-1">Issue description</div>
                                    <textarea
                                        value={requestComment}
                                        onChange={(e) => setRequestComment(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[120px]"
                                        placeholder="Describe the issue found during inspection..."
                                    />
                                </div>
                            </div>
                            <div className="px-4 py-3 border-t border-gray-200 bg-white">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRequestChangesOpen(false)}
                                        className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveRequestChanges}
                                        className="px-3 py-2 rounded-md bg-red-600 text-white text-xs hover:bg-red-700"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Preview + Row Selections Modal */}
            {pdfModalUrl && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => {
                            setPdfModalUrl(null);
                            setPdfType('standard');
                            setPdfRows([]);
                            setPartsRows([]);
                            setMaterialRows([]);
                            // Don't reset designer, production, and machine selections
                            setInspectionSelectedRowNos([]);
                            setInspectionPartsSelectedRowNos([]);
                            setInspectionMaterialSelectedRowNos([]);
                            resetNestingPdfStates();
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="w-full max-w-6xl h-[85vh] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between p-3 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900">PDF Preview & Inspection Selection</h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPdfModalUrl(null);
                                        setPdfType('standard');
                                        setPdfRows([]);
                                        setPartsRows([]);
                                        setMaterialRows([]);
                                        // Don't reset designer, production, and machine selections
                                        setInspectionSelectedRowNos([]);
                                        setInspectionPartsSelectedRowNos([]);
                                        setInspectionMaterialSelectedRowNos([]);
                                        resetNestingPdfStates();
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
                                        rows={pdfType === 'standard' ? (activePdfTab === 'subnest' ? pdfRows : activePdfTab === 'parts' ? partsRows : materialRows) : []}
                                        selectedRowIds={pdfType === 'standard' ? (activePdfTab === 'subnest' ? inspectionSelectedRowNos : []) : []}
                                        onToggleRow={pdfType === 'standard' ? (activePdfTab === 'subnest' ? handleInspectionCheckboxChange : () => {}) : () => {}}
                                        initialScale={0.9}
                                        showCheckboxes={pdfType === 'standard' && activePdfTab === 'subnest'}
                                    />
                                </div>

                                <div className="w-1/2 flex flex-col min-h-0">
                                    <div className="border-b border-gray-200 px-3 py-2 flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-xs font-medium">
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
                                    {(isAnalyzingPdf || isRowsLoading) && (
                                        <div className="flex flex-col items-center justify-center flex-1">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
                                            <p className="text-sm text-gray-600">
                                                {isAnalyzingPdf ? 'Detecting PDF type...' : 'Loading PDF data...'}
                                            </p>
                                        </div>
                                    )}

                                    {!isAnalyzingPdf && !isRowsLoading && (
                                        <div className="flex-1 overflow-auto p-2 text-xs text-gray-900">
                                        {pdfType === 'nesting' && activePdfTab === 'results' && (
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
                                                            {[{ label: 'D', role: 'DESIGN' }, { label: 'P', role: 'PRODUCTION' }, { label: 'M', role: 'MACHINING' }, { label: 'I', role: 'INSPECTION' }].map((x) => (
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
                                                                return (
                                                                    <tr
                                                                        key={id}
                                                                        className={active ? 'bg-indigo-50' : ''}
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
                                                                                    disabled={!canEditRole(role)}
                                                                                    onChange={() => toggleRoleRow(role, id)}
                                                                                />
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                );
                                                            })}
                                                    </tbody>
                                                </table>

                                                <div className="mt-3 border border-gray-200 rounded">
                                                    <div className="px-2 py-1 text-[11px] font-semibold text-gray-700 border-b border-gray-200 flex items-center justify-between">
                                                        <span>Parts List {activeResultNo ? `(Result ${activeResultNo})` : ''}</span>
                                                        <span className="text-gray-500 font-normal">{(activeResultBlock?.parts || []).length} Parts Total</span>
                                                    </div>

                                                    <table className="min-w-full text-xs">
                                                        <thead>
                                                            <tr className="text-left text-gray-700 border-b border-gray-200">
                                                                <th className="px-2 py-1">Thumbnail</th>
                                                                <th className="px-2 py-1">Part Name</th>
                                                                <th className="px-2 py-1">Size</th>
                                                                <th className="px-2 py-1 text-center">Count</th>
                                                                {[{ label: 'D', role: 'DESIGN' }, { label: 'P', role: 'PRODUCTION' }, { label: 'M', role: 'MACHINING' }, { label: 'I', role: 'INSPECTION' }].map((x) => (
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
                                                                return (
                                                                    <tr key={rowId}>
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
                                                                                    disabled={!canEditRole(role)}
                                                                                    onChange={() => toggleRoleRow(role, rowId)}
                                                                                />
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
                                                        <th className="px-2 py-1">Size (mm  d7 mm)</th>
                                                        <th className="px-2 py-1">Parts Count</th>
                                                        <th className="px-2 py-1">Cut Total Length</th>
                                                        <th className="px-2 py-1">Move Total Length</th>
                                                        <th className="px-2 py-1">Plan Process Time</th>
                                                        <th className="px-2 py-1">Count</th>
                                                        {[{ label: 'D', role: 'DESIGN' }, { label: 'P', role: 'PRODUCTION' }, { label: 'M', role: 'MACHINING' }, { label: 'I', role: 'INSPECTION' }].map((x) => (
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
                                                        return (
                                                            <tr key={id + idx}>
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
                                                                            disabled={!canEditRole(role)}
                                                                            onChange={() => toggleRoleRow(role, id)}
                                                                        />
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
                                                        <th className="px-2 py-1">Size (mm  d7 mm)</th>
                                                        <th className="px-2 py-1">Parts Count</th>
                                                        <th className="px-2 py-1">Nest Count</th>
                                                        <th className="px-2 py-1">Remain Count</th>
                                                        <th className="px-2 py-1">Processed</th>
                                                        {[{ label: 'D', role: 'DESIGN' }, { label: 'P', role: 'PRODUCTION' }, { label: 'M', role: 'MACHINING' }, { label: 'I', role: 'INSPECTION' }].map((x) => (
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
                                                        return (
                                                            <tr key={id}>
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
                                                                            disabled={!canEditRole(role)}
                                                                            onChange={() => toggleRoleRow(role, id)}
                                                                        />
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}

                                        {activePdfTab === 'subnest' && (
                                            <table className="min-w-full text-xs border border-gray-200">
                                                <thead>
                                                    <tr className="text-left text-gray-700 border-b border-gray-200">
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
                                                        <th className="px-2 py-1 text-center">Production</th>
                                                        <th className="px-2 py-1 text-center">Machine</th>
                                                        <th className="px-2 py-1 text-center">
                                                            <input
                                                                type="checkbox"
                                                                disabled={userRole !== 'INSPECTION'}
                                                                checked={
                                                                    userRole === 'INSPECTION' &&
                                                                    pdfRows.length > 0 &&
                                                                    pdfRows.every((row) => inspectionSelectedRowNos.includes(row.rowNo))
                                                                }
                                                                onChange={(e) => {
                                                                    if (userRole !== 'INSPECTION') return;
                                                                    const checked = e.target.checked;
                                                                    const visibleIds = pdfRows.map((row) => row.rowNo);
                                                                    if (checked) {
                                                                        setInspectionSelectedRowNos((prev) => {
                                                                            const next = new Set(prev);
                                                                            visibleIds.forEach((id) => next.add(id));
                                                                            return Array.from(next);
                                                                        });
                                                                    } else {
                                                                        setInspectionSelectedRowNos((prev) =>
                                                                            prev.filter((id) => !visibleIds.includes(id))
                                                                        );
                                                                    }
                                                                }}
                                                                className={userRole === 'INSPECTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                                                            />
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-900 divide-y divide-gray-100">
                                                    {pdfRows.map((row) => (
                                                        <tr key={row.rowNo}>
                                                            <td className="px-2 py-1 font-medium">{row.rowNo}</td>
                                                            <td className="px-2 py-1">{row.sizeX}</td>
                                                            <td className="px-2 py-1">{row.sizeY}</td>
                                                            <td className="px-2 py-1">{row.material}</td>
                                                            <td className="px-2 py-1">{row.thickness}</td>
                                                            <td className="px-2 py-1 whitespace-nowrap">{row.timePerInstance}</td>
                                                            <td className="px-2 py-1 whitespace-nowrap">{row.totalTime}</td>
                                                            <td className="px-2 py-1">{row.ncFile}</td>
                                                            <td className="px-2 py-1 text-right">{row.qty}</td>
                                                            <td className="px-2 py-1 text-right">{row.areaM2}</td>
                                                            <td className="px-2 py-1 text-right">{row.efficiencyPercent}</td>
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
                                                                    disabled={true}
                                                                    className="cursor-not-allowed opacity-50"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={machineSelectedRowNos.includes(row.rowNo)}
                                                                    disabled={true}
                                                                    className="cursor-not-allowed opacity-50"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={inspectionSelectedRowNos.includes(row.rowNo)}
                                                                    onChange={(e) => handleInspectionCheckboxChange(row.rowNo, e.target.checked)}
                                                                    disabled={userRole !== 'INSPECTION'}
                                                                    className={userRole === 'INSPECTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                        {activePdfTab === 'parts' && (
                                            <table className="min-w-full text-xs border border-gray-200">
                                                <thead>
                                                    <tr className="text-left text-gray-700 border-b border-gray-200">
                                                        <th className="px-2 py-1">No.</th>
                                                        <th className="px-2 py-1">Part name</th>
                                                        <th className="px-2 py-1">Material</th>
                                                        <th className="px-2 py-1">Thk</th>
                                                        <th className="px-2 py-1">Req. qty</th>
                                                        <th className="px-2 py-1">Placed qty</th>
                                                        <th className="px-2 py-1">Weight (kg)</th>
                                                        <th className="px-2 py-1">Time / inst.</th>
                                                        <th className="px-2 py-1">Pierce qty</th>
                                                        <th className="px-2 py-1">Cut length</th>
                                                        <th className="px-2 py-1 text-center">Designer</th>
                                                        <th className="px-2 py-1 text-center">Production</th>
                                                        <th className="px-2 py-1 text-center">Machine</th>
                                                        <th className="px-2 py-1 text-center w-[56px] min-w-[56px] whitespace-nowrap">
                                                            <input
                                                                type="checkbox"
                                                                disabled={userRole !== 'INSPECTION'}
                                                                checked={
                                                                    userRole === 'INSPECTION' &&
                                                                    partsRows.length > 0 &&
                                                                    partsRows.every((row, idx) => inspectionPartsSelectedRowNos.includes(getPartsSelectionId(row, idx)))
                                                                }
                                                                onChange={(e) => {
                                                                    if (userRole !== 'INSPECTION') return;
                                                                    const checked = e.target.checked;
                                                                    const visibleIds = partsRows.map((row, idx) => getPartsSelectionId(row, idx));
                                                                    if (checked) {
                                                                        setInspectionPartsSelectedRowNos((prev) => {
                                                                            const next = new Set(prev);
                                                                            visibleIds.forEach((id) => next.add(id));
                                                                            return Array.from(next);
                                                                        });
                                                                    } else {
                                                                        setInspectionPartsSelectedRowNos((prev) =>
                                                                            prev.filter((id) => !visibleIds.includes(id))
                                                                        );
                                                                    }
                                                                }}
                                                                className={userRole === 'INSPECTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                                                            />
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-900 divide-y divide-gray-100">
                                                    {partsRows.map((row, idx) => (
                                                        <tr key={getPartsSelectionId(row, idx)}>
                                                            <td className="px-2 py-1 font-medium">{idx + 1}</td>
                                                            <td className="px-2 py-1">{row.partName}</td>
                                                            <td className="px-2 py-1">{row.material}</td>
                                                            <td className="px-2 py-1">{row.thickness}</td>
                                                            <td className="px-2 py-1 text-right">{row.requiredQty}</td>
                                                            <td className="px-2 py-1 text-right">{row.placedQty}</td>
                                                            <td className="px-2 py-1 text-right">{row.weightKg}</td>
                                                            <td className="px-2 py-1 whitespace-nowrap">{row.timePerInstance}</td>
                                                            <td className="px-2 py-1 text-right">{row.pierceQty}</td>
                                                            <td className="px-2 py-1 text-right">{row.cuttingLength}</td>
                                                            <td className="px-2 py-1 text-center">
                                                                <input type="checkbox" checked={designerPartsSelectedRowNos.includes(getPartsSelectionId(row, idx))} disabled={true} className="cursor-not-allowed opacity-50" />
                                                            </td>
                                                            <td className="px-2 py-1 text-center">
                                                                <input type="checkbox" checked={productionPartsSelectedRowNos.includes(getPartsSelectionId(row, idx))} disabled={true} className="cursor-not-allowed opacity-50" />
                                                            </td>
                                                            <td className="px-2 py-1 text-center">
                                                                <input type="checkbox" checked={machinePartsSelectedRowNos.includes(getPartsSelectionId(row, idx))} disabled={true} className="cursor-not-allowed opacity-50" />
                                                            </td>
                                                            <td className="px-2 py-1 text-center w-[56px] min-w-[56px] whitespace-nowrap">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={inspectionPartsSelectedRowNos.includes(getPartsSelectionId(row, idx))}
                                                                    onChange={(e) => {
                                                                        const checked = e.target.checked;
                                                                        const id = getPartsSelectionId(row, idx);
                                                                        setInspectionPartsSelectedRowNos((prev) =>
                                                                            checked ? [...prev, id] : prev.filter((n) => n !== id)
                                                                        );
                                                                    }}
                                                                    disabled={userRole !== 'INSPECTION'}
                                                                    className={userRole === 'INSPECTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                        {activePdfTab === 'material' && (
                                            <table className="min-w-full text-xs border border-gray-200">
                                                <thead>
                                                    <tr className="text-left text-gray-700 border-b border-gray-200">
                                                        <th className="px-2 py-1 text-right">No.</th>
                                                        <th className="px-2 py-1">Material</th>
                                                        <th className="px-2 py-1">Thk</th>
                                                        <th className="px-2 py-1">Size X</th>
                                                        <th className="px-2 py-1">Size Y</th>
                                                        <th className="px-2 py-1 text-right">Sheet qty.</th>
                                                        <th className="px-2 py-1">Notes</th>
                                                        <th className="px-2 py-1 text-center">Designer</th>
                                                        <th className="px-2 py-1 text-center">Production</th>
                                                        <th className="px-2 py-1 text-center">Machine</th>
                                                        <th className="px-2 py-1 text-center w-[56px] min-w-[56px] whitespace-nowrap">
                                                            <input
                                                                type="checkbox"
                                                                disabled={userRole !== 'INSPECTION'}
                                                                checked={
                                                                    userRole === 'INSPECTION' &&
                                                                    materialRows.length > 0 &&
                                                                    materialRows.every((_, idx) => inspectionMaterialSelectedRowNos.includes(String(idx)))
                                                                }
                                                                onChange={(e) => {
                                                                    if (userRole !== 'INSPECTION') return;
                                                                    const checked = e.target.checked;
                                                                    const visibleIds = materialRows.map((_, idx) => String(idx));
                                                                    if (checked) {
                                                                        setInspectionMaterialSelectedRowNos((prev) => {
                                                                            const next = new Set(prev);
                                                                            visibleIds.forEach((id) => next.add(id));
                                                                            return Array.from(next);
                                                                        });
                                                                    } else {
                                                                        setInspectionMaterialSelectedRowNos((prev) =>
                                                                            prev.filter((id) => !visibleIds.includes(id))
                                                                        );
                                                                    }
                                                                }}
                                                                className={userRole === 'INSPECTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                                                            />
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-900 divide-y divide-gray-100">
                                                    {materialRows.map((row, idx) => (
                                                        <tr key={`${row?.id ?? 'mat'}-${row?.material ?? ''}-${row?.thickness ?? ''}-${row?.sizeX ?? ''}-${row?.sizeY ?? ''}-${idx}`}>
                                                            <td className="px-2 py-1 text-left font-medium">{idx + 1}</td>
                                                            <td className="px-2 py-1">{row.material}</td>
                                                            <td className="px-2 py-1">{row.thickness}</td>
                                                            <td className="px-2 py-1">{row.sizeX}</td>
                                                            <td className="px-2 py-1">{row.sizeY}</td>
                                                            <td className="px-2 py-1 text-center">{row.sheetQty}</td>
                                                            <td className="px-2 py-1">{row.notes}</td>
                                                            <td className="px-2 py-1 text-center">
                                                                <input type="checkbox" checked={designerMaterialSelectedRowNos.includes(String(idx))} disabled={true} className="cursor-not-allowed opacity-50" />
                                                            </td>
                                                            <td className="px-2 py-1 text-center">
                                                                <input type="checkbox" checked={productionMaterialSelectedRowNos.includes(String(idx))} disabled={true} className="cursor-not-allowed opacity-50" />
                                                            </td>
                                                            <td className="px-2 py-1 text-center">
                                                                <input type="checkbox" checked={machineMaterialSelectedRowNos.includes(String(idx))} disabled={true} className="cursor-not-allowed opacity-50" />
                                                            </td>
                                                            <td className="px-2 py-1 text-center w-[56px] min-w-[56px] whitespace-nowrap">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={inspectionMaterialSelectedRowNos.includes(String(idx))}
                                                                    onChange={(e) => {
                                                                        const checked = e.target.checked;
                                                                        const id = String(idx);
                                                                        setInspectionMaterialSelectedRowNos((prev) =>
                                                                            checked ? [...prev, id] : prev.filter((n) => n !== id)
                                                                        );
                                                                    }}
                                                                    disabled={userRole !== 'INSPECTION'}
                                                                    className={userRole === 'INSPECTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {pdfType === 'nesting' && (
                                <div className="p-3 border-t border-gray-200 flex items-center justify-end gap-3 text-xs">
                                    <button
                                        type="button"
                                        disabled={userRole !== 'INSPECTION' || inspectionSelectedRowIds.length === 0 || isSaving}
                                        onClick={saveThreeCheckboxSelectionNesting}
                                        className="rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white py-2 px-4"
                                    >
                                        Save Selection (Role)
                                    </button>
                                </div>
                            )}

                            {pdfType === 'standard' && (
                                <div className="p-3 border-t border-gray-200">
                                    <div className="flex gap-2">
                                        {activePdfTab === 'subnest' && (
                                            <button
                                                type="button"
                                                disabled={inspectionSelectedRowNos.length === 0 || isSaving}
                                                onClick={saveInspectionSelection}
                                                className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                                            >
                                                {isSaving ? 'Saving…' : 'Save Inspection Selection'}
                                            </button>
                                        )}
                                        {activePdfTab === 'parts' && (
                                            <button
                                                type="button"
                                                disabled={inspectionPartsSelectedRowNos.length === 0 || isSaving}
                                                onClick={saveInspectionPartsSelection}
                                                className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                                            >
                                                {isSaving ? 'Saving…' : 'Save Parts Selection'}
                                            </button>
                                        )}
                                        {activePdfTab === 'material' && (
                                            <button
                                                type="button"
                                                disabled={inspectionMaterialSelectedRowNos.length === 0 || isSaving}
                                                onClick={saveInspectionMaterialSelection}
                                                className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                                            >
                                                {isSaving ? 'Saving…' : 'Save Material Selection'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}