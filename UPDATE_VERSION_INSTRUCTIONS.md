# How to Update App Version for Auto-Update Feature

## When releasing a new build to Google Play Store:

### 1. Update Frontend Version (app.json)
File: `/app/frontend/app.json`

```json
{
  "expo": {
    "version": "1.0.13",  // Increment this
    "android": {
      "versionCode": 60,   // Increment this (must be higher than previous)
    }
  }
}
```

### 2. Update Backend Version Endpoint
File: `/app/backend/server.py`

Find the `/api/app-version/latest` endpoint (around line 680) and update:

```python
@api_router.get("/app-version/latest", response_model=AppVersionInfo)
async def get_latest_app_version():
    return AppVersionInfo(
        latest_version="1.0.13",          # Match app.json version
        latest_version_code=60,           # Match app.json versionCode
        release_date="2025-12-15",        # Today's date (YYYY-MM-DD)
        update_message="Update available! This version includes [describe key features].",
        minimum_supported_version=None    # Keep None for soft updates
    )
```

### 3. Build and Deploy

#### Backend:
Backend changes deploy automatically on Render when you push to git.

#### Frontend:
```bash
cd /app/frontend
eas build --platform android --profile production
```

Wait for build to complete, then download the AAB file and upload to Google Play Store.

## How the Auto-Update Works:

1. **Version Check**: On app launch, the UpdateBanner component checks `/api/app-version/latest`
2. **Comparison**: Compares user's `versionCode` with `latest_version_code` from backend
3. **Age Calculation**: Calculates days since `release_date`
4. **Display Logic**:
   - Shows banner only if update is available AND version is 7+ days old
   - Banner is dismissible and reappears once per day
   - Users can tap "Update" to go to Play Store
   
## Customizing Update Behavior:

### Change update age threshold (currently 7 days):
File: `/app/frontend/components/UpdateBanner.tsx`
Line: ~68
```typescript
if (daysSinceRelease >= 7) {  // Change this number
```

### Customize update message per release:
Edit the `update_message` field in backend endpoint (step 2 above)

### Future: Add Force Update
To require users to update (blocking), set `minimum_supported_version`:
```python
minimum_supported_version="1.0.10"  // Users below this MUST update
```
Then implement blocking logic in frontend (Phase 2 - not yet implemented)

## Testing Update Banner:

### To test locally:
1. Change backend `latest_version_code` to be higher than your current app
2. Change `release_date` to 8+ days ago
3. Open app in Expo Go / Emulator
4. You should see the update banner

### To test dismissal:
1. Tap the "X" button
2. Close and reopen app - banner should not appear
3. Clear app data or wait until next day - banner reappears

## Important Notes:

- Always update BOTH app.json and backend endpoint together
- Version code must ALWAYS increase (never decrease or reuse)
- Release date should be the actual Play Store release date
- Update message appears in the banner - keep it concise (1-2 lines)
- Banner only shows on Android (Play Store links don't work on iOS)
