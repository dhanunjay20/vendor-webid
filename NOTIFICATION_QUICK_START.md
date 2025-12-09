# 🚀 Real-Time Notifications - Quick Start Guide

## Prerequisites
- Backend Spring Boot application running on `http://localhost:8080`
- WebSocket endpoint `/ws` enabled
- Vendor logged in with valid credentials

## Installation

The dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## Running the Application

1. **Start the development server**:
```bash
npm run dev
```

2. **Login as a vendor**:
   - Navigate to `http://localhost:5174/login`
   - Enter vendor credentials
   - Upon successful login, notification service will auto-connect

## Testing Real-Time Notifications

### Option 1: Using Backend Test Controller

The backend has test endpoints to trigger notifications:

```bash
# Test bid broadcast
curl -X POST http://localhost:8080/api/test/notifications/bid/broadcast

# Test order broadcast
curl -X POST http://localhost:8080/api/test/notifications/order/broadcast

# Test bid to specific vendor
curl -X POST http://localhost:8080/api/test/notifications/bid/vendor/YOUR_VENDOR_ORG_ID

# Test order to specific vendor
curl -X POST http://localhost:8080/api/test/notifications/order/vendor/YOUR_VENDOR_ORG_ID
```

Replace `YOUR_VENDOR_ORG_ID` with your actual vendor organization ID (e.g., `DHFOCO-DHTH-53881291`).

### Option 2: Using Real CRUD Operations

#### Test Bid Notifications

1. **Create a new order** (as a customer):
```bash
POST http://localhost:8080/api/user/{userId}/orders
```
- Vendor will receive `BID_CREATED` notification
- Toast will appear: "🆕 New Bid Request"
- Sound will play
- Bids page will auto-refresh

2. **Submit a quote** (as vendor):
```bash
PUT http://localhost:8080/api/vendor/{vendorOrgId}/bids/{bidId}/quote
```
- Toast will appear: "💰 Quote Submitted"

3. **Accept/Reject bid**:
```bash
PUT http://localhost:8080/api/user/{userId}/bids/{bidId}/accept
```
- Toast will appear: "✅ Bid Accepted" or "❌ Bid Rejected"

#### Test Order Notifications

1. **Create order**:
```bash
POST http://localhost:8080/api/user/{userId}/orders
```
- Toast: "🆕 New Order"
- Orders page auto-refreshes

2. **Update order status**:
```bash
PUT http://localhost:8080/api/vendor/{vendorOrgId}/orders/{orderId}/status?status=in_progress
```
- Toast: "🔄 Order Status Updated"
- Orders page auto-refreshes

3. **Delete order**:
```bash
DELETE http://localhost:8080/api/user/{userId}/orders/{orderId}
```
- Toast: "🗑️ Order Deleted"

## Visual Verification

### ✅ Connection Successful
Look for these indicators:
- Green dot on the bell icon (top right)
- Console message: `✅ Notification service connected`
- Toast message: "Connected - Real-time notifications are active"
- "Live" badge in notification dropdown

### ❌ Connection Failed
If you see:
- Red or no dot on bell icon
- Console error messages
- Toast: "Connection Error"

**Troubleshooting**:
1. Check backend is running: `http://localhost:8080`
2. Check WebSocket endpoint: `ws://localhost:8080/ws`
3. Verify `vendorOrganizationId` in localStorage
4. Check browser console for errors

## Browser Notification Permission

When you first login, the browser will ask for notification permission:

1. **Allow** → Browser notifications will work even when tab is inactive
2. **Deny** → Only in-app toast notifications will show

You can change this later in browser settings.

## Features to Test

### 1. Toast Notifications
- Appear in bottom-right corner
- Auto-dismiss after 5 seconds
- Show event type icon and message
- Display amount when available

### 2. Browser Notifications
- Show even when tab is inactive
- Click to return to the app
- Navigate to relevant page (Bids/Orders)
- Auto-close after interaction

### 3. Notification Sound
- Plays on each notification
- Can be muted via speaker icon in header
- Mute state persists across page reloads
- Re-enable via same icon

### 4. Notification Dropdown
- Click bell icon to open
- Shows last 10 notifications
- Displays time received
- Shows amount when available
- Click notification to navigate
- "Clear All" button to remove all
- "View All Notifications" link at bottom

