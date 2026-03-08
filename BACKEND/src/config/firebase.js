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
  
  // Try 1: Check if FIREBASE_SERVICE_ACCOUNT env var contains the full JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      console.log('Loading Firebase service account from FIREBASE_SERVICE_ACCOUNT environment variable');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('✓ Successfully loaded Firebase service account from env variable');
    } catch (e) {
      console.warn('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
    }
  }
  
  // Try 2: Load from file (for local development)
  if (!serviceAccount) {
    try {
      const path = join(__dirname, '..', '..', '..', 'serviceAccount.json');
      console.log('Loading Firebase service account from file:', path);
      const fileContent = readFileSync(path, 'utf8');
      serviceAccount = JSON.parse(fileContent);
      console.log('✓ Successfully loaded Firebase service account from file');
    } catch (e) {
      console.warn('❌ Firebase service account file not found:', e.message);
    }
  }
  
  // Try 3: Build from individual environment variables
  if (!serviceAccount) {
    console.log('Building Firebase service account from environment variables');
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'mozambique-newhope',
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
