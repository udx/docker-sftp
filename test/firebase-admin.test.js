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

test("package and Firebase consumer entrypoints are loadable", () => {
  const packageJson = require("../package.json");
  const packageEntry = path.resolve(__dirname, "..", packageJson.main);
  const firebaseConsumer = require("../lib/firebase.consume");

  assert.equal(fs.existsSync(packageEntry), true);
  assert.equal(typeof firebaseConsumer.start, "function");
  assert.equal(typeof firebaseConsumer.refreshKeys, "function");
});
