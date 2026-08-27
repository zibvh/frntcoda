# frNtcOda — Render Deployment Guide

This version of frNtcOda runs as a **Node.js + Express.js** web service with **MongoDB/Mongoose** and **Resend API** for email.

## Production stack

- Hosting: Render Web Service
- Runtime: Node.js 20+
- Backend: Express.js
- Database: MongoDB Atlas
- Authentication: JWT + bcrypt
- Payments: Paystack
- Email: Resend Email API (server-side)
- Frontend: the existing HTML/CSS/vanilla-JS pages served by Express

The Express server serves both the frontend and `/api/*` endpoints, so you only need **one Render Web Service**.

---

## 1. Before deploying

You need:

1. A GitHub repository containing this project.
2. A MongoDB Atlas database and database user.
3. A Paystack account if payments are enabled.
4. A Resend account with a verified sender/domain and a Resend API key.
5. A strong random JWT secret.
6. Strong initial administrator credentials.

**Never commit `.env` to GitHub.** Commit `.env.example` only.

---

## 2. MongoDB Atlas

Create a MongoDB Atlas cluster and a database named:

```text
frntcoda
```

Create a database user with read/write access to that database.

Your connection string will look similar to:

```text
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/frntcoda?retryWrites=true&w=majority
```

Put the complete connection string into `MONGODB_URI` on Render.

### Network Access

For a straightforward Render deployment, MongoDB Atlas can allow Render's changing outbound IPs by adding:

```text
0.0.0.0/0
```

to Atlas Network Access.

Use a strong, unique MongoDB database password. For a stricter production setup, use MongoDB Atlas private networking where appropriate.

---

## 3. Resend email setup

frNtcOda sends transactional email through the **Resend Email API**. The Node.js server calls Resend directly; the API key is never exposed to frontend JavaScript.

Create a Resend account, verify the domain or sender address you want to use, then create a production API key. For production, use a key with **Sending access** and restrict it to your sending domain when available.

Resend's email API endpoint is:

```text
https://api.resend.com/emails
```

The server authenticates with:

```http
Authorization: Bearer YOUR_RESEND_API_KEY
Content-Type: application/json
```

Set these Render variables:

```text
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=frNtcOda <no-reply@frntcoda.com>
```

`EMAIL_FROM` must use a sender/domain verified and authorized in Resend.

### Important

Do **not** put `RESEND_API_KEY` in:

- HTML
- browser JavaScript
- `js/api.js`
- GitHub
- `.env.example`

Only put the real value in Render's Environment Variables.

The frontend calls your authenticated `/api/email/*` endpoints. Only the Express server talks to Resend.

## 4. Paystack

The server verifies transactions using the Paystack secret key.

Set:

```text
PAYSTACK_SECRET_KEY=sk_live_your_real_secret_key
```

The Paystack secret key must remain server-side.

If your frontend uses a Paystack public key directly, that public key is safe to expose to the browser. The secret key is not.

---

## 5. Render Web Service

In Render:

**New → Web Service → connect your GitHub repository.**

Use:

| Setting | Value |
|---|---|
| Environment | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Node Version | `20` or newer |
| Auto Deploy | On |

You do **not** need a separate Render Static Site for this project. Express serves the frontend.

Render supplies `PORT` automatically. The server already reads `process.env.PORT`.

---

## 6. Render environment variables

Add these under:

**Render → Your Web Service → Environment → Environment Variables**

### Server

```text
PORT=3000
NODE_ENV=production
```

Render supplies `PORT` automatically. You can leave `PORT` out if you prefer; the server has a default of `3000`.

### MongoDB

```text
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/frntcoda?retryWrites=true&w=majority
```

### Authentication

```text
JWT_SECRET=your-long-random-secret-at-least-32-bytes
```

Generate a unique random value. Do not reuse your MongoDB password, Paystack key, or Resend API key.

### Application URLs

For the default Render URL:

```text
APP_URL=https://frntcoda.onrender.com
CORS_ORIGIN=https://frntcoda.onrender.com
```

If you use a custom domain instead, use that domain:

```text
APP_URL=https://frntcoda.com
CORS_ORIGIN=https://frntcoda.com
```

