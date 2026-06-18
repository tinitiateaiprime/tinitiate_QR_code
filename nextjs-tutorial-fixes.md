# Next.js Tutorial Fixes for Mobile QR Links

This workspace did not contain an existing Next.js tutorial project, so these are the concrete fixes to apply if the tutorial version is rebuilt in Next.js.

## 1. Do not use `next/link` for deep-link schemes

Use a normal anchor for `sms:`, `mailto:`, and app links. `next/link` is for internal app routes.

```tsx
export function OpenLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} rel="noreferrer">
      {children}
    </a>
  );
}
```

## 2. Build WhatsApp links with digits only

WhatsApp `wa.me` links should use the country code and phone number with no `+`, spaces, or punctuation.

```ts
export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const text = message.trim();
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
```

## 3. Use `mailto` for the default email app

The requirement is to open the default email application, so generate a `mailto:` link from the payload.

```ts
export function mailtoLink(to: string, subject: string, body: string) {
  const params = new URLSearchParams();
  if (subject.trim()) params.set("subject", subject.trim());
  if (body.trim()) params.set("body", body.trim());
  return `mailto:${to.trim()}${params.toString() ? `?${params}` : ""}`;
}
```

## 4. Build SMS links from payload

Use the phone and message values from the payload.

```ts
export function smsLink(phone: string, message: string) {
  const normalized = phone.trim().startsWith("+")
    ? `+${phone.replace(/\D/g, "")}`
    : phone.replace(/\D/g, "");
  const body = encodeURIComponent(message.trim());

  if (!body) return `sms:${normalized}`;
  return `sms:${normalized}?&body=${body}`;
}
```

## 5. Static export for Netlify

If the tutorial is implemented as a Next.js static site, set:

```js
// next.config.js
const nextConfig = {
  output: "export"
};

module.exports = nextConfig;
```

Netlify publish directory for that setup is:

```text
out
```

For the plain HTML version in this workspace, publish directory is:

```text
.
```

## 6. Keep QR values in `payload.json`

For this project, the page reads the initial QR details from `payload.json`:

```json
{
  "whatsapp": {
    "phone": "919876543210",
    "message": "Hello, this is a dynamic WhatsApp message."
  },
  "email": {
    "email": "example@gmail.com",
    "subject": "Test Subject",
    "message": "This is a test email message."
  },
  "sms": {
    "phone": "919876543210",
    "message": "This is a dynamic SMS message."
  }
}
```

In Next.js, put this file in `public/payload.json` and load it from `/payload.json`.
