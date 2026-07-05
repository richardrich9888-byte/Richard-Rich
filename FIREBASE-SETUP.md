# Firebase Setup — Richard Rich (one-time, ~5–8 minutes, free)

This connects your site to a free Google cloud database so that:
- every client booking appears in your **Command Center** (type `owner` on the site), and
- **Sign in with Google** works for visitors.

You only do this **once**. Follow it click by click.

---

## 1. Create the project
1. Go to **https://console.firebase.google.com**
2. Click **Add project** → name it `richard-rich` → Continue
3. Turn **OFF** Google Analytics (not needed) → **Create project** → wait → Continue

## 2. Add a Web App
1. On the project home, click the **`</>`** (web) icon
2. Nickname: `richard-rich-web` → **Register app**
3. Firebase shows a `firebaseConfig = { ... }` block. **Copy the values.**
4. Open **`js/firebase-config.js`** in your site folder and paste each value between the quotes:
   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "PASTE",
     authDomain: "PASTE",
     projectId: "PASTE",
     storageBucket: "PASTE",
     messagingSenderId: "PASTE",
     appId: "PASTE"
   };
   ```
   (Leave `OWNER_EMAIL` and `OWNER_SECRET_CODE` as they are.)

## 3. Turn on the database
1. Left menu → **Build → Firestore Database** → **Create database**
2. Choose a location near you → Start in **Production mode** → Enable
3. Go to the **Rules** tab, delete what's there, paste this exactly, then **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /bookings/{doc} {
         allow create: if true;
         allow read, update, delete: if request.auth != null
           && request.auth.token.email == 'richardrich9888@gmail.com';
       }
     }
   }
   ```
   > This is the real lock: anyone can *send* a booking, but only YOU (signed in) can *read* them.

## 4. Turn on sign-in methods
1. Left menu → **Build → Authentication** → **Get started**
2. **Sign-in method** tab → enable **Google** (pick your support email) → Save
3. Same tab → enable **Email/Password** → Save

## 5. Create YOUR owner login
1. Authentication → **Users** tab → **Add user**
2. Email: `richardrich9888@gmail.com`
3. Password: `rucrazyy`
4. **Add user**

## 6. Allow your website address
1. Authentication → **Settings** → **Authorized domains** → **Add domain**
2. Add your live site domain (e.g. `your-site.netlify.app`, and later your real domain)
   - `localhost` is already allowed for testing.

---

## Done — how to use it
- **See client bookings:** open your site, type the word **`owner`** → log in with
  `richardrich9888@gmail.com` / `rucrazyy` → enter code **`tayyabisdady`** → your files appear.
- Every new booking shows up the moment a client submits, from any device in the world.

> After editing `js/firebase-config.js`, re-zip the folder (or re-upload) so the live site gets the change.
