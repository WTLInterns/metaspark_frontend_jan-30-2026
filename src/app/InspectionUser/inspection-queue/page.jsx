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
    const [pdfRows, setPdfRows] = useState([]);
    const [partsRows, setPartsRows] = useState([]);
    const [materialRows, setMaterialRows] = useState([]);
    const [designerSelectedRowNos, setDesignerSelectedRowNos] = useState([]); // rows selected by Designer (read-only)
    const [productionSelectedRowNos, setProductionSelectedRowNos] = useState([]); // rows selected by Production (read-only)
    const [machineSelectedRowNos, setMachineSelectedRowNos] = useState([]); // rows selected by Machine (read-only)
    const [inspectionSelectedRowNos, setInspectionSelectedRowNos] = useState([]); // local selection by Inspection
    const [activePdfTab, setActivePdfTab] = useState('subnest');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState({ message: '', type: '' });
    const [userRole] = useState('INSPECTION');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = await orderApi.getAllOrders();

                const transformed = (data || []).map((order) => {
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
                    };
                });

                setOrders(transformed);
            } catch {
                setOrders([]);
            }
        };

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

    const filtered = useMemo(() => {
        return orders.filter(order => {
            const dept = (order.department || '').toUpperCase();
            return dept === 'INSPECTION';
        });
    }, [orders]);

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

        try {
            const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setDesignerSelectedRowNos((data.designerSelectedRowIds || []).map(Number));
                setProductionSelectedRowNos((data.productionSelectedRowIds || []).map(Number));
                setMachineSelectedRowNos((data.machineSelectedRowIds || []).map(Number));
                setInspectionSelectedRowNos((data.inspectionSelectedRowIds || []).map(Number));
            }
        } catch (error) {
            console.error('Error fetching three-checkbox selection:', error);
        }
    };

    const handleInspectionCheckboxChange = (rowNo, checked) => {
        setInspectionSelectedRowNos(prev =>
            checked
                ? [...prev, rowNo]
                : prev.filter(n => n !== rowNo)
        );
    };

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
                // After saving inspection checkboxes, move the order to COMPLETED
                const statusPayload = {
                    newStatus: 'COMPLETED',
                    comment: 'Inspection selection saved and order completed',
                    percentage: null,
                    attachmentUrl: pdfModalUrl,
                };
                const formData = new FormData();
                formData.append(
                    'status',
                    new Blob([JSON.stringify(statusPayload)], { type: 'application/json' })
                );

                const statusRes = await fetch(`http://localhost:8080/status/create/${numericId}`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                if (!statusRes.ok) {
                    let msg = 'Failed to update order status to COMPLETED';
                    try {
                        const data = await statusRes.json();
                        if (data && data.message) msg = data.message;
                    } catch {}
                    setToast({ message: msg, type: 'error' });
                    return;
                }
                
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
        } catch (error) {
            setToast({ message: 'Error saving inspection selection', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const openPdfWithSelections = async (orderId) => {
        const url = pdfMap[orderId];
        if (!url) return;
        setPdfModalUrl(url);
        setPdfRows([]);
        setPartsRows([]);
        setMaterialRows([]);
        // Don't reset designer, production, and machine selections when opening
        setInspectionSelectedRowNos([]);
        setActivePdfTab('subnest');

        const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
        if (!raw) return;
        const auth = JSON.parse(raw);
        const token = auth?.token;
        if (!token) return;

        const numericId = String(orderId).replace(/^SF/i, '');
        if (!numericId) return;

        try {
            const baseUrl = `http://localhost:8080/api/pdf/subnest`;
            const attachmentUrl = encodeURIComponent(url);
            const headers = { Authorization: `Bearer ${token}` };

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

            // Fetch three-checkbox selection data
            await fetchThreeCheckboxSelection(orderId);
        } catch {
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PDF Preview + Row Selections Modal */}
            {pdfModalUrl && (
                <div className="fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => {
                            setPdfModalUrl(null);
                            setPdfRows([]);
                            setPartsRows([]);
                            setMaterialRows([]);
                            // Don't reset designer, production, and machine selections
                            setInspectionSelectedRowNos([]);
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
                                        setPdfRows([]);
                                        setPartsRows([]);
                                        setMaterialRows([]);
                                        // Don't reset designer, production, and machine selections
                                        setInspectionSelectedRowNos([]);
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
                                        rows={pdfRows}
                                        selectedRowIds={inspectionSelectedRowNos}
                                        onToggleRow={handleInspectionCheckboxChange}
                                        initialScale={0.9}
                                        showCheckboxes={true}
                                    />
                                </div>
                                <div className="w-1/2 flex flex-col min-h-0">
                                    <div className="border-b border-gray-200 px-3 py-2 flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-xs font-medium">
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
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto p-2 text-xs text-gray-900">
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
                                                        <th className="px-2 py-1 text-center">Inspection</th>
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
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-900 divide-y divide-gray-100">
                                                    {partsRows.map((row) => (
                                                        <tr key={row.rowNo}>
                                                            <td className="px-2 py-1 font-medium">{row.rowNo}</td>
                                                            <td className="px-2 py-1">{row.partName}</td>
                                                            <td className="px-2 py-1">{row.material}</td>
                                                            <td className="px-2 py-1">{row.thickness}</td>
                                                            <td className="px-2 py-1 text-right">{row.requiredQty}</td>
                                                            <td className="px-2 py-1 text-right">{row.placedQty}</td>
                                                            <td className="px-2 py-1 text-right">{row.weightKg}</td>
                                                            <td className="px-2 py-1 whitespace-nowrap">{row.timePerInstance}</td>
                                                            <td className="px-2 py-1 text-right">{row.pierceQty}</td>
                                                            <td className="px-2 py-1 text-right">{row.cuttingLength}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                        {activePdfTab === 'material' && (
                                            <table className="min-w-full text-xs border border-gray-200">
                                                <thead>
                                                    <tr className="text-left text-gray-700 border-b border-gray-200">
                                                        <th className="px-2 py-1">Material</th>
                                                        <th className="px-2 py-1">Thk</th>
                                                        <th className="px-2 py-1">Size X</th>
                                                        <th className="px-2 py-1">Size Y</th>
                                                        <th className="px-2 py-1">Sheet qty.</th>
                                                        <th className="px-2 py-1">Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-900 divide-y divide-gray-100">
                                                    {materialRows.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-2 py-1">{row.material}</td>
                                                            <td className="px-2 py-1">{row.thickness}</td>
                                                            <td className="px-2 py-1">{row.sizeX}</td>
                                                            <td className="px-2 py-1">{row.sizeY}</td>
                                                            <td className="px-2 py-1 text-right">{row.sheetQty}</td>
                                                            <td className="px-2 py-1">{row.notes}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                    <div className="p-3 border-t border-gray-200">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={inspectionSelectedRowNos.length === 0 || isSaving}
                                                onClick={saveInspectionSelection}
                                                className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                                            >
                                                {isSaving ? 'Saving…' : 'Save Inspection Selection'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}