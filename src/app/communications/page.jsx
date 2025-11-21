'use client';
import { useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState('inbox'); // inbox | sent
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState('');

  const [inbox, setInbox] = useState([
    {
      id: 'MSG-201',
      dept: 'Machining',
      orderId: 'SF1002',
      priority: 'High',
      read: false,
      timestamp: 'Nov 19, 2025 at 12:25 PM',
      body: 'URGENT: Issue with tolerance on arc reactor casings for #SF1002. Need immediate inspection before proceeding.'
    },
    {
      id: 'MSG-200',
      dept: 'Design',
      orderId: 'SF1004',
      priority: 'High',
      read: false,
      timestamp: 'Nov 19, 2025 at 7:25 AM',
      body: 'The prototype material for #SF1004 is proving difficult to machine. We may need to reconsider the alloy.'
    },
    {
      id: 'MSG-199',
      dept: 'Design',
      orderId: 'SF1003',
      priority: 'Medium',
      read: false,
      timestamp: 'Nov 18, 2025 at 5:15 PM',
      body: 'Requesting feedback on the revised drawings for #SF1003 before sending to production.'
    }
  ]);
  const [sent, setSent] = useState([]);

  const [form, setForm] = useState({ dept: '', orderId: '', priority: 'Medium', body: '' });

  const list = activeTab === 'inbox' ? inbox : sent;
  const filtered = useMemo(() => {
    return list.filter(item =>
      `${item.dept} ${item.orderId} ${item.body}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [list, query]);

  const priorityPill = (p) => (
    p === 'High' ? 'bg-red-100 text-red-700' : p === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'
  );

  const markAsRead = (id) => {
    setInbox(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const createMessage = () => {
    if (!form.dept || !form.body.trim()) return;
    const currentMax = Math.max(200, ...[...inbox, ...sent].map(m => Number(String(m.id).replace(/\D/g, '')) || 0));
    const id = `MSG-${currentMax + 1}`;
    const options = { month: 'short', day: '2-digit', year: 'numeric' };
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateStr = `${new Date().toLocaleDateString('en-US', options)} at ${time}`;
    const newMsg = { id, dept: form.dept, orderId: form.orderId || '', priority: form.priority, read: false, timestamp: dateStr, body: form.body.trim() };
    setInbox(prev => [newMsg, ...prev]);
    setShowModal(false);
    setForm({ dept: '', orderId: '', priority: 'Medium', body: '' });
    setActiveTab('inbox');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Communications Center</h1>
              <p className="text-sm text-gray-600 mt-1">Send and receive messages between departments.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md">
              <span>＋</span> New Message
            </button>
          </div>

          {/* Tabs + Search */}
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button onClick={() => setActiveTab('inbox')} className={`px-4 py-2 text-sm rounded-md ${activeTab==='inbox' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>Inbox ({inbox.length})</button>
              <button onClick={() => setActiveTab('sent')} className={`px-4 py-2 text-sm rounded-md ${activeTab==='sent' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>Sent ({sent.length})</button>
            </div>
            <div className="flex-1 min-w-[220px]">
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search messages..." className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none" />
            </div>
          </div>

          {/* Message Cards */}
          <div className="mt-5 space-y-4">
            {filtered.map(item => (
              <div key={item.id} className="rounded-lg border border-gray-200 bg-indigo-50/40">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.read ? 'bg-gray-300' : 'bg-red-500'}`} />
                      <p className="text-sm font-semibold text-gray-900">From: {item.dept}</p>
                      {item.orderId && <span className="text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded px-2 py-0.5">#{item.orderId}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityPill(item.priority)}`}>{item.priority}</span>
                      {activeTab==='inbox' && !item.read && (
                        <button onClick={() => markAsRead(item.id)} className="text-xs font-medium px-3 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50">Mark as Read</button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{item.timestamp}</p>
                  <p className="mt-2 text-sm text-gray-800">{item.body}</p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-10">No messages found.</div>
            )}
          </div>
        </div>

        {/* New Message Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-white rounded-lg border border-gray-200 shadow" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">New Message</h3>
                  <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowModal(false)}>✕</button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select value={form.dept} onChange={(e)=>setForm(f=>({...f, dept:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                      <option value="">Select department...</option>
                      <option value="Design">Design</option>
                      <option value="Machining">Machining</option>
                      <option value="Production">Production</option>
                      <option value="Inspection">Inspection</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Related Order (optional)</label>
                    <input value={form.orderId} onChange={(e)=>setForm(f=>({...f, orderId:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. SF1002" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select value={form.priority} onChange={(e)=>setForm(f=>({...f, priority:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea value={form.body} onChange={(e)=>setForm(f=>({...f, body:e.target.value}))} rows={5} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Type your message..." />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-4 border-top border-gray-200">
                  <button type="button" onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md">Cancel</button>
                  <button type="button" onClick={createMessage} className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white">Send Message</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
