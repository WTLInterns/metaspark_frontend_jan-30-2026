// 'use client'

// export default function ProductionLinePage() {
//   return (
//     <main className="min-h-screen bg-gray-50 p-6">
//       <div className="bg-white border border-gray-200 rounded-lg p-4">
//         <h1 className="text-2xl font-semibold text-black">Production Line</h1>
//         <p className="text-black mt-2">This is the Production Line page.</p>
//       </div>
//     </main>
//   );
// }


'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

export default function ProductionLinePage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orders, setOrders] = useState([
    { id: 'SF1005', customer: 'Tyrell Corporation', products: 'Voight-Kampff machine empathy sensors', date: 'Nov 19, 2025', status: 'Inquiry' },
    { id: 'SF1004', customer: 'Cyberdyne Systems', products: 'T-800 endoskeleton fingers (prototype)', date: 'Nov 17, 2025', status: 'Design' },
    { id: 'SF1003', customer: 'Wayne Enterprises', products: 'Graphene-composite body armor plates', date: 'Nov 16, 2025', status: 'Machining' },
    { id: 'SF1002', customer: 'Stark Industries', products: 'Custom arc reactor casings', date: 'Nov 14, 2025', status: 'Inspection' },
  ]);
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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Orders</h1>
            <p className="text-sm text-gray-600 mt-1">Oversee and manage all active and completed orders.</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md">
            <span>＋</span> Create Order
          </button>
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
                    <Link href={`/orders/${o.id}`} className="text-gray-900 hover:text-indigo-700 font-medium">View Details</Link>
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
      </main>
    </div>
  );
}
