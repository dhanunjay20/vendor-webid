/**
 * Bid Request Status - Status of the customer's request
 */
export enum BidRequestStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  COMPETITIVE = "COMPETITIVE",
  COOLING = "COOLING",
  ACCEPTED = "ACCEPTED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

/**
 * Bid Status - Status of the vendor's bid
 * Per API docs: PENDING | ACCEPTED | REJECTED | EXPIRED | WITHDRAWN
 */
export enum BidStatus {
  PENDING = "PENDING",
  SUBMITTED = "SUBMITTED",
  REVISED = "REVISED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
  WITHDRAWN = "WITHDRAWN",
}

/**
 * Period Status - Status of the competitive bidding period
 */
export enum PeriodStatus {
  ACTIVE = "ACTIVE",
  ENDED = "ENDED",
}

/**
 * Get display label for BidRequestStatus
 */
export function getBidRequestStatusLabel(status: string | BidRequestStatus): string {
  const labels: Record<string, string> = {
    [BidRequestStatus.DRAFT]: "Draft",
    [BidRequestStatus.ACTIVE]: "Active",
    [BidRequestStatus.COMPETITIVE]: "Competitive",
    [BidRequestStatus.COOLING]: "Cooling Period",
    [BidRequestStatus.ACCEPTED]: "Accepted",
    [BidRequestStatus.EXPIRED]: "Expired",
    [BidRequestStatus.CANCELLED]: "Cancelled",
  };
  return labels[status] || status;
}

/**
 * Get display label for BidStatus
 */
export function getBidStatusLabel(status: string | BidStatus): string {
  const labels: Record<string, string> = {
    [BidStatus.PENDING]: "Pending",
    [BidStatus.SUBMITTED]: "Submitted",
    [BidStatus.REVISED]: "Revised",
    [BidStatus.ACCEPTED]: "Accepted",
    [BidStatus.REJECTED]: "Rejected",
    [BidStatus.EXPIRED]: "Expired",
    [BidStatus.WITHDRAWN]: "Withdrawn",
  };
  return labels[status] || status;
}

/**
 * Get status badge styling
 */
export function getStatusBadgeClass(status: string): string {
  const statusUpper = status?.toUpperCase() || "";
  
  if (statusUpper === BidRequestStatus.ACTIVE || statusUpper === BidRequestStatus.COMPETITIVE) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-400";
  }
  if (statusUpper === BidRequestStatus.COOLING || statusUpper === BidStatus.PENDING || statusUpper === BidStatus.SUBMITTED) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-400";
  }
  if (statusUpper === BidStatus.REVISED) {
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-400";
  }
  if (statusUpper === BidRequestStatus.ACCEPTED || statusUpper === BidStatus.ACCEPTED || statusUpper === "CONFIRMED") {
    return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-400";
  }
  if (statusUpper === BidRequestStatus.EXPIRED || statusUpper === BidStatus.EXPIRED) {
    return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-400";
  }
  if (statusUpper === BidRequestStatus.CANCELLED || statusUpper === BidStatus.REJECTED || statusUpper === BidStatus.WITHDRAWN) {
    return "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300 border-gray-400";
  }
  
  return "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border-slate-400";
}

/**
 * Check if a bid request is still open for new bids
 */
export function isRequestOpen(status: string): boolean {
  const statusUpper = status?.toUpperCase() || "";
  return statusUpper === BidRequestStatus.ACTIVE || statusUpper === BidRequestStatus.COMPETITIVE;
}

/**
 * Check if a bid can be revised (PENDING or SUBMITTED or REVISED bids can be revised)
 */
export function isBidInCoolingPeriod(bidStatus: string): boolean {
  const statusUpper = bidStatus?.toUpperCase() || "";
  return statusUpper === BidStatus.PENDING || statusUpper === BidStatus.SUBMITTED || statusUpper === BidStatus.REVISED;
}

/**
 * Check if a bid can be withdrawn
 */
export function canWithdrawBid(bidStatus: string): boolean {
  const statusUpper = bidStatus?.toUpperCase() || "";
  return statusUpper !== BidStatus.WITHDRAWN && 
         statusUpper !== BidStatus.ACCEPTED && 
         statusUpper !== BidStatus.REJECTED;
}
