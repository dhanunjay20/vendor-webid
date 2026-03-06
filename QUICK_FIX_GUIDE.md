## 🎯 Quick Fix Guide for Remaining Issues

---

## 1️⃣ Complete Bid Submission Form UI

**File:** `src/pages/BidsNew.tsx`

### Problem
The bid submission form only collects basic price and validity period, but the API requires:
- Itemized pricing per menu item
- Delivery timeline details
- Staff allocation (chefs/servers/cleaners)

### Solution
Update the bid submission dialog to include these sections:

```tsx
// Add to BidsNew.tsx bid submission form:

// ❌ CURRENT: Only basic fields
const [quotedPrice, setQuotedPrice] = useState({...});
const [validityPeriodHours, setValidityPeriodHours] = useState(48);

// ✅ ADD: Itemized pricing
const [itemizedPricing, setItemizedPricing] = useState([
  // For each menu item in the bid request:
  // { vendorItemId: '', itemName: '', quantity: 0, pricePerPlate: 0, totalPrice: 0 }
]);

// ✅ ADD: Delivery timeline
const [deliveryDetails, setDeliveryDetails] = useState({
  estimatedSetupTime: '',  // DateTime picker
  foodReadyTime: '',       // DateTime picker  
  cleanupTime: '',         // DateTime picker
});

// ✅ ADD: Staff allocation
const [staffProvided, setStaffProvided] = useState({
  chefs: 0,      // Input field
  servers: 0,    // Input field
  cleaners: 0,   // Input field
});
```

### Form Sections to Add
1. **Itemized Price Breakdown** - One row per menu item from bid request
2. **Delivery Timeline** - 3 date/time pickers
3. **Staff Allocation** - 3 number inputs
4. **Terms & Conditions** - Text area (already there probably)
5. **Advance Payment %** - Number input

### API Call Update
```tsx
// Current: Only sends basic fields
submitBid(bidRequestId, {
  quotedPrice,
  validityPeriodHours,
})

// ✅ UPDATE: Send all required fields
submitBid(bidRequestId, {
  quotedPrice,
  itemizedPricing,      // ADD
  deliveryDetails,      // ADD
  staffProvided,        // ADD
  termsAndConditions,   // ADD if not there
  validityPeriodHours,
  advancePercentage,    // ADD if not there
  requiredAdvanceAmount,// ADD if not there
})
```

**Effort:** Medium (2-3 hours)  
**Impact:** High (required for complete bid submission)

---

## 2️⃣ Implement Chat WebSocket

**Files:** `src/lib/chatApi.ts`, `src/hooks/useWebSocketChat.ts`

### Problem
Messages are sent via REST API but backend expects WebSocket for real-time updates.

### Solution

#### Step 1: Install STOMP client library
```bash
npm install stompjs
# or
npm install @stomp/stompjs
```

#### Step 2: Create WebSocket service
```tsx
// src/lib/chatWebSocket.ts (NEW FILE)

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class ChatWebSocketService {
  private client: Client | null = null;
  private connected = false;
  
  connect() {
    const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
    
    this.client = new Client({
      brokerURL: import.meta.env.VITE_API_BASE || 'http://localhost:8080',
      connectHeaders: {
        login: accessToken || '',
        passcode: accessToken || '',
      },
      debug: function (str) {
        console.log('[WebSocket]', str);
      },
      beforeConnect: async () => {
        // Optional: refresh token if needed
      },
      onConnect: () => {
        this.connected = true;
        console.log('Chat WebSocket connected');
      },
      onDisconnect: () => {
        this.connected = false;
        console.log('Chat WebSocket disconnected');
      },
    });
    
    this.client.activate();
  }
  
  sendMessage(conversationId: string, message: string, messageType: string = 'TEXT') {
    if (!this.connected || !this.client) {
      console.error('WebSocket not connected');
      return;
    }
    
    const payload = {
      conversationId,
      message,
      messageType,
      timestamp: new Date().toISOString(),
    };
    
    this.client.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(payload),
    });
  }
  
  subscribeToConversation(conversationId: string, callback: (msg: any) => void) {
    if (!this.client) {
      console.error('WebSocket not initialized');
      return null;
    }
    
    return this.client.subscribe(
      `/topic/conversations.${conversationId}`,
      (message) => {
        if (message.body) {
          callback(JSON.parse(message.body));
        }
      }
    );
  }
  
  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.connected = false;
    }
  }
}

export const chatWebSocketService = new ChatWebSocketService();
```

#### Step 3: Update Messaging.tsx to use WebSocket
```tsx
// In Messaging.tsx

useEffect(() => {
  // Connect to WebSocket when component mounts
  chatWebSocketService.connect();
  
  return () => {
    // Disconnect when component unmounts
    chatWebSocketService.disconnect();
  };
}, []);

useEffect(() => {
  if (selectedConversation) {
    // Subscribe to conversation messages
    const subscription = chatWebSocketService.subscribeToConversation(
      selectedConversation.conversationId,
      (msg) => {
        // Handle incoming message
        setMessages(prev => [...prev, msg]);
      }
    );
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }
}, [selectedConversation]);

const handleSendMessage = async (text: string) => {
  if (selectedConversation) {
    // Send via WebSocket instead of REST
    chatWebSocketService.sendMessage(
      selectedConversation.conversationId,
      text,
      'TEXT'
    );
  }
};
```

