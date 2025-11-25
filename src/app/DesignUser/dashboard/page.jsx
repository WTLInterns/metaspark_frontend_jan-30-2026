'use client';

import React, { useState } from 'react';
import Link from 'next/link';

function DetailsPanel({ order, onClose }) {
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
                <div className={`flex items-center justify-center h-8 w-8 rounded-full border ${order.status===step ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-500'}`}>{i+1}</div>
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
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-black">{order.products}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-black mb-1">Units</div>
                  <div className="text-black">20</div>
                </div>
                <div>
                  <div className="text-xs text-black mb-1">Material</div>
                  <div className="text-black">Bi-metallic film</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs text-black mb-1">Customer</div>
                  <div className="text-black">{order.customer}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs text-black mb-1">Address</div>
                  <div className="text-black">Nexus Building, Los Angeles</div>
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
                  <textarea placeholder="Add comments about the status change..." className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm min-h-[90px] text-black" />
                </div>
                <div className="sm:col-span-2">
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md">Update Status</button>
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-black mb-2">Status History</h3>
              <div className="border border-dashed border-gray-300 rounded-md p-8 text-center text-gray-500">
                No History
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-black">Assigned Team</h3>
                <button className="text-black hover:text-black">✎</button>
              </div>
              {['Design','Production','Machinists','Inspection'].map(team => (
                <div key={team} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">?</div>
                    <div>
                      <div className="text-black">Unassigned</div>
                      <div className="text-xs text-black">{team}</div>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">✎</button>
                </div>
              ))}
            </section>

            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-black mb-3">Reports</h3>
              {['Notes Summary','Design Report','Production Report','Machinists Report','Inspection Report'].map((r, i) => (
                <div key={r} className={`flex items-center justify-between px-3 py-2 rounded-md ${i===0 ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}>
                  <span className="text-black">{r}</span>
                  <button className="text-black hover:text-black">⬇</button>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rows, setRows] = useState([
    { id: 'SF1005', customer: 'Tyrell Corporation', products: 'Voight-Kampff machine empathy sensors', date: 'Nov 20, 2025', status: 'Inquiry', dept: 'Design' },
    { id: 'SF1006', customer: 'Acme Corp', products: 'Custom brackets', date: 'Nov 18, 2025', status: 'Design', dept: 'Design' },
    { id: 'SF1007', customer: 'Wayne Tech', products: 'Titanium shafts', date: 'Nov 17, 2025', status: 'Machining', dept: 'Machining' },
  ]);
  const [form, setForm] = useState({ customer: '', products: '', custom: '', units: '', material: '', dept: '' });

  const createOrder = () => {
    const nextNum = Math.max(
      1000,
      ...rows.map(r => Number(String(r.id).replace(/\D/g, '')))
    ) + 1;
    const id = `SF${nextNum}`;
    const productText = form.custom?.trim() ? form.custom.trim() : (form.products || '—');
    const options = { month: 'short', day: '2-digit', year: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    const newRow = {
      id,
      customer: form.customer || 'Unknown Customer',
      products: productText,
      date: dateStr,
      status: 'Inquiry',
      dept: form.dept || 'Design',
    };
    setRows(prev => [newRow, ...prev]);
    setShowCreateModal(false);
    setForm({ customer: '', products: '', custom: '', units: '', material: '', dept: '' });
  };
  return (
    <div className="w-full">
      {/* Main content */}
      <main className="w-full p-0">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-md border border-gray-200 hover:bg-gray-50">
              <span className="sr-only">Toggle</span>✦
            </button>
            <h1 className="text-2xl font-semibold text-black">Dashboard</h1>
          </div>

          {/* <div className="flex items-center gap-3">
            <button className="p-2 rounded-full hover:bg-gray-100">🔔</button>
            <div className="h-8 w-8 rounded-full bg-gray-800" />
          </div> */}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-black">Orders by Status</h2>
              <span className="text-xs text-black">Last 30 days</span>
            </div>
            <p className="text-sm text-black mb-4">
              A breakdown of all orders by their current status.
            </p>
            <BarChart />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-black">Active Orders by Department</h2>
              <span className="text-xs text-black">Last 30 days</span>
            </div>
            <p className="text-sm text-black mb-4">
              Distribution of active orders across departments.
            </p>
            <DonutChart />
            <div className="flex gap-6 justify-center mt-4 text-xs text-black">
              <LegendDot color="bg-orange-500" label="Design" />
              <LegendDot color="bg-blue-500" label="Machining" />
              <LegendDot color="bg-yellow-400" label="Inspection" />
            </div>
          </div>
        </div>

        {/* Orders table section */}
        <div className="bg-white border-t border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-black">Design Department</h1>
          </div>
          <div  className="flex items-center justify-between mb-3 text-black">
            <p><p>Manage orders in the inquiry and design phase.</p></p>
            </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by Order ID or Customer..."
                className="w-full border border-gray-200 rounded-md px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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

          <OrdersTable rows={rows} statusFilter={statusFilter} onView={setSelectedOrder} />
        </div>
        {/* Details Panel */}
        {selectedOrder && (
          <DetailsPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        )}

        {/* Create Order Modal */}
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

/* UI Pieces */

function SidebarItem({ label, active = false }) {
  return (
    <div
      className={`px-3 py-2 rounded-md cursor-pointer ${
        active ? 'bg-gray-100 text-black font-medium' : 'text-black hover:bg-gray-50'
      }`}
    >
      {label}
    </div>
  );
}

function SidebarGroup({ label, items = [] }) {
  return (
    <div>
      <div className="px-3 py-2 text-black">{label}</div>

      <div className="ml-2 pl-1 border-l border-gray-200 space-y-1">
        {items.map((i) => (
          <SidebarItem key={i} label={i} />
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-black">{label}</span>
    </div>
  );
}

function BarChart() {
  // simple bar visualization using SVG
  const bars = [
    { label: 'Inquiry', value: 4, color: 'fill-orange-400' },
    { label: 'Design', value: 4, color: 'fill-blue-500' },
    { label: 'Machining', value: 4, color: 'fill-yellow-400' },
    { label: 'Inspection', value: 4, color: 'fill-emerald-500' },
    { label: 'Completed', value: 0.5, color: 'fill-gray-200' },
  ];

  const max = Math.max(...bars.map((b) => b.value)) || 1;

  return (
    <div className="h-64">
      <svg viewBox="0 0 500 220" className="w-full h-full">
        {/* axes */}
        <line x1="40" y1="10" x2="40" y2="200" stroke="#e5e7eb" strokeWidth="2" />
        <line x1="40" y1="200" x2="480" y2="200" stroke="#e5e7eb" strokeWidth="2" />
        {bars.map((b, idx) => {
          const bw = 70;
          const gap = 15;
          const x = 50 + idx * (bw + gap);
          const h = (b.value / max) * 160;
          const y = 200 - h;
          return (
            <g key={b.label}>
              <rect x={x} y={y} width={bw} height={h} className={b.color} rx="6" />
              <text x={x + bw / 2} y="215" textAnchor="middle" className="fill-black" fontSize="10">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart() {
  // simple donut visualization using SVG
  const segments = [
    { label: 'Design', value: 45, color: '#f97316' }, // orange-500
    { label: 'Machining', value: 35, color: '#3b82f6' }, // blue-500
    { label: 'Inspection', value: 20, color: '#facc15' }, // yellow-400
  ];
  const total = segments.reduce((a, b) => a + b.value, 0);
  const radius = 70;
  const cx = 130;
  const cy = 100;
  let startAngle = -90;

  const arcs = segments.map((s) => {
    const angle = (s.value / total) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;

    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);

    const d = [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArc, 0, end.x, end.y,
      'L', cx, cy,
      'Z',
    ].join(' ');

    startAngle = endAngle;
    return { d, color: s.color };
  });

  return (
    <div className="h-64 flex items-center justify-center">
      <svg viewBox="0 0 260 200" className="w-full h-full max-w-md">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} opacity="0.9" />
        ))}
        <circle cx={cx} cy={cy} r={40} fill="white" />
      </svg>
    </div>
  );
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function OrdersTable({ rows = [], statusFilter = 'All', onView }) {
  const visible = statusFilter === 'All' ? rows : rows.filter(r => r.status === statusFilter);
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
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.id} className={i % 2 ? 'bg-gray-50' : ''}>
              <td className="py-2 px-3 font-medium text-indigo-600">
                <Link href={`/orders/${r.id}`} className="underline">{r.id}</Link>
              </td>
              <td className="py-2 px-3 text-black">{r.customer}</td>
              <td className="py-2 px-3 text-black">{r.products}</td>
              <td className="py-2 px-3 text-black">{r.date}</td>
              <td className="py-2 px-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  {r.status}
                </span>
              </td>
              <td className="py-2 px-3">
                <button 
                  onClick={() => onView?.(r)} 
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