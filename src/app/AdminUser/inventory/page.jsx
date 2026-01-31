'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiPlusCircle, FiEdit, FiTrash2 } from 'react-icons/fi';
import { getInventoryDashboard, createInwardEntry, createOutwardEntry, downloadInventoryReport, getInventoryRemark, updateInwardEntry, deleteInwardEntry, updateOutwardEntry, deleteOutwardEntry, searchCustomers } from './inventoryService';

const formatDate = (dateTime) => {
  if (!dateTime) return '';
  const d = new Date(dateTime);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateTime) => {
  if (!dateTime) return '';
  const d = new Date(dateTime);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ latestInward: [], latestOutward: [], totalInventory: [] });

  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showOutwardModal, setShowOutwardModal] = useState(false);

  const [inwardForm, setInwardForm] = useState({
    supplier: '',
    materialName: '',
    sheetSize: '',
    thickness: '',
    quantity: '',
    location: '',
    remarkUnique: '',
  });

  const [outwardForm, setOutwardForm] = useState({
    customer: '',
    materialId: '',
    quantity: '',
    remarkUnique: '',
  });

  const [submittingInward, setSubmittingInward] = useState(false);
  const [submittingOutward, setSubmittingOutward] = useState(false);

  const [editingInwardId, setEditingInwardId] = useState(null);
  const [editingOutwardId, setEditingOutwardId] = useState(null);

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [customerSearchTimeout, setCustomerSearchTimeout] = useState(null);

  const [outwardSearch, setOutwardSearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await getInventoryDashboard();
      setData({
        latestInward: res.latestInward || [],
        latestOutward: res.latestOutward || [],
        totalInventory: res.totalInventory || [],
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to load inventory dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const openInwardModal = async () => {
    try {
      const remark = await getInventoryRemark('INW');
      setEditingInwardId(null);
      setInwardForm({
        supplier: '',
        materialName: '',
        sheetSize: '',
        thickness: '',
        quantity: '',
        location: '',
        remarkUnique: remark,
      });
      setShowInwardModal(true);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to generate remark');
    }
  };

  const openOutwardModal = async () => {
    try {
      const remark = await getInventoryRemark('OUT');
      setEditingOutwardId(null);
      setOutwardForm({
        customer: '',
        materialId: '',
        quantity: '',
        remarkUnique: remark,
      });
      setShowOutwardModal(true);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to generate remark');
    }
  };

  const handleInwardSubmit = async (e) => {
    e.preventDefault();
    if (!inwardForm.supplier || !inwardForm.materialName || !inwardForm.sheetSize || !inwardForm.thickness || !inwardForm.quantity || !inwardForm.location) {
      toast.error('Please fill all fields');
      return;
    }

    const qty = Number(inwardForm.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    setSubmittingInward(true);
    try {
      const payload = {
        supplier: inwardForm.supplier,
        materialName: inwardForm.materialName,
        sheetSize: inwardForm.sheetSize,
        thickness: inwardForm.thickness,
        quantity: qty,
        location: inwardForm.location,
        remarkUnique: inwardForm.remarkUnique,
      };

      if (editingInwardId) {
        await updateInwardEntry(editingInwardId, payload);
        toast.success('Inward entry updated');
      } else {
        await createInwardEntry(payload);
        toast.success('Inward entry added');
      }
      setShowInwardModal(false);
      setInwardForm({ supplier: '', materialName: '', sheetSize: '', thickness: '', quantity: '', location: '', remarkUnique: '' });
      await loadDashboard();
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to add inward entry');
    } finally {
      setSubmittingInward(false);
    }
  };

  const handleOutwardSubmit = async (e) => {
    e.preventDefault();
    if (!outwardForm.customer || !outwardForm.materialId || !outwardForm.quantity) {
      toast.error('Please fill all fields');
      return;
    }

    const qty = Number(outwardForm.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    setSubmittingOutward(true);
    try {
      const available = selectedOutwardMaterial ? selectedOutwardMaterial.quantity || 0 : 0;
      if (qty > available) {
        toast.error(`Quantity cannot exceed available stock (${available})`);
        setSubmittingOutward(false);
        return;
      }
      const payload = {
        customer: outwardForm.customer,
        materialId: Number(outwardForm.materialId),
        quantity: qty,
        remarkUnique: outwardForm.remarkUnique,
      };

      if (editingOutwardId) {
        await updateOutwardEntry(editingOutwardId, payload);
        toast.success('Outward entry updated');
      } else {
        await createOutwardEntry(payload);
        toast.success('Outward entry added');
      }
      setShowOutwardModal(false);
      setOutwardForm({ customer: '', materialId: '', quantity: '', remarkUnique: '' });
      await loadDashboard();
    } catch (e) {
      console.error(e);
      const msg = e.message || 'Failed to add outward entry';
      toast.error(msg);
    } finally {
      setSubmittingOutward(false);
    }
  };

  const selectedOutwardMaterial = data.totalInventory.find(m => String(m.id) === String(outwardForm.materialId));

  const filteredOutward = (data.latestOutward || []).filter((row) => {
    const q = outwardSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      String(row.customer || '').toLowerCase().includes(q) ||
      String(row.material || row.materialName || '').toLowerCase().includes(q) ||
      String(row.size || row.sheetSize || '').toLowerCase().includes(q) ||
      String(row.thickness || '').toLowerCase().includes(q) ||
      String(row.remark || row.remarkUnique || '').toLowerCase().includes(q) ||
      String(row.quantity || '').toLowerCase().includes(q) ||
      String(row.date || '').toLowerCase().includes(q)
    );
  });

  const filteredInventory = (data.totalInventory || []).filter((row) => {
    const q = inventorySearch.trim().toLowerCase();
    if (!q) return true;

    return (
      String(row.materialName || '').toLowerCase().includes(q) ||
      String(row.thickness || '').toLowerCase().includes(q) ||
      String(row.sheetSize || '').toLowerCase().includes(q) ||
      String(row.location || '').toLowerCase().includes(q) ||
      String(row.defaultSupplier || '').toLowerCase().includes(q) ||
      String(row.quantity || '').toLowerCase().includes(q)
    );
  });

  const handleEditInward = (row) => {
    const matchedMaterial = (data.totalInventory || []).find((m) =>
      (m.materialName || '').trim().toLowerCase() === (row.material || row.materialName || '').trim().toLowerCase() &&
      (m.sheetSize || '').trim().toLowerCase() === (row.size || row.sheetSize || '').trim().toLowerCase() &&
      (m.thickness || '').trim().toLowerCase() === (row.thickness || '').trim().toLowerCase()
    );

    setEditingInwardId(row.id);
    setInwardForm((prev) => ({
      ...prev,
      supplier: row.supplier || '',
      materialName: row.material || row.materialName || '',
      sheetSize: row.size || row.sheetSize || '',
      thickness: row.thickness || '',
      quantity: row.quantity != null ? String(row.quantity) : '',
      remarkUnique: row.remark || row.remarkUnique || '',
      location: matchedMaterial?.location || '',
    }));
    setShowInwardModal(true);
  };

  const handleDeleteInward = async (row) => {
    if (!window.confirm('Are you sure you want to delete this inward entry?')) return;
    try {
      await deleteInwardEntry(row.id);
      toast.success('Inward entry deleted');
      await loadDashboard();
    } catch (e) {
      toast.error(e.message || 'Failed to delete inward entry');
    }
  };

  const handleEditOutward = (row) => {
    const material = data.totalInventory.find(m => m.materialName === row.materialName && m.sheetSize === row.sheetSize && m.thickness === row.thickness);
    setEditingOutwardId(row.id);
    setOutwardForm({
      customer: row.customer || '',
      materialId: material ? String(material.id) : '',
      quantity: row.quantity != null ? String(row.quantity) : '',
      remarkUnique: row.remarkUnique || '',
    });
    setShowOutwardModal(true);
  };

  const handleDeleteOutward = async (row) => {
    if (!window.confirm('Are you sure you want to delete this outward entry?')) return;
    try {
      await deleteOutwardEntry(row.id);
      toast.success('Outward entry deleted');
      await loadDashboard();
    } catch (e) {
      toast.error(e.message || 'Failed to delete outward entry');
    }
  };

  const handleCustomerChange = (value) => {
    setOutwardForm(prev => ({ ...prev, customer: value }));
    setCustomerQuery(value);

    if (customerSearchTimeout) {
      clearTimeout(customerSearchTimeout);
    }

    if (!value || !value.trim()) {
      setCustomerSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const results = await searchCustomers(value.trim());
        setCustomerSuggestions(results);
      } catch (e) {
        console.error(e);
      }
    }, 300);

    setCustomerSearchTimeout(timeout);
  };

  return (
    <div className="w-full">
      <div className="px-6 pt-4 pb-6 space-y-8">
        {/* Card 1: Inventory Ledger */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Inventory Ledger</h1>
              <p className="text-sm text-gray-500">Track all inward and outward movements of your raw materials.</p>
            </div>
            <button
              onClick={() => downloadInventoryReport('excel')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              <FiDownload className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          </div>
        </div>

        {/* Card 2: Inward Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-500 text-lg">↓</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Inward</h2>
                <p className="text-xs text-gray-500">Log of all materials received from suppliers.</p>
              </div>
            </div>
            <button
              onClick={openInwardModal}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              <FiPlusCircle className="w-4 h-4" />
              <span>Add Inward Entry</span>
            </button>
          </div>
          <div className="px-6 py-5">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Date</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Time</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Supplier</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Material</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Size</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Thickness</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Quantity</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Remark</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-right text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : data.latestInward.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-gray-500">No inward entries</td>
                      </tr>
                    ) : (
                      data.latestInward.map((row, idx) => (
                        <tr key={row.id} className={idx % 2 ? 'bg-gray-50' : ''}>
                          <td className="py-3 px-4 text-gray-900">{formatDate(row.dateTime)}</td>
                          <td className="py-3 px-4 text-gray-900">{formatTime(row.dateTime)}</td>
                          <td className="py-3 px-4 text-gray-900">{row.supplier}</td>
                          <td className="py-3 px-4 text-gray-900">{row.materialName}</td>
                          <td className="py-3 px-4 text-gray-900">{row.sheetSize}</td>
                          <td className="py-3 px-4 text-gray-900">{row.thickness}</td>
                          <td className="py-3 px-4 text-gray-900">{row.quantity}</td>
                          <td className="py-3 px-4 text-gray-900">{row.remarkUnique}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => handleEditInward(row)}
                                className="text-green-600 hover:text-green-700"
                                title="Edit"
                              >
                                <FiEdit />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteInward(row)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Outward Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-red-500 text-lg">↑</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Outward</h2>
                <p className="text-xs text-gray-500">Log of all materials consumed for orders.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={outwardSearch}
                onChange={(e) => setOutwardSearch(e.target.value)}
                placeholder="Search outward..."
                className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={openOutwardModal}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md"
              >
                <FiPlusCircle className="w-4 h-4" />
                <span>Add Outward Entry</span>
              </button>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-72 overflow-y-auto w-full block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Date</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Time</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Customer</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Material</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Size</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Thickness</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Quantity</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Remark</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-right text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : filteredOutward.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-gray-500">No outward entries found</td>
                      </tr>
                    ) : (
                      filteredOutward.map((row, idx) => (
                        <tr key={row.id} className={idx % 2 ? 'bg-gray-50' : ''}>
                          <td className="py-3 px-4 text-gray-900">{formatDate(row.dateTime)}</td>
                          <td className="py-3 px-4 text-gray-900">{formatTime(row.dateTime)}</td>
                          <td className="py-3 px-4 text-gray-900">{row.customer}</td>
                          <td className="py-3 px-4 text-gray-900">{row.materialName}</td>
                          <td className="py-3 px-4 text-gray-900">{row.sheetSize}</td>
                          <td className="py-3 px-4 text-gray-900">{row.thickness}</td>
                          <td className="py-3 px-4 text-gray-900">{row.quantity}</td>
                          <td className="py-3 px-4 text-gray-900">{row.remarkUnique}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => handleEditOutward(row)}
                                className="text-green-600 hover:text-green-700"
                                title="Edit"
                              >
                                <FiEdit />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOutward(row)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Total Inventory */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Total Inventory</h2>
            <p className="text-sm text-gray-500">A summary of your current raw material stock levels.</p>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div>
                {/* Title is already in header above */}
              </div>
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search inventory..."
                className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto w-full block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Material</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Thickness</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Sheet Size</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Quantity</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Location</th>
                      <th className="bg-gray-100 text-gray-900 font-bold px-4 py-3 text-left text-sm">Default Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-500">No inventory records found</td>
                      </tr>
                    ) : (
                      filteredInventory.map((row, idx) => (
                        <tr key={row.id} className={idx % 2 ? 'bg-gray-50' : ''}>
                          <td className="py-3 px-4 text-gray-900">{row.materialName}</td>
                          <td className="py-3 px-4 text-gray-900">{row.thickness}</td>
                          <td className="py-3 px-4 text-gray-900">{row.sheetSize}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs ${
                              (row.quantity || 0) < 100
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {row.quantity} sheets
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-900">{row.location}</td>
                          <td className="py-3 px-4 text-gray-900">{row.defaultSupplier}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inward Modal */}
      {showInwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add Inward Entry</h3>
                <p className="text-xs text-gray-500">Record new material received from supplier.</p>
              </div>
              <button
                onClick={() => setShowInwardModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleInwardSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={inwardForm.supplier}
                    onChange={e => setInwardForm({ ...inwardForm, supplier: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={inwardForm.materialName}
                    onChange={e => setInwardForm({ ...inwardForm, materialName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Size (e.g. 2000x1000)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={inwardForm.sheetSize}
                    onChange={e => setInwardForm({ ...inwardForm, sheetSize: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Thickness</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={inwardForm.thickness}
                    onChange={e => setInwardForm({ ...inwardForm, thickness: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={inwardForm.quantity}
                    onChange={e => setInwardForm({ ...inwardForm, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={inwardForm.location}
                    onChange={e => setInwardForm({ ...inwardForm, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remark</label>
                  <input
                    type="text"
                    readOnly
                    className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm"
                    value={inwardForm.remarkUnique}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInward}
                  className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submittingInward ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outward Modal */}
      {showOutwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add Outward Entry</h3>
                <p className="text-xs text-gray-500">Record material consumption for orders.</p>
              </div>
              <button
                onClick={() => setShowOutwardModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleOutwardSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={outwardForm.customer}
                      onChange={e => handleCustomerChange(e.target.value)}
                    />
                    {customerSuggestions.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto text-sm">
                        {customerSuggestions.map(name => (
                          <li
                            key={name}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setOutwardForm(prev => ({ ...prev, customer: name }));
                              setCustomerSuggestions([]);
                            }}
                          >
                            {name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    value={outwardForm.materialId}
                    onChange={e => setOutwardForm({ ...outwardForm, materialId: e.target.value })}
                  >
                    <option value="">Select material</option>
                    {data.totalInventory.map(mat => (
                      <option key={mat.id} value={mat.id} disabled={mat.quantity === 0}>
                        {mat.materialName} / {mat.sheetSize} / {mat.thickness} {mat.quantity === 0 ? '(0 available)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Size</label>
                  <input
                    type="text"
                    readOnly
                    className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm"
                    value={selectedOutwardMaterial?.sheetSize || ''}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Thickness</label>
                  <input
                    type="text"
                    readOnly
                    className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm"
                    value={selectedOutwardMaterial?.thickness || ''}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={outwardForm.quantity}
                    onChange={e => {
                      const value = e.target.value;
                      const num = Number(value);
                      const available = selectedOutwardMaterial ? selectedOutwardMaterial.quantity || 0 : Infinity;
                      if (Number.isFinite(num) && num > available) {
                        setOutwardForm({ ...outwardForm, quantity: String(available) });
                      } else {
                        setOutwardForm({ ...outwardForm, quantity: value });
                      }
                    }}
                  />
                  {selectedOutwardMaterial && (
                    <p
                      className={`mt-1 text-xs ${
                        (selectedOutwardMaterial.quantity || 0) < 100
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      Available: {selectedOutwardMaterial.quantity || 0}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remark</label>
                  <input
                    type="text"
                    readOnly
                    className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm"
                    value={outwardForm.remarkUnique}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOutwardModal(false)}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOutward}
                  className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submittingOutward ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
