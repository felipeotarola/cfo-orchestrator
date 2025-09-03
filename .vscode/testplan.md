================================================== GLOBAL / FOUNDATION
Authentication & Session
Preconditions: Valid test user account; one incognito window (logged out) and one normal (logged in).
Tests: a. Visit /login -> perform login -> redirected to dashboard; user avatar shows. b. Refresh dashboard: user stays logged in (session persistence). c. Open /properties while logged out (if allowed) -> Ensure anonymous listing works (no user-only UI like favorites toggled initially). d. Logout (if UI present) -> accessing protected endpoints (e.g., progress, favorites) returns 401.
Negative:
Manually call a protected API (e.g., /api/properties/{id}/progress) without auth; expect 401 JSON error.
Tamper with userId in client requests (favorites) – verify server still resolves/validates (if server trusts userId in body, note risk).
Navigation & Layout
Tests: a. Navigate between Dashboard, Properties, a Property Chat page, Preferences. b. Browser back/forward retains state (search query preserved? If not, note as expected). c. Mobile viewport (narrow) – grid reflows; carousel horizontally scrollable with arrows visible on hover or always?
================================================== PROPERTIES LISTING & SEARCH
API: GET /api/properties, GET /api/properties/search UI: /properties page (grid, MCP carousel, search box, load more)

