# The Birthday Circle

A small React + Vite birthday scrapbook with public wish walls stored in Firebase Firestore. The site uses hash-based routes and is designed for GitHub Pages.

## 1. Project files

- `src/App.jsx` – website pages and wish submission/display logic
- `src/data/members.js` – the 13 group members and state themes
- `src/firebase.js` – Firebase connection and automatic anonymous sign-in
- `firestore.rules` – database access rules (also paste these into Firebase Console)
- `.github/workflows/deploy.yml` – GitHub Pages build and deployment

## 2. Create and configure Firebase

1. Create a project at https://console.firebase.google.com/.
2. Create a **Cloud Firestore** database. Choose a nearby region such as `asia-south1` if appropriate; the selected region cannot easily be changed later.
3. In **Authentication → Sign-in method**, enable **Anonymous**.
4. In **Project settings → General**, register a Web App and copy its Firebase web configuration.
5. In **Firestore Database → Rules**, paste the contents of `firestore.rules` and publish them.
6. For the local development setup, copy `.env.example` to `.env` and replace each placeholder with the matching Firebase web-app value.

The app writes to the top-level collection `wishes`. Every wish contains `recipientId`, `senderName`, `message` and `createdAt`.

## 3. Run locally

Install Node.js, open this folder in VS Code, open its Terminal, and run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Test submitting a wish and opening the same page in another browser/device. Do not upload your real `.env` file to GitHub; it is ignored by `.gitignore`.

## 4. Publish to GitHub Pages

1. Create a GitHub repository, for example `the-birthday-circle`.
2. Upload the contents of this project folder to the repository root. The `.github/workflows/deploy.yml` file must remain at that exact path.
3. Make sure the repository's default branch is named `main` (or change the branch name in the workflow).
4. In **Repository → Settings → Secrets and variables → Actions**, create these six repository secrets using the exact names:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. In **Repository → Settings → Pages**, set the build and deployment source to **GitHub Actions**.
6. Open the **Actions** tab. The workflow will build and deploy after a push to `main`, or you can run it manually using **Run workflow**.
7. When deployment succeeds, GitHub Pages displays the public website URL.

The Vite config uses `base: './'`, and profile URLs use hash routing (for example `#/person/depp`), so it works from a repository subpath and direct profile links can be refreshed.

## 5. Important Firebase security note

Firebase web-app configuration is intended to be present in browser code; `VITE_` values are bundled into the published JavaScript and are visible to visitors. GitHub Actions secrets keep them out of the source repository, but do **not** make them secret after the website is built. Never put Firebase Admin SDK keys or service-account private keys in this project. Security comes from Firestore rules, API restrictions where applicable, and optionally Firebase App Check. Public reading and anonymous wish creation are intentional features of this site.

The rules validate the sender, message length, allowed recipient IDs and server timestamp, and prevent edits/deletions. They do not provide a hard per-person rate limit; enable Firebase App Check for additional abuse protection before sharing widely.

## Notes

- The project uses `npm install` in GitHub Actions, so it does not require a pre-generated `package-lock.json` to deploy. For reproducible installs, run `npm install` locally and commit the generated `package-lock.json`; then you can change the workflow install command to `npm ci`.
- `MG` is currently labelled as Meghalaya in `src/data/members.js`; change `stateName` if that was not intended.
- The code currently treats Dot Sharma's state as unspecified.
