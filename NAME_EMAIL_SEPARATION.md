# NeuroSync — Name and Email Separation (v2.1)

## Overview

**Email** and **Display Name** are now completely independent and decoupled. This allows users to:
- Use their email exclusively for login authentication
- Customize their display name independently
- Change their display name anytime without affecting login credentials
- Have an email different from their public profile name

---

## Architecture Changes

### Database Schema
```sql
-- users table already had separate columns:
CREATE TABLE users (
  id               INTEGER PRIMARY KEY,
  email            TEXT NOT NULL,          -- Login credential (immutable)
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL,
  profile_type     TEXT NOT NULL,
  display_name     TEXT,                   -- Display name (mutable, independent)
  preferred_language TEXT NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Key Points:**
- `email`: Used for authentication, never changes after registration
- `display_name`: User's public name, can be changed anytime
- These are completely independent - no association

---

## Backend Implementation

### Updated Endpoints

#### 1. **POST /api/guest-login** (Existing, Enhanced)
```javascript
// Request
{
  email: "user@example.com",
  displayName: "John Smith",      // Independent display name
  preferredLanguage: "en",
  role: "parent",
  useCase: "support"
}

// Response
{
  token: "...",
  email: "user@example.com",      // For login
  displayName: "John Smith",      // For display
  role: "parent",
  profileType: "family"
}
```

**Behavior:**
- Email used to find/create user for authentication
- Display name stored independently
- Display name can be different from email local part

#### 2. **PUT /api/profile/display-name** (NEW)
```javascript
// Update display name independently
// Request
{
  displayName: "New Display Name"
}

// Response
{
  success: true,
  user: {
    id: 123,
    email: "user@example.com",           // Unchanged
    displayName: "New Display Name",     // Updated
    role: "parent",
    profileType: "family"
  },
  message: "Display name updated successfully"
}
```

**Usage:**
```bash
curl -X PUT http://localhost:3000/api/profile/display-name \
  -H "Content-Type: application/json" \
  -H "Cookie: neurosync_token=..." \
  -d '{"displayName": "New Name"}'
```

#### 3. **PUT /api/profile/preferred-language** (NEW)
```javascript
// Update language preference
// Request
{
  preferredLanguage: "hi"  // "en", "hi", or "mr"
}

// Response
{
  success: true,
  preferredLanguage: "hi",
  message: "Language preference updated successfully"
}
```

#### 4. **GET /api/me** (Enhanced)
```javascript
// Returns complete user profile with separated fields
{
  id: 123,
  email: "user@example.com",      // Login email (immutable)
  displayName: "John Smith",      // Display name (mutable)
  role: "parent",
  profileType: "family",
  preferredLanguage: "en",
  children: [
    // child profiles...
  ]
}
```

---

## Frontend Implementation

### 1. **ProfilePage Component** (NEW)
Location: `frontend/src/pages/ProfilePage.tsx`

**Features:**
- View current email (read-only)
- Edit display name independently
- Change language preference
- View account information (role, profile type, user ID)

**UI Structure:**
```
Profile Settings
│
├─ Email Section (Read-Only)
│  ├─ Display: user@example.com
│  └─ Info: "Email is used for login authentication"
│
├─ Display Name Section (Editable)
│  ├─ Current name: [editable input]
│  ├─ Edit/Save buttons
│  └─ Info: "Independent from Email"
│
├─ Language Preference (Dropdown)
│  ├─ Options: English, हिंदी, मराठी
│  └─ Save button
│
└─ Account Information (Read-Only)
   ├─ Role: parent/caregiver
   ├─ Profile Type: family/caregiver
   └─ User ID: 123
```

### 2. **Updated Layout Component**
Enhanced sidebar user info display:
```
┌──────────────────┐
│ Display Name     │  (independent from email)
│ user@example.com │  (shown separately)
│ role             │  (e.g., parent, caregiver)
└──────────────────┘
```

### 3. **Authentication Context Updates**
`frontend/src/context/AuthContext.tsx`

```typescript
export interface AuthUser {
  id: number;
  email: string;           // Login credential
  displayName: string;     // Display name (independent)
  role: string;
  profileType: "family" | "caregiver";
  preferredLanguage: string;
  children: ChildProfile[];
}
```

### 4. **Navigation Updates**
Added profile settings to main navigation:
- `/profile` route now available
- Icon: ⚙️ (Settings)
- Label: "Profile"

---

## Use Cases Enabled

### Use Case 1: Professional Privacy
```
Email: work@example.com (work email)
Display Name: "Therapist Susan" (public profile name)

Benefit: Professional identity preserved, but staff can use 
         work email for authentication and institutional tracking
```

### Use Case 2: Family Aliases
```
Email: family@example.com (shared family email)
Display Name: "Mom" or "Dad" (contextual name in app)

Benefit: Family can use single shared email, but each 
         caregiver has their own display name
