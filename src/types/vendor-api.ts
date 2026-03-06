/**
 * Vendor API TypeScript Types — Based on actual Java DTOs
 * VendorRegistrationRequest, VendorUpdateRequest, VendorResponse,
 * VendorMenuItemResponse, SubmitBidDTO, VendorBidResponse,
 * BidRequestResponse, OrderResponse, ReviewResponse,
 * VendorDashboardResponse, ConversationResponse, ChatMessageResponse,
 * FileUploadResponse
 *
 * Bidzaro Catering Platform v1.0.0
 */

// ==================== Common ====================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string | null;
  data: T;
  pageInfo?: PageInfo;
}

export interface PageInfo {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface Address {
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ==================== Vendor ====================

export interface OwnerInfo {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  idProofType?: string; // AADHAR, PAN, PASSPORT, DRIVERS_LICENSE, etc.
  idProofNumber?: string;
}

export interface ServiceArea {
  city: string;
  state: string;
  radiusKm: number;
}

export interface VendorCapacity {
  minGuests: number;
  maxGuests: number;
  concurrentEvents?: number;
}

export interface VendorPricing {
  currency: string; // INR | USD
  startingPricePerPlate: number;
  averagePricePerPlate?: number;
}

export interface VendorRatings {
  averageRating: number;
  totalReviews: number;
}

export interface VendorStats {
  totalOrders: number;
  completedOrders: number;
}

export interface VendorDocument {
  documentId: string;
  documentType: string; // BUSINESS_LICENSE | TAX_CERTIFICATE | FOOD_LICENSE | INSURANCE | etc.
  documentName: string;
  documentUrl: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string | null;
  verificationStatus: string; // PENDING | VERIFIED | REJECTED
  uploadedAt: string;
}

/** POST /vendors — request body */
export interface VendorRegistrationRequest {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessType: string; // CATERING | RESTAURANT | CLOUD_KITCHEN | HOME_CHEF | BAKERY
  businessRegistrationNumber?: string;
  taxId?: string;
  description?: string;
  establishedYear?: number;
  cuisinesOffered?: string[];
  specialties?: string[];
  businessAddress?: {
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  };
  ownerInfo?: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    idProofType?: string;
    idProofNumber?: string;
  };
  serviceAreas?: ServiceArea[];
  capacity?: VendorCapacity;
  pricing?: VendorPricing;
  country: string; // INDIA | USA — required
  documents?: Array<{
    documentType: string;
    documentName: string;
    documentUrl: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
  }>;
}

/** PUT /vendors/me — all fields optional */
export interface VendorUpdateRequest {
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessType?: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  description?: string;
  establishedYear?: number;
  cuisinesOffered?: string[];
  specialties?: string[];
  logoUrl?: string;
  bannerUrl?: string;
  businessAddress?: {
    streetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  ownerInfo?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    idProofType?: string;
    idProofNumber?: string;
  };
  serviceAreas?: ServiceArea[];
  capacity?: Partial<VendorCapacity>;
  pricing?: Partial<VendorPricing>;
  country?: string;
  documents?: Array<{
    documentType: string;
    documentName: string;
    documentUrl: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
  }>;
}

/** Full vendor profile response (GET /vendors/my-profile, POST /vendors/register response, etc.) */
export interface VendorResponse {
  vendorId: string;
  userId: string;
  registeredEmail: string;
  registeredPhone: string;
  registeredEmailVerified: boolean;
  registeredPhoneVerified: boolean;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessEmailVerified: boolean;
  businessPhoneVerified: boolean;
  businessType: string;
  businessRegistrationNumber?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  establishedYear?: number | null;
  cuisinesOffered?: string[] | null;
  specialties?: string[] | null;
  businessAddress: Address;
  ownerInfo: OwnerInfo;
  serviceAreas?: ServiceArea[] | null;
  capacity: VendorCapacity;
  pricing: VendorPricing;
  ratings?: VendorRatings | null;
  stats?: VendorStats | null;
  status: string; // PENDING | APPROVED | REJECTED | SUSPENDED | ACTIVE | INACTIVE
  approvalStatus: string; // PENDING | APPROVED | REJECTED
  verified: boolean;
  featured: boolean;
  createdAt: string;
  documents?: VendorDocument[] | null;
  country: string;
}

// ==================== Menu Items ====================

export interface MenuItemPricing {
  currency: string;
  pricePerPlate: number;
  minimumOrderQuantity?: number;
  discountPercentage?: number | null;
  discountedPrice?: number | null;
}

export interface MenuItemAvailability {
  isAvailable: boolean;
  unavailableReason?: string | null;
  unavailableUntil?: string | null;
  advanceNoticeHours?: number;
  maxDailyCapacity?: number;
}

export interface CustomizationOption {
  optionName: string;
  choices: string[];
  additionalCost?: number;
  isRequired?: boolean;
}

export interface MenuItemStats {
  totalOrders: number;
  averageRating?: number | null;
  totalReviews: number;
}

/** POST /menu/vendor-items — request body (flat fields, not nested) */
export interface AddMenuItemRequest {
  masterItemId: string;           // Required on POST
  customName?: string;
  customDescription?: string;
  pricePerPlate: number;          // Required on POST, must be >= 0.01
  minimumOrderQuantity?: number;  // Min 1, default 1
  discountPercentage?: number;    // 0–100
  isAvailable?: boolean;          // Default true
  unavailableReason?: string;
  advanceNoticeHours?: number;    // Min 0
  maxDailyCapacity?: number;      // Min 1
  preparationTimeMinutes?: number; // Min 1
  customizationOptions?: CustomizationOption[];
}

/** PUT /menu/vendor-items/{vendorItemId} — all fields optional, same flat shape */
export type UpdateMenuItemRequest = Partial<Omit<AddMenuItemRequest, 'masterItemId'>>;

/** PATCH /menu/vendor-items/{vendorItemId}/availability — sent as QUERY PARAMS not body */
export interface ToggleAvailabilityRequest {
  isAvailable: boolean;
  reason?: string;  // maps to &reason= query param
}

/** Full vendor menu item response */
export interface VendorMenuItemResponse {
  vendorItemId: string;
  vendorId: string;
  masterItemId: string;
  customName?: string | null;
  customDescription?: string | null;
  pricing: MenuItemPricing;
  availability: MenuItemAvailability;
  preparationTimeMinutes?: number;
  customizationOptions?: CustomizationOption[] | null;
  stats: MenuItemStats;
  status: string; // ACTIVE | INACTIVE
  createdAt: string;
}

// ==================== Bids ====================

export interface EventDetails {
  eventType: string; // WEDDING | CORPORATE | BIRTHDAY | etc.
  eventName: string;
  eventDate: string;
  eventStartTime?: string;
  eventEndTime?: string;
  eventTime?: string;
  numberOfGuests: number;
  venueAddress: Address;
}

export interface BidMenuItem {
  vendorItemId?: string | null;
  masterItemId: string;
  itemName: string;
  quantity: number;
}

export interface AdditionalRequirements {
  serviceStaffNeeded?: boolean;
  numberOfStaff?: number;
  decorationNeeded?: boolean;
  liveCounters?: string[];
  specialInstructions?: string;
}

export interface BudgetInfo {
  currency: string;
  estimatedBudget: number;
  budgetRange?: string;
}

export interface CompetitivePeriod {
  startTime: string;
  endTime: string;
  status: string; // ACTIVE | ENDED
}

/** GET /bids/available-leads response item */
export interface BidRequestResponse {
  bidRequestId: string;
  userId: string;
  eventDetails: EventDetails;
  menuItems: BidMenuItem[];
  additionalRequirements?: AdditionalRequirements | null;
  budget: BudgetInfo;
  targetedVendors: string[];
  competitivePeriod: CompetitivePeriod;
  acceptedBid?: string | null;
  status: string; // ACTIVE | EXPIRED | CANCELLED | ACCEPTED
  totalBidsReceived: number;
  lowestBidAmount?: number | null;
  createdAt: string;
  expiresAt: string;
}

export interface QuotedPrice {
  currency: string;
  subtotal: number;
  serviceCharge?: number;
  taxPercentage?: number;
  taxAmount?: number;
  totalAmount: number;
}

export interface ItemizedPrice {
  vendorItemId?: string;
  itemName: string;
  quantity: number;
  pricePerPlate: number;
  totalPrice: number;
}

export interface DeliveryDetails {
  estimatedSetupTime?: string;
  foodReadyTime?: string;
  cleanupTime?: string;
}

export interface StaffProvided {
  chefs?: number;
  servers?: number;
  cleaners?: number;
}

/** POST /bids/{bidRequestId}/submit — request body (bidRequestId is a PATH param) */
export interface SubmitBidRequest {
  quotedPrice: QuotedPrice;
  itemizedPricing?: ItemizedPrice[];
  deliveryDetails?: DeliveryDetails;
  staffProvided?: StaffProvided;
  termsAndConditions?: string;
  validityPeriodHours?: number;   // Default 168 (7 days)
  advancePercentage?: number;     // 0–100
}

/** PUT /bids/{bidId} — request body */
export interface ReviseBidRequest {
  quotedPrice?: QuotedPrice;
  itemizedPricing?: ItemizedPrice[];
  deliveryDetails?: DeliveryDetails;
  staffProvided?: StaffProvided;
  termsAndConditions?: string;
  validityPeriodHours?: number;
  advancePercentage?: number;
}

/** Full bid response */
export interface VendorBidResponse {
  bidId: string;
  bidRequestId: string;
  vendorId: string;
  vendorName: string;
  eventDetails?: EventDetails | null;
  quotedPrice: QuotedPrice;
  itemizedPricing?: ItemizedPrice[] | null;
  deliveryDetails?: DeliveryDetails | null;
  staffProvided?: StaffProvided | null;
  termsAndConditions?: string | null;
  validityPeriodHours: number;
  advancePercentage: number;
  requiredAdvanceAmount: number; // server-calculated
  revisionCount: number;
  status: string; // SUBMITTED | REVISED | ACCEPTED | REJECTED | EXPIRED | WITHDRAWN
  isLowest: boolean;
  rank: number;
  submittedAt: string;
  expiresAt: string;
}

// ==================== Orders ====================

export interface VendorOrderItem {
  vendorItemId: string;
  itemName: string;
  quantity: number;
  pricePerPlate: number;
  totalPrice: number;
}

export interface VendorOrderEntry {
  vendorOrderId: string;
  vendorId: string;
  vendorUserId?: string | null;
  vendorName: string;
  items: VendorOrderItem[] | null;
  subtotal: number;
  serviceCharge: number | null;
  taxAmount: number;
  totalAmount: number;
  vendorStatus: string; // ACCEPTED | IN_PREPARATION | DISPATCHED | SETUP_IN_PROGRESS | DELIVERED | COMPLETED | CANCELLED
  deliveryStatus: string;
}

export interface OrderPricing {
  currency: string;
  subtotal: number;
  serviceCharges: number | null;
  taxAmount: number;
  platformFee: number;
  discountAmount: number;
  totalAmount: number;
}

export interface OrderPaymentDetails {
  tokenAmount: number;
  tokenPaid: boolean;
  tokenPaidAt?: string;
  totalPaid: number;
  balanceDue: number;
  paymentStatus: string; // TOKEN_PAID | PARTIALLY_PAID | FULLY_PAID
}

export interface OrderContactInfo {
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
}

export interface OrderCancellation {
  isCancelled?: boolean;
  cancellationReason?: string;
  cancelledAt?: string;
  refundAmount?: number;
  refundStatus?: string;
}

/** PATCH /orders/{orderId}/vendor-status — request body */
export interface UpdateVendorStatusRequest {
  vendorStatus: string;
  deliveryStatus?: string;
  notes?: string;
}

/** Full order response */
export interface OrderResponse {
  orderId: string;
  userId: string;
  bidRequestId: string;
  eventDetails: EventDetails;
  vendorOrders: VendorOrderEntry[];
  pricing: OrderPricing;
  paymentDetails: OrderPaymentDetails;
  contactInfo?: OrderContactInfo;
  specialInstructions?: string | null;
  status: string; // CONFIRMED | IN_PREPARATION | DELIVERED | COMPLETED | CANCELLED
  cancellation?: OrderCancellation | null;
  createdAt: string;
  confirmedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
}

// ==================== Reviews ====================

export interface VendorReviewResponse {
  vendorResponse?: {
    responseText: string;
    respondedAt: string;
  } | null;
}

/** GET /reviews/vendor/my response item */
export interface ReviewResponse {
  reviewId: string;
  orderId: string;
  vendorId: string;
  userId: string;
  userName?: string;
  rating: number;
  foodQualityRating?: number;
  serviceQualityRating?: number;
  hygieneRating?: number;
  valueForMoneyRating?: number;
  punctualityRating?: number;
  reviewText: string;
  images?: string[];
  vendorResponse?: {
    responseText: string;
    respondedAt: string;
  } | null;
  helpfulCount: number;
  reportedCount?: number;
  moderationNotes?: string | null;
  status: string; // APPROVED | PENDING | REJECTED
  createdAt: string;
  updatedAt?: string;
}

/** POST /reviews/{reviewId}/vendor-response — request body */
export interface VendorReviewResponseRequest {
  responseText: string;
}

// ==================== Analytics ====================

export interface RevenueMetrics {
  totalRevenue: number;
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
  pendingPayouts: number;
}

export interface OrderMetrics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  completionRate: number;
  cancellationRate: number;
}

