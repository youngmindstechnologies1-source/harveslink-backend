const admin = require('firebase-admin');
const { env } = require('./env');

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK.
 * Uses service account JSON file path from environment.
 */
function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin SDK initialized');
    } else {
      console.warn('⚠️  Firebase service account not configured. Push notifications will be disabled.');
    }
  } catch (error) {
    console.warn('⚠️  Firebase initialization failed:', error.message);
    console.warn('   Push notifications will be disabled.');
  }
}

/**
 * Get Firebase messaging instance.
 * Returns null if Firebase is not initialized.
 */
function getMessaging() {
  if (!firebaseInitialized) return null;
  return admin.messaging();
}

module.exports = { initializeFirebase, getMessaging };
