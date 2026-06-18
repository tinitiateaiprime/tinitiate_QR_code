# Dynamic QR Code Generator

This project is a static JavaScript website that generates QR codes for:

- WhatsApp message links
- Email compose links
- SMS message links

The QR codes are generated from `payload.json`. A user can open the website, see the QR codes, edit the JSON payload on the page, download QR SVG files, and scan the QR codes on mobile.

## Quick Start

Open PowerShell in the project folder:

```powershell
cd C:\Users\developer\Desktop\scan
```

Start the local website:

```powershell
.\start-local.bat
```

Open this URL in the browser:

```text
http://127.0.0.1:8000/
```

You can also use:

```text
http://localhost:8000/
```

Important: do not open this URL:

```text
http://[::]:8000/
```

`[::]` is only an IPv6 bind address printed by Python. It is not the correct browser URL for this project.

## What This Project Does

The project reads data from `payload.json` and creates QR codes dynamically.

When a QR code is scanned:

- WhatsApp QR opens WhatsApp with the target phone number and message.
- Email QR opens the default email app with recipient, subject, and body.
- SMS QR opens the default SMS app with phone number and message.

The app does not use a backend server, database, external QR API, React, or Next.js. It is plain HTML, CSS, and JavaScript.

## Project Files

```text
scan/
  index.html
  styles.css
  app.js
  payload.json
  netlify.toml
  start-local.bat
  start-local.ps1
  start-network.bat
  start-network.ps1
  README.md
```

File purpose:

- `index.html`: main website structure.
- `styles.css`: modern responsive UI design.
- `app.js`: QR generation, JSON loading, auto-sync, buttons, and download logic.
- `payload.json`: source data for WhatsApp, Email, and SMS QR codes.
- `netlify.toml`: deployment config for Netlify.
- `start-local.bat`: starts local testing on `127.0.0.1`.
- `start-local.ps1`: PowerShell version of local startup.
- `start-network.bat`: starts server for mobile/network testing.
- `start-network.ps1`: PowerShell version of network startup.

## Payload JSON Format

Edit `payload.json` to change the QR data.

Current format:

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

WhatsApp payload:

```json
{
  "phone": "919876543210",
  "message": "Hello, this is a dynamic WhatsApp message."
}
```

Email payload:

```json
{
  "email": "example@gmail.com",
  "subject": "Test Subject",
  "message": "This is a test email message."
}
```

SMS payload:

```json
{
  "phone": "919876543210",
  "message": "This is a dynamic SMS message."
}
```

Use phone numbers with country code. Example for India:

```text
919876543210
```

## How To Run On This Computer

Recommended command:

```powershell
.\start-local.bat
```

Manual command:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8000/
```

or:

```text
http://localhost:8000/
```

Why use `--bind 127.0.0.1`?

It forces Python to use a normal IPv4 localhost address. Without this, Python may print:

```text
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

That printed `[::]` link can fail in the browser with:

```text
ERR_ADDRESS_INVALID
```

So always open:

```text
http://127.0.0.1:8000/
```

## How To Test On Mobile

The phone and computer must be on the same Wi-Fi/network.

Start the network server:

```powershell
.\start-network.bat
```

Manual command:

```powershell
python -m http.server 8000 --bind 0.0.0.0
```

Find your computer IPv4 address:

```powershell
ipconfig
```

Look for an IPv4 address like:

```text
192.168.55.103
```

Open this URL on the phone:

```text
http://192.168.55.103:8000/
```

Replace `192.168.55.103` with your actual computer IP address.

## How It Works Internally

1. The browser opens `index.html`.
2. `index.html` loads `styles.css` and `app.js`.
3. `app.js` fetches `payload.json`.
4. The JSON data is shown inside the page editors.
5. The app creates deep links for WhatsApp, Email, and SMS.
6. The internal QR generator converts each link into an SVG QR code.
7. The QR code appears on the website.
8. When scanned on mobile, the matching app opens with data prefilled.