export interface BidMetrics {
  totalBidsSubmitted: number;
  bidsAccepted: number;
  bidsRejected: number;
  bidsPending: number;
  bidSuccessRate: number;
}

export interface RatingMetrics {
  averageRating: number;
  totalReviews: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
}

export interface UpcomingEventSummary {
  orderId: string;
  eventType: string;
  eventDate: string;
  numberOfGuests: number;
  totalAmount: number;
  status: string;
}

/** GET /analytics/vendor/dashboard response */
export interface VendorDashboardResponse {
  revenueMetrics: RevenueMetrics;
  orderMetrics: OrderMetrics;
  bidMetrics: BidMetrics;
  ratingMetrics: RatingMetrics;
  upcomingEvents: UpcomingEventSummary[];
}

// ==================== File Upload ====================

/** POST /upload/image or POST /upload/document response */
export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType: string; // IMAGE | DOCUMENT
  contentType: string;
  fileSize: number;
  entityType?: string; // VENDOR_LOGO | VENDOR_BANNER | MENU_ITEM | VENDOR_DOCUMENT
  entityId?: string;
  uploadedBy?: string;
  createdAt: string;
}

// ==================== Chat ====================

export interface ChatParticipant {
  userId: string;
  userType: string; // USER | VENDOR | SUPPORT
  name: string;
}