### 5. Auto-Refresh
- Bids page refreshes when bid notification arrives
- Orders page refreshes when order notification arrives
- No manual refresh needed

### 6. Connection Status
- Green dot = Connected
- No dot = Disconnected
- "Live" badge in dropdown when connected

## Common Scenarios

### Scenario 1: New Bid Request
**When**: Customer creates an order selecting your catering service

**What happens**:
1. 🔔 Toast: "🆕 New Bid Request"
2. 🔊 Sound plays
3. 🌐 Browser notification
4. 🔴 Badge count +1
5. 📋 Notification in dropdown
6. 🔄 Bids page auto-refreshes

**Action**: Go to Bids page, review request, submit quote

### Scenario 2: Quote Submitted
**When**: You submit a quote for a bid

**What happens**:
1. 🔔 Toast: "💰 Quote Submitted"
2. 🔊 Sound plays
3. 📋 Notification saved
4. 🔄 Bids page updates status

**Action**: Wait for customer to accept/reject

### Scenario 3: Bid Accepted
**When**: Customer accepts your quote

**What happens**:
1. 🔔 Toast: "✅ Bid Accepted"
2. 🔊 Sound plays (celebration!)
3. 🌐 Browser notification
4. 🔴 Badge count +1
5. 📋 Notification in dropdown
6. 🔄 Bids page shows "Accepted" status
7. 🔄 Orders page shows new confirmed order

**Action**: Check Orders page, begin preparation

### Scenario 4: Order Status Changed
**When**: Order status is updated (you or customer)

**What happens**:
1. 🔔 Toast: "🔄 Order Status Updated"
2. 🔊 Sound plays
3. 📋 Notification saved
4. 🔄 Orders page auto-refreshes

**Action**: View updated order details

## Performance Tips

### Reduce Notification Volume
- Only critical notifications trigger sound
- Mute sound during busy periods
- Clear old notifications regularly

### Optimize Browser Performance
- Close notification dropdown when not in use
- Clear notification history (max 50 stored)
- Use "Clear All" regularly

### Network Optimization
- WebSocket uses minimal bandwidth
- Automatic reconnection on disconnect
- Polling backup runs every 30 seconds

## Debugging

### Check Connection Status
Open browser console and look for:
```
STOMP Debug: Opening Web Socket...
STOMP Debug: Web Socket Opened...
STOMP Debug: connected to server undefined
✅ Notification service connected
```

### Check Subscriptions
Console should show:
```
Subscribed to vendor topics for: YOUR_VENDOR_ORG_ID
Subscribed to broadcast topics
```

### Check Incoming Messages
When notification arrives:
```
📢 Bid notification received: {...}
🔄 Bid notification received, refreshing bids list
```

### Common Issues

**Issue**: No notifications received
- **Check**: vendorOrganizationId in localStorage
- **Fix**: Logout and login again

**Issue**: Sound not playing
- **Check**: Speaker icon in header (not muted)
- **Fix**: Click to unmute

**Issue**: Toasts not showing
- **Check**: Browser console for errors
- **Fix**: Verify toast component is rendered

**Issue**: Connection keeps dropping
- **Check**: Backend WebSocket stability
- **Fix**: Check backend logs, restart if needed

## Production Deployment

Before deploying to production:

1. **Update environment variables**:
```env
VITE_API_URL=https://your-production-api.com
```

2. **Enable secure WebSocket**:
```typescript
// Update in notificationWebSocket.ts
const socket = new SockJS(`${import.meta.env.VITE_API_URL}/ws`);
// Use wss:// for production
```

3. **Add JWT authentication** (see FRONTEND_REALTIME_NOTIFICATIONS.md)

4. **Test with production data**

5. **Monitor WebSocket connections** in production

## Support

For issues or questions:
1. Check `FRONTEND_REALTIME_NOTIFICATIONS.md` for detailed docs
2. Check backend `REALTIME_NOTIFICATIONS.md` for backend setup
3. Review browser console logs
4. Check backend logs for WebSocket errors

---

**Last Updated**: December 9, 2025  
**Status**: ✅ Ready for Testing
