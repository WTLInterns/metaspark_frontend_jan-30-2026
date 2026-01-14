
'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import PdfRowOverlayViewer from '@/components/PdfRowOverlayViewer';
import * as orderApi from '@/app/ProductionUser/orders/api';

export default function DesignQueuePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pdfMap, setPdfMap] = useState({});
  const [pdfModalUrl, setPdfModalUrl] = useState(null);
  const [pdfRows, setPdfRows] = useState([]);
  const [partsRows, setPartsRows] = useState([]);
  const [materialRows, setMaterialRows] = useState([]);
  const [selectedSubnestRowNos, setSelectedSubnestRowNos] = useState([]);
  const [designerSelectedRowNos, setDesignerSelectedRowNos] = useState([]); // rows selected by Designer (read-only)
  const [productionSelectedRowNos, setProductionSelectedRowNos] = useState([]); // rows selected by Production (read-only)
  const [machineSelectedRowNos, setMachineSelectedRowNos] = useState([]); // local selection by Machine
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
  const [machineNameMap, setMachineNameMap] = useState({});
  const [form, setForm] = useState({ customer: '', products: '', custom: '', units: '', material: '', dept: '' });
  const [userRole, setUserRole] = useState('MACHINING');
  const [toast, setToast] = useState({ message: '', type: '' });

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

        const sorted = Array.isArray(orders)
          ? orders.slice().sort((a, b) => (b.orderId || 0) - (a.orderId || 0))
          : [];

        const transformed = sorted.map((order) => {
          // Customer name from customers array (new backend shape) with fallback
          const customerName = order.customers && order.customers.length > 0
            ? (order.customers[0].companyName || order.customers[0].customerName || 'Unknown Customer')
            : 'Unknown Customer';

          // Product text from customProductDetails or first product entry
          const productText = order.customProductDetails ||
            (order.products && order.products.length > 0
              ? `${order.products[0].productCode || ''} ${order.products[0].productName || ''}`.trim() || 'No Product'
              : 'No Product');

          return {
            id: `SF${order.orderId}`,
            customer: customerName,
            products: productText,
            date: order.dateAdded || '',
            status: order.status || 'Machining',
            department: order.department,
          };
        });

        setOrders(transformed);
      } catch (err) {
        console.error('Error fetching machining orders:', err);
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
              console.log(`Order ${numericId} status history:`, history);
              
              // Debug: Show all entries with attachmentUrl
              const pdfEntries = Array.isArray(history) ? history.filter(h => h.attachmentUrl) : [];
              console.log(`Order ${numericId} PDF entries:`, pdfEntries);
              
              // Find the most recent MACHINING status entry
              const machiningEntry = Array.isArray(history)
                ? history
                    .filter((h) => h.newStatus === 'MACHINING')
                    .sort((a, b) => b.id - a.id)[0]
                : null;
              
              // If there's a MACHINING entry, find the most recent PDF URL from any status
              const withPdf = machiningEntry && Array.isArray(history)
                ? history
                    .filter(
                      (h) =>
                        h.attachmentUrl &&
                        h.attachmentUrl.toLowerCase().endsWith('.pdf')
                    )
                    .sort((a, b) => b.id - a.id)[0]
                : null;
                
              console.log(`Found PDF for order ${numericId}:`, withPdf?.attachmentUrl || 'None');
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

        // Also fetch machining selection to get assigned machine name
        const machEntries = await Promise.all(
          orders.map(async (order) => {
            const numericId = String(order.id).replace(/^SF/i, '');
            if (!numericId) return [order.id, null];
            try {
              const selResp = await fetch(`http://localhost:8080/pdf/order/${numericId}/machining-selection`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!selResp.ok) return [order.id, null];
              const selJson = await selResp.json();
              const machineName = selJson && typeof selJson.machineName === 'string' && selJson.machineName.trim() !== ''
                ? selJson.machineName.trim()
                : null;
              return [order.id, machineName];
            } catch {
              return [order.id, null];
            }
          })
        );

        const machineMap = {};
        machEntries.forEach(([id, name]) => {
          if (name) {
            machineMap[id] = name;
          }
        });
        setMachineNameMap(machineMap);
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
      const matchesDepartment =
        dept === 'MACHINING' ||
        dept === 'PRODUCTION' ||
        dept === 'PRODUCTION_READY';
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
        setDesignerMaterialSelectedRowNos((data.designerSelectedRowIds || []).map(Number));
        setProductionMaterialSelectedRowNos((data.productionSelectedRowIds || []).map(Number));
        setMachineMaterialSelectedRowNos((data.machineSelectedRowIds || []).map(Number));
        setInspectionMaterialSelectedRowNos((data.inspectionSelectedRowIds || []).map(Number));
      }
    } catch (error) {
      console.error('Error fetching material selection:', error);
    }
  };

  const handleMachineCheckboxChange = (rowNo, checked) => {
    setMachineSelectedRowNos(prev =>
      checked
        ? [...prev, rowNo]
        : prev.filter(n => n !== rowNo)
    );
  };

  const handleMachinePartsCheckboxChange = (rowNo, checked) => {
    setMachinePartsSelectedRowNos(prev =>
      checked
        ? [...prev, rowNo]
        : prev.filter(n => n !== rowNo)
    );
  };

  const handleMachineMaterialCheckboxChange = (rowNo, checked) => {
    setMachineMaterialSelectedRowNos(prev =>
      checked
        ? [...prev, rowNo]
        : prev.filter(n => n !== rowNo)
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
      setIsSaving(true);
      const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/parts-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          machineSelectedRowIds: machinePartsSelectedRowNos.map(String),
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
      setIsSaving(true);
      const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/material-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          machineSelectedRowIds: machineMaterialSelectedRowNos.map(String),
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
      setIsSaving(true);
      const response = await fetch(`http://localhost:8080/pdf/order/${numericId}/three-checkbox-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          machineSelectedRowIds: machineSelectedRowNos.map(String),
        }),
      });

      if (response.ok) {
        // After saving machine checkboxes, move the order to INSPECTION
        const statusPayload = {
          newStatus: 'INSPECTION',
          comment: 'Machine selection saved and sent to Inspection',
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
          let msg = 'Failed to update order status to INSPECTION';
          try {
            const data = await statusRes.json();
            if (data && data.message) msg = data.message;
          } catch {}
          console.error(msg);
          return;
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Machine Department</h1>
            <p className="text-sm text-gray-600 mt-1">Manage all assigned machining jobs.</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
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
                <th className="py-3 px-4 font-medium">Assign Machine</th>
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
                  <td className="py-4 px-4 text-gray-700 text-sm">
                    {machineNameMap[o.id] || '-'}
                  </td>
                  <td className="py-4 px-4">
                    {pdfMap[o.id] ? (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={async () => {
                            const url = pdfMap[o.id];
                            if (!url) return;
                            setPdfModalUrl(url);
                            setPdfRows([]);
                            setPartsRows([]);
                            setMaterialRows([]);
                            setSelectedSubnestRowNos([]);
                            setDesignerSelectedRowNos([]);
                            setProductionSelectedRowNos([]);
                            setMachineSelectedRowNos([]);
                            setActivePdfTab('subnest');

                            const numericId = String(o.id).replace(/^SF/i, '');
                            const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
                            if (!raw) return;
                            const auth = JSON.parse(raw);
                            const token = auth?.token;
                            if (!token) return;

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
                              await fetchThreeCheckboxSelection(o.id);
                              // Fetch isolated Parts/Material selection data
                              await fetchPartsSelection(o.id);
                              await fetchMaterialSelection(o.id);
                            } catch {
                            }
                          }}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          View
                        </button>
                        <a
                          href={pdfMap[o.id]}
                          download
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  {/* <td className="py-4 px-4">
                    <button 
                      onClick={() => router.push(`/DesignUser/design-queue/${o.id}`)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                    >
                      View Details
                    </button>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              setDesignerSelectedRowNos([]);
              setProductionSelectedRowNos([]);
              setMachineSelectedRowNos([]);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl h-[85vh] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">PDF Preview & Machining Selection</h3>
                <button
                  type="button"
                  onClick={() => {
                    setPdfModalUrl(null);
                    setPdfRows([]);
                    setPartsRows([]);
                    setMaterialRows([]);
                    setSelectedSubnestRowNos([]);
                    setDesignerSelectedRowNos([]);
                    setProductionSelectedRowNos([]);
                    setMachineSelectedRowNos([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-1 min-h-0">
                <div className="w-1/2 border-r border-gray-200">
                  <PdfRowOverlayViewer
                    pdfUrl={pdfModalUrl}
                    rows={pdfRows}
                    selectedRowIds={[...designerSelectedRowNos, ...productionSelectedRowNos, ...machineSelectedRowNos]}
                    onToggleRow={handleMachineCheckboxChange}
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
                            <th className="px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                disabled={userRole !== 'MACHINING'}
                                checked={
                                  userRole === 'MACHINING' &&
                                  pdfRows.length > 0 &&
                                  pdfRows.every((row) => machineSelectedRowNos.includes(row.rowNo))
                                }
                                onChange={(e) => {
                                  if (userRole !== 'MACHINING') return;
                                  const checked = e.target.checked;
                                  const visibleIds = pdfRows.map((row) => row.rowNo);
                                  if (checked) {
                                    setMachineSelectedRowNos((prev) => {
                                      const next = new Set(prev);
                                      visibleIds.forEach((id) => next.add(id));
                                      return Array.from(next);
                                    });
                                  } else {
                                    setMachineSelectedRowNos((prev) =>
                                      prev.filter((id) => !visibleIds.includes(id))
                                    );
                                  }
                                }}
                                className={userRole === 'MACHINING' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
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
                                  onChange={(e) => handleMachineCheckboxChange(row.rowNo, e.target.checked)}
                                  disabled={userRole !== 'MACHINING'}
                                  className={userRole === 'MACHINING' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
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
                            <th className="px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                disabled={userRole !== 'MACHINING'}
                                checked={
                                  userRole === 'MACHINING' &&
                                  partsRows.length > 0 &&
                                  partsRows.every((row, idx) => machinePartsSelectedRowNos.includes(getPartsSelectionId(row, idx)))
                                }
                                onChange={(e) => {
                                  if (userRole !== 'MACHINING') return;
                                  const checked = e.target.checked;
                                  const visibleIds = partsRows.map((row, idx) => getPartsSelectionId(row, idx));
                                  if (checked) {
                                    setMachinePartsSelectedRowNos((prev) => {
                                      const next = new Set(prev);
                                      visibleIds.forEach((id) => next.add(id));
                                      return Array.from(next);
                                    });
                                  } else {
                                    setMachinePartsSelectedRowNos((prev) =>
                                      prev.filter((id) => !visibleIds.includes(id))
                                    );
                                  }
                                }}
                                className={userRole === 'MACHINING' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
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
                                  disabled={true}
                                  className="cursor-not-allowed opacity-50"
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={productionPartsSelectedRowNos.includes(getPartsSelectionId(row, idx))}
                                  disabled={true}
                                  className="cursor-not-allowed opacity-50"
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={machinePartsSelectedRowNos.includes(getPartsSelectionId(row, idx))}
                                  onChange={(e) => handleMachinePartsCheckboxChange(getPartsSelectionId(row, idx), e.target.checked)}
                                  disabled={userRole !== 'MACHINING'}
                                  className={userRole === 'MACHINING' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
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
                            <th className="px-2 py-1 text-center">Designer</th>
                            <th className="px-2 py-1 text-center">Production</th>
                            <th className="px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                disabled={userRole !== 'MACHINING'}
                                checked={
                                  userRole === 'MACHINING' &&
                                  materialRows.length > 0 &&
                                  materialRows.every((_, idx) => machineMaterialSelectedRowNos.includes(idx))
                                }
                                onChange={(e) => {
                                  if (userRole !== 'MACHINING') return;
                                  const checked = e.target.checked;
                                  const visibleIds = materialRows.map((_, idx) => idx);
                                  if (checked) {
                                    setMachineMaterialSelectedRowNos((prev) => {
                                      const next = new Set(prev);
                                      visibleIds.forEach((id) => next.add(id));
                                      return Array.from(next);
                                    });
                                  } else {
                                    setMachineMaterialSelectedRowNos((prev) =>
                                      prev.filter((id) => !visibleIds.includes(id))
                                    );
                                  }
                                }}
                                className={userRole === 'MACHINING' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
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
                                  disabled={true}
                                  className="cursor-not-allowed opacity-50"
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={productionMaterialSelectedRowNos.includes(idx)}
                                  disabled={true}
                                  className="cursor-not-allowed opacity-50"
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={machineMaterialSelectedRowNos.includes(idx)}
                                  onChange={(e) => handleMachineMaterialCheckboxChange(idx, e.target.checked)}
                                  disabled={userRole !== 'MACHINING'}
                                  className={userRole === 'MACHINING' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                                />
                              </td>
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
                        disabled={machineSelectedRowNos.length === 0 || isSaving}
                        onClick={saveThreeCheckboxSelection}
                        className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                      >
                        {isSaving ? 'Saving…' : 'Save Machine Selection'}
                      </button>
                      {activePdfTab === 'parts' && (
                        <button
                          type="button"
                          disabled={userRole !== 'MACHINING' || machinePartsSelectedRowNos.length === 0 || isSaving}
                          onClick={savePartsSelection}
                          className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                        >
                          Save Parts Selection
                        </button>
                      )}
                      {activePdfTab === 'material' && (
                        <button
                          type="button"
                          disabled={userRole !== 'MACHINING' || machineMaterialSelectedRowNos.length === 0 || isSaving}
                          onClick={saveMaterialSelection}
                          className="flex-1 rounded-md bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                        >
                          Save Material Selection
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={machineSelectedRowNos.length === 0 || isSaving}
                        onClick={async () => {
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
                            const res = await fetch(`http://localhost:8080/pdf/order/${numericId}/inspection-selection`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                selectedRowIds: machineSelectedRowNos.map(String),
                              }),
                            });

                            if (!res.ok) {
                              let msg = 'Failed to send to Inspection';
                              try {
                                const data = await res.json();
                                if (data && data.message) msg = data.message;
                              } catch {}
                              setToast({ message: msg, type: 'error' });
                            } else {
                              setToast({ message: 'Selection sent to Inspection successfully.', type: 'success' });
                              setPdfModalUrl(null);
                              setPdfRows([]);
                              setPartsRows([]);
                              setMaterialRows([]);
                              setSelectedSubnestRowNos([]);
                              setDesignerSelectedRowNos([]);
                              setProductionSelectedRowNos([]);
                              setMachineSelectedRowNos([]);
                            }
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        className="flex-1 rounded-md bg-green-600 disabled:bg-gray-300 disabled:text-gray-600 text-white text-xs py-2"
                      >
                        Send to Inspection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
      </main>
    </div>
  );
}
