import { createHeaders } from '@/utils/api';

export const downloadReport = async ({ orderDisplayId, type }) => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
    const orderId = orderDisplayId.replace('SF', '');

    const endpointByType = {
      design: `/api/orders/${orderId}/reports/design`,
      production: `/api/orders/${orderId}/reports/production`,
      machinists: `/api/orders/${orderId}/reports/machinists`,
      inspection: `/api/orders/${orderId}/reports/inspection`,
    };

    const typeLabelByType = {
      design: 'Design',
      production: 'Production',
      machinists: 'Machinists',
      inspection: 'Inspection',
    };

    const endpoint = endpointByType[type];
    const typeLabel = typeLabelByType[type];
    if (!endpoint || !typeLabel) {
      throw new Error(`Unknown report type: ${type}`);
    }

    const headers = createHeaders({});
    delete headers['Content-Type'];
    headers.Accept = 'application/pdf';

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to download report');
      throw new Error(msg || 'Failed to download report');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${orderDisplayId}_${typeLabel}_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Report download failed:', error);
  }
};
