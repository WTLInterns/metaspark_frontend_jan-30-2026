import React from 'react';

export default function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl border border-gray-200 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-lg font-semibold text-black">Order Details - {order.orderId}</h3>
            <button onClick={onClose} className="text-black">×</button>
          </div>
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Customer Name:</dt>
                    <dd className="text-sm text-gray-900">{order.customers?.[0]?.customerName || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Company Name:</dt>
                    <dd className="text-sm text-gray-900">{order.customers?.[0]?.companyName || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Email:</dt>
                    <dd className="text-sm text-gray-900">{order.customers?.[0]?.customerEmail || 'N/A'}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Order ID:</dt>
                    <dd className="text-sm text-gray-900">SF{order.orderId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Date Added:</dt>
                    <dd className="text-sm text-gray-900">{order.dateAdded}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Status:</dt>
                    <dd className="text-sm text-gray-900">{order.status}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Product Details</h4>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">Product(s):</dt>
                  <dd className="text-sm text-gray-900">
                    {order.products?.map(p => `${p.productCode} - ${p.productName}`).join(', ') || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Custom Product Details:</dt>
                  <dd className="text-sm text-gray-900">{order.customProductDetails || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Units:</dt>
                  <dd className="text-sm text-gray-900">{order.units || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Material:</dt>
                  <dd className="text-sm text-gray-900">{order.materialDetails?.material || order.material || 'N/A'}</dd>
                </div>
              </dl>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Material Details</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Material:</dt>
                    <dd className="text-sm text-gray-900">{order.materialDetails?.material || order.material || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Gas:</dt>
                    <dd className="text-sm text-gray-900">{order.materialDetails?.gas || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Thickness:</dt>
                    <dd className="text-sm text-gray-900">{order.materialDetails?.thickness || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Type:</dt>
                    <dd className="text-sm text-gray-900">{order.materialDetails?.type || 'N/A'}</dd>
                  </div>
                </dl>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Process Details</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Laser Cutting:</dt>
                    <dd className="text-sm text-gray-900">{order.processDetails ? (order.processDetails.laserCutting ? 'Yes' : 'No') : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Bending:</dt>
                    <dd className="text-sm text-gray-900">{order.processDetails ? (order.processDetails.bending ? 'Yes' : 'No') : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Fabrication:</dt>
                    <dd className="text-sm text-gray-900">{order.processDetails ? (order.processDetails.fabrication ? 'Yes' : 'No') : 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Powder Coating:</dt>
                    <dd className="text-sm text-gray-900">{order.processDetails ? (order.processDetails.powderCoating ? 'Yes' : 'No') : 'N/A'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Address Information</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs font-medium text-gray-500 mb-1">PRIMARY ADDRESS</div>
                  <p className="text-sm text-gray-900">{order.customers?.[0]?.primaryAddress || 'N/A'}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-xs font-medium text-blue-700 mb-1">BILLING ADDRESS</div>
                  <p className="text-sm text-blue-900">{order.customers?.[0]?.billingAddress || 'N/A'}</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-xs font-medium text-green-700 mb-1">SHIPPING ADDRESS</div>
                  <p className="text-sm text-green-900">{order.customers?.[0]?.shippingAddress || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-black">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

