import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

type ApiError = { message?: string; status?: number };

// Read base from env (Vite replaces import.meta.env at build/dev time)
const RAW_BASE = (import.meta.env.VITE_API_BASE || "").trim();
const BASE = RAW_BASE.replace(/\/$/, "");

function buildUrl(path: string) {
  if (!BASE) return path.startsWith("/") ? path : `/${path}`;

  const p = path.startsWith("/") ? path : `/${path}`;

  if (BASE.endsWith("/api") && p.startsWith("/api")) {
    return `${BASE}${p.replace(/^\/api/, "")}`;
  }

  return `${BASE}${p}`;
}

// Create axios instance for API calls
const apiClient = axios.create();

// Flag to prevent multiple simultaneous refresh requests
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Subscribe to token refresh
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// Notify all subscribers when token is refreshed
function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
}

// Refresh access token using refresh token
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      return null;
    }

    const url = buildUrl("/api/v1/auth/refresh-token");
    const response = await axios.post(url, { refreshToken });
    
    const { accessToken, tokenType } = response.data;
    
    // Update tokens in localStorage
    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("authToken", accessToken); // Keep legacy key for compatibility
      if (tokenType) {
        localStorage.setItem("tokenType", tokenType);
      }
      return accessToken;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Request interceptor: Add authorization header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    
    if (token && config.headers) {
      config.headers.Authorization = `${tokenType} ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors with silent refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Check if error is 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, wait for the new token
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            if (originalRequest.headers) {
              const tokenType = localStorage.getItem("tokenType") || "Bearer";
              originalRequest.headers.Authorization = `${tokenType} ${newToken}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        
        if (newToken) {
          isRefreshing = false;
          onTokenRefreshed(newToken);
          
          // Retry original request with new token
          if (originalRequest.headers) {
            const tokenType = localStorage.getItem("tokenType") || "Bearer";
            originalRequest.headers.Authorization = `${tokenType} ${newToken}`;
          }
          return apiClient(originalRequest);
        } else {
          // Refresh failed, logout user
          isRefreshing = false;
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject(error);
        }
      } catch (refreshError) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

function extractError(err: any): { message?: string; status?: number } {
  if (!err) return { message: "Network error" };
  if (err.response) {
    const status = err.response.status;
    const d = err.response.data;
    // Log full server response for debugging, but avoid showing raw 5xx messages to users
    try {
    } catch (e) {
      /* ignore */
    }

    // For server-side errors, do not return a user-visible server message.
    // Return undefined message but include status so callers can show friendly text.
    if (status >= 500) {
      return { status };
    }

    // For client errors (4xx), prefer server-provided message if present
    const body = (d && (d.message || d.error || d.msg)) || (d ? JSON.stringify(d) : undefined);
    const msg = body ? `${status}: ${body}` : `HTTP ${status}`;
    return { message: msg, status };
  }
  return { message: err.message || String(err) };
}

