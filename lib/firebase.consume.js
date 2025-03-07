const admin = require("firebase-admin");
const _ = require("lodash");

// Keep running even if environment variables are missing
let isConfigured = false;

// Check configuration once
const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const hasDbUrl = process.env.FIREBASE_DATABASE_URL;

if (hasCredentials && hasDbUrl) {
  console.log("Firebase configuration detected, starting consumer...");
  isConfigured = true;
  initializeFirebase();
} else {
  console.log("Firebase consumer: required configuration not available");
  console.log(
    "Required: GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_DATABASE_URL"
  );
  // Stay running but do nothing
  setInterval(() => {}, 1000000);
}

// Initialize Firebase
function initializeFirebase() {
  if (!isConfigured) return;

  try {
    const firebaseConfig = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    setupListeners();
  } catch (error) {
    console.log(`Firebase initialization error: ${error.message}`);
    console.log("Service will stay running but inactive");
    // Stay running but do nothing
    setInterval(() => {}, 1000000);
    return;
  }
}

// Track changes in deployment collection
function setupListeners() {
  const deploymentCollection = admin.database().ref("deployment");

  // Initial data load with logging
  deploymentCollection.once("value", (snapshot) => {
    const count = _.size(snapshot.val());
    console.log(`Initial data loaded with ${count} documents`);
    if (count > 0) {
      updateKeys(snapshot);
    }
  });

  // Watch for changes silently
  deploymentCollection.on("child_changed", (data) => {
    updateKeys(data);
  });
}