**Effort:** Medium (3-4 hours)  
**Impact:** High (enables real-time messaging)

---

## 3️⃣ Fix Menu Item Availability Toggle

**File:** `src/pages/Menu.tsx`

### Problem
The toggle button exists but doesn't show reason dialog or call API.

### Solution

```tsx
// Add to Menu.tsx

const [unavailabilityDialog, setUnavailabilityDialog] = useState({
  isOpen: false,
  itemId: '',
  currentlyAvailable: true,
  reason: '',
  unavailableUntil: '',
});

const handleToggleAvailability = async (vendorItemId: string, currentlyAvailable: boolean) => {
  if (!currentlyAvailable) {
    // Making available again - no dialog needed
    await api.toggleMenuItemAvailability(vendorItemId, true);
    // Refresh items
    await fetchMenu();
  } else {
    // Making unavailable - show dialog
    setUnavailabilityDialog({
      isOpen: true,
      itemId: vendorItemId,
      currentlyAvailable: true,
      reason: '',
      unavailableUntil: '',
    });
  }
};

const submitUnavailability = async () => {
  try {
    await api.toggleMenuItemAvailability(
      unavailabilityDialog.itemId,
      false,  // Make unavailable
      unavailabilityDialog.reason
      // Note: API also supports unavailableUntil date if backend accepts it
    );
    
    toast({ title: 'Item marked as unavailable' });
    setUnavailabilityDialog({ isOpen: false, itemId: '', currentlyAvailable: true, reason: '', unavailableUntil: '' });
    await fetchMenu();
  } catch (err) {
    toast({ title: 'Error', description: err?.message || 'Failed to update availability', variant: 'destructive' });
  }
};

// Add Dialog component
<Dialog open={unavailabilityDialog.isOpen} onOpenChange={(open) => 
  setUnavailabilityDialog(prev => ({ ...prev, isOpen: open }))
}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Mark Item as Unavailable</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      <div>
        <Label>Reason</Label>
        <Textarea
          placeholder="e.g., Ingredient shortage, out of stock..."
          value={unavailabilityDialog.reason}
          onChange={(e) => setUnavailabilityDialog(prev => ({...prev, reason: e.target.value}))}
        />
      </div>
      
      <div>
        <Label>Available Again On (Optional)</Label>
        <Input
          type="date"
          value={unavailabilityDialog.unavailableUntil}
          onChange={(e) => setUnavailabilityDialog(prev => ({...prev, unavailableUntil: e.target.value}))}
        />
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setUnavailabilityDialog(prev => ({...prev, isOpen: false}))}>
        Cancel
      </Button>
      <Button onClick={submitUnavailability}>
        Mark Unavailable
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Effort:** Low (1-2 hours)  
**Impact:** Medium (required feature for vendors)

---

## Development Checklist

### Before Pushing to Production

- [ ] Test analytics dashboard shows real data (not random numbers)
- [ ] Test bid form collects all required fields (itemized pricing, delivery, staff)
- [ ] Test new bid submission includes all fields in API call
- [ ] Test chat WebSocket connects and receives messages in real-time
- [ ] Test menu item availability toggle with reason dialog
- [ ] Verify no console errors for token retrieval
- [ ] Test on staging environment
- [ ] Verify CORS headers allow `/api/v1/` endpoints
- [ ] Check localStorage for consistent token key usage

### Testing Commands

```bash
# Build project
npm run build

# Test in dev mode
npm run dev

# Check for TypeScript errors
npx tsc --noEmit

# Lint code
npm run lint
```

### Debugging Tips

1. **Check token in browser console:**
   ```javascript
   localStorage.getItem('accessToken')  // Should have value
   localStorage.getItem('authToken')    // Fallback
   ```

2. **Monitor API calls:**
   - Open DevTools → Network tab
   - Look for `/api/v1/` requests
   - Check response status and data

3. **Check WebSocket connection:**
   ```javascript
   // In browser console after WebSocket is connected
   // Should see connection confirmation in console logs
   ```

4. **Monitor localStorage keys:**
   ```javascript
   for (let key in localStorage) {
     if (key.includes('token')) {
       console.log(key, '=', localStorage.getItem(key).substring(0, 50));
     }
   }
   ```

---

## Reference Links

- **API Docs:** See `VENDOR_API_DOCUMENTATION.md`
- **Audit Report:** See `VENDOR_API_ALIGNMENT_AUDIT.md`
- **Fixes Applied:** See `FIXES_APPLIED.md`
- **STOMP/WebSocket Docs:** https://stomp-js.github.io/stomp-protocol/v1_0.html

---

*Last Updated: March 6, 2026*
