# 📊 self-hosted-visitor-logs (Log Dashboard)

A tiny, self-hosted **visitor log & device tracker** for your own websites.
Add one `<script>` tag to any site, and watch devices, visits, time-on-page, IP/location and live online status in a private, installable (PWA) admin dashboard. You can also **ban a device or an IP** with a custom message.

- 100% static front-end (GitHub Pages / any static host)
- Backend = your own **Firebase Firestore + Firebase Auth** (free Spark plan is enough for small sites)
- No server to run, no build step, no npm
- Dark/light mode, mobile-first, installable as an app

> ⚠️ **You must use your own Firebase project.** Never share or reuse someone else's Firebase config. Follow the setup below.

---

## 📸 Screenshots

| Login | Websites | Devices |
|:---:|:---:|:---:|
| <img src="screenshots/login.png" width="100%" alt="Login"> | <img src="screenshots/sites.png" width="100%" alt="Websites"> | <img src="screenshots/devices.png" width="100%" alt="Devices"> |

| Device details | Attempts | Ban dialog |
|:---:|:---:|:---:|
| <img src="screenshots/detail.png" width="100%" alt="Device details"> | <img src="screenshots/attempts.png" width="100%" alt="Login attempts"> | <img src="screenshots/blocked.png" width="100%" alt="Ban dialog"> |

<p align="center">
  <b>What a banned visitor sees</b><br><br>
  <img src="screenshots/blocked2.png" width="30%" alt="Access blocked page">
</p>

---

## ✨ Features

