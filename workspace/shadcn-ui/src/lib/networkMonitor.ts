// Network monitor utility for debugging Supabase requests
let isMonitoringEnabled = false;

// Store original fetch function
const originalFetch = window.fetch;

// Function to enable network monitoring
export function enableNetworkMonitoring() {
  if (isMonitoringEnabled) return;
  
  // Override fetch to log requests and responses
  window.fetch = async function(input, init) {
    // Only log Supabase API requests
    const url = input instanceof Request ? input.url : String(input);
    const isSupabaseRequest = url.includes('supabase');
    
    if (!isSupabaseRequest) {
      return originalFetch(input, init);
    }
    
    // Log the request
    const requestId = Math.random().toString(36).substring(2, 9);
    const method = init?.method || 'GET';
    console.group(`🌐 Supabase Request [${requestId}]: ${method} ${url}`);
    
    if (init?.headers) {
      console.log('Headers:', sanitizeHeaders(init.headers));
    }
    
    if (init?.body) {
      try {
        const body = JSON.parse(init.body.toString());
        console.log('Request Body:', body);
      } catch (e) {
        console.log('Request Body:', init.body);
      }
    }
    
    const startTime = performance.now();
    
    try {
      // Make the actual fetch request
      const response = await originalFetch(input, init);
      
      // Calculate request duration
      const duration = (performance.now() - startTime).toFixed(2);
      
      // Clone the response so we can read the body
      const clone = response.clone();
      
      // Log response details
      console.log(`Response Status: ${response.status} ${response.statusText}`);
      console.log(`Duration: ${duration}ms`);
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await clone.json();
          console.log('Response Body:', data);
        }
      } catch (e) {
        console.log('Could not parse response body:', e);
      }
      
      console.groupEnd();
      return response;
    } catch (error) {
      // Log any network errors
      console.error('Network Error:', error);
      console.groupEnd();
      throw error;
    }
  };
  
  console.log('🚀 Supabase Network Monitoring Enabled');
  isMonitoringEnabled = true;
}

// Function to disable network monitoring
export function disableNetworkMonitoring() {
  if (!isMonitoringEnabled) return;
  
  window.fetch = originalFetch;
  console.log('⏹️ Supabase Network Monitoring Disabled');
  isMonitoringEnabled = false;
}

// Helper to sanitize headers for logging (remove sensitive info)
function sanitizeHeaders(headers) {
  const sanitized = {};
  
  // Convert headers object to simple key-value pairs
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      sanitized[key] = sanitizeHeaderValue(key, value);
    });
  } else if (typeof headers === 'object') {
    Object.keys(headers).forEach(key => {
      sanitized[key] = sanitizeHeaderValue(key, headers[key]);
    });
  }
  
  return sanitized;
}

// Sanitize specific header values
function sanitizeHeaderValue(key, value) {
  const sensitiveHeaders = ['authorization', 'apikey'];
  if (sensitiveHeaders.includes(key.toLowerCase())) {
    return '[REDACTED]';
  }
  return value;
}

export default {
  enableNetworkMonitoring,
  disableNetworkMonitoring,
  isEnabled: () => isMonitoringEnabled
};