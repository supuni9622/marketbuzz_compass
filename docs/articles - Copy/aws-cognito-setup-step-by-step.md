# AWS Cognito Setup Step by Step: User Pool, Users, Groups, Managed Login, and Domain

This article documents a full Cognito setup for a web app with role-based access (Admin vs Viewer): User Pool, groups, app client, domain, Managed login (Hosted UI), users, and passwords. Everything is step-by-step so you can reproduce it or adapt it for your own project.

---

## What We’re Building

- **User Pool** – Email/password sign-in, no Identity Pool.
- **Groups** – `Admin` and `Viewer` for RBAC.
- **Managed login (Hosted UI)** – Cognito-hosted sign-in page with a custom domain.
- **App client** – Public client (no secret) for Authorization Code flow.
- **Users** – Created in the console, assigned to groups; first-time password flow documented.

The backend validates the JWT and reads `cognito:groups` to allow or deny access (e.g. Admin-only CSV upload).

---

## 1. Create the User Pool

1. In **AWS Console** go to **Amazon Cognito** → **User pools** → **Create user pool**.
2. **Sign-in experience**
   - Choose **Cognito user pool**.
   - Sign-in options: **Email** (and optionally **User name**).
   - Leave MFA as you prefer (e.g. Optional).
3. **Security requirements**
   - Password policy: e.g. minimum 8 characters, uppercase, lowercase, number, special character.
   - Temporary password expiry: e.g. 7 days.
4. **Sign-up experience**
   - Configure self-registration if needed, or leave disabled for admin-created users only.
5. **Message delivery**
   - Use **Send email with Cognito** (or your SES/SMTP if configured).
6. **Integrations**
   - Pool name: e.g. `marketbuzz-compass-pool`.
   - No Lambda triggers required for basic auth.
7. **Review and create** – Create the pool.

After creation, note the **User pool ID** (e.g. `us-east-1_TLudlnsPu`) and **ARN**. You’ll need the pool ID for the app client and for backend JWKS validation.

---

## 2. Create Groups

1. In the User Pool, go to **User management** → **Groups**.
2. **Create group**
   - **Group name:** `Admin`
   - **Description:** e.g. “Upload CSV, manage catalog, full access”
   - Create.
3. Create a second group:
   - **Group name:** `Viewer`
   - **Description:** e.g. “Read-only access”
   - Create.

Group names are just labels. **What each group is allowed to do is enforced in your backend** (e.g. “Admin can call POST /admin/upload/csv”). Cognito only puts group names in the JWT (`cognito:groups`).

---

## 3. Create an App Client (for Hosted UI)

1. Go to **Applications** → **App clients** → **Create app client**.
2. **App type:** **Public client** (no client secret).
3. **App client name:** e.g. `marketbuzz_compass`.
4. **Authentication flows**
   - Enable **Authorization code grant** (recommended for web).
   - You do *not* need to enable Implicit grant for Hosted UI with Authorization Code.
5. **Other settings**
   - OpenID Connect scopes: **openid**, **email**, **profile** (add **phone** only if you use it).
6. Create the app client.

Note the **Client ID**; you’ll use it in callback URLs, Postman, and frontend config.

---

## 4. Domain (for Hosted UI URL)

The Hosted UI needs a domain so users get a URL like `https://<prefix>.auth.<region>.amazoncognito.com`.

1. In the User Pool, find **App integration** (or **Domain** / **Hosted UI** depending on console version).
2. Under **Domain**, set a **Domain prefix** (e.g. `marketbuzz-compass`).
   - You can use a Cognito-provided domain or your own; for simplicity we used the prefix.
3. Save.

Your Hosted UI base URL is then:
`https://marketbuzz-compass.auth.us-east-1.amazoncognito.com`  
(Replace prefix and region with yours.)

---

## 5. Configure Managed Login (Callback URLs, OAuth, Scopes)

Managed login is the Hosted UI plus the app client settings that control redirects and OAuth.

1. Go to **Applications** → **App clients** → select your app client (e.g. `marketbuzz_compass`).
2. Open **Edit** (or **Edit managed login pages configuration**).
3. **Identity providers**
   - Ensure **Cognito user pool** is selected.
4. **OAuth 2.0 grant types**
   - **Authorization code grant** – selected.
5. **OpenID Connect scopes**
   - **OpenID**, **Email**, **Profile** (use Phone only if needed).
6. **Allowed callback URLs**
   - Add `http://localhost:3000` for local dev.
   - Add your production URL when you deploy (e.g. `https://your-app.com`).
7. **Default redirect URL**
   - Set to one of the callback URLs (e.g. `http://localhost:3000`).
8. **Allowed sign-out URLs**
   - Add the same URLs (e.g. `http://localhost:3000`).
9. Save.

If you don’t see “App integration” as a top-level item, these settings are often under **App clients** → **[your client]** → **Edit** or under a **Managed login** / **Hosted UI** section. The **Managed login** styling page (logo, colours) is separate from this configuration.

---

## 6. Create Users

1. Go to **User management** → **Users** → **Create user**.
2. **User information**
   - **User name:** Required; use email or a short username (e.g. `admin@example.com` or `supuni`).
   - **Email address:** Set and check **Mark email address as verified** if you’re sure it’s valid.
   - **Phone:** Optional; leave blank unless needed.
