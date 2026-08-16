import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_ADMIN_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: (() => {
            let key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
            if (key) {
              if (key.startsWith('"') && key.endsWith('"')) {
                key = key.slice(1, -1);
              }
              return key.replace(/\\n/g, '\n');
            }
            return undefined;
          })(),
        }),
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error.message);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : {
  verifyIdToken: async () => { throw new Error('Firebase not initialized'); },
  verifySessionCookie: async () => { throw new Error('Firebase not initialized'); },
  createSessionCookie: async () => { throw new Error('Firebase not initialized'); },
};
