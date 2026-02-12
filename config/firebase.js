const admin = require('firebase-admin');
const path = require('path');

// Download serviceAccountKey.json from Firebase Console
// Place it in backend/config/serviceAccountKey.json

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;