## Generated Link Formats

WhatsApp:

```text
https://wa.me/<phone>?text=<message>
```

Example:

```text
https://wa.me/919876543210?text=Hello
```

Email:

```text
mailto:<email>?subject=<subject>&body=<message>
```

Example:

```text
mailto:example@gmail.com?subject=Test&body=Hello
```

SMS:

```text
sms:<phone>?&body=<message>
```

Example:

```text
sms:919876543210?&body=Hello
```

## Auto JSON Sync

The website checks `payload.json` every few seconds.

If you change and save `payload.json`, the page automatically:

- reloads the JSON data,
- updates the JSON editors,
- regenerates the QR codes,
- updates the QR previews.

You do not need to refresh the browser manually.

## Page Features

- Three equal-size QR generator cards.
- WhatsApp, Email, and SMS sections.
- Icons for each module.
- Real-time QR preview.
- Dynamic JSON payload editor.
- Generate button.
- Download SVG button.
- Reset button.
- Auto-sync from `payload.json`.
- Responsive layout for desktop and mobile.

## Buttons

Generate:

- Regenerates the QR code from the current JSON editor data.

Download:

- Downloads the visible QR code as an SVG file.

Reset:

- Restores that section from the latest `payload.json` data.

## Testing Checklist

1. Start the server:

```powershell
.\start-local.bat
```

2. Open:

```text
http://127.0.0.1:8000/
```

3. Confirm three cards are visible:

- WhatsApp QR Generator
- Email QR Generator
- SMS QR Generator

4. Edit the WhatsApp JSON message on the page.

5. Confirm the QR preview updates.

6. Scan the WhatsApp QR with a phone.

7. Confirm WhatsApp opens with the phone number and message.

8. Edit the Email JSON.

9. Scan the Email QR and confirm the email app opens.

10. Edit the SMS JSON.

11. Scan the SMS QR and confirm the SMS app opens.

12. Edit `payload.json` directly and save it.

13. Keep the browser open and wait a few seconds.

14. Confirm the page updates automatically.

## Stop The Server

If the server is running in the current PowerShell or Command Prompt window, press:

```text
Ctrl + C
```

If the server is running in the background and you know the process ID:

```powershell
Stop-Process -Id <PROCESS_ID>
```

## Common Problems

### Problem: `http://[::]:8000/` shows ERR_ADDRESS_INVALID

Do not use:

```text
http://[::]:8000/
```

Use:

```text
http://127.0.0.1:8000/
```

or:

```text
http://localhost:8000/
```

Start the server with:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

### Problem: JSON changes are not showing

Check that:

- the server is running,
- the site was opened through `http://127.0.0.1:8000/`,
- `payload.json` is valid JSON,
- the browser page is still open,
- you waited a few seconds for auto-sync.

### Problem: QR is not generated

Check that required fields exist.

WhatsApp requires:

```json
{
  "phone": "919876543210",
  "message": "Hello"
}
```

Email requires:

```json
{
  "email": "example@gmail.com",
  "subject": "Test",
  "message": "Hello"
}
```

SMS requires:

```json
{
  "phone": "919876543210",
  "message": "Hello"
}
```

### Problem: Mobile cannot open the site

Check that:

- phone and computer are on the same Wi-Fi,
- server was started with `.\start-network.bat`,
- you used the computer IPv4 address,
- firewall is not blocking port `8000`.

## Deployment

This is a static site and can be deployed to Netlify.

Netlify settings:

```text
Publish directory: .
```

After deployment, Netlify gives a public link like:

```text
https://your-site-name.netlify.app
```

That public link will display the QR generator website and load data from `payload.json`.

## Notes For A New Developer

- This is not a Next.js project.
- This is not a React project.
- No package install is required.
- No build command is required.
- Python is only used to serve the static files locally.
- QR generation happens inside `app.js`.
- Data comes from `payload.json`.
- UI styling is inside `styles.css`.
- The website must be opened through a local server so `payload.json` can load correctly.