If both `frntcoda.com` and `www.frntcoda.com` are intentionally used, set:

```text
CORS_ORIGIN=https://frntcoda.com,https://www.frntcoda.com
```

Do not add a trailing `/`.

### Paystack

```text
PAYSTACK_SECRET_KEY=sk_live_your_real_paystack_secret_key
```

### Resend API

```text
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=frNtcOda <no-reply@frntcoda.com>
```

### Initial administrator

```text
ADMIN_EMAIL=admin@frntcoda.com
ADMIN_PASSWORD=your-strong-admin-password
ADMIN_NAME=frNtcOda Administrator
```

On startup, if `ADMIN_EMAIL` does not already exist, the server creates the administrator with a bcrypt-hashed password.

**Use a strong unique password.** Do not use the example password in production.

---

## 7. Complete Render variable list

For clarity, the production environment can contain exactly these application variables:

```text
NODE_ENV
MONGODB_URI
JWT_SECRET
APP_URL
CORS_ORIGIN
PAYSTACK_SECRET_KEY
RESEND_API_KEY
EMAIL_FROM
ADMIN_EMAIL
ADMIN_PASSWORD
ADMIN_NAME
```

`PORT` is optional because Render provides it automatically.

There is **no `EMAIL_SERVICE_URL`, `EMAIL_SERVICE_API_KEY`, or SMTP configuration in this version**. Email is sent directly from the Node.js server through the Resend API.

---

## 8. Deploy

After adding the environment variables, deploy the Render service.

The server should:

1. Start Node.js.
2. Connect to MongoDB Atlas.
3. Create the bootstrap admin if needed.
4. Start Express.
5. Serve the frontend.
6. Expose the API under `/api/*`.

---

## 9. Health check

After deployment, open:

```text
https://frntcoda.onrender.com/health
```

A healthy response should look similar to:

```json
{
  "ok": true,
  "service": "frNtcOda API",
  "database": "mongodb"
}
```

If the database says `disconnected`, check `MONGODB_URI` and Atlas Network Access.

---

## 10. Test Resend email

After logging in, test an action that sends an email, such as a welcome email or tutor notification.

If email fails, check Render logs for messages such as:

```text
Resend API is not configured on the server
```

or a Resend API authentication/request error.

Check these values first:

- `RESEND_API_KEY`
- `EMAIL_FROM`

Also verify that the sender is authorized in Resend.

---

## 11. Custom domain

After the Render service works on its `onrender.com` URL:

1. Add your custom domain in Render.
2. Configure the DNS records Render gives you.
3. Wait for DNS/SSL provisioning.
4. Change `APP_URL` to the final HTTPS domain.
5. Change `CORS_ORIGIN` to the final frontend origin.
6. Make sure `EMAIL_FROM` uses a sender/domain that is verified in Resend.

Example:

```text
APP_URL=https://frntcoda.com
CORS_ORIGIN=https://frntcoda.com
```

---

## 12. Firebase migration

The project no longer requires Firebase at runtime.

If you have exported Firestore data, use the included migration script after configuring MongoDB.

The exact migration procedure depends on the format of your Firestore export. Do not blindly import Firebase document IDs into MongoDB if your data contains references that need conversion.

---

## 13. Security checklist before going live

- [ ] `.env` is in `.gitignore`.
- [ ] No real MongoDB password is committed.
- [ ] No real Paystack secret is committed.
- [ ] No real Resend API key is committed.
- [ ] `JWT_SECRET` is long and random.
- [ ] `ADMIN_PASSWORD` is strong and unique.
- [ ] MongoDB Atlas database user has only the permissions it needs.
- [ ] Resend sender is verified.
- [ ] HTTPS is enabled.
- [ ] `APP_URL` uses the final HTTPS domain.
- [ ] `CORS_ORIGIN` matches the actual frontend origin.
- [ ] Paystack is using the correct live/test key for the environment.
- [ ] `/health` reports `mongodb`.
- [ ] A real test email reaches the intended mailbox.
- [ ] A real/test Paystack transaction is verified by the server.

---

## 14. Local development

Copy `.env.example` to `.env` and replace the example values.

Then:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

For local development, you can use:

```text
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

You can still use your Resend API credentials locally, but never commit the real `.env` file.
