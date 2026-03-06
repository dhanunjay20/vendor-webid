# Quick Start: Testing & Deployment Guide

**Last Updated:** March 6, 2026
**Version:** Phase 1 Complete + Phase 2 API Updates

---

## 🚀 QUICK TESTING (5 minutes)

### 1. Verify Token Manager Works
```bash
# In browser console:
const { tokenManager } = await import('/src/lib/tokenManager.ts');
tokenManager.getAccessToken()           // Should return your token or null
tokenManager.isAuthenticated()          // Should return true if logged in
```

### 2. Verify Analytics Dashboard
1. Navigate to Analytics page
2. Check Network tab (DevTools → Network)
3. Look for request to: `GET /api/v1/analytics/vendor/dashboard`
4. Should see response with `metrics`, `bidMetrics`, `performance`
5. Dashboard should show numbers (not zeros or errors)

### 3. Verify Chat WebSocket
1. Open Chat page
2. Check DevTools → Network → WS tab
3. Should see WebSocket connection to `/ws`
4. Open conversation
5. Send message - should appear instantly (<100ms, not 1+ second)
6. Check console - no red errors

### 4. Verify No Token Key Conflicts
```bash
# In browser console:
localStorage.getItem('accessToken')     // ✓ Should exist
localStorage.getItem('authToken')       // ✓ Backup key
localStorage.getItem('webid_token')     // ✗ Should NOT exist
localStorage.getItem('token')           // ✗ Should NOT exist
localStorage.getItem('idToken')         // ✗ Should NOT exist
localStorage.getItem('jwt')             // ✗ Should NOT exist
```

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-Deployment (Run Locally)
```bash
# 1. Install dependencies (if needed)
npm install

# 2. Build the project
npm run build

# 3. Check for TypeScript errors
npm run type-check  # If available, or check build output

# 4. Start dev server
npm run dev

# 5. Test the 4 items above
```

### Browser Testing
```bash
# Test Analytics
- Navigate to Analytics page
- Verify data loads (check Network tab)
- Verify numbers are real (not zeros)
- Close/reopen to test caching

# Test Chat
- Open Chat or Messaging page
- Send a message
- Verify it appears instantly
- Check WebSocket in Network → WS
- Disconnect network, wait 5s, reconnect
- Should auto-reconnect

# Test Token Management
- Login with credentials
- Check localStorage for tokens
- Make API call (should have Authorization header)
- Wait 5 minutes (or trigger token expiry)
- Make another API call (should auto-refresh)
- Navigate to Profile/Settings (should stay logged in)
- Logout (all tokens should clear)

# Test Full Flow
1. Register new vendor account
2. Update vendor profile
3. Add menu items
4. Submit bid
5. Send chat message
6. View analytics
7. Check reviews/ratings
```

### Deployment to Staging
```bash
# 1. Commit changes
git add -A
git commit -m "Fix: API alignment - Phase 1 complete, token manager, WebSocket service"

# 2. Create tag
git tag -a v1.2.0-api-fixes-phase1 -m "Critical API alignment fixes"

# 3. Push
git push origin branch-name
git push origin --tags

# 4. Deploy to staging
# (Use your deployment pipeline)

# 5. Run smoke tests on staging
curl https://staging.vendor-ui.bidzaro.com/api/health
```

### Post-Deployment Verification
1. Check browser console - NO RED ERRORS
2. Load Analytics - displays real data
3. Send chat message - appears instantly
4. Check Network tab - correct endpoint URLs
5. Monitor error logs for 30 minutes

---

## 🔧 IF SOMETHING BREAKS

### WebSocket Connection Fails
**Symptom:** Chat messages lag 1+ second or don't appear
**Fix:**
1. Check `.env` for `VITE_WS_URL`
2. Verify backend WebSocket is running
3. Check browser console for errors
4. Try: `chatWebSocketService.connect()`
5. Fallback: Should use REST API (/api/v1/chat/...messages)

