const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Firebase Admin exposes the modular APIs used by the gateway", () => {
  const app = require("firebase-admin/app");
  const database = require("firebase-admin/database");

  assert.equal(typeof app.initializeApp, "function");
  assert.equal(typeof app.cert, "function");
  assert.equal(typeof database.getDatabase, "function");
});

test("package entrypoint exists and Firebase consumer entrypoints are loadable", () => {
  const packageJson = require("../package.json");
  const packageEntry = path.resolve(__dirname, "..", packageJson.main);
  const firebaseConsumer = require("../lib/firebase.consume");

  assert.equal(fs.existsSync(packageEntry), true);
  assert.equal(typeof firebaseConsumer.start, "function");
  assert.equal(typeof firebaseConsumer.refreshKeys, "function");
  assert.equal(typeof firebaseConsumer.setupListeners, "function");
});

test("Firebase initialization reports a missing private key clearly", () => {
  const utility = require("../lib/utility");
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  delete process.env.FIREBASE_PRIVATE_KEY;
  try {
    assert.throws(
      () => utility.getFirebase(),
      /FIREBASE_PRIVATE_KEY is required to initialize Firebase/
    );
  } finally {
    if (privateKey === undefined) {
      delete process.env.FIREBASE_PRIVATE_KEY;
    } else {
      process.env.FIREBASE_PRIVATE_KEY = privateKey;
    }
  }
});

test("Firebase initialization reports a missing database URL clearly", () => {
  const utility = require("../lib/utility");
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const databaseUrl = process.env.FIREBASE_DATABASE_URL;

  process.env.FIREBASE_PRIVATE_KEY = "test-private-key";
  process.env.FIREBASE_PROJECT_ID = "test-project";
  process.env.FIREBASE_CLIENT_EMAIL = "test@example.com";
  delete process.env.FIREBASE_DATABASE_URL;
  try {
    assert.throws(
      () => utility.getFirebase(),
      /FIREBASE_DATABASE_URL is required to initialize Firebase/
    );
  } finally {
    if (privateKey === undefined) {
      delete process.env.FIREBASE_PRIVATE_KEY;
    } else {
      process.env.FIREBASE_PRIVATE_KEY = privateKey;
    }

    if (projectId === undefined) {
      delete process.env.FIREBASE_PROJECT_ID;
    } else {
      process.env.FIREBASE_PROJECT_ID = projectId;
    }

    if (clientEmail === undefined) {
      delete process.env.FIREBASE_CLIENT_EMAIL;
    } else {
      process.env.FIREBASE_CLIENT_EMAIL = clientEmail;
    }

    if (databaseUrl === undefined) {
      delete process.env.FIREBASE_DATABASE_URL;
    } else {
      process.env.FIREBASE_DATABASE_URL = databaseUrl;
    }
  }
});

test("Firebase consumer listens for added, changed, and removed deployments", () => {
  const { setupListeners } = require("../lib/firebase.consume");
  const events = [];
  const collection = {
    once: (_eventName, callback) => callback({ val: () => null }),
    on: (eventName) => events.push(eventName),
  };
  const database = { ref: () => collection };

  setupListeners(database, () => {});

  assert.deepEqual(events, ["child_added", "child_changed", "child_removed"]);
});

test("Firebase consumer coalesces concurrent key refresh requests", () => {
  const { refreshKeys } = require("../lib/firebase.consume");
  const accessToken = process.env.ACCESS_TOKEN;
  const callbacks = [];
  let calls = 0;
  const updateKeys = (_options, callback) => {
    calls += 1;
    callbacks.push(callback);
  };

  process.env.ACCESS_TOKEN = "test-token";
  try {
    refreshKeys(updateKeys);
    refreshKeys(updateKeys);
    refreshKeys(updateKeys);
    assert.equal(calls, 1);

    callbacks.shift()(null);
    assert.equal(calls, 2);

    callbacks.shift()(null);
    assert.equal(callbacks.length, 0);
  } finally {
    if (accessToken === undefined) {
      delete process.env.ACCESS_TOKEN;
    } else {
      process.env.ACCESS_TOKEN = accessToken;
    }
  }
});

test("Firebase consumer reports a missing access token once per outage", () => {
  const { refreshKeys } = require("../lib/firebase.consume");
  const accessToken = process.env.ACCESS_TOKEN;
  const consoleError = console.error;
  const errors = [];

  delete process.env.ACCESS_TOKEN;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    refreshKeys();
    refreshKeys();
    assert.equal(errors.length, 1);

    process.env.ACCESS_TOKEN = "test-token";
    refreshKeys((_options, callback) => callback(null));

    delete process.env.ACCESS_TOKEN;
    refreshKeys();
    assert.equal(errors.length, 2);
  } finally {
    console.error = consoleError;
    if (accessToken === undefined) {
      delete process.env.ACCESS_TOKEN;
    } else {
      process.env.ACCESS_TOKEN = accessToken;
    }
  }
});

test("key updates return an error when the authorized_keys directory is missing", () => {
  const utility = require("../lib/utility");
  const keysPath = path.join(__dirname, "missing-authorized-keys");
  let callbackError;
  let callbackData;

  assert.equal(fs.existsSync(keysPath), false);
  utility.updateKeys({ keysPath, accessToken: "test-token" }, (error, data) => {
    callbackError = error;
    callbackData = data;
  });

  assert.match(callbackError.message, /authorized_keys directory missing/);
  assert.deepEqual(callbackData, { users: {} });
});
