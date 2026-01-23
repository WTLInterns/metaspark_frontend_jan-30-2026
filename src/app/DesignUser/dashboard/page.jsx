'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useCustomerProductData } from './useCustomerProductData';
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

  const [isSavingStageProgress, setIsSavingStageProgress] = useState(false);
  const [stageProgressError, setStageProgressError] = useState('');

  useEffect(() => {
    setStageProgress({
      designProgress: Number(order?.designProgress ?? 0),
      productionProgress: Number(order?.productionProgress ?? 0),
      machiningProgress: Number(order?.machiningProgress ?? 0),
      inspectionProgress: Number(order?.inspectionProgress ?? 0),
    });
  }, [order?.designProgress, order?.productionProgress, order?.machiningProgress, order?.inspectionProgress]);

  const visibleReports = getVisibleReportDefsForCurrentUser();

  const downloadReport = (type) => {
    if (typeof downloadReportUtil !== 'function') return;
    if (!resolvedOrderId) {
      console.error('Cannot download report, missing order id');
      return;
    }
    return downloadReportUtil({ orderDisplayId: resolvedOrderId, type });
  };

  const getStatusBadgeClasses = (status) => {
    const base = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium';
    const value = (status || '').toUpperCase();

    switch (value) {
      case 'INQUIRY':
      case 'ENQUIRY':
        return `${base} bg-slate-100 text-slate-700`;
      case 'DESIGN':
        return `${base} bg-purple-100 text-purple-700`;
      case 'PRODUCTION':
        return `${base} bg-orange-100 text-orange-700`;
      case 'MACHINING':
        return `${base} bg-yellow-100 text-yellow-700`;
      case 'INSPECTION':
        return `${base} bg-blue-100 text-blue-700`;
      case 'COMPLETED':
        return `${base} bg-emerald-100 text-emerald-700`;
      default:
        return `${base} bg-gray-100 text-gray-700`;
    }
  };

  const getStatusDisplayMessage = (status) => {
    if (!status) return '';
    if (status.displayMessage) return String(status.displayMessage);

    const rawComment = status.comment != null ? String(status.comment) : '';
    const trimmed = rawComment.trim();
    const isJsonLike = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
    if (isJsonLike) {
      try {
        JSON.parse(trimmed);
        const to = status.newStatus ? String(status.newStatus) : '';
        if (to.toUpperCase() === 'PRODUCTION') return 'Design selection saved and sent to Production';
        if (to.toUpperCase() === 'MACHINING') return 'Production selection saved and sent to Machining';
        if (to.toUpperCase() === 'INSPECTION') return 'Machining selection saved and sent to Inspection';
        return 'Selection saved';
      } catch {
        // If it looks like JSON but isn't valid, fall through to normal status message
      }
    }

    const from = status.oldStatus ? String(status.oldStatus) : '';
    const to = status.newStatus ? String(status.newStatus) : '';
    if (from && to) {
      return `Status moved from ${from} to ${to}`;
    }
    if (to) {
      return `Status set to ${to}`;
    }
    if (from) {
      return `Status updated from ${from}`;
    }
    return 'Status updated';
  };

  // Handle file selection
  const handleFileChange = (e) => {
    setAttachment(e.target.files[0]);
  };

  // Fetch status history
  useEffect(() => {
    const fetchStatusHistory = async () => {
      try {
        setLoadingHistory(true);
        if (!numericOrderId) {
          setStatusHistory([]);
          return;
        }

        // Get token from localStorage
        const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
        const token = authData?.token;

        const response = await fetch(`http://localhost:8080/status/order/${numericOrderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          setStatusHistory([]);
          return;
        }

        const data = await response.json();
        setStatusHistory(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching status history:', error);
        setStatusHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchStatusHistory();
  }, [numericOrderId]);

  // Handle form submission
  const handleSubmitStatus = async (e) => {
    e.preventDefault();
    if (!newStatus) {
      setSubmitError('Please select a status');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Create FormData object for multipart request
      const formData = new FormData();

      // Create status request object
      const statusRequest = {
        newStatus: newStatus.toUpperCase(),
        comment: comment || '',
        percentage: null,
      };

      // Append status request as JSON string
      formData.append('status', new Blob([JSON.stringify(statusRequest)], {
        type: 'application/json'
      }));

      // Append attachment if provided
      if (attachment) {
        formData.append('attachment', attachment);
      }

      if (!numericOrderId) {
        setSubmitError('Invalid order id for status update');
        return;
      }

      // Get token from localStorage
      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;

      // Make API call with authorization header
      const response = await fetch(`http://localhost:8080/status/create/${numericOrderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Reset form
      setNewStatus('');
      setComment('');
      setAttachment(null);
      toast.success('Status updated successfully!');

      // Immediately refresh status history so the UI shows the latest entry
      try {
        const historyResponse = await fetch(`http://localhost:8080/status/order/${numericOrderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (historyResponse.ok) {
          const latestHistory = await historyResponse.json();
          setStatusHistory(latestHistory);
        }
      } catch (historyError) {
        console.error('Error refreshing status history after update:', historyError);
      }

      // Notify parent to refresh order data
      if (onUpdateOrder) {
        onUpdateOrder(numericOrderId, newStatus);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setSubmitError('Failed to update status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveStageProgress = async (stageKey, progressValue) => {
    setStageProgressError('');
    setIsSavingStageProgress(true);

    try {
      if (!numericOrderId) {
        setStageProgressError('Invalid order id for stage progress update');
        return;
      }

      const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
      const token = authData?.token;

      const stageMap = {
        designProgress: 'DESIGN',
        productionProgress: 'PRODUCTION',
        machiningProgress: 'MACHINING',
        inspectionProgress: 'INSPECTION',
      };

      const stage = stageMap[stageKey];
      if (!stage) {
        throw new Error('Invalid stage');
      }

      const response = await fetch(`http://localhost:8080/order/${numericOrderId}/stage-progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stage,
          progress: Number(progressValue),
        }),
      });

      if (!response.ok) {
        let msg = 'Failed to update stage progress';
        try {
          const data = await response.json();
          if (data?.message) msg = data.message;
          if (data?.error) msg = data.error;
        } catch {}
        throw new Error(msg);
      }

      const updatedOrder = await response.json();
      toast.success('Stage progress updated');

      if (onUpdateOrder) {
        onUpdateOrder(orderId, null, {
          designProgress: updatedOrder.designProgress,
          productionProgress: updatedOrder.productionProgress,
          machiningProgress: updatedOrder.machiningProgress,
          inspectionProgress: updatedOrder.inspectionProgress,
        });
      }
    } catch (err) {
      setStageProgressError(err?.message || 'Failed to update stage progress');
    } finally {
      setIsSavingStageProgress(false);
    }
  };

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

        {/* Attachment Modal */}
        {selectedAttachment && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden">
              <div className="absolute top-4 right-4 flex gap-2">
                <a
                  href={selectedAttachment}
                  download
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                >
                  Download
                </a>
                <button
                  onClick={() => setSelectedAttachment(null)}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
                >
                  Close
                </button>
              </div>

              <div className="flex items-center justify-center h-full p-4">
                {selectedAttachment.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img
                    src={selectedAttachment}
                    alt="Attachment"
                    className="max-w-full max-h-[80vh] object-contain"
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="text-4xl mb-4">📄</div>
                    <p className="text-lg text-gray-700 mb-2">File Preview Unavailable</p>
                    <p className="text-gray-500 mb-4">This file type cannot be previewed directly.</p>
                    <a
                      href={selectedAttachment}
                      download
                      className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="m-4 rounded-2xl border border-indigo-50 bg-gradient-to-r from-white via-slate-50 to-indigo-50 px-6 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          {(() => {
            const steps = [
              { key: 'ENQUIRY', label: 'Inquiry' },

              { key: 'DESIGN', label: 'Design' },
              { key: 'PRODUCTION', label: 'Production' },
              { key: 'MACHINING', label: 'Machining' },
              { key: 'INSPECTION', label: 'Inspection' },
              { key: 'COMPLETED', label: 'Completed' },
            ];
            const backendStatus = (order.department || 'ENQUIRY').toUpperCase();
            const currentIndex = Math.max(
              0,
              steps.findIndex((s) => s.key === backendStatus)
            );
            const progressPercent = (currentIndex / (steps.length - 1)) * 100;

            const departmentProgress = {
              ENQUIRY: backendStatus === 'ENQUIRY' ? 0 : 100,
              DESIGN: Number(order?.designProgress ?? 0),
              PRODUCTION: Number(order?.productionProgress ?? 0),
              MACHINING: Number(order?.machiningProgress ?? 0),
              INSPECTION: Number(order?.inspectionProgress ?? 0),
              COMPLETED: 0,
            };

            // Define colors for each department
            const departmentColors = {
              'ENQUIRY': '#a855f7',    // purple
              'DESIGN': '#f97316',     // orange
              'PRODUCTION': '#22c55e', // green
              'MACHINING': '#3b82f6',  // blue
              'INSPECTION': '#eab308', // yellow
              'COMPLETED': '#6b7280'   // gray
            };

            return (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-indigo-500 font-semibold">Order progress</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {steps[currentIndex].label} stage
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-900">
                      {Math.round(progressPercent)}% <span className="font-normal text-slate-400">complete</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Step {currentIndex + 1} of {steps.length}
                    </p>
                  </div>
                </div>

                {/* Track */}
                <div className="relative w-full h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-indigo-600 to-sky-500 shadow-[0_0_18px_rgba(79,70,229,0.45)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Step dots with department progress */}
                <div className="mt-5 flex justify-between">
                  {steps.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const baseColor = isCompleted || isCurrent ? 'text-indigo-600' : 'text-gray-400';
                    const departmentPercentage = departmentProgress[step.key] || 0;

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center flex-1 min-w-0">
                        <div
                          className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] transition-all duration-200
                          ${(isCompleted || isCurrent) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : ''}
                          ${!isCompleted && !isCurrent ? 'border-slate-300 text-slate-400 bg-white' : ''}`}
                        >
                          {(isCompleted || isCurrent) ? '✓' : '•'}
                        </div>
                        <div className={`text-[11px] font-medium whitespace-nowrap ${baseColor}`}>
                          {step.label}
                        </div>
                        {/* Horizontal small progress bar for each department */}
                        <div className="w-16 mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="h-1.5 rounded-full"
                              style={{ 
                                width: `${departmentPercentage}%`,
                                backgroundColor: departmentColors[step.key] || '#9ca3af'
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {departmentPercentage}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
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
                  <div className="text-xs text-black mb-1">Units</div>
                  <div className="text-black">{order.units || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-xs text-black mb-1">Material</div>
                  <div className="text-black">{order.material || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-xs text-black mb-1">Billing Address</div>
                  <div className="text-black">
                    {order.customers && order.customers.length > 0 && order.customers[0].billingAddress 
                      ? order.customers[0].billingAddress.replace(/\n$/, '') // Remove trailing newline
                      : 'Not specified'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-black mb-1">Shipping Address</div>
                  <div className="text-black">
                    {order.customers && order.customers.length > 0 && order.customers[0].shippingAddress 
                      ? order.customers[0].shippingAddress.replace(/\n$/, '') // Remove trailing newline
                      : 'Not specified'}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs text-black mb-1">Customer</div>
                  <div className="text-black">{order.customer}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs text-black mb-1">Address</div>
                  <div className="text-black">
                    {order.customers && order.customers.length > 0 && order.customers[0].primaryAddress 
                      ? order.customers[0].primaryAddress.replace(/\n$/, '') // Remove trailing newline
                      : 'Not specified'}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-black mb-3">Update Stage Progress</h3>
              {stageProgressError && (
                <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">
                  {stageProgressError}
                </div>
              )}

              {(() => {
                const canEdit = {
                  designProgress: currentRole === 'ADMIN' || currentRole === 'DESIGN',
                  productionProgress: currentRole === 'ADMIN' || currentRole === 'PRODUCTION',
                  machiningProgress: currentRole === 'ADMIN' || currentRole === 'MACHINING',
                  inspectionProgress: currentRole === 'ADMIN' || currentRole === 'INSPECTION',
                };

                const labels = {
                  designProgress: 'Design Progress (%)',
                  productionProgress: 'Production Progress (%)',
                  machiningProgress: 'Machining Progress (%)',
                  inspectionProgress: 'Inspection Progress (%)',
                };

                const keysInRoleOrder = ['designProgress', 'productionProgress', 'machiningProgress', 'inspectionProgress'];
                const visibleKeys = currentRole === 'ADMIN'
                  ? keysInRoleOrder
                  : keysInRoleOrder.filter((k) => canEdit[k]);

                return (
                  <div className="space-y-4">
                    {visibleKeys.map((key) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs text-black">{labels[key]}</label>
                          <span className="text-xs text-gray-600">{Number(stageProgress[key] || 0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Number(stageProgress[key] || 0)}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            setStageProgress((prev) => ({ ...prev, [key]: next }));
                          }}
                          onMouseUp={(e) => saveStageProgress(key, e.target.value)}
                          onTouchEnd={(e) => saveStageProgress(key, e.target.value)}
                          disabled={!canEdit[key] || isSavingStageProgress}
                          className="w-full"
                        />
                        <div className="mt-1 text-[11px] text-gray-500">
                          {canEdit[key] ? 'You can update this stage.' : 'Read-only.'}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>

            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-black mb-3">Update Order Status</h3>
              {submitError && (
                <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">
                  {submitError}
                </div>
              )}
              <form onSubmit={handleSubmitStatus}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-black mb-1">New Status</label>
                    <select 
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm"
                      disabled={isSubmitting}
                    >
                      <option value="">Select next status...</option>
                      {['Enquiry','Design','Production','Machining','Inspection','Completed'].map(s => (
                        <option key={s} value={s.toUpperCase()}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-black mb-1">Attachment (Optional)</label>
                    <input 
                      type="file" 
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" 
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-black mb-1">Comments</label>
                    <textarea 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add comments about the status change..." 
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm min-h-[90px] text-black" 
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className={`bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>
              </form>
            </section>

            <StatusHistoryTimeline
              statusHistory={statusHistory}
              loadingHistory={loadingHistory}
              getStatusBadgeClasses={getStatusBadgeClasses}
              getStatusDisplayMessage={getStatusDisplayMessage}
              onSelectAttachment={setSelectedAttachment}
              userLabel="Admin User"
              userInitials="AU"
            />

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
              {visibleReports.map((r, i) => (
                <div key={r.type} className={`flex items-center justify-between px-3 py-2 rounded-md ${i===0 ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}>
                  <span className="text-black">{r.label}</span>
                  <button
                    type="button"
                    onClick={() => downloadReport?.(r.type)}
                    className="text-black hover:text-black"
                  >
                    ⬇
                  </button>
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
  const [formError, setFormError] = useState(''); // Add state for form error message
  const [departmentCounts, setDepartmentCounts] = useState([]);

  // Fetch customers and products for the create order modal
  const { customerData, productData, loading: customerProductLoading } = useCustomerProductData();

  // Fetch orders data
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const orders = await orderApi.getAllOrders();
      console.log('Orders data:', orders);

      // Transform the API response to match the table structure
      const transformedOrders = orders.map(order => {
        // Format the date to "27 Nov 2025" format
        let formattedDate = 'Unknown Date';
        if (order.dateAdded) {
          // Assuming dateAdded is in format "dd-MM-yyyy"
          const [day, month, year] = order.dateAdded.split('-');
          if (day && month && year) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIndex = parseInt(month) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
              formattedDate = `${parseInt(day)} ${monthNames[monthIndex]} ${year}`;
            }
          }
        }

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
          date: formattedDate,
          status: order.status || 'Inquiry',
          department: department, // Use the actual department from API
          units: order.units || '',
          material: order.material || '',
          customers: order.customers || [], // Preserve the full customers array for the details panel
          designProgress: order.designProgress ?? 0,
          productionProgress: order.productionProgress ?? 0,
          machiningProgress: order.machiningProgress ?? 0,
          inspectionProgress: order.inspectionProgress ?? 0,
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

  useEffect(() => {
    const fetchDepartmentCounts = async () => {
      try {
        // Get token from localStorage
        const authData = JSON.parse(localStorage.getItem('swiftflow-user'));
        const token = authData?.token;

        const response = await fetch('http://localhost:8080/order/getCountByDepartment', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();

        const barColorMap = {
          DESIGN: 'fill-orange-400',
          PRODUCTION: 'fill-green-500',
          INSPECTION: 'fill-yellow-400',
          MACHINING: 'fill-blue-500',
          COMPLETED: 'fill-gray-400',
          ENQUIRY: 'fill-purple-500',
        };

        const pieColorMap = {
          DESIGN: '#f97316',     // orange-500
          PRODUCTION: '#22c55e', // green-500
          INSPECTION: '#eab308', // yellow-500
          MACHINING: '#3b82f6',  // blue-500
          COMPLETED: '#6b7280',  // gray-500
          ENQUIRY: '#a855f7',    // purple-500
        };

        const labelMap = {
          DESIGN: 'Design',
          PRODUCTION: 'Production',
          INSPECTION: 'Inspection',
          MACHINING: 'Machining',
          COMPLETED: 'Completed',
          ENQUIRY: 'Inquiry',
        };

        const order = ['DESIGN', 'PRODUCTION', 'INSPECTION', 'MACHINING', 'COMPLETED', 'ENQUIRY'];

        const mapped = Array.isArray(data)
          ? data
              .map((item) => {
                const key = (item.departmentName || '').toUpperCase().trim();
                return {
                  key,
                  label: labelMap[key] || key || 'Unknown',
                  value: item.orderCount ?? 0,
                  barColor: barColorMap[key] || 'fill-gray-300',
                  pieColor: pieColorMap[key] || '#9ca3af',
                };
              })
              .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
          : [];

        setDepartmentCounts(mapped);
      } catch (err) {
        console.error('Error fetching department counts:', err);
      }
    };

    fetchDepartmentCounts();
  }, []);

  // Log any errors
  useEffect(() => {
    if (error) {
      console.error('Error fetching customer/product data:', error);
    }
    // Log the data for debugging
    console.log('Customer Data:', customerData);
    console.log('Product Data:', productData);
    console.log('Loading:', loading);
    console.log('Error:', error);
  }, [customerData, productData, loading, error]);

  const createOrder = async () => {
    try {
      // Clear any previous error
      setFormError('');

      // Validate required fields
      if (!form.customer || !form.products || !form.dept) {
        const errorMessage = 'Please select customer, product, and department';
        setFormError(errorMessage);
        toast.error(errorMessage, { duration: 10000 }); // Show for 10 seconds
        return;
      }

      // Prepare order data
      const orderData = {
        productDetails: form.products,
        customProductDetails: form.custom || '',
        units: form.units || '',
        material: form.material || '',
        department: form.dept // Values are already in uppercase format
      };

      // Call the API to create the order
      const response = await orderApi.createOrder(
        parseInt(form.customer), 
        parseInt(form.products), 
        orderData
      );

      // Show success message
      toast.success('Order created successfully', { duration: 10000 }); // Show for 10 seconds

      // Refresh the orders list
      await fetchOrders();

      setShowCreateModal(false);
      setForm({ customer: '', products: '', custom: '', units: '', material: '', dept: '' });
      setFormError(''); // Clear error on success
    } catch (error) {
      console.error('Error creating order:', error);
      // Show error message from API response or fallback to generic error
      const errorMessage = error.message || 'Error creating order';
      setFormError(errorMessage);
      toast.error(errorMessage, { duration: 10000 }); // Show for 10 seconds
    }
  };

  const handleOpenOrderDetails = async (row) => {
    try {
      const rawId = row?.id ? String(row.id).replace('SF', '') : '';
      if (!rawId) {
        toast.error('Invalid order id');
        return;
      }

      const order = await orderApi.getOrderById(rawId);
      setDetailsOrder(order);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching order details from design dashboard:', err);
      toast.error('Failed to fetch order details');
    }
  };

  const handleOpenOrderSlider = async (row) => {
    try {
      const rawId = row?.id ? String(row.id).replace('SF', '') : '';
      if (!rawId) {
        toast.error('Invalid order id');
        return;
      }

      const order = await orderApi.getOrderById(rawId);
      setSelectedOrder(order);
    } catch (err) {
      console.error('Error fetching order details for slider from design dashboard:', err);
      toast.error('Failed to fetch order details');
    }
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
            <BarChart data={departmentCounts} />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-black">Active Orders by Department</h2>
              <span className="text-xs text-black">Last 30 days</span>
            </div>
            <p className="text-sm text-black mb-4">
              Distribution of active orders across departments.
            </p>
            <DonutChart data={departmentCounts} />

            <div className="flex gap-6 justify-center mt-4 text-xs text-black">
              {departmentCounts.map((department) => (
                <div key={department.key} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: department.pieColor }}
                  />
                  <span>{department.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Orders table section */}
        <div className="bg-white border-t border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-black">All Orders</h2>
            {/* <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md">
              <span>＋</span> Create Order
            </button> */}
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              <option value="ENQUIRY">Enquiry</option>
              <option value="DESIGN">Design</option>
              <option value="PRODUCTION">Production</option>
              <option value="MACHINING">Machining</option>
              <option value="INSPECTION">Inspection</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <OrdersTable
            rows={rows}
            statusFilter={statusFilter}
            departmentFilter={departmentFilter}
            searchTerm={searchTerm}
            onView={handleOpenOrderDetails}
            onViewDetails={handleOpenOrderSlider}
            loading={loading}
            error={error}
          />
        </div>
        {/* Details Panel */}
        {showDetailsModal && detailsOrder && (
          <OrderDetailsModal
            order={detailsOrder}
            onClose={() => setShowDetailsModal(false)}
          />
        )}

        {selectedOrder && (
          <DetailsPanel
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
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
                  {formError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm">{formError}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Customer</label>
                    {loading ? (
                      <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black" disabled>
                        <option>Loading customers...</option>
                      </select>
                    ) : (
                      <select 
                        value={form.customer} 
                        onChange={(e)=>setForm(f=>({...f, customer:e.target.value}))} 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                      >
                        <option value="">Select Customer...</option>
                        {Array.isArray(customerData) && customerData.length > 0 ? (
                          customerData.map(customer => (
                            <option key={customer.customerId} value={customer.customerId}>
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
                    <label className="block text-xs font-medium mb-1 text-black">Products</label>
                    {loading ? (
                      <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black" disabled>
                        <option>Loading products...</option>
                      </select>
                    ) : (
                      <select 
                        value={form.products} 
                        onChange={(e)=>setForm(f=>({...f, products:e.target.value}))} 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black"
                      >
                        <option value="">Select Products...</option>
                        {Array.isArray(productData) && productData.length > 0 ? (
                          productData.map(product => (
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
                    <div>
                      <label className="block text-xs font-medium mb-1 text-black">Material</label>
                      <input value={form.material} onChange={(e)=>setForm(f=>({...f, material:e.target.value}))} type="text" placeholder="e.g. Stainless Steel 316" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-black">Assign to Department</label>
                    <select value={form.dept} onChange={(e)=>setForm(f=>({...f, dept:e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black">
                      <option value="">Select initial department...</option>
                      <option value="ENQUIRY">Enquiry</option>
                      <option value="DESIGN">Design</option>
                      <option value="PRODUCTION">Production</option>
                      <option value="MACHINING">Machining</option>
                      <option value="INSPECTION">Inspection</option>
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

function BarChart({ data }) {
  // If no data yet, fall back to default placeholders
  const fallback = [
    { label: 'Inquiry', value: 0, color: 'fill-purple-500' },
    { label: 'Design', value: 0, color: 'fill-orange-400' },
    { label: 'Production', value: 0, color: 'fill-green-500' },
    { label: 'Machining', value: 0, color: 'fill-blue-500' },
    { label: 'Inspection', value: 0, color: 'fill-yellow-400' },
    { label: 'Completed', value: 0, color: 'fill-gray-400' },
  ];

  const bars = (data && data.length
    ? data.map((d) => ({
        label: d.label,
        value: d.value,
        color: d.barColor || 'fill-gray-300',
      }))
    : fallback);

  const maxValue = Math.max(...bars.map((b) => b.value)) || 1;
  const maxTick = Math.max(4, maxValue); // ensure at least 0-4 scale

  return (
    <div className="h-64">
      <svg viewBox="0 0 500 220" className="w-full h-full">
        {/* axes */}
        <line x1="40" y1="10" x2="40" y2="200" stroke="#e5e7eb" strokeWidth="2" />
        <line x1="40" y1="200" x2="480" y2="200" stroke="#e5e7eb" strokeWidth="2" />

        {/* Y-axis ticks and grid lines */}
        {Array.from({ length: maxTick + 1 }).map((_, v) => {
          const y = 200 - (v / maxTick) * 160;
          return (
            <g key={v}>
              {/* grid line, skip bottom axis (v === 0) */}
              {v !== 0 && (
                <line
                  x1="40"
                  y1={y}
                  x2="480"
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
              )}
              {/* tick label */}
              <text
                x="30"
                y={y + 4}
                textAnchor="end"
                className="fill-gray-400"
                fontSize="9"
              >
                {v}
              </text>
            </g>
          );
        })}

        {bars.map((b, idx) => {
          const bw = 65;  // bar width
          const gap = 10; // space between bars
          const x = 50 + idx * (bw + gap);

          const h = (b.value / maxTick) * 160;

          const y = 200 - h;
          return (
            <g key={b.label}>
              <rect x={x} y={y} width={bw} height={h} className={b.color} rx="6">
                <title>{`${b.label}: ${b.value} orders`}</title>
              </rect>
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

function DonutChart({ data }) {
  // simple donut visualization using SVG
  const fallback = [
    { label: 'Design', value: 0, color: '#f97316' },
    { label: 'Machining', value: 0, color: '#3b82f6' },
    { label: 'Inspection', value: 0, color: '#facc15' },
  ];

  const segments = (data && data.length
    ? data.map((d) => ({
        label: d.label,
        value: d.value,
        color: d.pieColor || '#e5e7eb',
      }))
    : fallback);

  const total = segments.reduce((a, b) => a + b.value, 0) || 1;

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
    return { d, color: s.color, label: s.label, value: s.value };
  });

  return (
    <div className="h-64 flex items-center justify-center">
      <svg viewBox="0 0 260 200" className="w-full h-full max-w-md">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} opacity="0.9">
            <title>{`${a.label}: ${a.value} orders`}</title>
          </path>
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
            <th className="py-2 px-3">Date Created</th>
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
              <td className="py-2 px-3 text-black">{r.date}</td>
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