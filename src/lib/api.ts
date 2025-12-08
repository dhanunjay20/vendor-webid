import axios from "axios";

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

function extractError(err: any): { message?: string; status?: number } {
  if (!err) return { message: "Network error" };
  if (err.response) {
    const status = err.response.status;
    const d = err.response.data;
    // Log full server response for debugging, but avoid showing raw 5xx messages to users
    try {
      console.debug("API error response body:", d);
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
      const bizPart = firstTwoLettersPerWord(payload.businessName || payload.businessName || "");
      const ownerPart = firstTwoLettersPerWord(payload.contactName || payload.ownerName || `${payload.firstName || ""} ${payload.lastName || ""}`);
      const minDigits = 4;
      const maxDigits = 9;
      const digits = Math.floor(Math.random() * (maxDigits - minDigits + 1)) + minDigits;
      let rand = "";
      for (let i = 0; i < digits; i++) rand += Math.floor(Math.random() * 10).toString();
      const parts = [] as string[];
      if (bizPart) parts.push(bizPart.toUpperCase());
      if (ownerPart) parts.push(ownerPart.toUpperCase());
      parts.push(rand);
      vendorPayload.vendorOrganizationId = parts.join("-");
    }

    const url = buildUrl("/api/vendor/register");
    const res = await axios.post(url, vendorPayload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("registerUser error", err);
    throw { message, status } as ApiError;
  }
}

export async function login(payload: { login: string; password: string; }) {
  try {
    const url = buildUrl("/api/auth/login");
    const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("login error", err);
    throw { message, status } as ApiError;
  }
}

export async function forgotUsername(payload: { contact: string; }) {
  try {
    const url = buildUrl("/api/auth/forgot-username");
    const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("forgotUsername error", err);
    throw { message, status } as ApiError;
  }
}

export async function forgotPassword(payload: { login: string; }) {
  try {
    const url = buildUrl("/api/auth/forgot-password");
    const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("forgotPassword error", err);
    throw { message, status } as ApiError;
  }
}

export async function resetPassword(payload: { contact: string; otp: string; newPassword: string; }) {
  try {
    const url = buildUrl("/api/auth/reset-password");
    const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("resetPassword error", err);
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
    console.error("registerVendor error", err);
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
    console.error("registerVendorMultipart error", err);
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
    console.error("loginVendor error", err);
    throw { message, status } as ApiError;
  }
}

// Menu item endpoints
export async function getMenuItems(vendorOrganizationId: string) {
  try {
    const url = buildUrl(`/api/vendor/${vendorOrganizationId}/menu`);
    const token = localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const res = await axios.get(url, { headers: token ? { Authorization: `${tokenType} ${token}` } : undefined });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("getMenuItems error", err);
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
    console.error("getBidsByVendor error", err);
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
    console.error("getBidById error", err);
    throw { message, status } as ApiError;
  }
}

export async function createMenuItem(vendorOrganizationId: string, payload: any) {
  try {
    const url = buildUrl(`/api/vendor/${vendorOrganizationId}/menu`);
    const token = localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `${tokenType} ${token}` } : {}) } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("createMenuItem error", err);
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
    console.error("submitBidQuote error", err);
    throw { message, status } as ApiError;
  }
}

export async function updateMenuItem(vendorOrganizationId: string, id: string, payload: any) {
  try {
    const url = buildUrl(`/api/vendor/${vendorOrganizationId}/menu/${id}`);
    const token = localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const res = await axios.put(url, payload, { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `${tokenType} ${token}` } : {}) } });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("updateMenuItem error", err);
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
    console.error("acceptBid error", err);
    throw { message, status } as ApiError;
  }
}

export async function deleteMenuItem(vendorOrganizationId: string, id: string) {

  try {
    const url = buildUrl(`/api/vendor/${vendorOrganizationId}/menu/${id}`);
    const token = localStorage.getItem("authToken");
    const tokenType = localStorage.getItem("tokenType") || "Bearer";
    const res = await axios.delete(url, { headers: token ? { Authorization: `${tokenType} ${token}` } : undefined });
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("deleteMenuItem error", err);
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
    console.error("getOrdersByVendor error", err);
    throw { message, status } as ApiError;
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
        console.warn("getOrderById called without vendorOrgId");
      }
      if (!orderId) {
        console.warn("getOrderById called without orderId");
      }

      // Ensure path params are encoded
      const encVendor = encodeURIComponent(vendorOrgId || "");
      const encOrder = encodeURIComponent(orderId || "");
      const finalUrl = buildUrl(`/api/vendor/${encVendor}/orders/${encOrder}/details`);
      console.debug("getOrderById requesting URL:", finalUrl);

      // Request raw text so we can handle JSON or XML responses robustly
      const res = await axios.get(finalUrl, { headers, responseType: "text" });
    const dataText = res.data as string;
    console.debug("getOrderById response content-type:", res.headers && res.headers["content-type"]);

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
      console.error("XML parse error for order details", e);
      return {};
    }
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("getOrderById error", err);
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
    console.error("updateOrderStatus error", err);
    throw { message, status: errStatus } as ApiError;
  }
}

// Notification endpoints
export async function getVendorNotifications(vendorOrgId: string) {
  try {
    const url = buildUrl(`/api/notifications/vendor/${vendorOrgId}`);
    const res = await axios.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("getVendorNotifications error", err);
    throw { message, status } as ApiError;
  }
}

// Reviews
export async function getVendorReviews(vendorOrgId: string) {
  try {
    const url = buildUrl(`/api/vendor/${vendorOrgId}/review`);
    const res = await axios.get(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("getVendorReviews error", err);
    throw { message, status } as ApiError;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const url = buildUrl(`/api/notifications/${notificationId}/read`);
    const res = await axios.put(url);
    return res.data;
  } catch (err: any) {
    const { message, status } = extractError(err);
    console.error("markNotificationAsRead error", err);
    throw { message, status } as ApiError;
  }
}

export default {
  registerUser,
  login,
  forgotUsername,
  forgotPassword,
  resetPassword,
  registerVendor,
  loginVendor,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getBidsByVendor,
  submitBidQuote,
  acceptBid,
  getOrdersByVendor,
  updateOrderStatus,
  getVendorNotifications,
  markNotificationAsRead,
};
