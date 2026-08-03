# Google OAuth Setup for Giveaway Form

## Current Configuration

**Production Google Client ID:** `167229821672-gdjkve4kaui9f83cstfpt3c7bc2na3tt.apps.googleusercontent.com`

**Production URL:** `https://dimora.provecchio.com`

## Common Errors and Solutions

### 1. `redirect_uri_mismatch`

**Error:** The redirect URI in the request does not match the authorized redirect URIs for this client.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   - `https://dimora.provecchio.com`
   - `https://dimora.provecchio.com/`
   - `http://localhost:3011` (for local development)
4. Save changes

### 2. `popup_closed` or Popup Blocked

**Error:** User closed the popup or browser blocked it.

**Solution:**
- Tell users to allow popups for your domain
- The error is now handled with a friendly message

### 3. `access_denied`

**Error:** User denied permission request.

**Solution:**
- User must grant permissions for profile, email, birthday, and address
- If denied, fallback to manual form completion

### 4. `invalid_client`

**Error:** The OAuth client ID is invalid or the app is disabled.

**Solution:**
1. Verify the Client ID in `.env.production` matches Google Cloud Console
2. Ensure the OAuth app is not disabled
3. Check that the app is not in "Testing" mode (should be "In production")

### 5. SDK Not Loaded

**Error:** `google.accounts.oauth2 is undefined`

**Solution:**
- The SDK loads asynchronously; the code now handles this gracefully
- Falls back to mock data if SDK isn't ready

## Required Google APIs

Enable these APIs in Google Cloud Console:

1. **Google People API** - For birthday, phone, address
2. **Google+ API** (deprecated but still works for basic userinfo) OR **People API**

## Required OAuth Scopes

The form requests these scopes:
- `profile` - Basic profile info
- `email` - Email address
- `https://www.googleapis.com/auth/user.birthday.read` - Birthday
- `https://www.googleapis.com/auth/user.addresses.read` - Address

## Testing

### Local Development

1. Add to `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=167229821672-gdjkve4kaui9f83cstfpt3c7bc2na3tt.apps.googleusercontent.com
   ```

2. Add `http://localhost:3011` to authorized redirect URIs in Google Cloud Console

3. Run frontend:
   ```bash
   cd frontend
   npm run dev
   ```

### Production

1. Verify `.env.production` has the correct Client ID
2. Rebuild frontend if you changed the Client ID:
   ```bash
   cd frontend
   npm run build
   ```

3. Verify nginx is serving the updated files

## Debug Mode

Open browser console and look for:
- `[Google OAuth]` prefixed logs
- Check for errors in Network tab for `googleapis.com` requests

## Fallback Behavior

If OAuth fails or is not configured:
- Form shows mock data (test mode)
- Users can still complete manually
- No blocking errors
