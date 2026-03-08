# Customer Support & SPA Setup

## What Was Added

### 1. Single Page App (SPA) - `app.html`
- **Entry point**: Open `app.html` for the SPA experience
- **Persistent navigation**: Top bar (with balances) and bottom nav stay fixed
- **Routes**: Dashboard, Account, Grid (dash2), Tasks, Support
- Content loads in an iframe without full page reloads

### 2. Customer Support Chat
- **User page**: `support.html` - WhatsApp-style chat UI
- **Admin page**: `admin-support.html` - View and reply to user messages
- **Database**: Firebase Realtime Database - `supportChats/{userId}/messages`
- **Copyright**: Footer shows "© 2026 CLASSIC MAXIMIZE PAY" like WhatsApp

### 3. Floating Support Bubble
- Appears on **all pages**: login, signup, dashboard, account, tasks, deposit, withdrawal, etc.
- Green WhatsApp-style bubble (bottom-right)
- Click to go to support (users) or admin-support (admins)

## Firebase Setup

### 1. Add Admin Users
To let staff access `admin-support.html`, add their UID to Firebase:

```
/admins/{adminUserId}: true
```

In Firebase Console → Realtime Database → add a key `admins` with each admin's UID as a child.

### 2. Database Rules (optional but recommended)
Deploy rules for `supportChats`:

```json
{
  "rules": {
    "supportChats": {
      "$userId": {
        ".read": "auth != null && (auth.uid == $userId || root.child('admins').child(auth.uid).exists())",
        ".write": "auth != null"
      }
    }
  }
}
```

Or use the included `database.rules.json` and merge with your existing rules.

### 3. Index for Support Chats (optional, for admin list ordering)
In Firebase Console → Realtime Database → Rules → add index:

```json
{
  "supportChats": {
    ".indexOn": ["updatedAt"]
  }
}
```

## Usage

- **Users**: Click the green headset bubble on any page → opens support chat
- **Admins**: Log in as admin → click bubble → opens admin support to reply to users
- **SPA**: Use `app.html` as main entry; login/signup/dashboard load inside without reloading nav
