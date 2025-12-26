'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as orderApi from '../../ProductionUser/orders/api';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orders = await orderApi.getAllOrders();
        const foundOrder = orders.find(o => 
          `SF${o.orderId}` === orderId || 
          o.orderId.toString() === orderId.replace('SF', '')
        );
        
        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          setError('Order not found');
        }
      } catch (err) {
        setError('Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || 'Order not found'}</div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-indigo-和B600 text 600 text-white tad rounded-md hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Order #{orderId}</h1>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Customer</h3>
                <p className="text-gray-900">
                  {order.customers?.[0]?.companyName || order.customers?.[0]?.customerName || 'Unknown Customer'}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <p className="text-gray-900">{order.status || 'Unknown'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Date Added</h3>
                <p className="text-gray-900">{order.dateAdded || 'Unknown'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Department</h3>
                <p className="text-gray-900">{order.department || 'Not assigned'}</p>
              </div>
            </div>
            
            {order.products && order.products.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Products</h3>
                <div className="space-y-2">
                  {order.products.map((product, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md">
                      <p className="text-gray-900">{product.productCode} - {product.productName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {order.customProductDetails && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Custom Product Details</h3>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{order.customProductDetails}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
