
'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import * as orderApi from '../orders/api';

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
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100">Close</button>
        </div>

        {/* Progress */}
        <div className="m-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {['Inquiry','Design','Production','Machining','Inspection','Completed'].map((step, i) => (
              <div key={step} className="flex-1 flex items-center">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full border ${order.status===step ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-500'}`}>
                  {i+1}
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
                  {Array.isArray(order.products)
                    ? order.products
                        .map((p) => p && (p.productName || p.productCode))
                        .filter(Boolean)
                        .join(', ')
                    : order.products && typeof order.products === 'object'
                      ? (order.products.productName || order.products.productCode || 'No Product')
                      : (order.products || 'No Product')}
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
                  {['Inquiry','Design','Production','Machining','Inspection','Completed'].map(s => (
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
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
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
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ customer: '', products: '', custom: '', units: '', material: '', dept: '' });

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
          };
        });

        setOrders(transformed);
      } catch (err) {
        console.error('Error fetching orders for admin design queue:', err);
      }
    };

    fetchOrders();
  }, []);
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchesQuery = `${o.id} ${o.customer}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === 'all' ? true : o.status.toLowerCase() === status;
      return matchesQuery && matchesStatus;
    });
  }, [orders, query, status]);

  const badge = (s) => {
    const map = {
      Inquiry: 'bg-blue-100 text-blue-700',
      Design: 'bg-purple-100 text-purple-700',
      Machining: 'bg-yellow-100 text-yellow-800',
      Inspection: 'bg-indigo-100 text-indigo-700',
    };
    return map[s] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="w-full">
      {/* Page content - layout is handled by ClientLayout */}
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Orders</h1>
            <p className="text-sm text-gray-600 mt-1">Oversee and manage all active and completed orders.</p>
          </div>
          {/* <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md">
            <span>＋</span> Create Order
          </button> */}
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
          <div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900">
              <option value="all">all</option>
              <option value="inquiry">Inquiry</option>
              <option value="design">Design</option>
              <option value="machining">Machining</option>
              <option value="inspection">Inspection</option>
            </select>
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
                <th className="py-3 px-4 font-medium">Actions</th>
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
                    <button 
                      onClick={() => setSelectedOrder(o)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
      
      {/* Details Panel */}
      <DetailsPanel 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </div>
  );
}