| Feature | Details |
|---|---|
| Multi-site | One dashboard, many websites (each `data-site` name becomes a group) |
| Device tracking | Browser/OS label, user-agent, first/last seen, visits, total active time |
| Per-visit logs | Page URL, timestamp, time spent (only while tab is visible) |
| Live status | "Online now" / "Last online X ago" |
| IP + location | Via `ipwho.is` (fallback `ipify`) |
| Ban system | Ban by device or by IP, with custom "Access blocked" message, applied live |
| Login protection | 5 wrong passwords → login locked for 24 days. While locked, the Sign in button is hidden and the admin account **cannot** log in. Only a separate **unlock-only account** can lift the lock (see [Lock & unlock](#-lock--unlock-how-it-works)) |
| Login attempt log | Every attempt with device, IP, location |
| Trash | Soft-delete devices/logs, restore, or delete forever |
| PWA | Installable, offline shell via service worker |

---

## 🗂️ Repository structure

```
.
├── index.html            # Admin dashboard (the PWA)
├── tracker.js            # Script you embed in the websites you want to track
├── sw.js                 # Service worker (dashboard offline shell)
├── manifest.webmanifest  # PWA manifest
├── firestore.rules       # Firestore security rules (edit before deploying!)
├── icons/                # App icons (replace with your own)
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── favicon.ico
│   └── favicon-32.png
├── screenshots/          # Images used in this README
│   ├── login.png
│   ├── sites.png
│   ├── devices.png
│   ├── detail.png
│   ├── attempts.png
│   ├── blocked.png
│   └── blocked2.png
├── LICENSE
├── SECURITY.md
└── README.md
```

---

## 🔑 The two-account design (read this first)

This project uses **exactly two** Firebase Authentication users:

| Account | Used for | Can read/manage logs? | Can unlock a locked dashboard? |
|---|---|:---:|:---:|
| **Admin account** | Your daily dashboard login | ✅ Yes (when not locked) | ❌ No |
| **Unlock account** | Only to lift the 24-day lock | ❌ No (all reads/writes denied) | ✅ Yes, **only while locked** |

Why two accounts?

- If the unlock account could also sign in normally, anyone who knows it could open the dashboard. So the rules make it **useless for everything except unlocking**.
- If you use the unlock account on the normal login screen, the dashboard answers **"Wrong password"** and counts it as a failed attempt. This is intentional.
- If you type the **admin** account on the lock screen, **nothing happens**. The admin account cannot unlock.

Use **different, strong passwords** for the two accounts (minimum 6 characters each).

---

## 🚀 Setup (step by step)

### 1) Get the code
Click **Fork** on GitHub (or **Use this template**), then clone it:

```bash
git clone https://github.com/ShadmanShakibSium/self-hosted-visitor-logs.git
cd self-hosted-visitor-logs
```

### 2) Create a Firebase project
1. Go to <https://console.firebase.google.com> → **Add project** (Analytics not needed).
2. **Project settings (⚙️) → General → Your apps → Web (`</>`)** → register an app (no hosting needed).
3. Copy the `firebaseConfig` object. It looks like:

```js
{
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
}
```

### 3) Create the database
**Build → Firestore Database → Create database** → pick a location → start in **production mode**.

### 4) Create the TWO accounts
1. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
2. **Users → Add user** → create the **Admin account** (your email + a strong password). This is your normal dashboard login.
3. **Users → Add user** → create the **Unlock account** (a different email, e.g. `unlock@yourdomain.com`, + a different strong password). The email does not need to be a real inbox.
4. Copy the **User UID of the Unlock account** (shown in the Users table). You need **only this one**. The admin UID is not used anywhere.
5. 🔒 **Block public sign-up** (very important): **Authentication → Settings → User actions → untick "Enable create (sign-up)"**.
   The rules treat **any signed-in user except the unlock account** as an admin (while the dashboard is not locked). So these two accounts must be the **only** accounts in the project. Disabling sign-up guarantees that.

### 5) Add the security rules
1. Open `firestore.rules`.
2. Find the `unlocker()` function and replace `YOUR_UNLOCK_UID` with the **Unlock account's UID** (step 4.4). Do **not** put the admin UID here.
3. Copy the whole file into **Firestore → Rules** and press **Publish**.

What the rules do:

| Rule | Meaning |
|---|---|
| `admin()` | Signed in, dashboard **not locked**, and **not** the unlock account |
| `unlocker()` | Signed in as the unlock account (the UID you set) |
| Wrong-password counter | Anyone can add +1 (needed before login); the 5th failure sets the lock |
| Successful-login reset | Any signed-in user **except** the unlock account, only when not locked |
| Unlock (reset to 0) | **Only** the unlock account, **only while locked** |

### 6) Put your config into the code
Replace the Firebase config in **both** files:

- `index.html` → search for `initializeApp({` (inside the `<script type="module">`)
- `tracker.js` → the `CFG` object at the top

### 7) Replace the branding (optional)
- Replace the files inside the `icons/` folder (`icon-192.png`, `icon-512.png`, `favicon.ico`, `favicon-32.png`) with your own. Keep the same file names, or update the paths in `index.html`, `manifest.webmanifest` and the `SHELL` list in `sw.js`.
- Edit `name`, `short_name`, colors in `manifest.webmanifest`.
- Bump `const V="logdash-v8"` in `sw.js` (e.g. to `logdash-v9`) whenever you change cached files, so users get the update.

### 8) Deploy the dashboard on GitHub Pages
1. Push your changes (`git add . && git commit -m "setup" && git push`).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → `main` / `/ (root)` → Save.
3. After a minute your dashboard is live at:
   `https://YOUR_USERNAME.github.io/self-hosted-visitor-logs/`
4. In Firebase: **Authentication → Settings → Authorized domains → Add** `YOUR_USERNAME.github.io`.

Open the URL, sign in with the **Admin account** from step 4. 🎉

### 9) Track your websites
Paste this before `</body>` on every page you want to track:

```html
<script src="https://YOUR_USERNAME.github.io/self-hosted-visitor-logs/tracker.js" data-site="My Website" defer></script>
```

- `data-site` = the name shown as a group in the dashboard. If empty, the hostname is used.
- You can also copy `tracker.js` into the site itself and use `src="tracker.js"`.

Visit your site once, then refresh the dashboard — the device appears under **Websites → My Website**.

### 10) (Recommended) Restrict your API key
Google Cloud Console → **APIs & Services → Credentials →** your *Browser key* → **Application restrictions → Websites** → add every domain that runs `tracker.js` plus your dashboard domain (e.g. `https://YOUR_USERNAME.github.io/*`).
> The web API key is not a secret by design, but restricting it reduces abuse.

---

## 🔒 Lock & unlock (how it works)

### What triggers the lock
Every wrong password on the normal login screen adds **+1** to a counter stored in Firestore (`auth/state`). On the **5th** wrong password (`MAXF`), the dashboard is locked for `LOCK_DAYS` (default **24 days**). This counts attempts from any device, and it also counts the **unlock account** if someone uses it on the normal login screen.

### What you see while locked
- The login screen shows **"Locked for 24 days · Opens on `<date>`"**.
- The **Sign in button is hidden**.
- The admin account cannot sign in, even with the correct password.

### How to unlock (step by step)
1. Open the dashboard. You see the lock screen.
2. In the **Email** field type the **Unlock account's email**.
3. In the **Password** field type the **Unlock account's password**.
4. **Wait about 1 second.** There is no button; it checks automatically.
5. If correct, the counter resets to 0 and you see **"Unlocked. Now sign in with your admin account."**
6. Now sign in normally with the **Admin account**.

### What happens in every situation

| Situation | Result |
|---|---|
| Locked, unlock account typed on the lock screen | ✅ Unlocks, then shows the normal login screen |
| Locked, **admin** account typed on the lock screen | Nothing happens (rejected by the rules) |
| Locked, wrong email/password typed | Nothing happens, nothing is counted |
| **Not** locked, unlock account used on the login screen | ❌ "Wrong password (n/5)", counts toward the lock |
| Not locked, admin account + correct password | ✅ Dashboard opens, counter resets to 0 |
| Not locked, wrong password | "Wrong password (n/5)" |
| Lock screen left open and the lock expires | Automatically returns to the normal login screen |

> ⚠️ Never use the unlock account on the normal login screen. It is only for the lock screen.

### Auto-expiry
If nobody unlocks it, the lock ends by itself after `LOCK_DAYS`, and the next wrong password restarts the counter from 1.

---

## 🧭 Using the dashboard

- **Websites** → pick a site → list of devices → tap a device for full logs.
- **Rename** a device to a friendly alias.
- **Ban device / Ban IP** → the visitor instantly sees an "Access blocked" page with your message. **Unban** from the device page or the **Banned** tab.
- **Trash** → soft-delete; restore or delete forever (banned devices can't be deleted).
- **Attempts** → every login attempt (success, wrong password, locked, unlocked).
- **Session** auto-expires after inactivity (`SESSION_MIN` in `index.html`, default 2 min).
- **Lock / unlock** → see [Lock & unlock](#-lock--unlock-how-it-works).

---

## 🛠️ Configuration cheat-sheet

| What | Where |
|---|---|
| Firebase config | `index.html`, `tracker.js` |
| Unlock account UID | `unlocker()` in `firestore.rules` (**the unlock account's UID, not the admin's**) |
| Session timeout | `SESSION_MIN` in `index.html` |
| Max failed logins / lock days | `MAXF`, `LOCK_DAYS` in `index.html` **and** the numbers `5` / `24` in `firestore.rules` (keep them identical) |
| "Online" threshold | `ONLINE_MS` in `index.html` |
| Default block message | `DEFAULT_MSG` in `tracker.js` |
| Time-on-page flush interval | `setInterval(flush, 30000)` in `tracker.js` |
| Service worker cache version | `V` in `sw.js` |

---

## 💸 Firebase free-tier note
The Spark plan allows roughly 50k reads / 20k writes per day. `tracker.js` writes on each visit and about every 30 s while the page is open, and the dashboard uses live listeners. Busy sites may exceed the free quota — monitor usage in the Firebase console.

---

## 🔐 Security & limitations (please read)

- **Two accounts only.** Any signed-in user except the unlock account can read and manage the data while the dashboard is not locked. Keep public sign-up disabled, keep only the admin and unlock users in Firebase Authentication, and use strong, unique passwords.
- The unlock account is **powerless except for unlocking**: it cannot read logs, devices, bans or attempts, and it can only reset the counter while the dashboard is locked.
- Failed-login counting is stored in Firestore and is **publicly writable by design** (needed so the lock works before login). Someone could deliberately trigger the lock by entering 5 wrong passwords. That is harmless for you: you simply unlock with the unlock account (see [Lock & unlock](#-lock--unlock-how-it-works)). Nobody else can unlock it, because the `unlocker()` rule trusts only that one UID.
- Bans are enforced **client-side** by `tracker.js`. A visitor who blocks scripts or the tracker is not blocked. This is *not* a firewall.
- Device IDs live in the visitor's `localStorage`; clearing it creates a "new" device.
- Anyone can create device/log documents (that's how tracking works), so data can be spammed. Treat statistics as indicative, not exact.
- Firebase Auth also has its own brute-force protection. After many bad attempts it may answer "Too many attempts. Try later." Wait a while and retry.

## ⚖️ Privacy & legal

This tool collects **IP address, approximate location, user-agent and browsing time** of your visitors. Depending on where you and your visitors live (GDPR, ePrivacy, CCPA, etc.) you may need to:

- publish a **privacy policy** that mentions this tracking,
- ask for **consent** where required,
- honour data-deletion requests (use the *Delete forever* button).

IP/location lookup uses third-party services (`ipwho.is`, `api.ipify.org`) — their terms apply. **You are solely responsible for how you use this software.**

---

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| `Save failed: permission-denied` | Rules not published, the dashboard is locked, you are not signed in, or you are signed in with the unlock account |
| Dashboard empty after tracking | Check browser console on the tracked site; confirm config is identical in `tracker.js`; check API-key referrer restrictions |
| Can't sign in | Email/Password provider enabled? User exists? Not locked? Using the **admin** account (not the unlock account)? |
| "Locked for 24 days" | Type the **unlock account's** email + password on the lock screen and wait ~1 second (no button). See [Lock & unlock](#-lock--unlock-how-it-works) |
| Typing the admin account on the lock screen does nothing | Expected. Only the unlock account can unlock |
| Unlock account says "Wrong password" on the normal login | Expected. It is for the lock screen only. Each try counts as a failed attempt |
| Unlock does nothing | Check: (1) email/password are the unlock account's and at least 6 characters, (2) `unlocker()` in `firestore.rules` holds the **unlock** account's UID, (3) the rules were **published**, (4) the dashboard is actually locked (counter at 5 and not expired) |
| Works on desktop but old behaviour on phone | Cached old version. Bump `V` in `sw.js`, redeploy, close the app, reopen (or reinstall the PWA) |
| Install button doesn't work | Needs HTTPS, valid `manifest.webmanifest`, icons and `sw.js`. Open in Chrome/Safari (not in-app browsers). The Install dialog shows a checklist |
| Icons not showing | Check the `icons/` folder name and the paths in `index.html`, `manifest.webmanifest` and `sw.js` |
| IP/location missing | Ad-blockers may block `ipwho.is`; the tracker then continues without it |

---

## 🐞 Found a bug? Need help?

1. **First choice:** open a [GitHub Issue](https://github.com/ShadmanShakibSium/self-hosted-visitor-logs/issues) with
   what you did, what you expected, what happened, and your browser/device. Please **never** paste
   your API keys, UIDs, passwords or private logs.
2. **Security problems** (for example, a way to read the logs without logging in): please **don't**
   open a public issue. Email me privately instead.

## 📬 Contact

| | |
|---|---|
| 📧 Email | [mdshadmanshakibsium@gmail.com](mailto:mdshadmanshakibsium@gmail.com) |
| 🐙 GitHub | [@ShadmanShakibSium](https://github.com/ShadmanShakibSium) |
| 📸 Instagram | [সাদমান সাকিব](https://instagram.com/shadman_shakib_sium) |
| 💬 Discord | [Message me on Discord](https://discord.com/users/1267359105492844545) |

⭐ If this project helped you, please give the repo a star!

---

## 🤝 Contributing
Issues and pull requests are welcome. Please never commit real credentials, UIDs or user data.

## 📄 License
Released under the [MIT License](LICENSE) — free to use, modify and distribute, with no warranty.
