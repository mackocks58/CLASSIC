# CLASSIC MAXIMIZE PAY – Backend System

A full-stack application with **Express.js backend API** and Firebase (Auth + Realtime Database).

## Project Structure

```
classic-backend/
├── node_modules/
├── src/
│   ├── config/
│   │   ├── firebase.js
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── depositController.js
│   │   ├── withdrawalController.js
│   │   ├── taskController.js
│   │   └── adminController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── depositRoutes.js
│   │   ├── withdrawalRoutes.js
│   │   ├── taskRoutes.js
│   │   └── adminRoutes.js
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   ├── adminMiddleware.js
│   │   └── errorMiddleware.js
│   ├── services/
│   │   ├── depositService.js
│   │   ├── referralService.js
│   │   └── commissionService.js
│   ├── utils/
│   │   ├── helpers.js
│   │   └── validators.js
│   ├── models/
│   │   ├── userModel.js
│   │   ├── depositModel.js
│   │   └── withdrawalModel.js
│   └── app.js
├── public/
│   ├── css/
│   ├── js/
│   ├── images/
│   ├── videos/
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── deposit.html
│   ├── withdrawal.html
│   └── referrals.html
├── .env
├── package.json
└── server.js
```

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | No | Register (email, password, phone, referralCode) |
| GET | `/api/users/me` | Yes | Get current user |
| PATCH | `/api/users/me` | Yes | Update profile |
| PUT | `/api/users/me/withdrawal-account` | Yes | Set withdrawal account |
| POST | `/api/deposits` | Yes | Submit mobile deposit |
| POST | `/api/deposits/crypto` | Yes | Submit crypto deposit |
| GET | `/api/deposits` | Yes | List my deposits |
| POST | `/api/withdrawals` | Yes | Submit withdrawal |
| GET | `/api/withdrawals` | Yes | List my withdrawals |
| GET | `/api/support/messages` | Yes | Get support chat |
| POST | `/api/support/messages` | Yes | Send support message |
| GET | `/api/notifications` | Yes | List notifications |
| GET | `/api/notifications/announcements` | Yes | List announcements |
| GET | `/api/transactions` | Yes | List transactions |
| GET | `/api/tasks/videos` | Yes | Get video tasks |
| POST | `/api/tasks/videos/:id/watch` | Yes | Record video watch |
| GET | `/api/upgrades/history` | Yes | Upgrade history |
| POST | `/api/upgrades/unlock` | Yes | Unlock level |
| GET | `/api/admin/*` | Admin | Admin-only endpoints |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Firebase Service Account

1. Firebase Console → Project Settings → Service Accounts  
2. Generate a new private key  
3. Save as `firebase-service-account.json` in project root  

### 3. Environment (optional)

Copy `.env.example` to `.env` and set:

- `PORT` – Server port (default 3000)  
- `FIREBASE_SERVICE_ACCOUNT` – Path to service account JSON  

### 4. Run

```bash
npm start
```

Development with auto-reload:

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- API base: `http://localhost:3000/api`

## Frontend API Client

`public/js/api.js` exposes `window.ClassicAPI`:

```javascript
// After Firebase Auth login:
await ClassicAPI.users.me();
await ClassicAPI.deposits.create({ amount: 150, reference: 'REF123', network: 'Orange' });
await ClassicAPI.support.send('Hello');
```

All requests include the Firebase ID token in the `Authorization: Bearer <token>` header.

## Gradual Migration

The frontend can use either Firebase directly or the API:

- **Signup** – Uses `POST /api/auth/register` when `ClassicAPI` is available
- **Support** – Uses `GET/POST /api/support/messages` when `ClassicAPI` is available

Include `js/api.js` before app scripts. Other pages (dashboard, deposit, withdrawal, etc.) can be migrated to use `ClassicAPI` instead of `firebase.database()` over time. Firebase Auth remains on the client for login; the API verifies the ID token.

## Deployment

1. Build/deploy backend (e.g. Node on Heroku, Railway, Render)  
2. Set `window.API_BASE = 'https://your-api.com'` in the frontend if API is on a different domain  
3. CORS is enabled for credentials  
