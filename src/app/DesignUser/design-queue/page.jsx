"use client";
import { useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as orderApi from '../orders/api';
import PdfRowOverlayViewer from '@/components/PdfRowOverlayViewer';

function DetailsPanel({ order, onClose }) { 
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-50">
      <div className="absolute inset-y-0 right-0 w-full lg:w-4/5 bg-gray-50 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-black">Order #{order.id}</h2>
            <p className="text-sm text-black">Track the progress of the order from inquiry to completion.</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        {/* Progress */}
        <div className="m-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {['Inquiry', 'Design', 'Production', 'Machining', 'Inspection', 'Completed'].map((step, i) => (
              <div key={step} className="flex-1 flex items-center">
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full border ${
                    order.status === step
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 5 && <div className="flex-1 h-px bg-gray-300 mx-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-black">Project Details</h3>
                <button className="text-black hover:text-black">✎</button>
              </div>
              <div className="mb-4">
                <div className="text-xs text-black mb-1">Products</div>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-black">
                  {order.products}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-black mb-1">Customer</div>
                  <div className="text-black">{order.customer}</div>
                </div>
                <div>
                  <div className="text-xs text-black mb-1">Date Created</div>
                  <div className="text-black">{order.date}</div>
                </div>
                <div>
                  <div className="text-xs text-black mb-1">Status</div>
                  <div className="text-black">{order.status}</div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-black mb-3">Update Order Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select className="border border-gray-200 rounded-md px-2 py-2 text-sm">
                  <option>Select next status...</option>
                  {['Inquiry', 'Design', 'Production', 'Machining', 'Inspection', 'Completed'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <div>
                  <input type="file" className="block w-full text-sm text-gray-600" />
                </div>
                <div className="sm:col-span-2">
                  <textarea
                    placeholder="Add comments about the status change..."
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm min-h-[90px] text-black"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md">
                    Update Status
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-black mb-3">Status History</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-black">Order Created</div>
                    <div className="text-xs text-gray-500">{order.date} by System</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DesignQueuePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' }); // type: 'success' | 'error'
  const [orders, setOrders] = useState([]);
  const [pdfMap, setPdfMap] = useState({});
  const [pdfModalUrl, setPdfModalUrl] = useState(null);
  const [pdfRows, setPdfRows] = useState([]);
  const [partsRows, setPartsRows] = useState([]);
  const [materialRows, setMaterialRows] = useState([]);
  const [selectedSubnestRowNos, setSelectedSubnestRowNos] = useState([]);
  const [selectedPartsRowNos, setSelectedPartsRowNos] = useState([]);
  const [selectedMaterialRowNos, setSelectedMaterialRowNos] = useState([]);
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
  const [designerSelectedRowNos, setDesignerSelectedRowNos] = useState([]);
  const [productionSelectedRowNos, setProductionSelectedRowNos] = useState([]);
  const [machineSelectedRowNos, setMachineSelectedRowNos] = useState([]);
  const [isSendingToMachine, setIsSendingToMachine] = useState(false);
  const [userRole, setUserRole] = useState('DESIGN');
  const [activePdfTab, setActivePdfTab] = useState('subnest'); // 'subnest' | 'parts' | 'material'
  const [isRowsLoading, setIsRowsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [form, setForm] = useState({ customer: '', products: '', custom: '', units: '', material: '', dept: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const fileInputRef = useRef(null);
  const [currentPdfOrderId, setCurrentPdfOrderId] = useState(null);

  const createOrder = () => {
    const currentMax = Math.max(
      1000,
      ...orders.map(o => Number(String(o.id).replace(/\D/g, '')) || 0)
    );
    const id = `SF${currentMax + 1}`;
    const productText = form.custom?.trim() ? form.custom.trim() : (form.products || '—');
    const options = { month: 'short', day: '2-digit', year: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    const newOrder = {
      id,
      customer: form.customer || 'Unknown Customer',
      products: productText,
      date: dateStr,
      status: 'Inquiry'
    };
    setOrders(prev => [newOrder, ...prev]);
    setShowCreateModal(false);
    setForm({ customer: '', products: '', custom: '', units: '', material: '', dept: '' });
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const orders = await orderApi.getAllOrders();

        const transformed = orders.map(order => {
          let formattedDate = 'Unknown Date';
          if (order.dateAdded) {
            const [day, month, year] = order.dateAdded.split('-');
            if (day && month && year) {
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const monthIndex = parseInt(month) - 1;
              if (monthIndex >= 0 && monthIndex < 12) {
                formattedDate = `${parseInt(day)} ${monthNames[monthIndex]} ${year}`;
              }
            }
          }

          const customerName = order.customers && order.customers.length > 0
            ? (order.customers[0].companyName || order.customers[0].customerName || 'Unknown Customer')
            : 'Unknown Customer';

          const productText = order.customProductDetails ||
            (order.products && order.products.length > 0
              ? `${order.products[0].productCode} - ${order.products[0].productName}`
              : 'No Product');

          return {
            id: `SF${order.orderId}`,
            customer: customerName,
            products: productText,
            date: formattedDate,
            status: order.status || 'Inquiry',
            department: order.department,
          };
        });

        setOrders(transformed);
      } catch (err) {
        console.error('Error fetching orders for design queue:', err);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    const fetchPdfInfo = async () => {
      try {
        const authDataRaw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
        if (!authDataRaw) {
          return;
        }
        const authData = JSON.parse(authDataRaw);
        const token = authData?.token;
        if (!token) {
          return;
        }

        const entries = await Promise.all(
          orders.map(async (order) => {
            const numericId = String(order.id).replace(/^SF/i, '');
            if (!numericId) {
              return [order.id, null];
            }
            try {
              const response = await fetch(`http://localhost:8080/status/order/${numericId}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (!response.ok) {
                return [order.id, null];
              }
              const history = await response.json();
              // Prefer DESIGN PDF as source
              const designPdf = Array.isArray(history)
                ? history
                    .filter((item) =>
                      item.attachmentUrl &&
                      item.attachmentUrl.toLowerCase().endsWith('.pdf') &&
                      (item.newStatus || '').toUpperCase() === 'DESIGN'
                    )
                    .sort((a, b) => a.id - b.id)
                    .at(-1)
                : null;
              const fallbackPdf = Array.isArray(history)
                ? history.find((item) => item.attachmentUrl && item.attachmentUrl.toLowerCase().endsWith('.pdf'))
                : null;
              const chosen = designPdf || fallbackPdf;
              return [order.id, chosen ? chosen.attachmentUrl : null];
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
    return orders.filter(o => {
      const matchesQuery = `${o.id} ${o.customer}`.toLowerCase().includes(query.toLowerCase());
      const dept = (o.department || '').toUpperCase();
      const matchesDepartment = dept === 'DESIGN';
      return matchesQuery && matchesDepartment;
    });
  }, [orders, query]);

  const badge = (s) => {
    const map = {
      Inquiry: 'bg-blue-100 text-blue-700',
      Design: 'bg-purple-100 text-purple-700',
      Machining: 'bg-yellow-100 text-yellow-800',
      Inspection: 'bg-indigo-100 text-indigo-700',
    };
    return map[s] || 'bg-gray-100 text-gray-700';
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
    const rn = row?.rowNo;
    if (rn === undefined || rn === null) return String(idx);
    if ((partsRowNoCounts[rn] || 0) > 1) return `${rn}-${idx}`;
    return String(rn);
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

  const savePartsSelection = async () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return;
    const auth = JSON.parse(raw);
    const token = auth?.token;
    if (!token) return;

    const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
    const orderId = current ? current[0] : currentPdfOrderId;
    if (!orderId) return;

    const numericId = String(orderId).replace(/^SF/i, '');
    if (!numericId) return;

    try {
      const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/parts-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          designerSelectedRowIds: designerPartsSelectedRowNos,
        }),
      });

      if (response.ok) {
        setToast({ message: 'Parts selection saved successfully', type: 'success' });
      } else {
        setToast({ message: 'Failed to save parts selection', type: 'error' });
      }
    } catch {
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
    const orderId = current ? current[0] : currentPdfOrderId;
    if (!orderId) return;

    const numericId = String(orderId).replace(/^SF/i, '');
    if (!numericId) return;

    try {
      const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/material-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          designerSelectedRowIds: designerMaterialSelectedRowNos,
        }),
      });

      if (response.ok) {
        setToast({ message: 'Material selection saved successfully', type: 'success' });
      } else {
        setToast({ message: 'Failed to save material selection', type: 'error' });
      }
    } catch {
      setToast({ message: 'Error saving material selection', type: 'error' });
    }
  };

  const openPdfModalForAttachment = async (attachmentUrl, orderId) => {
    setPdfModalUrl(attachmentUrl);
    setCurrentPdfOrderId(orderId || null);

    setPdfRows([]);
    setPartsRows([]);
    setMaterialRows([]);
    setSelectedSubnestRowNos([]);
    setSelectedPartsRowNos([]);
    setSelectedMaterialRowNos([]);
    setDesignerPartsSelectedRowNos([]);
    setDesignerMaterialSelectedRowNos([]);

    setIsRowsLoading(true);

    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return;
    try {
      const auth = JSON.parse(raw);
      const token = auth?.token;
      if (!token) return;

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

      if (orderId) {
        await fetchPartsSelection(orderId);
        await fetchMaterialSelection(orderId);
      }
    } finally {
      setIsRowsLoading(false);
    }
  };

  const handleUploadClick = (orderId) => {
    setCurrentPdfOrderId(orderId || null);
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
    if (!raw) return;
    const auth = JSON.parse(raw);
    const token = auth?.token;
    if (!token) return;

    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch('http://localhost:8080/status/upload-pdf', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      return;
    }

    const uploadData = await uploadResponse.json();
    const uploadedUrl = uploadData?.attachmentUrl || uploadData?.url;
    if (!uploadedUrl) return;

    await openPdfModalForAttachment(uploadedUrl, currentPdfOrderId);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Design Department</h1>
            <p className="text-sm text-gray-600 mt-1">Manage orders in the inquiry and design phase.</p>
          </div>

          {toast.message && (
            <div
              className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded-md text-sm shadow-lg border flex items-center gap-2 ${
                toast.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => setToast({ message: '', type: '' })}
                className="ml-2 text-xs font-semibold hover:underline"
              >
                Close
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by Order ID or Customer..."
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-3 px-4 font-medium">Order ID</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Product(s)</th>
                <th className="py-3 px-4 font-medium">Date Created</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">PDF</th>
                {/* <th className="py-3 px-4 font-medium">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="py-4 px-4">
                    <Link href={`/orders/${o.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">{o.id}</Link>
                  </td>
                  <td className="py-4 px-4 text-gray-900 font-medium">{o.customer}</td>
                  <td className="py-4 px-4 text-gray-600">{o.products}</td>
                  <td className="py-4 px-4 text-gray-700">{o.date}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge(o.status)}`}>{o.status}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-xs">
                      {pdfMap[o.id] && (
                        <button
                          type="button"
                          onClick={async () => {
                            setCurrentPdfOrderId(o.id);
                            await openPdfModalForAttachment(pdfMap[o.id], o.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          View
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUploadClick(o.id)}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Upload
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pdfModalUrl && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setPdfModalUrl(null);
                setPdfRows([]);
                setPartsRows([]);
                setMaterialRows([]);
                setSelectedSubnestRowNos([]);
                setSelectedPartsRowNos([]);
                setSelectedMaterialRowNos([]);
                setDesignerPartsSelectedRowNos([]);
                setDesignerMaterialSelectedRowNos([]);
              }}
            />

            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-6xl h-[85vh] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">PDF Preview & Row Selection</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfModalUrl(null);
                      setPdfRows([]);
                      setPartsRows([]);
                      setMaterialRows([]);
                      setSelectedSubnestRowNos([]);
                      setSelectedPartsRowNos([]);
                      setSelectedMaterialRowNos([]);
                      setDesignerPartsSelectedRowNos([]);
                      setDesignerMaterialSelectedRowNos([]);
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
                      showCheckboxes={false}
                    />
                  </div>
                  <div className="w-1/2 flex flex-col">
                    <div className="border-b border-gray-200 flex items-center justify-between px-3 py-2 text-xs">
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
                    <div className="flex-1 overflow-auto p-2 text-xs">
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
                              <th className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={
                                    pdfRows.length > 0 &&
                                    pdfRows.every((row) => selectedSubnestRowNos.includes(row.rowNo))
                                  }
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const visibleIds = pdfRows.map((row) => row.rowNo);
                                    if (checked) {
                                      setSelectedSubnestRowNos((prev) => {
                                        const next = new Set(prev);
                                        visibleIds.forEach((id) => next.add(id));
                                        return Array.from(next);
                                      });
                                    } else {
                                      setSelectedSubnestRowNos((prev) =>
                                        prev.filter((id) => !visibleIds.includes(id))
                                      );
                                    }
                                  }}
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
                                    checked={selectedSubnestRowNos.includes(row.rowNo)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setSelectedSubnestRowNos((prev) =>
                                        checked
                                          ? [...prev, row.rowNo]
                                          : prev.filter((n) => n !== row.rowNo)
                                      );
                                    }}
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
                              <th className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  disabled={userRole !== 'DESIGN'}
                                  checked={
                                    userRole === 'DESIGN' &&
                                    partsRows.length > 0 &&
                                    partsRows.every((row, idx) => designerPartsSelectedRowNos.includes(getPartsSelectionId(row, idx)))
                                  }
                                  onChange={(e) => {
                                    if (userRole !== 'DESIGN') return;
                                    const checked = e.target.checked;
                                    const visibleIds = partsRows.map((row, idx) => getPartsSelectionId(row, idx));
                                    if (checked) {
                                      setDesignerPartsSelectedRowNos((prev) => {
                                        const next = new Set(prev);
                                        visibleIds.forEach((id) => next.add(id));

                                        return Array.from(next);
                                      });
                                    } else {
                                      setDesignerPartsSelectedRowNos((prev) =>
                                        prev.filter((id) => !visibleIds.includes(id))
                                      );
                                    }
                                  }}
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
                                  <input
                                    type="checkbox"
                                    checked={designerPartsSelectedRowNos.includes(getPartsSelectionId(row, idx))}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const id = getPartsSelectionId(row, idx);
                                      setDesignerPartsSelectedRowNos((prev) =>
                                        checked
                                          ? [...prev, id]
                                          : prev.filter((n) => n !== id)
                                      );
                                    }}
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
                              <th className="px-2 py-1">Material</th>
                              <th className="px-2 py-1">Thk</th>
                              <th className="px-2 py-1">Size X</th>
                              <th className="px-2 py-1">Size Y</th>
                              <th className="px-2 py-1 text-right">Sheet qty.</th>
                              <th className="px-2 py-1">Notes</th>
                              <th className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  disabled={userRole !== 'DESIGN'}
                                  checked={
                                    userRole === 'DESIGN' &&
                                    materialRows.length > 0 &&
                                    materialRows.every((_, idx) => designerMaterialSelectedRowNos.includes(idx))
                                  }
                                  onChange={(e) => {
                                    if (userRole !== 'DESIGN') return;
                                    const checked = e.target.checked;
                                    const visibleIds = materialRows.map((_, idx) => idx);
                                    if (checked) {
                                      setDesignerMaterialSelectedRowNos((prev) => {
                                        const next = new Set(prev);
                                        visibleIds.forEach((id) => next.add(id));
                                        return Array.from(next);
                                      });
                                    } else {
                                      setDesignerMaterialSelectedRowNos((prev) =>
                                        prev.filter((id) => !visibleIds.includes(id))
                                      );
                                    }
                                  }}
                                />
                              </th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-900 divide-y divide-gray-100">
                            {materialRows.map((row, idx) => (
                              <tr key={`${row?.id ?? 'mat'}-${row?.material ?? ''}-${row?.thickness ?? ''}-${row?.sizeX ?? ''}-${row?.sizeY ?? ''}-${idx}`}>
                                <td className="px-2 py-1">{row.material}</td>
                                <td className="px-2 py-1">{row.thickness}</td>
                                <td className="px-2 py-1">{row.sizeX}</td>
                                <td className="px-2 py-1">{row.sizeY}</td>
                                <td className="px-2 py-1 text-right">{row.sheetQty}</td>
                                <td className="px-2 py-1">{row.notes}</td>
                                <td className="px-2 py-1 text-center">
                                  <input
                                    type="checkbox"
                                    checked={designerMaterialSelectedRowNos.includes(idx)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setDesignerMaterialSelectedRowNos((prev) =>
                                        checked
                                          ? [...prev, idx]
                                          : prev.filter((n) => n !== idx)
                                      );
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-200">
                  {(activePdfTab === 'parts' || activePdfTab === 'material') && (
                    <div className="flex gap-2 mb-2">
                      {activePdfTab === 'parts' && (
                        <button
                          type="button"
                          disabled={userRole !== 'DESIGN' || designerPartsSelectedRowNos.length === 0 || isGenerating}
                          onClick={savePartsSelection}
                          className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                        >
                          Save Parts Selection
                        </button>
                      )}
                      {activePdfTab === 'material' && (
                        <button
                          type="button"
                          disabled={userRole !== 'DESIGN' || designerMaterialSelectedRowNos.length === 0 || isGenerating}
                          onClick={saveMaterialSelection}
                          className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                        >
                          Save Material Selection
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={selectedSubnestRowNos.length === 0 || isGenerating}
                    onClick={async () => {
                      if (selectedSubnestRowNos.length === 0) return;
                      const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
                      if (!raw) return;
                      const auth = JSON.parse(raw);
                      const token = auth?.token;
                      if (!token) return;

                      let orderId = null;
                      const current = Object.entries(pdfMap).find(([, url]) => url === pdfModalUrl);
                      if (current) {
                        orderId = current[0];
                      } else if (currentPdfOrderId) {
                        orderId = currentPdfOrderId;
                      }
                      if (!orderId) return;

                      const numericId = String(orderId).replace(/^SF/i, '');
                      if (!numericId) return;

                      try {
                        setIsGenerating(true);
                        // 1) Persist Designer checkbox selection only
                        const selectedItems = (pdfRows || [])
                          .filter((row) => selectedSubnestRowNos.includes(row.rowNo))
                          .map((row) => ({
                            rowNo: row.rowNo,
                            ncFile: row.ncFile,
                            material: row.material,
                            thickness: row.thickness,
                            sizeX: row.sizeX,
                            sizeY: row.sizeY,
                            quantity: row.qty,
                            area: row.areaM2,
                            time: row.totalTime,
                          }));

                        const selRes = await fetch(`http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            designerSelectedRowIds: selectedSubnestRowNos.map(String),
                            selectedRowIds: selectedSubnestRowNos,
                            selectedItems,
                          }),
                        });

                        if (!selRes.ok) {
                          let msg = 'Failed to save selection';
                          try {
                            const data = await selRes.json();
                            if (data && data.message) msg = data.message;
                          } catch {}
                          setToast({ message: msg, type: 'error' });
                          return;
                        }

                        // 2) Move order from DESIGN to PRODUCTION via status API
                        const statusPayload = {
                          newStatus: 'PRODUCTION',
                          comment: 'Design selection saved and sent to Production',
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
                          let msg = 'Failed to update order status to PRODUCTION';
                          try {
                            const data = await statusRes.json();
                            if (data && data.message) msg = data.message;
                          } catch {}
                          setToast({ message: msg, type: 'error' });
                          return;
                        }

                        setToast({ message: 'Selection saved and sent to Production successfully.', type: 'success' });
                        setPdfModalUrl(null);
                        setPdfRows([]);
                        setPartsRows([]);
                        setMaterialRows([]);
                        setSelectedSubnestRowNos([]);
                        setSelectedPartsRowNos([]);
                        setSelectedMaterialRowNos([]);
                      } finally {
                        setIsGenerating(false);
                      }
                    }}
                    className="w-full rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                  >
                    {isGenerating ? 'Saving…' : 'Save & Send to Production'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {showCreateModal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-gray-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-black">Create New Order</h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-black">×</button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Customer</label>
                    <select value={form.customer} onChange={(e)=>setForm(f=>({...f, customer:e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black">
                      <option value="">Select Customer...</option>
                      <option value="Tyrell Corporation">Tyrell Corporation</option>
                      <option value="Acme Corp">Acme Corp</option>
                      <option value="Wayne Tech">Wayne Tech</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Products</label>
                    <select value={form.products} onChange={(e)=>setForm(f=>({...f, products:e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black">
                      <option value="">Select Products...</option>
                      <option value="Custom brackets">Custom brackets</option>
                      <option value="Titanium shafts">Titanium shafts</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Or Enter Custom Product Details</label>
                    <textarea value={form.custom} onChange={(e)=>setForm(f=>({...f, custom:e.target.value}))} placeholder="For custom, one-off products, describe them here..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[90px] text-black" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Units</label>
                      <input value={form.units} onChange={(e)=>setForm(f=>({...f, units:e.target.value}))} type="number" placeholder="e.g. 500" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Material</label>
                      <input value={form.material} onChange={(e)=>setForm(f=>({...f, material:e.target.value}))} type="text" placeholder="e.g. Stainless Steel 316" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Assign to Department</label>
                    <select value={form.dept} onChange={(e)=>setForm(f=>({...f, dept:e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black">
                      <option value="">Select initial department...</option>
                      <option value="Design">Design</option>
                      <option value="Production">Production</option>
                      <option value="Machining">Machining</option>
                      <option value="Inspection">Inspection</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
                  <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-md border border-gray-300 text-black">Cancel</button>
                  <button onClick={createOrder} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white">Create Order</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <DetailsPanel 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </>
  );
}