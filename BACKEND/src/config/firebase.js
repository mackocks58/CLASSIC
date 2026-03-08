import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let app;
let auth;
let db;

function initFirebase() {
  if (app) return { app, auth, db };

  let serviceAccount;
  try {
    const path = process.env.FIREBASE_SERVICE_ACCOUNT || join(__dirname, '..', '..', '..', 'serviceAccount.json');
    console.log('Trying to load Firebase service account from:', path);
    const fileContent = readFileSync(path, 'utf8');
    serviceAccount = JSON.parse(fileContent);
    console.log('Successfully loaded Firebase service account');
  } catch (e) {
    console.warn('Firebase service account not found. Error:', e.message);
    serviceAccount = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'mozambique-newhope',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };
  }

  app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: 'https://mozambique-newhope-default-rtdb.firebaseio.com'
  });
  auth = getAuth(app);
  db = getDatabase(app);

  return { app, auth, db };
}

const { app: _app, auth: _auth, db: _db } = initFirebase();
export { _app as app, _auth as auth, _db as db };