3. **Invitation**
   - **Don’t send an invitation** – you set a temporary password and share it yourself, or
   - **Send an email invitation** – user gets a link to set their own password.
4. **Temporary password**
   - **Set a password** – enter a password that meets the pool policy (e.g. `TempPass123!`), or
   - **Generate a password** – let Cognito generate one.
5. Create user.

There is **no “Assign to group” on the Create user screen**. You assign groups in the next step.

---

## 7. Assign Users to Groups

Do this **after** the user exists.

**Option A – From the user**

1. **User management** → **Users** → click the **Username**.
2. Open the **Groups** tab.
3. **Add user to group** → choose **Admin** or **Viewer** → Add.

**Option B – From the group**

1. **User management** → **Groups** → open **Admin** (or **Viewer**).
2. **Add users to group** → select the user(s) → Add.

Repeat for each user. The JWT will include `cognito:groups` (e.g. `["Admin"]`).

---

## 8. Passwords: Temporary vs Permanent and “Force change password”

- New users created with “Set a password” start in **Force change password**.
- In the user detail page, **Confirmation status** shows **Force change password** and **Reset password** in the Actions menu can be **disabled** for that state.

**Ways to get a permanent password:**

1. **User changes it on first sign-in (recommended)**
   - Send the user the Hosted UI URL and the temporary password (securely).
   - User signs in → Cognito prompts for a new password → user sets it.
   - After that, status becomes **Confirmed** and **Reset password** in the console becomes available.

2. **Admin sets it via AWS CLI**
   - If the user can’t sign in yet, use:
   ```bash
   aws cognito-idp admin-set-user-password \
     --user-pool-id us-east-1_TLudlnsPu \
     --username supuni \
     --password "YourNewPassword123!" \
     --permanent
   ```
   - Replace user pool ID, username, and password. After this, the user can sign in without being forced to change.

3. **Use “Send an email invitation”** when creating future users so they set their own password via the link.

---

## 9. Where Permissions Are Defined (Important)

Cognito does **not** define what “Admin” or “Viewer” can do. It only:

- Stores group names.
- Puts them in the JWT as `cognito:groups`.

Your **backend** (e.g. Fastify middleware) must:

- Validate the JWT (signature, issuer, expiry) using Cognito JWKS.
- Read `request.user.groups` (from `cognito:groups`).
- For admin routes (e.g. `POST /admin/upload/csv`), require `groups.includes("Admin")` and return 403 otherwise.

So: **Cognito = who is in which group; Backend = what each group is allowed to do.**

---

## 10. Quick Reference: What We Did

| Step | Where | What |
|------|--------|------|
| 1 | Cognito → User pools | Created user pool (email sign-in, password policy) |
| 2 | User pool → Groups | Created **Admin** and **Viewer** |
| 3 | User pool → App clients | Created **public** app client, Authorization code grant |
| 4 | App integration / Domain | Set **domain prefix** for Hosted UI URL |
| 5 | App client → Edit | Callback URLs, sign-out URLs, OAuth code, scopes (openid, email, profile) |
| 6 | User pool → Users | Created user (username, email, temporary password) |
| 7 | User → Groups tab (or Group → Add users) | Assigned user to **Admin** (or Viewer) |
| 8 | Optional | User signed in and changed password, or admin set permanent password via CLI |
| 9 | Backend | JWT validation + requireAdmin for `/admin/*` routes |

---

## 11. Environment Variables for the Backend

Your API needs these (e.g. in `.env`):

```env
COGNITO_USER_POOL_ID=us-east-1_TLudlnsPu
COGNITO_CLIENT_ID=7ic0q5e0gj9o1hntl3coh86gcf
COGNITO_REGION=us-east-1
```

The backend uses the User Pool ID to load the JWKS URL:
`https://cognito-idp.<region>.amazonaws.com/<user-pool-id>/.well-known/jwks.json`

---

## 12. Gotchas We Hit

- **“Invalid request” on Hosted UI** – We used `response_type=token` (Implicit). The app client only had **Authorization code** grant. Fix: use `response_type=code` and exchange the code for tokens (e.g. with Postman or a small script).
- **“Where are callback URLs?”** – They’re under **App clients** → **[your client]** → **Edit** (or **Edit managed login pages configuration**), not on the User Pool overview. In some consoles the section is under **Managed login**.
- **“Reset password” disabled** – Normal when the user is in **Force change password**. Either have the user change password on first login or use `admin-set-user-password` with `--permanent` in the CLI.
- **`invalid_client` in Postman** – The token request was sent with Basic Auth (client secret). Our app client is public (no secret). Fix: set **Client Authentication** to **Send client credentials in body** and leave **Client Secret** blank.

---

## Summary

We created a Cognito User Pool with email sign-in, Admin and Viewer groups, a public app client with Authorization Code flow, a domain for the Hosted UI, and Managed login settings (callback/sign-out URLs and scopes). We created users, assigned them to groups, and handled the first-time password flow. Permissions are enforced in the backend using `cognito:groups`. This setup is enough to protect an API (e.g. Admin-only CSV upload) and to later plug in a Next.js app using the same Hosted UI and callback URLs.

---

*Documented from the MarketBuzz Compass project (Cognito + Fastify API). Adjust pool name, client ID, domain, and URLs for your own app.*