export interface LastMessage {
  message: string;
  senderId: string;
  senderType?: string;
  timestamp: string;
}

/** Conversation response */
export interface ConversationResponse {
  conversationId: string;
  participants: ChatParticipant[];
  otherParticipant?: ChatParticipant;
  conversationType?: string; // USER_VENDOR | VENDOR_SUPPORT
  relatedTo?: { entityType: string; entityId: string } | null;
  lastMessage?: LastMessage | null;
  unreadCount: Record<string, number> | number; // map of userId -> count, or scalar
  status: string; // ACTIVE | ARCHIVED
  createdAt: string;
  updatedAt?: string;
}

export interface MessageAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
}

/** Chat message response */
export interface ChatMessageResponse {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderType: string; // USER | VENDOR
  senderName?: string | null;
  message: string;
  messageType: string; // TEXT | IMAGE | FILE | SYSTEM
  attachments?: MessageAttachment[] | null;
  readBy?: Array<{ userId: string; readAt: string }>;
  isDeleted?: boolean;
  deletedAt?: string | null;
  timestamp: string;
  createdAt?: string;
}

/** POST /chat/conversations — request */
export interface CreateConversationRequest {
  otherUserId: string;
  type: string; // USER_VENDOR | USER_SUPPORT | VENDOR_SUPPORT
}

