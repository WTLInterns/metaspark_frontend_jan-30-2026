// Shared utility functions for consistent order display across all pages

/**
 * Get customer display text with proper priority fallback
 * Priority: customerName -> companyName -> "Unknown Customer"
 * Handles both full order data (customers[]) and AssignedOrderResponse (customerName)
 */
export const getCustomerText = (order) => {
  // DEBUG: Log raw order data
  if (order.orderId === 44) { // Log for first order as example
    console.log('🐛 [DEBUG] getCustomerText - Raw order:', order);
  }
  
  // First priority: customers array (from /order/getAll)
  if (order.customers && order.customers.length > 0) {
    const customer = order.customers[0];
    const customerName = customer.customerName?.trim();
    const companyName = customer.companyName?.trim();
    
    if (order.orderId === 44) {
      console.log('🐛 [DEBUG] getCustomerText - customers array:', order.customers);
      console.log('🐛 [DEBUG] getCustomerText - customerName:', customerName, 'companyName:', companyName);
    }
    
    if (customerName) return customerName;
    if (companyName) return companyName;
  }
  
  // Second priority: direct customerName field (from AssignedOrderResponse)
  if (order.customerName?.trim()) {
    if (order.orderId === 44) {
      console.log('🐛 [DEBUG] getCustomerText - direct customerName:', order.customerName);
    }
    return order.customerName.trim();
  }
  
  // Third priority: direct companyName field
  if (order.companyName?.trim()) {
    if (order.orderId === 44) {
      console.log('🐛 [DEBUG] getCustomerText - direct companyName:', order.companyName);
    }
    return order.companyName.trim();
  }
  
  // Final fallback
  if (order.orderId === 44) {
    console.log('🐛 [DEBUG] getCustomerText - fallback to Unknown Customer');
  }
  return 'Unknown Customer';
};

/**
 * Get product display text with proper priority fallback
 * Priority: products[].productCode - productName -> productName -> customProductDetails -> productDetails -> "No Product"
 * Handles both full order data (products[]) and AssignedOrderResponse (productName, customProductDetails, productDetails)
 */
export const getProductText = (order) => {
  // DEBUG: Log raw order data
  if (order.orderId === 44) { // Log for first order as example
    console.log('🐛 [DEBUG] getProductText - Raw order:', order);
  }
  
  // First priority: products array with productCode and productName (from /order/getAll)
  if (order.products && order.products.length > 0) {
    const productNames = order.products.map(p => {
      const productCode = p.productCode?.trim();
      const productName = p.productName?.trim();
      
      if (order.orderId === 44) {
        console.log('🐛 [DEBUG] getProductText - products array:', order.products);
        console.log('🐛 [DEBUG] getProductText - productCode:', productCode, 'productName:', productName);
      }
      
      if (productCode && productName) {
        return `${productCode} - ${productName}`;
      } else if (productName) {
        return productName;
      } else if (productCode) {
        return productCode;
      }
      return null;
    }).filter(Boolean);
    
    if (productNames.length > 0) {
      const result = productNames.join(', ');
      if (order.orderId === 44) {
        console.log('🐛 [DEBUG] getProductText - final products result:', result);
      }
      return result;
    }
  }
  
  // Second priority: direct productName field (from AssignedOrderResponse)
  if (order.productName?.trim()) {
    if (order.orderId === 44) {
      console.log('🐛 [DEBUG] getProductText - direct productName:', order.productName);
    }
    return order.productName.trim();
  }
  
  // Third priority: customProductDetails
  if (order.customProductDetails?.trim()) {
    if (order.orderId === 44) {
      console.log('🐛 [DEBUG] getProductText - customProductDetails:', order.customProductDetails);
    }
    return order.customProductDetails.trim();
  }
  
  // Fourth priority: productDetails
  if (order.productDetails?.trim()) {
    if (order.orderId === 44) {
      console.log('🐛 [DEBUG] getProductText - productDetails:', order.productDetails);
    }
    return order.productDetails.trim();
  }
  
  // Final fallback
  if (order.orderId === 44) {
    console.log('🐛 [DEBUG] getProductText - fallback to No Product');
  }
  return 'No Product';
};

/**
 * Format order date safely without parsing to avoid "Invalid Date"
 * Input: "dd-MM-yyyy" format from backend
 * Output: "dd/MM/yyyy" format
 */
export const formatOrderDate = (dateAdded) => {
  if (!dateAdded || typeof dateAdded !== 'string') {
    return '';
  }
  
  const trimmedDate = dateAdded.trim();
  if (!trimmedDate) {
    return '';
  }
  
  // Expected format: "dd-MM-yyyy" (e.g., "23-01-2026")
  const parts = trimmedDate.split('-');
  if (parts.length !== 3) {
    return trimmedDate; // Return as-is if format is unexpected
  }
  
  const [day, month, year] = parts;
  
  // Validate parts
  if (!day || !month || !year || day.length !== 2 || month.length !== 2 || year.length !== 4) {
    return trimmedDate; // Return as-is if format is invalid
  }
  
  // Return in dd/MM/yyyy format (safe, no date parsing)
  return `${day}/${month}/${year}`;
};

/**
 * Get assigned to display text for Production Line
 * Priority: sentToProductionByName -> "-"
 */
export const getAssignedToText = (order) => {
  return order.sentToProductionByName || '-';
};
