'use client'

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import * as orderApi from '../orders/api';
import { useCustomerProductData } from '../dashboard/useCustomerProductData';
import * as customerApi from '../customers/api';
import { createProduct as createProductApi } from '../products/productService';
import toast from 'react-hot-toast';
import OrderDetailsModal from '@/components/OrderDetailsModal';

export default function AllOrdersPage() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form, setForm] = useState({ customer: '', products: '', custom: '', units: '', material: '', dept: '', billingAddress: '', shippingAddress: '', addressType: '', materialDetails: { material: '', gas: '', thickness: '', type: '' }, processDetails: { laserCutting: false, bending: false, fabrication: false, powderCoating: false } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState('');

  // Inline modals for creating customer/product inside Create Order flow
  const [showInlineCustomerModal, setShowInlineCustomerModal] = useState(false);
  const [showInlineProductModal, setShowInlineProductModal] = useState(false);
  const [inlineCustomerForm, setInlineCustomerForm] = useState({
    customerName: '',
    companyName: '',
    email: '',
    customerNumber: '',
    gstNumber: '',
    phoneNumber: '',
    primaryAddress: '',
    useAsBilling: true,
    useAsShipping: true,
  });
  const [inlineProductForm, setInlineProductForm] = useState({
    name: '',
    code: '',
    status: 'Active',
  });
  const [savingInlineCustomer, setSavingInlineCustomer] = useState(false);
  const [savingInlineProduct, setSavingInlineProduct] = useState(false);

  // Fetch customers/products for dropdowns
  const { customerData, productData, loading: customerProductLoading, refetch } = useCustomerProductData();

  // Compute filtered view of rows based on query and status
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let out = rows;
    if (statusFilter !== 'All') out = out.filter(r => r.status === statusFilter);
    if (q) out = out.filter(r => r.id.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q));
    return out;
  }, [rows, query, statusFilter]);

  // Fetch orders from backend
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const orders = await orderApi.getAllOrders();

      const transformed = Array.isArray(orders)
        ? orders
            // sort latest first by numeric orderId
            .slice()
            .sort((a, b) => (b.orderId || 0) - (a.orderId || 0))
            .map(order => {
              // Format date similar to dashboard (e.g. "27 Nov 2025")
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

              // Map department/status
              const department = order.department || 'ENQUIRY';

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
                date: formattedDate,
                status: order.status || 'Inquiry',
                dept: department,
                address: order.customers && order.customers.length > 0 ? order.customers[0].primaryAddress || 'N/A' : 'N/A',
                addressType: '', // Default address type
              };
            })
        : [];

      setRows(transformed);
    } catch (e) {
      console.error('Error fetching orders in AllOrdersPage:', e);
      setError(e.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    const rawId = order?.id ? String(order.id).replace('SF', '') : '';
    const orderId = Number(rawId);
    if (!orderId) {
      toast.error('Invalid order id');
      return;
    }

    if (!confirm(`Are you sure you want to delete order ${order.id}?`)) return;

    try {
      await orderApi.deleteOrder(orderId);
      setRows((prev) => prev.filter((o) => o.id !== order.id));
      toast.success(`Order ${order.id} deleted`);
    } catch (e) {
      toast.error(e?.message || 'Failed to delete order');
    }
  };

  // Fetch orders from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        await fetchOrders();
      } finally {
        // no-op
      }
    };

    load();
  }, []);

  // Inline "Add Customer" save handler
  const handleSaveInlineCustomer = async () => {
    if (!inlineCustomerForm.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    try {
      setSavingInlineCustomer(true);
      const created = await customerApi.createCustomer(inlineCustomerForm);

      // Refresh dropdown data
      if (typeof refetch === 'function') {
        await refetch();
      }

      const newId = created?.customerId ?? created?.id;
      if (newId != null) {
        setForm((f) => ({ ...f, customer: String(newId) }));
      }

      toast.success('Customer created successfully');
      setShowInlineCustomerModal(false);
      setInlineCustomerForm({
        customerName: '',
        companyName: '',
        email: '',
        customerNumber: '',
        gstNumber: '',
        phoneNumber: '',
        primaryAddress: '',
        useAsBilling: true,
        useAsShipping: true,
      });
    } catch (e) {
      console.error('Error creating inline customer:', e);
      toast.error(e.message || 'Failed to create customer');
    } finally {
      setSavingInlineCustomer(false);
    }
  };

  // Inline "Add Product" save handler
  const handleSaveInlineProduct = async () => {
    if (!inlineProductForm.name.trim() || !inlineProductForm.code.trim()) {
      toast.error('Product name and code are required');
      return;
    }
    try {
      setSavingInlineProduct(true);
      const payload = {
        productName: inlineProductForm.name,
        productCode: inlineProductForm.code,
        status: inlineProductForm.status,
      };
      const created = await createProductApi(payload);

      // Refresh dropdown data
      if (typeof refetch === 'function') {
        await refetch();
      }

      const newId = created?.id;
      if (newId != null) {
        setForm((f) => ({ ...f, products: String(newId) }));
      }

      toast.success('Product created successfully');
      setShowInlineProductModal(false);
      setInlineProductForm({ name: '', code: '', status: 'Active' });
    } catch (e) {
      console.error('Error creating inline product:', e);
      toast.error(e.message || 'Failed to create product');
    } finally {
      setSavingInlineProduct(false);
    }
  };

  const createOrder = async () => {
    try {
      setFormError('');

      if (!form.customer || !form.products || !form.dept) {
        const msg = 'Please select customer, product, and department';
        setFormError(msg);
        toast.error(msg);
        return;
      }

      const orderData = {
        productDetails: form.products,
        customProductDetails: form.custom || '',
        units: form.units || '',
        material: form.materialDetails?.material || form.material || '',
        department: form.dept,
        materialDetails: {
          material: form.materialDetails?.material || '',
          gas: form.materialDetails?.gas || '',
          thickness: form.materialDetails?.thickness || '',
          type: form.materialDetails?.type || '',
        },
        processDetails: {
          laserCutting: Boolean(form.processDetails?.laserCutting),
          bending: Boolean(form.processDetails?.bending),
          fabrication: Boolean(form.processDetails?.fabrication),
          powderCoating: Boolean(form.processDetails?.powderCoating),
        },
      };

      await orderApi.createOrder(
        parseInt(form.customer),
        parseInt(form.products),
        orderData
      );

      toast.success('Order created successfully');
      await fetchOrders();
      setShowModal(false);
      setForm({ customer: '', products: '', custom: '', units: '', material: '', dept: '', billingAddress: '', shippingAddress: '', addressType: '', materialDetails: { material: '', gas: '', thickness: '', type: '' }, processDetails: { laserCutting: false, bending: false, fabrication: false, powderCoating: false } });
      setFormError('');
    } catch (e) {
      console.error('Error creating order from AllOrdersPage:', e);
      const msg = e.message || 'Error creating order';
      setFormError(msg);
      toast.error(msg);
    }
  };

  const handleView = async (order) => {
    try {
      const orderId = order.id.replace('SF', '');
      const response = await fetch(`http://localhost:8080/order/getById/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('swiftflow-user'))?.token}`
        }
      });
      
      if (response.ok) {
        const orderData = await response.json();
        setSelectedOrder(orderData);
        setShowViewModal(true);
      } else {
        toast.error('Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error viewing order:', error);
      toast.error('Error fetching order details');
    }
  };

  const handleEdit = async (order) => {
    try {
      const orderId = order.id.replace('SF', '');
      const response = await fetch(`http://localhost:8080/order/getById/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('swiftflow-user'))?.token}`
        }
      });
      
      if (response.ok) {
        const orderData = await response.json();
        setSelectedOrder(orderData);
        setForm({
          customer: orderData.customers?.[0]?.customerId || '',
          products: orderData.products?.[0]?.productId || '',
          custom: orderData.customProductDetails || '',
          units: orderData.units || '',
          material: orderData.material || '',
          dept: orderData.department || '',
          billingAddress: orderData.customers?.[0]?.billingAddress || '',
          shippingAddress: orderData.customers?.[0]?.shippingAddress || '',
          addressType: '',
          materialDetails: {
            material: orderData.materialDetails?.material || orderData.material || '',
            gas: orderData.materialDetails?.gas || '',
            thickness: orderData.materialDetails?.thickness || '',
            type: orderData.materialDetails?.type || '',
          },
          processDetails: {
            laserCutting: Boolean(orderData.processDetails?.laserCutting),
            bending: Boolean(orderData.processDetails?.bending),
            fabrication: Boolean(orderData.processDetails?.fabrication),
            powderCoating: Boolean(orderData.processDetails?.powderCoating),
          },
        });
        setShowEditModal(true);
      } else {
        toast.error('Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error editing order:', error);
      toast.error('Error fetching order details');
    }
  };

  const updateOrder = async () => {
    try {
      setFormError('');

      if (!form.dept) {
        const msg = 'Please select department';
        setFormError(msg);
        toast.error(msg);
        return;
      }

      const orderId = selectedOrder.orderId;
      const orderData = {
        customProductDetails: form.custom || '',
        units: form.units || '',
        material: form.materialDetails?.material || form.material || '',
        department: form.dept,
        customerId: parseInt(form.customer) || null,
        productId: parseInt(form.products) || null,
        materialDetails: {
          material: form.materialDetails?.material || '',
          gas: form.materialDetails?.gas || '',
          thickness: form.materialDetails?.thickness || '',
          type: form.materialDetails?.type || '',
        },
        processDetails: {
          laserCutting: Boolean(form.processDetails?.laserCutting),
          bending: Boolean(form.processDetails?.bending),
          fabrication: Boolean(form.processDetails?.fabrication),
          powderCoating: Boolean(form.processDetails?.powderCoating),
        },
      };

      const response = await fetch(`http://localhost:8080/order/update/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('swiftflow-user'))?.token}`
        },
        body: JSON.stringify(orderData)
      });
      
      if (response.ok) {
        toast.success('Order updated successfully');
        await fetchOrders();
        setShowEditModal(false);
        setSelectedOrder(null);
        setForm({ customer: '', products: '', custom: '', units: '', material: '', dept: '', billingAddress: '', shippingAddress: '', addressType: '', materialDetails: { material: '', gas: '', thickness: '', type: '' }, processDetails: { laserCutting: false, bending: false, fabrication: false, powderCoating: false } });
        setFormError('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order');
      }
    } catch (e) {
      console.error('Error updating order:', e);
      const msg = e.message || 'Error updating order';
      setFormError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="w-full">
      {/* Page content - layout is handled by ClientLayout */}
      <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-semibold text-black">All Orders</h1>
              <p className="text-black text-sm">Oversee and manage all active and completed orders.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md">
              <span>＋</span> Create Order
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(e)=>setQuery(e.target.value)}
                type="text"
                placeholder="Search by Order ID or Customer..."
                className="w-full border border-gray-200 rounded-md px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e)=>setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-2 text-sm text-black"
            >
              <option value="All">All</option>
              <option value="Inquiry">Inquiry</option>
              <option value="Design">Design</option>
              <option value="Production">Production</option>
              <option value="Machining">Machining</option>
              <option value="Inspection">Inspection</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-black">Loading orders...</div>
          ) : error ? (
            <div className="mt-4 text-sm text-red-600">{error}</div>
          ) : (
            <OrdersTable rows={filtered} onView={handleView} onEdit={handleEdit} onDelete={handleDeleteOrder} />
          )}
        </div>

      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={()=>setShowModal(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-[95vw] md:max-w-4xl lg:max-w-5xl bg-white rounded-lg shadow-xl border border-gray-200 max-h-[60vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-black">Create New Order</h3>
                <button onClick={()=>setShowModal(false)} className="text-black">×</button>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700 text-sm">{formError}</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium mb-1 text-black">Customer</label>
                    <button
                      type="button"
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      onClick={() => setShowInlineCustomerModal(true)}
                    >
                      Add Customer
                    </button>
                  </div>
                  {customerProductLoading ? (
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black" disabled>
                      <option>Loading customers...</option>
                    </select>
                  ) : (
                    <select
                      value={form.customer}
                      onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                    >
                      <option value="">Select Customer...</option>
                      {Array.isArray(customerData) && customerData.length > 0 ? (
                        customerData.map((customer) => (
                          <option
                            key={customer.customerId}
                            value={customer.customerId}
                          >
                            {customer.companyName || customer.customerName}
                          </option>
                        ))
                      ) : (
                        <option disabled>No customers available</option>
                      )}
                    </select>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium mb-1 text-black">Products</label>
                    <button
                      type="button"
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      onClick={() => setShowInlineProductModal(true)}
                    >
                      Add Products
                    </button>
                  </div>
                  {customerProductLoading ? (
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black" disabled>
                      <option>Loading products...</option>
                    </select>
                  ) : (
                    <select
                      value={form.products}
                      onChange={(e) => setForm((f) => ({ ...f, products: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                    >
                      <option value="">Select Products...</option>
                      {Array.isArray(productData) && productData.length > 0 ? (
                        productData.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.productCode} - {product.productName}
                          </option>
                        ))
                      ) : (
                        <option disabled>No products available</option>
                      )}
                    </select>
                  )}
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
                  <div />
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-black mb-3">Material Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Material</label>
                      <input
                        value={form.materialDetails?.material || ''}
                        onChange={(e)=>setForm(f=>({
                          ...f,
                          material: e.target.value,
                          materialDetails: { ...(f.materialDetails || {}), material: e.target.value }
                        }))}
                        type="text"
                        placeholder="e.g. Stainless Steel 316"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Gas</label>
                      <input
                        value={form.materialDetails?.gas || ''}
                        onChange={(e)=>setForm(f=>({ ...f, materialDetails: { ...(f.materialDetails || {}), gas: e.target.value } }))}
                        type="text"
                        placeholder="e.g. Nitrogen"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Thickness</label>
                      <input
                        value={form.materialDetails?.thickness || ''}
                        onChange={(e)=>setForm(f=>({ ...f, materialDetails: { ...(f.materialDetails || {}), thickness: e.target.value } }))}
                        type="text"
                        placeholder="e.g. 2mm"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Type</label>
                      <input
                        value={form.materialDetails?.type || ''}
                        onChange={(e)=>setForm(f=>({ ...f, materialDetails: { ...(f.materialDetails || {}), type: e.target.value } }))}
                        type="text"
                        placeholder="e.g. Sheet"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                      />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-black mb-3">Process Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-black">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(form.processDetails?.laserCutting)}
                        onChange={(e)=>setForm(f=>({ ...f, processDetails: { ...(f.processDetails || {}), laserCutting: e.target.checked } }))}
                        className="h-4 w-4"
                      />
                      <span>Laser Cutting</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(form.processDetails?.bending)}
                        onChange={(e)=>setForm(f=>({ ...f, processDetails: { ...(f.processDetails || {}), bending: e.target.checked } }))}
                        className="h-4 w-4"
                      />
                      <span>Bending</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(form.processDetails?.fabrication)}
                        onChange={(e)=>setForm(f=>({ ...f, processDetails: { ...(f.processDetails || {}), fabrication: e.target.checked } }))}
                        className="h-4 w-4"
                      />
                      <span>Fabrication</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(form.processDetails?.powderCoating)}
                        onChange={(e)=>setForm(f=>({ ...f, processDetails: { ...(f.processDetails || {}), powderCoating: e.target.checked } }))}
                        className="h-4 w-4"
                      />
                      <span>Powder Coating</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-black">Assign to Department</label>
                  <select
                    value={form.dept}
                    onChange={(e) => setForm((f) => ({ ...f, dept: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                  >
                    <option value="">Select initial department...</option>
                    <option value="ENQUIRY">Enquiry</option>
                    <option value="DESIGN">Design</option>
                    <option value="PRODUCTION">Production</option>
                    <option value="MACHINING">Machining</option>
                    <option value="INSPECTION">Inspection</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 flex-shrink-0">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-md border border-gray-300 text-black">Cancel</button>
                <button onClick={createOrder} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white">Create Order</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Inline Add Customer modal */}
      {showInlineCustomerModal && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowInlineCustomerModal(false)}
          />
          <div className="absolute inset-0 flex items-start md:items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl border border-gray-200 my-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-black">Add New Customer</h3>
                  <p className="text-sm text-black/70">Enter the customer details below.</p>
                </div>
                <button
                  onClick={() => setShowInlineCustomerModal(false)}
                  className="text-black"
                >
                  ×
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={inlineCustomerForm.customerName}
                      onChange={(e) =>
                        setInlineCustomerForm((f) => ({ ...f, customerName: e.target.value }))
                      }
                      type="text"
                      placeholder="Enter customer name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Company Name</label>
                    <input
                      value={inlineCustomerForm.companyName}
                      onChange={(e) =>
                        setInlineCustomerForm((f) => ({ ...f, companyName: e.target.value }))
                      }
                      type="text"
                      placeholder="Enter company name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Email Address</label>
                    <input
                      value={inlineCustomerForm.email}
                      onChange={(e) =>
                        setInlineCustomerForm((f) => ({ ...f, email: e.target.value }))
                      }
                      type="email"
                      placeholder="Enter email address"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Customer Number</label>
                    <input
                      value={inlineCustomerForm.customerNumber}
                      onChange={(e) =>
                        setInlineCustomerForm((f) => ({ ...f, customerNumber: e.target.value }))
                      }
                      type="text"
                      placeholder="Enter customer number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">GST Number</label>
                    <input
                      value={inlineCustomerForm.gstNumber}
                      onChange={(e) =>
                        setInlineCustomerForm((f) => ({ ...f, gstNumber: e.target.value }))
                      }
                      type="text"
                      placeholder="Enter GST number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Phone Number</label>
                    <input
                      value={inlineCustomerForm.phoneNumber}
                      onChange={(e) =>
                        setInlineCustomerForm((f) => ({ ...f, phoneNumber: e.target.value }))
                      }
                      type="text"
                      placeholder="Enter phone number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-black">Primary Address</label>
                  <textarea
                    value={inlineCustomerForm.primaryAddress}
                    onChange={(e) =>
                      setInlineCustomerForm((f) => ({ ...f, primaryAddress: e.target.value }))
                    }
                    placeholder="Enter primary address"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[80px] text-black"
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-black">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={inlineCustomerForm.useAsBilling}
                      onChange={(e) =>
                        setInlineCustomerForm((f) => ({ ...f, useAsBilling: e.target.checked }))
                      }
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <span>Use as Billing Address</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={inlineCustomerForm.useAsShipping}
                      onChange={(e) =>
                        setInlineCustomerForm((f) => ({ ...f, useAsShipping: e.target.checked }))
                      }
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <span>Use as Shipping Address</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
                <button
                  onClick={() => setShowInlineCustomerModal(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 text-black"
                  disabled={savingInlineCustomer}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveInlineCustomer}
                  className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={savingInlineCustomer}
                >
                  {savingInlineCustomer ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Inline Add Product modal */}
      {showInlineProductModal && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowInlineProductModal(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-black">Add New Product</h3>
                  <p className="text-sm text-black/70">Enter the details for the new product.</p>
                </div>
                <button
                  onClick={() => setShowInlineProductModal(false)}
                  className="text-black"
                >
                  ×
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-black">Product Name</label>
                  <input
                    value={inlineProductForm.name}
                    onChange={(e) =>
                      setInlineProductForm((f) => ({ ...f, name: e.target.value }))
                    }
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-black">Product Code</label>
                  <input
                    value={inlineProductForm.code}
                    onChange={(e) =>
                      setInlineProductForm((f) => ({ ...f, code: e.target.value }))
                    }
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-black">Status</label>
                  <select
                    value={inlineProductForm.status}
                    onChange={(e) =>
                      setInlineProductForm((f) => ({ ...f, status: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
                <button
                  onClick={() => setShowInlineProductModal(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 text-black"
                  disabled={savingInlineProduct}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveInlineProduct}
                  className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={savingInlineProduct}
                >
                  {savingInlineProduct ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setShowViewModal(false)}
        />
      )}
      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-gray-200 max-h-[60vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-black">Edit Order - SF{selectedOrder.orderId}</h3>
                <button onClick={() => setShowEditModal(false)} className="text-black">×</button>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700 text-sm">{formError}</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1 text-black">Customer</label>
                  <select
                    value={form.customer}
                    onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                  >
                    <option value="">Select Customer...</option>
                    {Array.isArray(customerData) && customerData.length > 0 ? (
                      customerData.map((customer) => (
                        <option
                          key={customer.customerId}
                          value={customer.customerId}
                        >
                          {customer.companyName || customer.customerName}
                        </option>
                      ))
                    ) : (
                      <option disabled>No customers available</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-black">Products</label>
                  <select
                    value={form.products}
                    onChange={(e) => setForm((f) => ({ ...f, products: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                  >
                    <option value="">Select Products...</option>
                    {Array.isArray(productData) && productData.length > 0 ? (
                      productData.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.productCode} - {product.productName}
                        </option>
                      ))
                    ) : (
                      <option disabled>No products available</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-black">Custom Product Details</label>
                  <textarea
                    value={form.custom}
                    onChange={(e) => setForm((f) => ({ ...f, custom: e.target.value }))}
                    placeholder="For custom, one-off products, describe them here..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[90px] text-black"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Units</label>
                    <input
                      value={form.units}
                      onChange={(e) => setForm((f) => ({ ...f, units: e.target.value }))}
                      type="number"
                      placeholder="e.g. 500"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                    />
                  </div>
                  <div />
                </div>

                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-black mb-3">Material Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Material</label>
                      <input
                        value={form.materialDetails?.material || ''}
                        onChange={(e)=>setForm(f=>({
                          ...f,
                          material: e.target.value,
                          materialDetails: { ...(f.materialDetails || {}), material: e.target.value }
                        }))}
                        type="text"
                        placeholder="e.g. Stainless Steel 316"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Gas</label>
                      <input
                        value={form.materialDetails?.gas || ''}
                        onChange={(e)=>setForm(f=>({ ...f, materialDetails: { ...(f.materialDetails || {}), gas: e.target.value } }))}
                        type="text"
                        placeholder="e.g. Nitrogen"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Thickness</label>
                      <input
                        value={form.materialDetails?.thickness || ''}
                        onChange={(e)=>setForm(f=>({ ...f, materialDetails: { ...(f.materialDetails || {}), thickness: e.target.value } }))}
                        type="text"
                        placeholder="e.g. 2mm"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Type</label>
                      <input
                        value={form.materialDetails?.type || ''}
                        onChange={(e)=>setForm(f=>({ ...f, materialDetails: { ...(f.materialDetails || {}), type: e.target.value } }))}
                        type="text"
                        placeholder="e.g. Sheet"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-black mb-3">Process Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-black">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(form.processDetails?.laserCutting)}
                        onChange={(e)=>setForm(f=>({ ...f, processDetails: { ...(f.processDetails || {}), laserCutting: e.target.checked } }))}
                        className="h-4 w-4"
                      />
                      <span>Laser Cutting</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(form.processDetails?.bending)}
                        onChange={(e)=>setForm(f=>({ ...f, processDetails: { ...(f.processDetails || {}), bending: e.target.checked } }))}
                        className="h-4 w-4"
                      />
                      <span>Bending</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(form.processDetails?.fabrication)}
                        onChange={(e)=>setForm(f=>({ ...f, processDetails: { ...(f.processDetails || {}), fabrication: e.target.checked } }))}
                        className="h-4 w-4"
                      />
                      <span>Fabrication</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(form.processDetails?.powderCoating)}
                        onChange={(e)=>setForm(f=>({ ...f, processDetails: { ...(f.processDetails || {}), powderCoating: e.target.checked } }))}
                        className="h-4 w-4"
                      />
                      <span>Powder Coating</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-black">Assign to Department</label>
                  <select
                    value={form.dept}
                    onChange={(e) => setForm((f) => ({ ...f, dept: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                  >
                    <option value="">Select initial department...</option>
                    <option value="ENQUIRY">Enquiry</option>
                    <option value="DESIGN">Design</option>
                    <option value="PRODUCTION">Production</option>
                    <option value="MACHINING">Machining</option>
                    <option value="INSPECTION">Inspection</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 flex-shrink-0">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-md border border-gray-300 text-black">
                  Cancel
                </button>
                <button onClick={updateOrder} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white">
                  Update Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// OrdersTable component
function OrdersTable({ rows = [], onView, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-black">
            <th className="py-2 px-3">Order ID</th>
            <th className="py-2 px-3">Customer</th>
            <th className="py-2 px-3">Product(s)</th>
            <th className="py-2 px-3">Date Created</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Address</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={i % 2 ? 'bg-gray-50' : ''}>
              <td className="py-2 px-3 font-medium text-indigo-600">
                <button
                  type="button"
                  onClick={() => onView(r)}
                  className="underline hover:text-indigo-800"
                >
                  {r.id}
                </button>
              </td>
              <td className="py-2 px-3 text-black">{r.customer}</td>
              <td className="py-2 px-3 text-black">{r.products}</td>
              <td className="py-2 px-3 text-black">{r.date}</td>
              <td className="py-2 px-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  {r.status}
                </span>
              </td>
              <td className="py-2 px-3 text-black max-w-xs truncate" title={r.address}>{r.address}</td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onView(r)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded"
                    title="View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onEdit(r)}
                    className="text-green-600 hover:text-green-800 p-1 rounded"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(r)}
                    className="text-red-600 hover:text-red-800 p-1 rounded"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