/** WebSocket send message payload */
export interface SendChatMessage {
  conversationId: string;
  message: string;
  messageType: string; // TEXT | IMAGE | FILE
}

// ==================== Status Enums ====================

export type VendorStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'DELETED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
export type BusinessType = 'CATERING' | 'RESTAURANT' | 'CLOUD_KITCHEN' | 'HOME_CHEF' | 'BAKERY';
export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type BidStatus = 'SUBMITTED' | 'REVISED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';
export type VendorOrderStatus = 'PENDING' | 'ACCEPTED' | 'CONFIRMED' | 'IN_PREPARATION' | 'READY' | 'DELIVERED' | 'COMPLETED';
export type DeliveryStatus = 'PENDING' | 'ON_THE_WAY' | 'DELIVERED';
export type OrderStatus = 'PENDING_TOKEN_PAYMENT' | 'CONFIRMED' | 'IN_PREPARATION' | 'READY_FOR_DELIVERY' | 'DELIVERING' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
export type MenuItemStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
export type FoodType = 'VEG' | 'NON_VEG' | 'VEGAN' | 'EGG';
export type SpiceLevel = 'MILD' | 'MEDIUM' | 'HOT' | 'EXTRA_HOT';
export type ConversationType = 'USER_VENDOR' | 'VENDOR_SUPPORT';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
export type PaymentMethod = 'CARD' | 'UPI' | 'NET_BANKING' | 'WALLET';
export type PaymentStatus = 'TOKEN_PAID' | 'PARTIALLY_PAID' | 'FULLY_PAID';
