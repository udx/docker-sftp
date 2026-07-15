const { cert, initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const _ = require("lodash");
const { updateKeys } = require("./utility");

// Keep running even if environment variables are missing
let isConfigured = false;
let refreshInProgress = false;
let refreshPending = false;
let missingAccessTokenReported = false;

function start() {
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
}

// Initialize Firebase
function initializeFirebase() {
  if (!isConfigured) return;

  try {
    const firebaseConfig = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    initializeApp({
      credential: cert(firebaseConfig),
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
function setupListeners(database = getDatabase(), refresh = refreshKeys) {
  const deploymentCollection = database.ref("deployment");

  // Initial data load with logging
  deploymentCollection.once("value", (snapshot) => {
    const count = _.size(snapshot.val());
    console.log(`Initial data loaded with ${count} documents`);
    if (count > 0) {
      refresh();
    }
  });

  // Refresh for deployments added, changed, or removed after startup.
  ["child_added", "child_changed", "child_removed"].forEach((eventName) => {
    deploymentCollection.on(eventName, () => {
      refresh();
    });
  });
}

function refreshKeys(updateKeysFn = updateKeys) {
  const accessToken = process.env.ACCESS_TOKEN;

  if (!accessToken) {
    if (!missingAccessTokenReported) {
      console.error(
        "Firebase consumer: ACCESS_TOKEN is required to refresh SSH keys"
      );
      missingAccessTokenReported = true;
    }
    return;
  }
  missingAccessTokenReported = false;

  if (refreshInProgress) {
    refreshPending = true;
    return;
  }

  refreshInProgress = true;
  updateKeysFn({ accessToken }, (error) => {
    if (error) {
      console.error(
        `Firebase consumer: SSH key refresh failed: ${error.message}`
      );
    }

    refreshInProgress = false;
    if (refreshPending) {
      refreshPending = false;
      refreshKeys(updateKeysFn);
    }
  });
}

if (require.main === module) {
  start();
}

module.exports = { refreshKeys, setupListeners, start };