export async function registerUser(payload: any) {
  try {
    // Normalize/map various possible registration payload shapes into the vendor DTO
    const vendorPayload: any = {};

    // prefer explicit vendor fields if provided
    vendorPayload.businessName = payload.businessName || payload.username || `${payload.firstName || ""} ${payload.lastName || ""}`.trim();
    vendorPayload.contactName = payload.contactName || `${payload.firstName || ""} ${payload.lastName || ""}`.trim();
    vendorPayload.email = payload.email;
    vendorPayload.mobile = payload.mobile || payload.phone || payload.contact || "";
    vendorPayload.password = payload.password;
    // addresses: accept provided addresses or map single address fields
    if (payload.addresses && Array.isArray(payload.addresses) && payload.addresses.length) {
      vendorPayload.addresses = payload.addresses;
    } else if (payload.addressLine1 || payload.city || payload.state || payload.country || payload.zipCode) {
      vendorPayload.addresses = [
        {
          addressLine1: payload.addressLine1 || "",
          addressLine2: payload.addressLine2 || "",
          city: payload.city || "",
          state: payload.state || "",
          country: payload.country || "",
          zipCode: payload.zipCode || "",
        },
      ];
    } else {
      vendorPayload.addresses = [];
    }

    // Generate vendorOrganizationId if not provided
    function firstTwoLettersPerWord(s?: string) {
      if (!s) return "";
      return s
        .split(/\s+/)
        .filter(Boolean)
        .map(w => (w.replace(/[^a-zA-Z0-9]/g, "").substring(0, 2) || ""))
        .join("");
    }

    if (!vendorPayload.vendorOrganizationId) {
      const bizPart = firstTwoLettersPerWord(payload.businessName || "").toUpperCase();
      const ownerPart = firstTwoLettersPerWord(payload.ownerName || `${payload.firstName || ""} ${payload.lastName || ""}`).toUpperCase();
      
      // Use hash-based algorithm (same as frontend) for consistent ID generation
      const seedStr = (payload.businessName || "") + "|" + (payload.ownerName || `${payload.firstName || ""} ${payload.lastName || ""}`);
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash << 5) - hash + seedStr.charCodeAt(i);
        hash |= 0;
      }
      
      const minDigits = 4;
      const maxDigits = 9;
      const digitsCount = Math.abs(hash) % (maxDigits - minDigits + 1) + minDigits;
      let rand = "";
      let h = Math.abs(hash) || 1;
      for (let i = 0; i < digitsCount; i++) {
        rand += String(h % 10);
        h = Math.floor(h / 10) || (h + 7);
      }
      
      const parts = [] as string[];
      if (bizPart) parts.push(bizPart);
      if (ownerPart) parts.push(ownerPart);
      parts.push(rand);
      vendorPayload.vendorOrganizationId = parts.join("-");
    }

    const url = buildUrl("/api/vendor/register");
    const res = await axios.post(url, vendorPayload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// New auth registration endpoint used by client-side registration flow
export async function registerAuth(payload: any) {
  try {
    const url = buildUrl("/api/v1/auth/register");
    const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function login(payload: { login: string; password: string; }) {
  try {
    const url = buildUrl("/api/v1/auth/login");
    const body = { identifier: payload.login, password: payload.password };
    const res = await axios.post(url, body, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function forgotEmail(phone: string) {
  try {
    const url = buildUrl("/api/v1/auth/recover/forgot-email");
    const res = await axios.post(url, null, { 
      params: { phone },
      headers: { "Content-Type": "application/json" } 
    });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function forgotPhone(email: string) {
  try {
    const url = buildUrl("/api/v1/auth/recover/forgot-phone");
    const res = await axios.post(url, null, { 
      params: { email },
      headers: { "Content-Type": "application/json" } 
    });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function forgotPassword(email: string) {
  try {
    const url = buildUrl("/api/v1/auth/forgot-password");
    const res = await axios.post(url, { email }, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function resetPassword(payload: { email: string; otp: string; newPassword: string; confirmPassword: string; }) {
  try {
    const url = buildUrl("/api/v1/auth/reset-password");
    const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Create vendor profile (called after registration to complete vendor setup)
/**
 * Create vendor profile
 * POST /api/v1/vendors
 */
export async function createVendorProfile(payload: any) {
  try {
    const url = buildUrl("/api/v1/vendors");
    const token = localStorage.getItem("accessToken") || localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const headers: any = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `${tokenType} ${token}`;
    }
    const res = await axios.post(url, payload, { headers });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Vendor-specific endpoints (Spring `VendorController` at /api/vendor)
export async function registerVendor(payload: any) {
  try {
    const url = buildUrl("/api/vendor/register");
    const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Multipart vendor registration: sends vendor JSON as 'vendor' field and files as 'licenseFiles'
export async function registerVendorMultipart(vendor: any, files?: File[]) {
  try {
    const url = buildUrl("/api/vendor/register");
    const fd = new FormData();
    fd.append("vendor", JSON.stringify(vendor));
    if (files && files.length) {
      for (let i = 0; i < files.length; i++) {
        fd.append("licenseFiles", files[i], files[i].name);
      }
    }

    const res = await axios.post(url, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function loginVendor(payload: any) {
  try {
    const url = buildUrl("/api/vendor/login");
    const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Get current vendor profile
// GET /api/v1/vendors/me
export async function getVendorMe() {
  try {
    const url = buildUrl("/api/v1/vendors/me");
    const token = localStorage.getItem("accessToken") || localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const headers: any = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `${tokenType} ${token}`;
    }
    const res = await axios.get(url, { headers });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Get vendor profile by organization ID (legacy endpoint)
export async function getVendorProfile(vendorOrganizationId: string) {
  try {
    const url = buildUrl(`/api/vendor/org/${vendorOrganizationId}`);
    const token = localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const headers: any = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `${tokenType} ${token}`;
    }
    const res = await axios.get(url, { headers });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Update vendor profile
// PUT /api/v1/vendors/me
export async function updateVendorProfile(_vendorId: string, payload: any) {
  try {
    const url = buildUrl("/api/v1/vendors/me");
    const token = localStorage.getItem("accessToken") || localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const headers: any = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `${tokenType} ${token}`;
    }
    const res = await axios.put(url, payload, { headers });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Service Details endpoints
export async function createOrUpdateServiceDetails(vendorId: string, payload: any) {
  try {
    const url = buildUrl(`/api/service-details/${vendorId}`);
    const token = localStorage.getItem("authToken");
    const headers: any = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Log payload for debugging
    const res = await axios.post(url, payload, { headers });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function getServiceDetailsByVendorId(vendorId: string) {
  try {
    const url = buildUrl(`/api/service-details/vendor/${vendorId}`);
    const token = localStorage.getItem("authToken");
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await axios.get(url, { headers });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function getServiceDetailsByVendorOrgId(vendorOrgId: string) {
  try {
    const url = buildUrl(`/api/service-details/org/${vendorOrgId}`);
    const token = localStorage.getItem("authToken");
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await axios.get(url, { headers });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function searchServicesByServiceType(serviceType: string) {
  try {
    const url = buildUrl(`/api/service-details/search/service-type`);
    const res = await axios.get(url, { params: { type: serviceType } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function searchServicesByCuisine(cuisine: string) {
  try {
    const url = buildUrl(`/api/service-details/search/cuisine`);
    const res = await axios.get(url, { params: { cuisine } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function searchServicesByArea(area: string) {
  try {
    const url = buildUrl(`/api/service-details/search/area`);
    const res = await axios.get(url, { params: { area } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function deleteServiceDetails(vendorId: string) {
  try {
    const url = buildUrl(`/api/service-details/vendor/${vendorId}`);
    const token = localStorage.getItem("authToken");
    const headers: any = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await axios.delete(url, { headers });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Menu item endpoints

/**
 * Browse platform master menu items (catalogue)
 * GET /api/v1/menu/items?page=0&size=20
 */
export async function getMasterMenuItems(page = 0, size = 20, search?: string) {
  try {
    let url = buildUrl(`/api/v1/menu/items?page=${page}&size=${size}`);
    if (search) url += `&query=${encodeURIComponent(search)}`;
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

/**
 * Get the authenticated vendor's OWN menu items.
 * Uses GET /api/v1/menu/vendor-items/my — vendorId is derived from JWT on the server.
 * No vendorId query param required. Falls back to public endpoint with stored vendorId
 * if the /my endpoint is unavailable.
 */
export async function getMenuItems(_vendorOrganizationId?: string, page: number = 0, size: number = 100) {
  try {
    // Primary: authenticated /my endpoint — no vendorId param needed, derived from JWT
    // includeInactive=true ensures INACTIVE items are returned alongside ACTIVE ones
    const url = buildUrl(`/api/v1/menu/vendor-items/my?page=${page}&size=${size}&includeInactive=true`);
    const res = await apiClient.get(url);
    if (res.data?.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
  } catch (err: any) {
    // Fallback: public endpoint with vendorId query param
    try {
      let vendorId = localStorage.getItem("vendorId");
      if (!vendorId) {
        const stored = localStorage.getItem("vendorProfile");
        if (stored) {
          const p = JSON.parse(stored);
          const src = p?.data || p;
          vendorId = src?.vendorId || src?.id || null;
          if (vendorId) localStorage.setItem("vendorId", String(vendorId));
        }
      }
      if (!vendorId) throw err; // re-throw original error
      const fallbackUrl = buildUrl(`/api/v1/menu/vendor-items?vendorId=${encodeURIComponent(vendorId)}&page=${page}&size=${size}&includeInactive=true`);
      const fallbackRes = await apiClient.get(fallbackUrl);
      if (fallbackRes.data?.data && Array.isArray(fallbackRes.data.data)) {
        return fallbackRes.data.data;
      }
      return Array.isArray(fallbackRes.data) ? fallbackRes.data : [];
    } catch (fallbackErr: any) {
      const { message, status: errStatus } = extractError(fallbackErr);
      throw { message, status: errStatus } as ApiError;
    }
  }
}

/**
 * Get single vendor menu item
 * GET /api/v1/menu/vendor-items/{vendorItemId}
 */
export async function getSingleVendorMenuItem(vendorItemId: string) {
  try {
    const url = buildUrl(`/api/v1/menu/vendor-items/${vendorItemId}`);
    const res = await apiClient.get(url);
    return res.data?.data || res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Bid endpoints
export async function getBidsByVendor(vendorOrgId: string) {
  try {
    const url = buildUrl(`/api/vendor/${vendorOrgId}/bids`);
    const res = await axios.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function getBidById(vendorOrgId: string, bidId: string) {
  try {
    const url = buildUrl(`/api/vendor/${vendorOrgId}/bids/${bidId}`);
    const res = await axios.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function createMenuItem(_vendorOrganizationId: string, payload: any) {
  try {
    // POST /api/v1/menu/vendor-items
    const url = buildUrl(`/api/v1/menu/vendor-items`);
    const res = await apiClient.post(url, payload);
    return res.data?.data || res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function submitBidQuote(vendorOrgId: string, bidId: string, payload: { orderId: string; proposedMessage: string; proposedTotalPrice: number; }) {
  try {
    const url = buildUrl(`/api/vendor/${vendorOrgId}/bids/${bidId}/quote`);
    const res = await axios.put(url, payload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function updateMenuItem(_vendorOrganizationId: string, id: string, payload: any) {
  try {
    // PUT /api/v1/menu/vendor-items/{vendorItemId}
    const url = buildUrl(`/api/v1/menu/vendor-items/${id}`);
    const res = await apiClient.put(url, payload);
    return res.data?.data || res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function acceptBid(vendorOrgId: string, bidId: string) {
  try {
    const url = buildUrl(`/api/vendor/${vendorOrgId}/bids/${bidId}/accept`);
    const token = localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const res = await axios.put(url, undefined, { headers: token ? { Authorization: `${tokenType} ${token}` } : undefined });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// ============ Bid Request & Bidding Flow ============

/**
 * Get bid requests available in vendor's service area
 * GET /api/v1/bids/requests/available?page=0&size=20
 */
export async function getReceivedBidRequests(page = 0, size = 20) {
  try {
    const url = buildUrl(`/api/v1/bids/requests/available?page=${page}&size=${size}`);
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

/**
 * Get available bid requests for vendor
 * GET /api/v1/bids/requests/available?page=0&size=20
 */
export async function getActiveBidRequests(page = 0, size = 20) {
  try {
    const url = buildUrl(`/api/v1/bids/requests/available?page=${page}&size=${size}`);
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

/**
 * Get vendor's submitted bids
 * GET /api/v1/bids/my?page=0&size=20
 */
export async function getVendorSubmittedBids(page = 0, size = 20, status?: string) {
  try {
    let url = buildUrl(`/api/v1/bids/my?page=${page}&size=${size}`);
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status: errStatus } = extractError(err);
    throw { message, status: errStatus } as ApiError;
  }
}

/**
 * Submit bid for a bid request
 * POST /api/v1/bids/{bidRequestId}/submit
 */
export async function submitBid(bidRequestId: string, payload: {
  quotedPrice: {
    currency?: string;
    subtotal: number;
    serviceCharge?: number;
    taxPercentage?: number;
    taxAmount?: number;
    totalAmount: number;
  };
  itemizedPricing?: Array<{
    vendorItemId?: string;
    itemName?: string;
    quantity?: number;
    pricePerPlate?: number;
    totalPrice?: number;
  }>;
  deliveryDetails?: {
    estimatedSetupTime?: string;
    foodReadyTime?: string;
    cleanupTime?: string;
  };
  staffProvided?: {
    chefs?: number;
    servers?: number;
    cleaners?: number;
  };
  termsAndConditions?: string;
  validityPeriodHours?: number;
  advancePercentage?: number;
  requiredAdvanceAmount?: number;
}) {
  try {
    const url = buildUrl(`/api/v1/bids/${bidRequestId}/submit`);
    const res = await apiClient.post(url, payload);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

/**
 * Revise an existing bid
 * PUT /api/v1/bids/{bidId}
 */
export async function reviseBid(bidId: string, payload: {
  quotedPrice?: {
    currency?: string;
    subtotal?: number;
    serviceCharge?: number;
    taxPercentage?: number;
    taxAmount?: number;
    totalAmount?: number;
  };
  itemizedPricing?: Array<{
    vendorItemId?: string;
    itemName?: string;
    quantity?: number;
    pricePerPlate?: number;
    totalPrice?: number;
  }>;
  deliveryDetails?: {
    estimatedSetupTime?: string;
    foodReadyTime?: string;
    cleanupTime?: string;
  };
  staffProvided?: {
    chefs?: number;
    servers?: number;
    cleaners?: number;
  };
  termsAndConditions?: string;
  validityPeriodHours?: number;
  advancePercentage?: number;
  requiredAdvanceAmount?: number;
}, reason?: string) {
  try {
    const url = buildUrl(`/api/v1/bids/${bidId}`);
    const res = await apiClient.put(url, payload);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

/**
 * Withdraw a submitted bid
 * DELETE /api/v1/bids/{bidId}
 */
export async function withdrawBid(bidId: string) {
  try {
    const url = buildUrl(`/api/v1/bids/${bidId}`);
    const res = await apiClient.delete(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

/**
 * Get bid request details by ID
 * GET /api/v1/bids/requests/{bidRequestId}
 */
export async function getBidRequestDetails(bidRequestId: string) {
  try {
    const url = buildUrl(`/api/v1/bids/requests/${bidRequestId}`);
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

/**
 * Get bid by ID
 * GET /api/v1/bids/{bidId}
 */
export async function getBidByIdV1(bidId: string) {
  try {
    const url = buildUrl(`/api/v1/bids/${bidId}`);
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

/**
 * @deprecated Use submitBid instead
 */
export async function submitBidQuotation(bidRequestId: string, payload: any) {
  return submitBid(bidRequestId, payload);
}

/**
 * @deprecated Use reviseBid instead
 */
export async function updateBidQuotation(bidId: string, payload: any) {
  return reviseBid(bidId, payload);
}

export async function deleteMenuItem(_vendorOrganizationId: string, id: string) {

  try {
    // DELETE /api/v1/menu/vendor-items/{vendorItemId}
    const url = buildUrl(`/api/v1/menu/vendor-items/${id}`);
    const res = await apiClient.delete(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

/**
 * Toggle menu item availability
 * PATCH /api/v1/menu/vendor-items/{vendorItemId}/availability?isAvailable=...&reason=...
 */
export async function toggleMenuItemAvailability(
  vendorItemId: string,
  isAvailable: boolean,
  reason?: string
) {
  try {
    let url = buildUrl(`/api/v1/menu/vendor-items/${vendorItemId}/availability?isAvailable=${isAvailable}`);
    if (!isAvailable && reason) url += `&reason=${encodeURIComponent(reason)}`;
    const res = await apiClient.patch(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

/**
 * Upload vendor document
 * POST /api/v1/uploads/document
 * Content-Type: multipart/form-data
 */
export async function uploadDocument(file: File, entityType: string = "VENDOR_DOCUMENT", entityId?: string) {
  try {
    const url = buildUrl(`/api/v1/uploads/document`);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("entityType", entityType);
    if (entityId) fd.append("entityId", entityId);
    const token = localStorage.getItem("accessToken") || localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const headers: any = {};
    if (token) headers.Authorization = `${tokenType} ${token}`;
    const res = await axios.post(url, fd, { headers });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Order endpoints
export async function getOrdersByVendor(vendorOrgId: string) {
  try {
    const url = buildUrl(`/api/vendor/${vendorOrgId}/orders`);
    const res = await axios.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Get vendor orders with pagination
// GET /api/v1/orders/vendor/my?page=0&size=20
export async function getVendorOrders(page: number = 0, size: number = 20, status?: string) {
  try {
    let url = buildUrl(`/api/v1/orders/vendor/my?page=${page}&size=${size}`);
    if (status && status !== 'all') {
      url += `&status=${encodeURIComponent(status)}`;
    }
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status: errStatus } = extractError(err);
    throw { message, status: errStatus } as ApiError;
  }
}

/**
 * Get single order by ID
 * GET /api/v1/orders/{orderId}
 */
export async function getVendorOrderById(orderId: string) {
  try {
    const url = buildUrl(`/api/v1/orders/${orderId}`);
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status: errStatus } = extractError(err);
    throw { message, status: errStatus } as ApiError;
  }
}

// New API: Get order transactions
export async function getOrderTransactions(orderId: string) {
  try {
    const url = buildUrl(`/api/v1/payments/order/${orderId}`);
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status: errStatus } = extractError(err);
    throw { message, status: errStatus } as ApiError;
  }
}

export async function getOrderById(vendorOrgId: string, orderId: string) {
  try {
    // Use the detailed endpoint that includes full menu item information
    const url = buildUrl(`/api/vendor/${vendorOrgId}/orders/${orderId}/details`);
    const token = localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `${tokenType} ${token}`;
      if (!vendorOrgId) {
      }
      if (!orderId) {
      }

      // Ensure path params are encoded
      const encVendor = encodeURIComponent(vendorOrgId || "");
      const encOrder = encodeURIComponent(orderId || "");
      const finalUrl = buildUrl(`/api/vendor/${encVendor}/orders/${encOrder}/details`);
      // Request raw text so we can handle JSON or XML responses robustly
      const res = await axios.get(finalUrl, { headers, responseType: "text" });
    const dataText = res.data as string;
    // First try JSON
    try {
      const parsedJson = JSON.parse(dataText);
      // Normalize possible wrapper shape: menuItems -> [{ menuItem: {...}, menuItemId, specialRequest }, ...]
      if (parsedJson && Array.isArray(parsedJson.menuItems) && parsedJson.menuItems.length > 0 && parsedJson.menuItems[0].menuItem) {
        parsedJson.menuItems = parsedJson.menuItems.map((w: any) => ({ ...(w.menuItem || {}), menuItemId: w.menuItemId, specialRequest: w.specialRequest }));
      }
      return parsedJson;
    } catch (jsonErr) {
      // Not JSON - try XML
    }

    const xml = dataText && dataText.trim();
    if (!xml) return {};

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "application/xml");
      const root = doc.documentElement;

      function getText(tag: string, parent: Element = root) {
        const el = parent.getElementsByTagName(tag)[0];
        return el ? el.textContent || "" : "";
      }

      // parse menu items wrapper
      const menuItemsRoot = root.getElementsByTagName("menuItems")[0];
      const wrappers: any[] = [];
      if (menuItemsRoot) {
        const wrapperNodes = Array.from(menuItemsRoot.childNodes).filter(n => n.nodeType === 1 && (n as Element).tagName === "menuItems") as Element[];
        for (const w of wrapperNodes) {
          const menuItemId = getText("menuItemId", w) || undefined;
          const specialRequest = getText("specialRequest", w) || undefined;
          const menuItemEl = w.getElementsByTagName("menuItem")[0];
          const menuItem: any = {};
          if (menuItemEl) {
            menuItem.id = getText("id", menuItemEl) || undefined;
            menuItem.vendorOrganizationId = getText("vendorOrganizationId", menuItemEl) || undefined;
            menuItem.name = getText("name", menuItemEl) || undefined;
            menuItem.description = getText("description", menuItemEl) || undefined;

            // images
            const imagesParent = menuItemEl.getElementsByTagName("images")[0];
            if (imagesParent) {
              const imgs = Array.from(imagesParent.getElementsByTagName("images")).map(i => i.textContent || "").filter(Boolean);
              menuItem.images = imgs;
            } else {
              menuItem.images = [];
            }

            menuItem.category = getText("category", menuItemEl) || undefined;
            menuItem.subCategory = getText("subCategory", menuItemEl) || undefined;

            // ingredients
            const ingredientsParent = menuItemEl.getElementsByTagName("ingredients")[0];
            if (ingredientsParent) {
              const ings = Array.from(ingredientsParent.getElementsByTagName("ingredients")).map(i => i.textContent || "").filter(Boolean);
              menuItem.ingredients = ings;
            } else {
              menuItem.ingredients = [];
            }

            // spiceLevels
            const spiceParent = menuItemEl.getElementsByTagName("spiceLevels")[0];
            if (spiceParent) {
              const s = Array.from(spiceParent.getElementsByTagName("spiceLevels")).map(i => i.textContent || "").filter(Boolean);
              menuItem.spiceLevels = s;
            } else {
              menuItem.spiceLevels = [];
            }

            const availText = getText("available", menuItemEl);
            menuItem.available = availText === "true" || availText === "1";
          }

          wrappers.push({ menuItemId, specialRequest, menuItem });
        }
      }

      const parsed: any = {
        id: getText("id"),
        customerId: getText("customerId"),
        userName: getText("userName"),
        userEmail: getText("userEmail"),
        userPhone: getText("userPhone"),
        vendorOrganizationId: getText("vendorOrganizationId"),
        vendorBusinessName: getText("vendorBusinessName"),
        vendorEmail: getText("vendorEmail"),
        vendorPhone: getText("vendorPhone"),
        eventName: getText("eventName"),
        eventDate: getText("eventDate"),
        eventLocation: getText("eventLocation"),
        guestCount: parseInt(getText("guestCount")) || 0,
        // flatten wrappers to match frontend expected shape: each item is the menuItem with menuItemId and specialRequest
        menuItems: wrappers.map(w => ({ ...(w.menuItem || {}), menuItemId: w.menuItemId, specialRequest: w.specialRequest })),
        status: getText("status"),
        totalPrice: parseFloat(getText("totalPrice")) || 0,
        createdAt: getText("createdAt"),
        updatedAt: getText("updatedAt"),
      };

      return parsed;
    } catch (e) {
      return {};
    }
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function updateOrderStatus(vendorOrgId: string, orderId: string, status: string) {
  try {
    const url = buildUrl(`/api/vendor/${vendorOrgId}/orders/${orderId}/status?status=${encodeURIComponent(status)}`);
    const res = await axios.put(url);
    return res.data;
  } catch (err: any) {
    const { message, status: errStatus } = extractError(err);
    throw { message, status: errStatus } as ApiError;
  }
}

// Update order status
// PUT /api/v1/orders/{orderId}/status
export async function updateOrderStatusNew(orderId: string, vendorStatus: string, _deliveryStatus?: string, _notes?: string) {
  try {
    const url = buildUrl(`/api/v1/orders/${orderId}/status`);
    const body: any = { status: vendorStatus };
    const res = await apiClient.put(url, body);
    return res.data;
  } catch (err: any) {
    const { message, status: errStatus } = extractError(err);
    throw { message, status: errStatus } as ApiError;
  }
}

// New API: Cancel order
export async function cancelOrder(orderId: string, reason?: string) {
  try {
    let url = buildUrl(`/api/v1/orders/${orderId}/cancel`);
    if (reason) {
      url += `?reason=${encodeURIComponent(reason)}`;
    }
    const res = await apiClient.post(url, {});
    return res.data;
  } catch (err: any) {
    const { message, status: errStatus } = extractError(err);
    throw { message, status: errStatus } as ApiError;
  }
}

// Notification endpoints
// GET /api/v1/notifications?page=0&size=20
export async function getVendorNotifications(_vendorOrgId?: string, page: number = 0, size: number = 20) {
  try {
    const url = buildUrl(`/api/v1/notifications?page=${page}&size=${size}`);
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// GET /api/v1/notifications/unread/count
export async function getNotificationsUnreadCount() {
  try {
    const url = buildUrl(`/api/v1/notifications/unread/count`);
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// PUT /api/v1/notifications/read-all
export async function markAllNotificationsRead() {
  try {
    const url = buildUrl(`/api/v1/notifications/read-all`);
    const res = await apiClient.put(url, {});
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// Reviews
// GET /api/v1/reviews/vendor/my?page=0&size=10
export async function getVendorReviews(_vendorId?: string, page: number = 0, size: number = 20) {
  try {
    const url = buildUrl(`/api/v1/reviews/vendor/my?page=${page}&size=${size}`);
    const res = await apiClient.get(url);
    // Return data array for backward compatibility
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// POST /api/v1/reviews/{reviewId}/respond
export async function respondToReview(reviewId: string, responseText: string) {
  try {
    const url = buildUrl(`/api/v1/reviews/${reviewId}/respond`);
    const res = await apiClient.post(url, { responseText });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function getLatestVendorReviews(_vendorId?: string) {
  try {
    const url = buildUrl(`/api/v1/reviews/vendor/my?page=0&size=5`);
    const res = await apiClient.get(url);
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function deleteVendorReview(reviewId: string) {
  try {
    const url = buildUrl(`/api/v1/reviews/${reviewId}`);
    const res = await apiClient.delete(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// PUT /api/v1/notifications/{notificationId}/read
export async function markNotificationAsRead(notificationId: string) {
  try {
    const url = buildUrl(`/api/v1/notifications/${notificationId}/read`);
    const res = await apiClient.put(url, {});
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// PUT /api/v1/vendors/me/logo
export async function updateVendorLogo(logoUrl: string) {
  try {
    const url = buildUrl("/api/v1/vendors/me/logo");
    const res = await apiClient.put(url, { logoUrl });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// PUT /api/v1/vendors/me/banner
export async function updateVendorBanner(bannerUrl: string) {
  try {
    const url = buildUrl("/api/v1/vendors/me/banner");
    const res = await apiClient.put(url, { bannerUrl });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// GET /api/v1/orders/vendor/upcoming?page=0&size=20
export async function getUpcomingOrders(page: number = 0, size: number = 20) {
  try {
    const url = buildUrl(`/api/v1/orders/vendor/upcoming?page=${page}&size=${size}`);
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status: errStatus } = extractError(err);
    throw { message, status: errStatus } as ApiError;
  }
}

// PUT /api/v1/users/me/fcm-token
export async function registerFcmToken(fcmToken: string) {
  try {
    const url = buildUrl("/api/v1/users/me/fcm-token");
    const res = await apiClient.put(url, { fcmToken });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// POST /api/v1/upload/image (multipart/form-data)
export async function uploadImage(file: File, entityType?: string, entityId?: string) {
  try {
    const url = buildUrl("/api/v1/upload/image");
    const fd = new FormData();
    fd.append("file", file);
    if (entityType) fd.append("entityType", entityType);
    if (entityId) fd.append("entityId", entityId);
    const res = await apiClient.post(url, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// POST /api/v1/upload/document (multipart/form-data)
export async function uploadDocumentFile(file: File, entityType?: string, entityId?: string) {
  try {
    const url = buildUrl("/api/v1/upload/document");
    const fd = new FormData();
    fd.append("file", file);
    if (entityType) fd.append("entityType", entityType);
    if (entityId) fd.append("entityId", entityId);
    const res = await apiClient.post(url, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// POST /api/v1/support/tickets
export async function createSupportTicket(payload: {
  category: string;
  subcategory?: string;
  priority?: string;
  subject: string;
  description: string;
  orderId?: string;
  vendorId?: string;
  paymentId?: string;
  attachmentUrls?: string[];
}) {
  try {
    const url = buildUrl("/api/v1/support/tickets");
    const res = await apiClient.post(url, payload);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

// GET /api/v1/support/tickets/my?page=0&size=20
export async function getMySupportTickets(page: number = 0, size: number = 20) {
  try {
    const url = buildUrl(`/api/v1/support/tickets/my?page=${page}&size=${size}`);
    const res = await apiClient.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function sendOtp(payload: { identifier: string; type: "EMAIL" | "PHONE"; channel?: "WHATSAPP" | "SMS" }) {
  try {
    const url = buildUrl(`/api/v1/auth/send-otp`);
    const res = await axios.post(url, payload);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export async function verifyOtp(payload: { identifier: string; otp: string; type: "EMAIL" | "PHONE" }) {
  try {
    const url = buildUrl(`/api/v1/auth/verify-otp`);
    const res = await axios.post(url, payload);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    throw { message, status } as ApiError;
  }
}

export default {
  registerUser,
  registerAuth,
  login,
  forgotEmail,
  forgotPhone,
  forgotPassword,
  resetPassword,
  createVendorProfile,
  registerVendor,
  loginVendor,
  getVendorMe,
  getVendorProfile,
  updateVendorProfile,
  createOrUpdateServiceDetails,
  getServiceDetailsByVendorId,
  getServiceDetailsByVendorOrgId,
  searchServicesByServiceType,
  searchServicesByCuisine,
  searchServicesByArea,
  deleteServiceDetails,
  getMenuItems,
  getMasterMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getSingleVendorMenuItem,
  toggleMenuItemAvailability,
  uploadDocument,
  getBidsByVendor,
  submitBidQuote,
  acceptBid,
  getReceivedBidRequests,
  getActiveBidRequests,
  getVendorSubmittedBids,
  submitBid,
  reviseBid,
  withdrawBid,
  getBidByIdV1,
  submitBidQuotation,
  updateBidQuotation,
  getBidRequestDetails,
  getOrdersByVendor,
  updateOrderStatus,
  updateOrderStatusNew,
  getVendorOrders,
  getVendorOrderById,
  getOrderTransactions,
  cancelOrder,
  getVendorNotifications,
  getNotificationsUnreadCount,
  markAllNotificationsRead,
  markNotificationAsRead,
  respondToReview,
  getVendorReviews,
  getLatestVendorReviews,
  deleteVendorReview,
  updateVendorLogo,
  updateVendorBanner,
  getUpcomingOrders,
  registerFcmToken,
  uploadImage,
  uploadDocumentFile,
  createSupportTicket,
  getMySupportTickets,
  sendOtp,
  verifyOtp,
};
