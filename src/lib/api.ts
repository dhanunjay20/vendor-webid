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

export default {
  registerUser,
  login,
  forgotUsername,
  forgotPassword,
  resetPassword,
  registerVendor,
  loginVendor,
};

