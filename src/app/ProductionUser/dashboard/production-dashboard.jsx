'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useCustomerProductData } from '../../DesignUser/dashboard/useCustomerProductData';
import * as orderApi from '../orders/api';
import toast from 'react-hot-toast';
import { getVisibleReportDefsForCurrentUser } from '@/utils/reportVisibility';
import { downloadReport as downloadReportUtil } from '@/utils/downloadReport';
import StatusHistoryTimeline from '@/components/StatusHistoryTimeline';
import OrderDetailsModal from '@/components/OrderDetailsModal';

function DetailsPanel({ order, onClose, onUpdateOrder }) {
  // Add state for the status update form
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [statusHistory, setStatusHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [departmentUsers, setDepartmentUsers] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const getCurrentUserRole = () => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
      if (!raw) return '';
      const auth = JSON.parse(raw);
      const roles = (auth?.roles || '').toString();
      return roles.split(',')[0].trim().toUpperCase();
    } catch {
      return '';
    }
  };

  const currentRole = getCurrentUserRole();

  const resolvedOrderId = order?.orderId ?? order?.id ?? order?._id ?? '';
  const numericOrderId = resolvedOrderId
    ? String(resolvedOrderId).replace('SF', '')
    : '';

  const [stageProgress, setStageProgress] = useState({
    designProgress: Number(order?.designProgress ?? 0),
    productionProgress: Number(order?.productionProgress ?? 0),
    machiningProgress: Number(order?.machiningProgress ?? 0),
    inspectionProgress: Number(order?.inspectionProgress ?? 0),
  });

  const [stageFiles, setStageFiles] = useState({
    designFiles: [],
    productionFiles: [],
    machiningFiles: [],
    inspectionFiles: [],
  });

  const [stageStatuses, setStageStatuses] = useState({
    designStatus: '',
    productionStatus: '',
    machiningStatus: '',
    inspectionStatus: '',
  });

  const [orderAssignedUsers, setOrderAssignedUsers] = useState({
    DESIGN: null,
    PRODUCTION: null,
    MACHINING: null,
    INSPECTION: null,
  });

  const fetchOrderAssignedUsers = async () => {
    try {
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;
      
      if (!token || !numericOrderId) return;

      const departments = ['DESIGN', 'PRODUCTION', 'MACHINING', 'INSPECTION'];
      const assignedUsers = {};

      for (const dept of departments) {
        try {
          const response = await fetch(`https://api.metaspark.co.in/users/assigned-to-order/${numericOrderId}/${dept}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const user = await response.json();
            assignedUsers[dept] = user;
          } else {
            assignedUsers[dept] = null;
          }
        } catch (error) {
          console.error(`Error fetching assigned user for ${dept}:`, error);
          assignedUsers[dept] = null;
        }
      }

      setOrderAssignedUsers(assignedUsers);
    } catch (error) {
      console.error('Error fetching order assigned users:', error);
    }
  };

  useEffect(() => {
    if (order && numericOrderId) {
      fetchOrderAssignedUsers();
    }
  }, [order, numericOrderId]);

  const fetchDepartmentUsers = async (department) => {
    try {
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;
      
      const response = await fetch(`https://api.metaspark.co.in/users/by-department/${department}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const users = await response.json();
        setDepartmentUsers(prev => ({ ...prev, [department]: users }));
      }
    } catch (error) {
      console.error(`Error fetching ${department} users:`, error);
    }
  };

  useEffect(() => {
    if (newStatus && ['DESIGN', 'PRODUCTION', 'MACHINING', 'INSPECTION'].includes(newStatus)) {
      fetchDepartmentUsers(newStatus);
    } else {
      setSelectedEmployee('');
    }
  }, [newStatus]);

  const fetchStatusHistory = async () => {
    try {
      setLoadingHistory(true);
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;
      
      if (!token || !numericOrderId) return;

      const response = await fetch(`https://api.metaspark.co.in/status/order/${numericOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const history = await response.json();
        setStatusHistory(Array.isArray(history) ? history : []);
      } else {
        setStatusHistory([]);
      }
    } catch (error) {
      console.error('Error fetching status history:', error);
      setStatusHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (order && numericOrderId) {
      fetchStatusHistory();
    }
  }, [order, numericOrderId]);

  const handleSubmitStatus = async (e) => {
    e.preventDefault();
    if (!newStatus) {
      setSubmitError('Please select a status');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const formData = new FormData();
      const statusRequest = {
        newStatus: newStatus.toUpperCase(),
        comment: comment || '',
        percentage: null,
      };
      formData.append('status', new Blob([JSON.stringify(statusRequest)], { type: 'application/json' }));
      if (attachment) {
        formData.append('attachment', attachment);
      }
      if (!numericOrderId) {
        setSubmitError('Invalid order id for status update');
        return;
      }
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;
      const response = await fetch(`https://api.metaspark.co.in/status/create/${numericOrderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) throw new Error('Failed to update status');
      
      if (selectedEmployee && ['DESIGN', 'PRODUCTION', 'MACHINING', 'INSPECTION'].includes(newStatus)) {
        const assignResponse = await fetch('https://api.metaspark.co.in/users/assign-to-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ userId: selectedEmployee, orderId: numericOrderId, department: newStatus }),
        });
        if (assignResponse.ok) {
          const assignResult = await assignResponse.json();
          toast.success('Status updated and employee assigned successfully!');
          fetchOrderAssignedUsers();
        } else {
          toast.success('Status updated successfully!');
        }
      } else {
        toast.success('Status updated successfully!');
      }
      setNewStatus('');
      setComment('');
      setAttachment(null);
      setSelectedEmployee('');
      const historyResponse = await fetch(`https://api.metaspark.co.in/status/order/${numericOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (historyResponse.ok) {
        const latestHistory = await historyResponse.json();
        setStatusHistory(latestHistory);
      }
      if (onUpdateOrder) onUpdateOrder(numericOrderId, newStatus);
    } catch (error) {
      setSubmitError('Failed to update status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-50">
      <div className="absolute inset-y-0 right-0 w-full lg:w-4/5 bg-gray-50 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-black">Order #{order.id}</h2>
            <p className="text-sm text-black">
              Track the progress of the order from inquiry to completion.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="m-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {["Inquiry", "Design", "Production", "Machining", "Inspection", "Completed"].map(
              (step, i) => (
                <div key={step} className="flex-1 flex items-center">
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-full border ${
                      order.status === step
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 5 && <div className="flex-1 h-px bg-gray-300 mx-2" />}
                </div>
              )
            )}
          </div>
        </div>

        <div className="m-4 space-y-4">
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-black">Project Details</h3>
              <button className="text-black hover:text-black">✎</button>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-1">Customer</label>
              <div className="text-sm text-black">{order.customer}</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-1">Products</label>
              <div className="text-sm text-black">
                {Array.isArray(order.products)
                  ? order.products
                      .map((p) => p && (p.productName || p.productCode))
                      .filter(Boolean)
                      .join(', ')
                  : order.products && typeof order.products === 'object'
                    ? (order.products.productName || order.products.productCode || 'No Product')
                    : order.products || 'No Product'
                }
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-1">Custom Requirements</label>
              <div className="text-sm text-black">{order.custom || 'None'}</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-1">Units</label>
              <div className="text-sm text-black">{order.units || 'N/A'}</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-1">Material</label>
              <div className="text-sm text-black">{order.material || 'N/A'}</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-1">Department</label>
              <div className="text-sm text-black">{order.department || 'N/A'}</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-1">Status</label>
              <div className="text-sm text-black">{order.status || 'N/A'}</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-1">Date Added</label>
              <div className="text-sm text-black">{order.dateAdded || 'N/A'}</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-700 mb-1">Assigned Team</label>
              <div className="space-y-2">
                {Object.entries(orderAssignedUsers).map(([dept, user]) => (
                  <div key={dept} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{dept}:</span>
                    <span className="text-black font-medium">
                      {user ? (user.fullName || user.email || 'Unknown User') : 'Not assigned'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-black">Status History</h3>
            </div>
            {loadingHistory ? (
              <div className="text-center text-gray-500 py-4">Loading status history...</div>
            ) : statusHistory.length > 0 ? (
              <StatusHistoryTimeline history={statusHistory} />
            ) : (
              <div className="text-center text-gray-500 py-4">No status history available</div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-black">Update Status</h3>
            </div>
            <form onSubmit={handleSubmitStatus} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-700 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  required
                >
                  <option value="">Select status...</option>
                  <option value="DESIGN">Design</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="MACHINING">Machining</option>
                  <option value="INSPECTION">Inspection</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {newStatus && ['DESIGN', 'PRODUCTION', 'MACHINING', 'INSPECTION'].includes(newStatus) && (
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Assign Employee</label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="">Select {newStatus.toLowerCase()} employee...</option>
                    {departmentUsers[newStatus]?.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.fullName || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-700 mb-1">Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  rows={3}
                  placeholder="Add a comment..."
                />
              </div>

              <div>
                <label className="block text-xs text-gray-700 mb-1">Attachment</label>
                <input
                  type="file"
                  onChange={(e) => setAttachment(e.target.files[0])}
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                />
              </div>

              {submitError && (
                <div className="text-red-600 text-xs">{submitError}</div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white rounded-md py-2 text-sm hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSubmitting ? 'Updating...' : 'Update Status'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ProductionDashboardPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOrder, setDetailsOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ customer: '', products: '', custom: '', units: '', material: '', dept: '' });
  const [formError, setFormError] = useState('');
  const [departmentCounts, setDepartmentCounts] = useState([]);

  const { customerData, productData, loading: customerProductLoading } = useCustomerProductData();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For ProductionUser dashboard, fetch ALL orders (not just assigned ones)
      const orders = await orderApi.getAllOrders();
      
      console.log('Production Dashboard - All Orders:', orders);

      // Transform the API response to match the table structure
      // Sort latest first by numeric orderId so newest orders appear at the top
      const transformedOrders = (Array.isArray(orders) ? orders.slice().sort((a, b) => (b.orderId || 0) - (a.orderId || 0)) : []).map(order => {
        // Map department to match the badge styling
        let department = 'ENQUIRY'; // Default
        if (order.department) {
          department = order.department;
        }

        return {
          id: `SF${order.orderId}`,
          customer: order.customers && order.customers.length > 0 
            ? (order.customers[0].companyName || order.customers[0].customerName || 'Unknown Customer')
            : 'Unknown Customer',
          products: (() => {
            const names = Array.isArray(order.products)
              ? order.products
                  .map((p) => p?.productName)
                  .filter(Boolean)
              : [];

            return names.length ? names.join(', ') : 'No Product';
          })(),
          date: '', // Remove date as requested
          status: order.status || 'Inquiry',
          department: department, // Use the actual department from API
          orderId: order.orderId,
        };
      });

      setRows(transformedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenOrder = (order) => {
    setSelectedOrder(order);
  };

  const handleOpenOrderDetails = (order) => {
    setDetailsOrder(order);
    setShowDetailsModal(true);
  };

  const handleCloseOrderSlider = () => {
    setSelectedOrder(null);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setDetailsOrder(null);
  };

  const handleUpdateOrder = async (orderId, newStatus) => {
    try {
      await fetchOrders();
      toast.success('Order updated successfully');
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      setFormError('');
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;

      const orderData = {
        customer: form.customer,
        products: form.products,
        custom: form.custom,
        units: form.units,
        material: form.material,
        department: form.dept,
        status: 'Inquiry'
      };

      const response = await fetch('https://api.metaspark.co.in/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      toast.success('Order created successfully');
      setShowCreateModal(false);
      setForm({ customer: '', products: '', custom: '', units: '', material: '', dept: '' });
      fetchOrders();
    } catch (error) {
      setFormError(error.message || 'Failed to create order');
    }
  };

  const downloadReport = async (reportDef, order) => {
    try {
      await downloadReportUtil(reportDef, order);
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const visibleReportDefs = getVisibleReportDefsForCurrentUser();

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading orders...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">All Orders</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm text-black w-64"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-md px-2 py-2 text-sm text-black"
              >
                <option value="All">All Statuses</option>
                <option value="Inquiry">Inquiry</option>
                <option value="Design">Design</option>
                <option value="Production">Production</option>
                <option value="Machining">Machining</option>
                <option value="Inspection">Inspection</option>
                <option value="Completed">Completed</option>
              </select>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="border border-gray-200 rounded-md px-2 py-2 text-sm text-black"
              >
                <option value="All">All Departments</option>
                <option value="DESIGN">Design</option>
                <option value="PRODUCTION">Production</option>
                <option value="MACHINING">Machining</option>
                <option value="INSPECTION">Inspection</option>
              </select>
              {/* <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700"
              >
                + New Order
              </button> */}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <OrdersTable
            rows={rows}
            statusFilter={statusFilter}
            departmentFilter={departmentFilter}
            searchTerm={searchTerm}
            onView={handleOpenOrder}
            onViewDetails={handleOpenOrderDetails}
            loading={loading}
            error={error}
          />
        </main>

        {selectedOrder && (
          <DetailsPanel
            order={selectedOrder}
            onClose={handleCloseOrderSlider}
            onUpdateOrder={handleUpdateOrder}
          />
        )}

        {showDetailsModal && detailsOrder && (
          <OrderDetailsModal
            order={detailsOrder}
            onClose={handleCloseDetailsModal}
            onUpdate={handleUpdateOrder}
            visibleReportDefs={visibleReportDefs}
            onDownloadReport={downloadReport}
          />
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Create New Order</h2>
              {formError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {formError}
                </div>
              )}
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer</label>
                  <input
                    type="text"
                    required
                    value={form.customer}
                    onChange={(e) => setForm({ ...form, customer: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Products</label>
                  <input
                    type="text"
                    required
                    value={form.products}
                    onChange={(e) => setForm({ ...form, products: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Custom Requirements</label>
                  <textarea
                    value={form.custom}
                    onChange={(e) => setForm({ ...form, custom: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Units</label>
                  <input
                    type="text"
                    required
                    value={form.units}
                    onChange={(e) => setForm({ ...form, units: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Material</label>
                  <input
                    type="text"
                    value={form.material}
                    onChange={(e) => setForm({ ...form, material: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select
                    required
                    value={form.dept}
                    onChange={(e) => setForm({ ...form, dept: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select department...</option>
                    <option value="DESIGN">Design</option>
                    <option value="PRODUCTION">Production</option>
                    <option value="MACHINING">Machining</option>
                    <option value="INSPECTION">Inspection</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700"
                  >
                    Create Order
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setForm({ customer: '', products: '', custom: '', units: '', material: '', dept: '' });
                      setFormError('');
                    }}
                    className="flex-1 border border-gray-300 rounded-md py-2 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrdersTable({ rows = [], statusFilter = 'All', departmentFilter = 'All', searchTerm = '', onView, onViewDetails, loading, error }) {

  // Apply all filters: status, department, and search
  let visible = rows;
  
  // Apply status filter
  if (statusFilter !== 'All') {
    visible = visible.filter(r => r.status === statusFilter);
  }
  
  // Apply department filter
  if (departmentFilter !== 'All') {
    visible = visible.filter(r => r.department === departmentFilter);
  }
  
  // Apply search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    visible = visible.filter(r => 
      r.id.toLowerCase().includes(term) || 
      r.customer.toLowerCase().includes(term)
    );
  }
  
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <div className="flex justify-center items-center h-32">
          <div className="text-black">Loading orders...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="overflow-x-auto">
        <div className="flex justify-center items-center h-32">
          <div className="text-red-500">Error loading orders: {error}</div>
        </div>
      </div>
    );
  }
  
  if (rows.length === 0) {
    return (
      <div className="overflow-x-auto">
        <div className="flex justify-center items-center h-32">
          <div className="text-black">No orders found</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-black">
            <th className="py-2 px-3">Order ID</th>
            <th className="py-2 px-3">Customer</th>
            <th className="py-2 px-3">Product(s)</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.id} className={i % 2 ? 'bg-gray-50' : ''}>
              <td className="py-2 px-3 font-medium text-indigo-600">
                <button
                  type="button"
                  onClick={() => onView?.(r)}
                  className="underline hover:text-indigo-800"
                >
                  {r.id}
                </button>
              </td>
              <td className="py-2 px-3 text-black">{r.customer}</td>
              <td className="py-2 px-3 text-black">{r.products}</td>
              <td className="py-2 px-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border whitespace-nowrap ${
                  r.department === 'DESIGN' 
                    ? 'bg-orange-50 text-orange-700 border-orange-200' 
                    : r.department === 'MACHINING' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : r.department === 'INSPECTION' 
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                        : r.department === 'PRODUCTION' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : r.department === 'ENQUIRY' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}>
                  {r.department}
                </span>
              </td>
              <td className="py-2 px-3">
                <button 
                  onClick={() => onViewDetails?.(r)}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
