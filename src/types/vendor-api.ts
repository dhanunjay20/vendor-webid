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

/** POST /vendors/register — request body */
export interface VendorRegistrationRequest {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessType: string; // CATERING | RESTAURANT | HOME_CHEF | CLOUD_KITCHEN
  businessRegistrationNumber?: string;
  taxId?: string;
  description?: string;
  establishedYear?: number;
  cuisinesOffered?: string[];
  specialties?: string[];
  businessAddress: Address;
  ownerInfo: OwnerInfo;
  serviceAreas?: ServiceArea[];
  capacity: VendorCapacity;
  pricing: VendorPricing;
  country: string; // INDIA | USA
}

/** PUT /vendors/{vendorId} — request body */
export interface VendorUpdateRequest {
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  description?: string;
  cuisinesOffered?: string[];
  specialties?: string[];
  logoUrl?: string;
  bannerUrl?: string;
  serviceAreas?: ServiceArea[];
  capacity?: VendorCapacity;
  pricing?: VendorPricing;
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

/** POST /menu/vendor-items — request body */
export interface AddMenuItemRequest {
  masterItemId: string;
  customName?: string;
  customDescription?: string;
  pricing: MenuItemPricing;
  availability: MenuItemAvailability;
  preparationTimeMinutes?: number;
  customizationOptions?: CustomizationOption[];
}

/** PUT /menu/vendor-items/{vendorItemId} — request body (same shape) */
export type UpdateMenuItemRequest = Partial<Omit<AddMenuItemRequest, 'masterItemId'>>;

/** PATCH /menu/vendor-items/{vendorItemId}/availability */
export interface ToggleAvailabilityRequest {
  isAvailable: boolean;
  reason?: string;
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

/** POST /bids/submit — request body */
export interface SubmitBidRequest {
  bidRequestId: string;
  quotedPrice: QuotedPrice;
  itemizedPricing?: ItemizedPrice[];
  deliveryDetails?: DeliveryDetails;
  staffProvided?: StaffProvided;
  termsAndConditions?: string;
  validityPeriodHours: number;
  advancePercentage: number;
  requiredAdvanceAmount: number;
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
  requiredAdvanceAmount?: number;
}

/** Full bid response (GET /bids/my-bids, POST /bids/submit response) */
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
  requiredAdvanceAmount: number;
  revisionCount: number;
  status: string; // PENDING | ACCEPTED | REJECTED | EXPIRED | WITHDRAWN
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

/** GET /reviews/vendor/{vendorId} response item */
export interface ReviewResponse {
  reviewId: string;
  orderId: string;
  vendorId: string;
  userId: string;
  userName: string;
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
  status: string; // APPROVED | PENDING | REJECTED
  createdAt: string;
}

/** POST /reviews/{reviewId}/vendor-response — request body */
export interface VendorReviewResponseRequest {
  responseText: string;
}

// ==================== Analytics ====================

export interface VendorMetrics {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  pendingPayouts: number;
  thisMonthRevenue: number;
  currency: string;
}

export interface BidMetrics {
  totalBidsSubmitted: number;
  acceptedBids: number;
  pendingBids: number;
  acceptanceRate: number;
  averageBidAmount: number;
}

export interface RecentOrderSummary {
  orderId: string;
  eventName: string;
  eventDate: string;
  guestCount: number;
  amount: number;
  status: string;
}

export interface UpcomingEventSummary {
  orderId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  guestCount: number;
  daysUntil: number;
}

export interface PerformanceMetrics {
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  onTimeDeliveryRate: number;
  repeatCustomers: number;
}

/** GET /analytics/vendor/dashboard response */
export interface VendorDashboardResponse {
  vendorId: string;
  vendorName: string;
  metrics: VendorMetrics;
  bidMetrics: BidMetrics;
  recentOrders: RecentOrderSummary[];
  upcomingEvents: UpcomingEventSummary[];
  performance: PerformanceMetrics;
}

// ==================== File Upload ====================

/** POST /uploads/document response */
export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  originalName: string;
  fileType: string; // DOCUMENT | IMAGE
  contentType: string;
  fileSize: number;
  fileUrl: string;
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
  lastMessage?: LastMessage | null;
  unreadCount: number;
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
  messageType: string; // TEXT | IMAGE | FILE
  attachments?: MessageAttachment[] | null;
  timestamp: string;
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

export type VendorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE' | 'INACTIVE';
export type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';
export type OrderVendorStatus = 'ACCEPTED' | 'IN_PREPARATION' | 'DISPATCHED' | 'SETUP_IN_PROGRESS' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'TOKEN_PAID' | 'PARTIALLY_PAID' | 'FULLY_PAID';
