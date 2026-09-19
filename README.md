# frNtcOda — MongoDB / Node.js / Express.js

This version removes the Firebase client SDK and uses a Node.js + Express API backed by MongoDB/Mongoose.

## Stack
- Frontend: existing HTML/CSS/vanilla JavaScript UI
- Backend: Node.js + Express.js
- Database: MongoDB via Mongoose
- Authentication: bcrypt password hashing + JWT sessions
- Payments: Paystack client checkout + server-side transaction verification
- Email: Resend Email API (server-side only)

## Setup
1. Install Node.js 20+ and MongoDB (local or MongoDB Atlas).
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` and a strong `JWT_SECRET`.
4. Set `PAYSTACK_SECRET_KEY` for server-side payment verification.
5. Set `RESEND_API_KEY` and `EMAIL_FROM` for Resend.
6. Optionally set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` for first-run admin bootstrap.
7. Run:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Firestore data migration
`migrate-firestore.js` imports a JSON export into MongoDB:

```bash
node migrate-firestore.js ./firestore-export.json
```

Supported JSON shape:

```json
{
  "users": [{"id":"...", "email":"..."}],
  "courses": [{"id":"...", "title":"..."}]
}
```

The old Firebase Authentication password hashes are **not** stored in Firestore, so normal Firestore data export cannot migrate existing passwords. Existing users need a password reset/re-registration path unless you separately export Firebase Auth credentials and build a compatible password-hash migration.

## Important production notes
- Never put `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, or `RESEND_API_KEY` in frontend files.
- Do not reuse or commit any old email-service API key; Resend credentials belong only in server environment variables.
- Configure `CORS_ORIGIN` to the actual production frontend origin.
- Use HTTPS in production.
- Back up MongoDB before importing production data.
