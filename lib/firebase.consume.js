const admin = require("firebase-admin");
const _ = require('lodash');

// Check required environment variables
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log('Required environment variable GOOGLE_APPLICATION_CREDENTIALS not set');
  process.exit(1);
}

if (!process.env.FIREBASE_DATABASE_URL) {
  console.log('Required environment variable FIREBASE_DATABASE_URL not set');
  process.exit(1);
}

// Initialize Firebase
try {
  const firebaseConfig = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
} catch (error) {
  console.log(`Error initializing Firebase: ${error.message}`);
  process.exit(1);
}

// Track changes in deployment collection
const deploymentCollection = admin.database().ref('deployment');
const changeQueue = [];

// Initial data load
deploymentCollection.once('value', (snapshot) => {
  const count = _.size(snapshot.val());
  console.log(`Initial data loaded with ${count} documents`);
  if (count > 0) {
    updateKeys(snapshot);
  }
});

// Watch for changes
deploymentCollection.on('child_changed', (data) => {
  console.log(`Change detected with ${_.size(data.val())} items`);
  changeQueue.push(data);
});

// Process queued changes
setInterval(() => {
  const queueSize = _.size(changeQueue);
  if (queueSize > 0) {
    console.log(`Processing ${queueSize} queued changes`);
    updateKeys(_.first(changeQueue));
    changeQueue.length = 0; // Clear queue
  }
}, 30000);


