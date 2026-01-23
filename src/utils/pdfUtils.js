// PDF Type Detection and Loading Utilities
export const detectPdfType = (pdfUrl) => {
  if (!pdfUrl) return 'standard';
  const filename = pdfUrl.toLowerCase();
  // Check if filename contains nesting indicators
  if (filename.includes('nesting') || filename.includes('nest') || filename.includes('lbr')) {
    return 'nesting';
  }
  return 'standard';
};

export const analyzePdfType = async (attachmentUrl) => {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('swiftflow-user') : null;
  if (!raw) return 'standard';
  const auth = JSON.parse(raw);
  const token = auth?.token;
  if (!token) return 'standard';

  try {
    const response = await fetch(`http://localhost:8080/api/pdf/subnest/debug-text?attachmentUrl=${encodeURIComponent(attachmentUrl)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.ok) {
      const text = await response.text();
      // Check for nesting PDF indicators in text
      if (text.toLowerCase().includes('nest result') || 
          text.toLowerCase().includes('plate info') ||
          text.toLowerCase().includes('parts list') ||
          text.toLowerCase().includes('material:') ||
          text.toLowerCase().includes('thickness:')) {
        return 'nesting';
      }
    }
  } catch (error) {
    console.error('Error analyzing PDF type:', error);
  }
  
  return 'standard';
};

export const getPdfApiEndpoints = (pdfType) => {
  const isNesting = pdfType === 'nesting';
  return {
    subnest: isNesting 
      ? 'http://localhost:8080/api/nesting/results'
      : 'http://localhost:8080/api/pdf/subnest/by-url',
    parts: isNesting
      ? 'http://localhost:8080/api/nesting/part-info'
      : 'http://localhost:8080/api/pdf/subnest/parts/by-url',
    material: isNesting
      ? 'http://localhost:8080/api/nesting/plate-info'
      : 'http://localhost:8080/api/pdf/subnest/material-data/by-url'
  };
};

export const LoadingSpinner = ({ message, subMessage }) => (
  <div className="flex flex-col items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
    <p className="text-sm text-gray-600 mb-2">{message}</p>
    {subMessage && <p className="text-xs text-gray-500">{subMessage}</p>}
  </div>
);

export const PdfTypeIndicator = ({ pdfType }) => (
  <span className="text-xs text-gray-500">
    {pdfType === 'nesting' ? 'Nesting PDF' : 'Standard PDF'}
  </span>
);
