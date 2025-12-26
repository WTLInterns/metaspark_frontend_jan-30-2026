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

  const [orders, setOrders] = useState([]);
  const [pdfMap, setPdfMap] = useState({});
  const [pdfModalUrl, setPdfModalUrl] = useState(null);
  const [selectedSubnestRowNos, setSelectedSubnestRowNos] = useState([]);
  const [selectedPartsRowNos, setSelectedPartsRowNos] = useState([]);
  const [selectedMaterialRowNos, setSelectedMaterialRowNos] = useState([]);
  // Three-checkbox state: always populated only from backend, never pre-filled locally
  const [designerSelectedRowNos, setDesignerSelectedRowNos] = useState([]);
  const [productionSelectedRowNos, setProductionSelectedRowNos] = useState([]);
  const [machineSelectedRowNos, setMachineSelectedRowNos] = useState([]);
  // rows selected by Machine (read-only)
  const [isSendingToMachine, setIsSendingToMachine] = useState(false);
  const [activePdfTab, setActivePdfTab] = useState('subnest');
  const [toast, setToast] = useState({ message: '', type: '' });
  const [showSelectMachineModal, setShowSelectMachineModal] = useState(false);
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [addMachineForm, setAddMachineForm] = useState({
    name: '',
    status: 'Active',
  });
  const [userRole, setUserRole] = useState('PRODUCTION');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const orders = await orderApi.getAllOrders();

        const transformed = orders.map(order => {
          const product = (order.products && order.products[0]) || {};

          return {
            id: `SF${order.orderId}`,
            product: product.productName || product.productCode || 'Unknown Product',
            quantity: order.units || '',
            status: order.status || 'Production',
            startDate: order.dateAdded || '',
            dueDate: '',
            assignedTo: '',
            department: order.department,
          };
        });

        setOrders(transformed);
      } catch (err) {
        console.error('Error fetching orders for production line:', err);
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

    if (orders.length > 0) {
      fetchPdfInfo();
    } else {
      setPdfMap({});
    }
  }, [orders]);

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
      const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`, {
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

  const handleProductionCheckboxChange = (rowNo, checked) => {
    setProductionSelectedRowNos((prev) =>
      checked ? [...prev, rowNo] : prev.filter((n) => n !== rowNo)
    );
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
      const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          designerSelectedRowIds: designerSelectedRowNos.map(String),
          productionSelectedRowIds: productionSelectedRowNos.map(String),
          machineSelectedRowIds: machineSelectedRowNos.map(String),
        }),
      });

      if (response.ok) {
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {pdfMap[order.id] ? (
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={async () => {
                              const url = pdfMap[order.id];
                              if (!url) return;
                              setPdfModalUrl(url);
                              setPdfRows([]);
                              setPartsRows([]);
                              setMaterialRows([]);
                              setDesignerSelectedRowIds([]);
                              setProductionSelectedRowNos([]);
                              setMachineSelectedRowNos([]);

                              const numericId = String(order.id).replace(/^SF/i, '');
                              const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
                              if (!numericId || !raw) return;
                              try {
                                const auth = JSON.parse(raw);
                                const token = auth?.token;
                                if (!token) return;

                                const attachmentUrl = url;
                                const baseSubnest = `http://localhost:8080/api/pdf/subnest/by-url?attachmentUrl=${encodeURIComponent(attachmentUrl)}`;
                                const baseParts = `http://localhost:8080/api/pdf/subnest/parts/by-url?attachmentUrl=${encodeURIComponent(attachmentUrl)}`;
                                const baseMaterial = `http://localhost:8080/api/pdf/subnest/material-data/by-url?attachmentUrl=${encodeURIComponent(attachmentUrl)}`;

                                const headers = { Authorization: `Bearer ${token}` };

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

                                // Fetch three-checkbox selection data
                                await fetchThreeCheckboxSelection(order.id);
                              } catch {
                              }
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
                    {/* <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-4">
                        View
                      </button>
                      <button className="text-indigo-600 hover:text-indigo-900">
                        Edit
                      </button>
                    </td> */}
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
              setDesignerSelectedRowIds([]);
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
                    setDesignerSelectedRowIds([]);
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
                    rows={[]}
                    selectedRowIds={[]}
                    onToggleRow={() => {}}
                    initialScale={1.1}
                    showCheckboxes={false}
                  />
                </div>
                <div className="w-1/2 flex flex-col">
                  <div className="border-b border-gray-200 flex items-center justify-between px-3 py-2 text-xs">
                    <div className="p-3 border-t border-gray-200 flex items-center justify-between gap-3">
                      {/* <button
                        type="button"
                        className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
                        onClick={() => setPdfModalUrl(null)}
                      >
                        Close
                      </button> */}
                      {/* <button
                        type="button"
                        disabled={isSendingToMachine || productionSelectedRowNos.length === 0}
                        onClick={async () => {
                          const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
                          if (!current) return;
                          const [orderId] = current;
                          const numericId = String(orderId).replace(/^SF/i, '');
                          if (!numericId) return;

                          const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
                          if (!raw) return;
                          const auth = JSON.parse(raw);
                          const token = auth?.token;
                          if (!token) return;

                          try {
                            setIsSendingToMachine(true);
                            await fetch(`http://localhost:8080/pdf/order/${numericId}/machining-selection`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ selectedRowIds: productionSelectedRowNos.map(String) }),
                            });
                          } finally {
                            setIsSendingToMachine(false);
                          }
                        }}
                        className="rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2 px-4"
                      >
                        {isSendingToMachine ? 'Sending to Machine…' : 'Send to Machine'}
                      </button> */}
                    </div>
                    <div className="flex gap-2">
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
                            <th className="px-2 py-1 text-center">Production</th>
                            <th className="px-2 py-1 text-center">Machine</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pdfRows.map((row) => (
                            <tr key={row.rowNo}>
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
                                  disabled={userRole !== 'PRODUCTION'}
                                  className={userRole === 'PRODUCTION' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
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
                            </tr>
                          ))}
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
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {partsRows.map((row) => (
                            <tr key={row.rowNo}>
                              <td className="px-2 py-1">{row.rowNo}</td>
                              <td className="px-2 py-1">{row.partName}</td>
                              <td className="px-2 py-1">{row.material}</td>
                              <td className="px-2 py-1">{row.thickness}</td>
                            </tr>
                          ))}
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
                            <th className="px-2 py-1">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {materialRows.map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-1">{row.material}</td>
                              <td className="px-2 py-1">{row.thickness}</td>
                              <td className="px-2 py-1">{row.sizeX}</td>
                              <td className="px-2 py-1">{row.sizeY}</td>
                              <td className="px-2 py-1">{row.sheetQty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 flex items-center justify-end gap-3 text-xs">
                    <button
                      type="button"
                      disabled={productionSelectedRowNos.length === 0}
                      onClick={async () => {
                        await ensureMachinesLoaded();
                        setShowSelectMachineModal(true);
                      }}
                      className="rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white py-2 px-4"
                    >
                      Select Machine
                    </button>
                  </div>
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
                  disabled={isSendingToMachine || !selectedMachineId || productionSelectedRowNos.length === 0}
                  onClick={async () => {
                    const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
                    if (!current) return;
                    const [orderId] = current;
                    const numericId = String(orderId).replace(/^SF/i, '');
                    if (!numericId) return;

                    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
                    if (!raw) return;
                    const auth = JSON.parse(raw);
                    const token = auth?.token;
                    if (!token) return;

                    try {
                      setIsSendingToMachine(true);
                      // Save three-checkbox selection first
                      await saveThreeCheckboxSelection();
                      
                      // Then send to machining with machine selection
                      const res = await fetch(`http://localhost:8080/pdf/order/${numericId}/machining-selection`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          selectedRowIds: productionSelectedRowNos.map(String),
                          machineId: selectedMachineId,
                        }),
                      });

                      let msg = '';
                      let type = '';

                      if (!res.ok) {
                        msg = 'Failed to send to Machine';
                        try {
                          const data = await res.json();
                          if (data && data.message) msg = data.message;
                        } catch {}
                        type = 'error';
                      } else {
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
    </div>
  );
}