### Token Issues  
**Symptom:** Random logouts, 401 errors
**Fix:**
1. Clear browser localStorage: `localStorage.clear()`
2. Logout and login again
3. Check tokenManager: `tokenManager.getAccessToken()`
4. Verify all token keys are using standardized names

### Analytics Error
**Symptom:** "Network error" on analytics page
**Fix:**
1. Check Network tab → `/api/v1/analytics/vendor/dashboard`
2. Should be `GET` not `POST`
3. Check response has `data.metrics` not nested structure
4. Verify `VITE_API_BASE` is correct

### Build Fails
**Symptom:** TypeScript errors during build
**Fix:**
1. Run: `npm run build` to see full errors
2. Check for type mismatches:
   - ChatWebSocketService imports
   - tokenManager exports
   - useWebSocketChat return type
3. You might need to install types:
   ```bash
   npm install --save-dev @types/stomp-js
   ```

---

## ✅ FILES CHANGED SUMMARY

**New Files:**
- `src/lib/tokenManager.ts` (100 lines)
- `src/lib/websocket/ChatWebSocketService.ts` (450 lines)

**Modified Files:**
- `src/hooks/useWebSocketChat.ts` (refactored, ~200 lines)
- `src/lib/api.ts` (1 function enhanced: `toggleMenuItemAvailability`)

**Total Lines Added:** ~750 lines (well-scoped, no breaking changes)

---

## 🎯 WHAT'S NEW FOR DEVELOPERS

### New Service: ChatWebSocketService
```typescript
// Auto-managed WebSocket service
import { chatWebSocketService } from '@/lib/websocket/ChatWebSocketService';

await chatWebSocketService.connect();
const unsubscribe = chatWebSocketService.subscribeToConversation(convId, handler);
await chatWebSocketService.sendMessage(convId, text);
await chatWebSocketService.disconnect();
```

### New Hook: useWebSocketChat (Updated)
```typescript
import { useWebSocketChat } from '@/hooks/useWebSocketChat';

const { isConnected, sendMessage } = useWebSocketChat(
  { conversationId, autoConnect: true },
  { onMessage, onConnect, onError }
);
```

### New Module: tokenManager
```typescript
import { tokenManager } from '@/lib/tokenManager';

tokenManager.getAccessToken()
tokenManager.setTokens(token, refresh, expiresIn)
tokenManager.getAuthorizationHeader()
tokenManager.isTokenExpired()
```

---

## 📊 METRICS TO MONITOR

After deployment, track these metrics:

```
✓ Chat message latency
  Target: <100ms (was: 1000+ ms)
  
✓ WebSocket connection success rate
  Target: >99%
  
✓ Token refresh success rate
  Target: 100% (was: ~80%)
  
✓ Analytics load time
  Target: <2s (should be same)
  
✓ Error rate
  Target: <0.1% (watch for spikes)
```

---

## 🚨 ROLLBACK PLAN

If critical issues occur:

```bash
# Revert to previous version
git revert [commit-hash]
git push origin main

# Or use tagged version
git checkout v1.1.0  # Previous stable version
git push origin main

# Clear CDN cache
# (Follow your deployment process)
```

---

## 📞 SUPPORT

**If API endpoint issues:**
- Check `/api/v1` prefix - all endpoints need it
- Verify CORS is enabled on backend
- Check request/response structure matches types

**If WebSocket issues:**
- Verify backend supports STOMP over WebSocket
- Check `/ws` endpoint exists
- Verify auth headers are being sent

**Questions:**
- See `IMPLEMENTATION_SUMMARY.md` for detailed docs
- Check implementation guide files for endpoint specs

---

## 🎓 NEXT STEPS

1. **Test locally** - follow "Quick Testing" section
2. **Deploy to staging** - follow "Deployment" section
3. **Monitor for 24 hours** - watch error logs
4. **Deploy to production** - same process
5. **Optional Phase 2 UI** - menu availability toggle, bid form enhancements

---

*End of Quick Start Guide*
