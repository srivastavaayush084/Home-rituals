<h1 style="font-size:2.5rem; font-weight:800;">Cookie Policy</h1>
**Effective Date:** November 2026

This Cookie Policy details how Home Rituals ("we", "us", "our") utilizes cookies, local storage, and similar technologies on [homerituals.co](https://homerituals.co).

---

## 1. What Are Cookies?
Cookies are compact text files stored on your browser or device by websites you visit. They allow platforms to remember your actions, retain items in your shopping bag, preserve security states, and provide an effortless user experience across sessions.

---

## 2. Types of Cookies We Use

| Category | Purpose | Duration | Default Status |
| :--- | :--- | :--- | :--- |
| **Strictly Essential** | User authentication sessions (`home_rituals_refresh`), CSRF tokens, cart persistence. | Session / 30 Days | Always Active (Mandatory) |
| **Analytics & Metrics** | Aggregated visitor counts, navigation paths, and page performance via Google Analytics 4. | 1 Year | Denied (Opt-in Required) |
| **Marketing & Personalization** | Measuring marketing campaign efficiency and tailored curations. | 90 Days | Denied (Opt-in Required) |

---

## 3. Technical Implementation & Security Flags
All authentication session cookies issued by Home Rituals are configured with highest-standard security flags:
- `HttpOnly`: Mitigates XSS attacks by ensuring client-side JavaScript cannot read the token.
- `Secure`: Transmitted exclusively over encrypted HTTPS connections in production.
- `SameSite=Lax`: Defends against Cross-Site Request Forgery (CSRF).
- `Path=/api/auth`: Restricts cookie transmission strictly to authentication endpoints.

---

## 4. Google Consent Mode v2
We have integrated Google Consent Mode v2. By default, `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` are blocked from storing or reading third-party cookies until you explicitly select "Accept All" or toggle them on in our Cookie Settings.

---

## 5. Managing Your Preferences
You can review, modify, or revoke your cookie consent at any time:
- Click **"Cookie Settings"** in the website footer to launch the interactive preferences dialog.
- Alternatively, adjust your browser settings to clear or block cookies globally.

For further assistance, reach out to our team at **info@homerituals.co**.