Initial Load
Clear cache, open /properties.
Expect PAGE_SIZE cards (48) or skeleton placeholders then cards.
Total count label matches API (check network response count vs displayed heading number).
Pagination & Prefetch
Click “Visa fler” until no more: each click appends; count increments; button disappears at end; final “Inga fler fastigheter.” message.
While scrolling, open DevTools Network: confirm subsequent requests offset/limit progression and no duplicate offset calls.
Confirm memory: earlier pages still visible; no obvious duplication.
Search (Full-text)
Enter a distinctive term (city or word in title).
Debounce (~450ms) then grid resets and heading changes to “Sökresultat (#)”.
Validate result count ≤ backend returned count; pagination still works (load more triggers search endpoint with updated offset).
Clear search: returns to full listing; pagination resets.
MCP Carousel
Perform a search via Copilot (ask assistant to “Sök efter lägenheter i <City>”).
Carousel shows up to first 12 new items; left/right arrows scroll by ~2–3 cards (600px).
Images lazy load (scroll to end; watch network).
Favorite button appears; clicking toggles (see favorites tests).
Performance / Edge Cases
Try rapid consecutive searches (type fast; ensure only latest is applied; no error state).
Simulate network slow (DevTools throttling) then Cancel navigation: page should handle aborted fetch without crash.
Offline mode (DevTools offline): attempt load more -> error message appears (graceful).
Negative
Manually construct /api/properties?limit=5000 (exceed cap) should clamp to 1000.
/api/properties/search with limit=0 or negative -> server returns bounded results (>=1).
================================================== FAVORITES
API: GET /api/favorites, POST /api/favorites/[propertyId] UI: FavoriteButton on property cards & carousel.

Add Favorite
Ensure user logged in.
Click heart on a property card (it should visually fill or update).
Network: POST toggle/add -> response success true isFavorited true.
Refresh page: card remains favorited.
Remove Favorite
Click again: isFavorited false in response; UI updates.
Refresh persists removal.
“Check” Action (Manual)
POST body { action: 'check', userId, ... } -> confirm current status.
Bulk / Many Favorites
Favorite >10 properties quickly; no rate limiting errors; list retrieval returns all.
Negative
Try POST without userId (intercept and modify) -> 400 error.
Use invalid action -> 400 Invalid action.
Non-existent propertyId -> expect error or graceful success false (note behavior).
Unauthorized
Logged out: pressing favorite button should prompt login or fail silently (verify current UX).
================================================== PROPERTY ENGAGEMENT PROGRESS
API: /api/properties/{id}/progress (GET, PATCH, PUT)

Initial GET (No Record)
For property never engaged: expect empty steps map with all false; counts computed.
PATCH Single Step
Send { stepId: 'someStep', value: true } -> response updated counts & that step true.
Repeat toggling false -> counts decrease.
PUT Full Map
Send full steps object (some true/false) -> response matches; blank or malformed should 400.
ChatId parameter
GET with ?chatId=XYZ vs without; ensure segregation if implemented (different progress sets).
Negative
Unauthorized (logged out) -> 401.
PATCH with missing stepId/value -> 400.
================================================== CHAT & PROPERTY CONTEXT
API: POST /api/chat (streaming) Supporting APIs: /api/chat/{id}, /api/chat/{id}/property-chats, followup, property/{propertyId} (if present)

Start Chat
Open a property chat page, send initial message (inspect network POST).
Confirm system message (Swedish) injected once (check backend logs or replicate scenario of sending second message—system message not duplicated).
Continuation
Send second message quickly; ensure previous messages loaded (dedup logic) and no duplicates in DB.
Property Data Use
Ask “Vad är avgiften?” -> assistant uses tool or returns correct monthly_fee.
Ask again: should reuse context (no duplicate system message content).
Image Generation (if available)
Provide prompt for room modification; ensure tool call; image returns (or error gracefully).
Error Handling
Temporarily simulate missing propertyId (modify request in DevTools) -> server returns database_error or bad_request.
Streaming
Abort request mid-stream (hit ESC or close tab) -> no hanging server process (check console/log for errors).
Negative
Send invalid JSON body -> 400.
Missing auth -> unauthorized error.
================================================== PREFERENCES
API: /api/preferences (likely GET/POST/PUT – confirm) Tests:

Load preferences page; existing values prefilled.
Update and save -> GET reflects changes after refresh.
Invalid payload (manually send) returns 400.
================================================== SCRAPED FAVORITES (LEGACY / ALT STORE)
APIs: /api/scraped-favorites, /[propertyId], /bulk Manual (if still active):

GET list after adding via legacy flows.
POST add/remove/check (depending on implementation) – ensure no conflict with new favorites.
Bulk endpoint: send multiple IDs; verify idempotence.
================================================== PROPERTY VISITS
API: /api/property-visits

Trigger visit record (load property detail page).
GET returns list with latest; duplicates for repeated view increments count or is deduped (note actual behavior).
Negative: unauthorized access (if protected) or missing propertyId in POST.
================================================== GENERATED IMAGES
API: /api/generated-images

After an image generation in chat, verify retrieval endpoint lists record with URL.
Download URL works (200).
Negative: unauthorized access -> 401 (if enforced).
================================================== SIGNED URL
API: /api/signed-url

Request with filename param -> returns signed upload URL (check JSON).
Attempt reuse of URL after upload (if S3/Blob semantics) -> expected failure or allowed once.
Negative: missing filename -> 400.
================================================== MCP BACKEND INTEGRATION
API: /api/mcp (tools/call)

Call list_properties (through assistant) with query limit; confirm server returns count and properties arrays.
Edge: limit >100 -> clamped.
Offset handling (if implemented) – test offset param.
Failure injection: invalid tool name -> error message.
================================================== COPILOT / AI ASSISTANT EDGE
Copilot Sidebar
Open/close; persistence of state (if any).
Ask for property search -> carousel updates at top (no duplicates appended to old results).
Ask a non-real-estate question -> assistant still responds in Swedish and reorients to housing (policy check).
================================================== DASHBOARD PAGE
Loading State
Force slow network; verify skeletons for stats and recent properties.
Favorites Count
Add/remove favorite; refresh dashboard -> count updates.
Recently Viewed
Visit multiple property pages; dashboard visited list matches.
Upcoming Viewings
Favorite property with upcoming viewing; parsed date formats; sorted ascending.
================================================== ERROR & LOGGING VERIFICATION
Force DB Error
Temporarily modify network request payload to invalid filter -> server 500 with generic message, logs show internal error.
Network Timeout
Set network offline mid-fetch; UI shows error banner (properties page).
Tool Error in Chat
Ask for an image without REPLICATE_API_TOKEN (if you can unset locally) -> distinct image_error surfaced.
================================================== SECURITY / AUTH GUARDS
Navigate to /dashboard while logged out -> redirected or shown login prompt.
Direct API calls requiring auth return 401 without leaking stack traces.
Verify no sensitive keys present in JSON responses (inspect all API responses quickly).
================================================== REGRESSION QUICK PASS (BEFORE RELEASE) Run this mini-sequence:

Login -> Dashboard loads stats.
Open Properties -> initial grid + carousel (if prior search).
Search term -> results filtered -> favorite first item.
Load more -> still correct.
Open a property chat -> ask about price -> correct Swedish reply.
Toggle a progress step via UI (if present) -> API reflects.
Refresh browser -> favorites, progress, preferences persist.
Logout -> revisit protected endpoint -> blocked.
================================================== DATA CLEANUP (Post-Test)

Remove test favorites (unfavorite).
Clear generated images if large.
Reset preferences to default.
Delete any test chats if cleanup endpoint exists (else leave).
================================================== NOTES / GAPS

Confirm whether preferences API supports methods beyond GET/PUT (not inspected here).
Validate if property-visits and engagement progress have race conditions under rapid toggling (optional stress test).
Consider adding automated smoke scripts later.