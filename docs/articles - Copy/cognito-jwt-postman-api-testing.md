# Getting a Cognito JWT for API Testing: Why You Get a Code, Not a Token (and How to Fix It with Postman)

**TL;DR:** AWS Cognito Hosted UI uses the **Authorization Code** flow by default. You get an authorization **code** in the redirect, not a JWT in the URL. To call your API with a Bearer token, you need to exchange that code for tokens. Postman can do this for you—but only if you set **Client Authentication** to *Send client credentials in body*. Otherwise you’ll hit `invalid_client`.

---

## The Challenge

You’ve set up:

- An API that expects `Authorization: Bearer <JWT>`.
- AWS Cognito with Hosted UI (Managed login) and an app client.
- An Admin user in a Cognito group.

You want to test your API (e.g. `POST /admin/upload/csv`) with a real JWT. So you:

1. Open the Cognito Hosted UI login URL.
2. Sign in.
3. Expect to copy a token from the URL.

**What actually happens:** After login, Cognito redirects to your callback URL with a **code** in the query string, e.g.:

```
http://localhost:3000/?code=abc123def456...
```

There is **no** `id_token` or `access_token` in the URL. That’s by design.

---

## Why You Get a Code Instead of a Token

Cognito supports two main flows for the Hosted UI:

| Flow                | `response_type` | What you get after login      | Typical use           |
|---------------------|-----------------|-------------------------------|------------------------|
| **Implicit**        | `token`         | Tokens in the URL fragment    | Legacy; less secure    |
| **Authorization Code** | `code`        | A short-lived **code** in the URL | Recommended for web apps |

Most setups (and the Cognito console’s “Authorization code grant”) use **Authorization Code**. Benefits:

- The token never appears in the browser URL or history.
- The code is exchanged for tokens server-side (or by a client that can keep a secret).

So: **you get a code, not a token.** To get a JWT you must **exchange the code** for tokens via Cognito’s token endpoint.

---

## The Problem for API Testing

For local or manual testing you need a real JWT to put in `Authorization: Bearer <token>`. Options:

1. **Build a small app** that does the OAuth flow and shows the ID token (works, but heavy for “just testing”).
2. **Use a tool that speaks OAuth 2.0** and can do the code exchange for you.

Postman does (2). It can open the Hosted UI, receive the redirect with the code, exchange the code for tokens, and then send the access token (or ID token, depending on config) as the Bearer token on your API request. So you don’t need to copy codes or tokens by hand—**if** Postman is configured correctly.

---

## What Goes Wrong: `invalid_client`

When you first set up OAuth 2.0 in Postman with Cognito, it’s easy to get:

```text
Error: invalid_client
```

during the **token exchange** (the `POST` to `/oauth2/token` after you’ve logged in).

Common cause: **how the client is authenticated** when Postman calls the token endpoint.

- Cognito **public** app clients (typical for Hosted UI / SPAs) **do not have a client secret**.
- If Postman sends the request as if there were a secret (e.g. using **“Send as Basic Auth header”**), Cognito rejects it with `invalid_client`.

So the fix is to tell Postman: **send client credentials in the body, and use no client secret.**

---

## Solution: Postman Configuration That Works

### 1. Create or open a request

- Method: `POST` (or whatever your endpoint needs).
- URL: your API, e.g. `http://localhost:3001/admin/upload/csv`.

### 2. Authorization tab

- **Type:** OAuth 2.0.
- **Add auth data to:** Request Headers (or as needed).

### 3. Get New Access Token (configure the flow)

Click **“Get New Access Token”** and fill in:

| Field | Value |
|--------|--------|
| **Token Name** | Any label (e.g. `Cognito Admin`) |
| **Grant Type** | **Authorization Code** |
| **Callback URL** | `http://localhost:3000` (must match Cognito app client) |
| **Auth URL** | `https://<domain-prefix>.auth.<region>.amazoncognito.com/oauth2/authorize` |
| **Access Token URL** | `https://<domain-prefix>.auth.<region>.amazoncognito.com/oauth2/token` |
| **Client ID** | Your Cognito app client ID |
| **Client Secret** | *(leave empty)* |
| **Scope** | `openid email profile` (or whatever your app client allows) |
| **State** | (optional) |
| **Client Authentication** | **Send client credentials in body** |

Replace `<domain-prefix>` with your Cognito domain (e.g. `marketbuzz-compass`) and `<region>` with your region (e.g. `us-east-1`).

**Critical:** Under **Client Authentication**, choose **“Send client credentials in body”** (or equivalent in your Postman version). Do **not** use “Send as Basic Auth header” when you have no client secret.

### 4. Get the token

- Click **“Get New Access Token”**.
- Postman opens the Cognito Hosted UI in a browser.
- Sign in with your user (e.g. Admin).
- After redirect, Postman receives the code and exchanges it for tokens.
- Select the new token and use it for the request.

### 5. Use the token on the request

- Ensure the request uses the token you just created (e.g. from the “Available Tokens” dropdown).
- Header prefix should be **Bearer**.
- Send the request; the API should receive `Authorization: Bearer <JWT>`.

---

## Exact Values That Worked (Example)

For a Cognito User Pool in `us-east-1` with domain prefix `marketbuzz-compass` and a public app client:

- **Auth URL:**  
  `https://marketbuzz-compass.auth.us-east-1.amazoncognito.com/oauth2/authorize`
- **Access Token URL:**  
  `https://marketbuzz-compass.auth.us-east-1.amazoncognito.com/oauth2/token`
- **Client ID:**  
  (from Cognito → App client, e.g. `7ic0q5e0gj9o1hntl3coh86gcf`)
- **Client Secret:**  
  *(empty)*
- **Callback URL:**  
  `http://localhost:3000`
- **Grant Type:**  
  Authorization Code
- **Client Authentication:**  
  Send client credentials in body

Using **Basic Auth** for the token request caused `invalid_client`; switching to **body** fixed it.

---

## Takeaways

1. **Cognito Hosted UI with “Authorization code grant”** gives you a **code** in the redirect, not a JWT. You must exchange the code for tokens.
2. **Public Cognito app clients** have no client secret; the token request must not use Basic Auth with a secret.
3. **Postman** can run the full flow and give you a Bearer token for testing—use **“Send client credentials in body”** and leave **Client Secret** blank.
4. Use the **ID token** (or access token, depending on your API) as the Bearer token when calling your backend.

---

## Optional: Using the Token in curl

Once Postman has obtained the token, you can copy it and use it in curl:

```bash
curl -X POST http://localhost:3001/admin/upload/csv \
  -H "Authorization: Bearer <PASTE_ID_OR_ACCESS_TOKEN>" \
  -F "file=@your-file.csv"
```

Replace `<PASTE_ID_OR_ACCESS_TOKEN>` with the token value Postman shows (usually the ID token for APIs that validate Cognito JWTs).

---

*Documented from real setup on MarketBuzz Compass (Cognito Hosted UI + Fastify API). You can adapt the same steps for any Cognito-backed API.*


