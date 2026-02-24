# Cognito: Token Storage and JWT Validation Decisions

This article explains two common “should we do more?” questions when using AWS Cognito with a web app and backend API: (1) storing the JWT in **sessionStorage** vs **httpOnly cookie/session**, and (2) adding explicit **issuer/audience** validation on the backend. For an internal app with a single Cognito User Pool and one client, the short answer is: **you don’t need to change either.** Below is the reasoning and when to reconsider.

---

## 1. Token storage: sessionStorage vs httpOnly cookie/session

**Do you need to change it?** **No.** For your app, sessionStorage is a reasonable and common choice.

### sessionStorage (what we use)

- The token lives in the browser, not in a cookie.
- It’s not sent on every request automatically—only when your JS adds it to the `Authorization` header.
- It’s not accessible to other origins.
- It’s cleared when the tab/window is closed.

The main downside is that it’s still readable by any script on the same origin (including in the case of XSS). For an internal tool with a small set of users, that’s often acceptable.

### httpOnly cookie + backend session

- The token (or a session id) is stored in an **httpOnly** cookie, so JavaScript can’t read it; the browser sends it automatically with requests.
- That reduces the impact of XSS: an attacker can’t steal the token via script.
- It requires a backend session store and a small “session” or “cookie” API: set cookie after login, clear on logout, and optionally refresh.

### When it’s worth switching

If you have strict security/compliance requirements, or you expect the app to grow to many users or higher risk, moving to httpOnly + server-side session is a good next step. For an internal revenue tool with Cognito and Admin/Viewer only, you don’t need to change it unless you decide to tighten security.

---

## 2. Explicit JWT issuer/audience validation on the backend

**Do you need it?** **No.** What you have is already correct for typical Cognito use.

### Current behavior

You verify the JWT with Cognito’s JWKS (`jwtVerify(token, getJwks())`). That checks **signature** and **expiration**. Only tokens signed by your Cognito User Pool’s keys and not expired will pass.

### What issuer/audience add

They reject tokens that are validly signed and not expired but were issued for a **different app or tenant** (wrong `iss` or `aud`). That matters when you have multiple issuers or multiple clients and want to be sure the token was meant for *this* API.

### When it’s worth adding

If you ever have multiple Cognito pools, or multiple app clients (e.g. different frontends) and want to restrict this API to one client, then adding **issuer** and **audience** (and passing them into `jwtVerify`) is the right hardening. For a single Cognito User Pool and one app client, you don’t need it; the JWKS verification is enough.

---

## Summary

| Topic | Need to change? | When to reconsider |
|--------|------------------|---------------------|
| Token storage | No; sessionStorage is fine for this app. | Stricter security/compliance or higher risk / many users → consider httpOnly + server-side session. |
| JWT issuer/audience | No; JWKS + signature + exp is enough. | Multiple Cognito pools or multiple app clients → add explicit `iss`/`aud` in `jwtVerify`. |
