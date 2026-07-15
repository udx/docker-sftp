const test = require("node:test");
const assert = require("node:assert/strict");

test("Firebase Admin exposes the modular APIs used by the gateway", () => {
  const app = require("firebase-admin/app");
  const database = require("firebase-admin/database");

  assert.equal(typeof app.initializeApp, "function");
  assert.equal(typeof app.cert, "function");
  assert.equal(typeof database.getDatabase, "function");
});