```

### Use Case 3: Name Changes
```
User changes name legally
- Email stays the same (no re-registration needed)
- Display name updated via /api/profile/display-name
- Login unchanged, but public profile reflects new name
```

### Use Case 4: Child Profile Names
```
Email: john@example.com (parent email)
Display Name: "John" (parent's name)

Child Profile: "Emma" (child's name stored separately)

Benefit: Clear distinction between parent login and child profile names
```

---

## API Changes Summary

### New Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| PUT | `/api/profile/display-name` | Update display name |
| PUT | `/api/profile/preferred-language` | Update language preference |

### Modified Endpoints
| Method | Path | Changes |
|--------|------|---------|
| GET | `/api/me` | Enhanced with separate email/displayName fields |
| POST | `/api/login` | Returns separate email and displayName |
| POST | `/api/guest-login` | Accepts independent displayName parameter |

---

## Migration Guide

### For Existing Users
**No migration needed!** The system works with existing data:
- If `display_name` is NULL, it falls back to email
- Existing registrations continue working
- First time accessing profile page, they can set a display name

### For New Development
**Always use separate fields:**
```javascript
// ✅ Correct
user.email               // For login display
user.displayName         // For public display

// ❌ Avoid
user.email               // Don't use for both
```

---

## Security Considerations

### Email Immutability
- Email cannot be changed after registration
- Ensures account recovery is always possible
- Prevents email-based account takeovers

### Display Name Flexibility
- Can be changed anytime without verification
- Not used for authentication
- Just a cosmetic label for the app

### Data Separation
```
Authentication Layer:
  → Uses: email + password

Identification Layer:
  → Uses: display_name + email (shown in UI)

Linking Layer:
  → Child profiles linked by user ID, not name
  → Sessions use user ID, not email
```

---

## Frontend API Usage

### Updating Display Name
```typescript
import { apiPut } from "../lib/api";

const handleUpdateName = async (newName: string) => {
  try {
    const result = await apiPut("/profile/display-name", {
      displayName: newName
    });
    console.log("Updated:", result.user.displayName);
    await refreshUser(); // Refresh auth context
  } catch (err) {
    console.error("Update failed:", err);
  }
};
```

### Getting User Profile
```typescript
import { apiGet } from "../lib/api";

const getProfile = async () => {
  const user = await apiGet("/api/me");
  console.log("Email:", user.email);           // Login email
  console.log("Display Name:", user.displayName); // Public name
};
```

---

## Testing

### Test Scenarios

#### Scenario 1: Registration with Different Name
```
1. Register with email: test@example.com
2. Register with displayName: "Dr. John"
3. Verify: email ≠ displayName
4. Verify: login uses email, profile shows displayName
```

#### Scenario 2: Change Display Name
```
1. Login with email: test@example.com
2. Go to Profile Settings
3. Change display name to "Dr. Johnson"
4. Verify: email unchanged, displayName updated
5. Verify: other users see new displayName
```

#### Scenario 3: Multi-language
```
1. Set displayName to "नाम" (Hindi)
2. Change preferredLanguage to "hi"
3. Verify: display name works in any language
```

#### Scenario 4: Guest Login
```
1. Guest login: email="guest@example.com", displayName="Guest User"
2. Verify: user created with separate fields
3. Later: change displayName via profile page
4. Verify: email unchanged, displayName updated
```

---

## Files Changed

### Backend
- ✅ `server/routes/user.ts` - Added profile update endpoints
- ✅ `server/routes/auth.ts` - Enhanced guest-login to handle separate names
- ✅ `db/index.ts` - Schema already supports separation (no changes needed)

### Frontend
- ✅ `frontend/src/pages/ProfilePage.tsx` - NEW
- ✅ `frontend/src/components/Layout.tsx` - Updated user info display
- ✅ `frontend/src/context/AuthContext.tsx` - Updated interface types
- ✅ `frontend/src/App.tsx` - Added profile route

### Documentation
- ✅ This file: NAME_EMAIL_SEPARATION.md

---

## Rollout Plan

### Phase 1: Backend (Complete ✅)
- [x] Add PUT endpoints for profile updates
- [x] Update GET /api/me response
- [x] Ensure backwards compatibility

### Phase 2: Frontend (Complete ✅)
- [x] Create ProfilePage component
- [x] Add profile route to navigation
- [x] Update Layout to show both email and displayName
- [x] Update AuthContext types

### Phase 3: Testing (Ready)
- [ ] Unit tests for profile endpoints
- [ ] Integration tests for display name changes
- [ ] E2E tests for user workflows

### Phase 4: Deployment (Ready)
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Monitor for issues
- [ ] Gather user feedback

---

## Backwards Compatibility

### Existing Data
- ✅ Works as-is
- ✅ No migration script needed
- ✅ Fallback to email if displayName is NULL

### Existing API Calls
- ✅ All existing endpoints continue working
- ✅ New endpoints are optional additions
- ✅ No breaking changes

### Client Applications
- ✅ Can ignore new endpoints if not needed
- ✅ Will receive separated fields in responses
- ✅ Can display email/displayName as before

---

## Future Enhancements

### Potential Improvements
1. **Profile Picture** - Add avatar with display name
2. **Username** - Allow custom username (different from email)
3. **Pronouns** - Add pronoun field (they/them, she/her, etc.)
4. **Bio** - Short bio/description field
5. **Social Links** - Optional social media links
6. **Email Verification** - Verify email ownership on registration
7. **Email Change Request** - Support email changes with verification

---

## Support & Questions

### Common Questions

**Q: Can users change their email?**
A: No, email is immutable for security and account recovery.

**Q: Can two users have the same display name?**
A: Yes, display names are unique only within context (email + org).

**Q: What if displayName is empty?**
A: The system shows email as fallback.

**Q: Can display name contain special characters?**
A: Yes, any Unicode characters are supported (NFKC normalized).

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Sept 2026 | Initial UI redesign |
| 2.1 | Oct 30, 2026 | Name/Email separation feature |

---

*Document Version: 1.0*  
*Last Updated: October 30, 2026*  
*NeuroSync v2.1 - Name and Email Independence*
