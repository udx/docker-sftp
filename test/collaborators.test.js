const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// The key refresh calls axios directly: for the pod list, for the collaborators
// and for each user's public keys. It is replaced, before the gateway modules
// load, by a function the tests script.
const axiosPath = require.resolve("axios");
require(axiosPath);
const requested = [];
let respond = () => {
  throw new Error("no response scripted");
};
require.cache[axiosPath].exports = (options) => {
  requested.push(options.url);
  return Promise.resolve().then(() => respond(options));
};

const collaborators = require("../lib/collaborators");
const { updateKeys } = require("../lib/controller.keys");

const HOUR = 60 * 60 * 1000;
const TTL = 600000;

function refusal(status, headers, message) {
  return Object.assign(new Error("Request failed with status code " + status), {
    response: { status, headers: headers || {}, data: { message } },
  });
}

// A GitHub that counts what it is asked and answers from a script.
function github(answer) {
  const state = { asked: [], clock: 1800000000000, answer };
  state.options = {
    now: () => state.clock,
    request: async (options) => {
      state.asked.push(options);
      const result = state.answer(options);
      if (result instanceof Error) {
        throw result;
      }
      return result;
    },
  };
  return state;
}

function listOf(...logins) {
  return {
    status: 200,
    headers: { "x-ratelimit-remaining": "4000", "x-ratelimit-reset": "0" },
    data: logins.map((login) => ({ login, role_name: "admin" })),
  };
}

test.beforeEach(() => {
  collaborators.reset();
  delete process.env.COLLABORATORS_CACHE_TTL_MS;
});

test("a repository is asked once and its collaborators are remembered for ten minutes", async () => {
  const hub = github(() => listOf("alice"));

  const first = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(first.source, "github");
  assert.equal(first.remaining, "4000");
  assert.deepEqual(first.collaborators.map((user) => user.login), ["alice"]);
  assert.equal(hub.asked[0].url, "https://api.github.com/repos/udx/site/collaborators");
  assert.equal(hub.asked[0].headers.Authorization, "token secret");

  hub.clock += TTL - 1;
  const second = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(second.source, "cache");
  assert.deepEqual(second.collaborators, first.collaborators);
  assert.equal(hub.asked.length, 1);

  hub.clock += 1;
  const third = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(third.source, "github");
  assert.equal(hub.asked.length, 2);
});

test("each repository has its own answer", async () => {
  const hub = github((options) =>
    options.url.includes("udx/site/") ? listOf("alice") : listOf("bob")
  );

  const site = await collaborators.list("udx/site", "secret", hub.options);
  const api = await collaborators.list("udx/api", "secret", hub.options);

  assert.deepEqual(site.collaborators.map((user) => user.login), ["alice"]);
  assert.deepEqual(api.collaborators.map((user) => user.login), ["bob"]);
  assert.equal(hub.asked.length, 2);
});

test("COLLABORATORS_CACHE_TTL_MS sets how long an answer is remembered, and 0 asks every time", async () => {
  const hub = github(() => listOf("alice"));

  process.env.COLLABORATORS_CACHE_TTL_MS = "1000";
  await collaborators.list("udx/site", "secret", hub.options);
  hub.clock += 999;
  await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(hub.asked.length, 1);
  hub.clock += 1;
  await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(hub.asked.length, 2);

  process.env.COLLABORATORS_CACHE_TTL_MS = "0";
  await collaborators.list("udx/site", "secret", hub.options);
  await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(hub.asked.length, 4);

  process.env.COLLABORATORS_CACHE_TTL_MS = "soon";
  collaborators.reset();
  await collaborators.list("udx/site", "secret", hub.options);
  hub.clock += TTL - 1;
  await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(hub.asked.length, 5);
});

test("a spent rate limit stops the lookups until it resets, and the last list is used meanwhile", async () => {
  const hub = github(() => listOf("alice"));
  await collaborators.list("udx/site", "secret", hub.options);

  hub.clock += TTL;
  const reset = hub.clock + 30 * 60 * 1000;
  hub.answer = () =>
    refusal(
      403,
      { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset / 1000) },
      "API rate limit exceeded for user ID 1."
    );

  const refused = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(refused.source, "last");
  assert.equal(refused.reason, "rate limit");
  assert.equal(refused.pausedUntil, reset);
  assert.deepEqual(refused.collaborators.map((user) => user.login), ["alice"]);
  assert.equal(hub.asked.length, 2);

  // Nothing is asked while the limit is spent: not for a known repository, not for a new one.
  const known = await collaborators.list("udx/site", "secret", hub.options);
  const unknown = await collaborators.list("udx/api", "secret", hub.options);
  assert.equal(known.source, "last");
  assert.equal(unknown.source, "none");
  assert.equal(unknown.collaborators, null);
  assert.equal(unknown.reason, "rate limit");
  assert.equal(unknown.pausedUntil, reset);
  assert.equal(hub.asked.length, 2);

  hub.clock = reset - 1;
  await collaborators.list("udx/api", "secret", hub.options);
  assert.equal(hub.asked.length, 2);

  hub.clock = reset;
  hub.answer = () => listOf("alice", "bob");
  const after = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(after.source, "github");
  assert.deepEqual(after.collaborators.map((user) => user.login), ["alice", "bob"]);
  assert.equal(hub.asked.length, 3);
});

test("the answer that uses up the rate limit is still an answer", async () => {
  const hub = github(() => ({
    status: 200,
    headers: {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": String((hub.clock + 20 * 60 * 1000) / 1000),
    },
    data: [{ login: "alice", role_name: "admin" }],
  }));

  const last = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(last.source, "github");
  assert.deepEqual(last.collaborators.map((user) => user.login), ["alice"]);

  const next = await collaborators.list("udx/api", "secret", hub.options);
  assert.equal(next.source, "none");
  assert.equal(next.reason, "rate limit");
  assert.equal(hub.asked.length, 1);
});

test("a secondary rate limit pauses for the time GitHub names, or a minute when it names none", async () => {
  const hub = github(() =>
    refusal(403, { "x-ratelimit-remaining": "4000", "retry-after": "120" }, "slow down")
  );

  const told = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(told.reason, "rate limit");
  assert.equal(told.pausedUntil, hub.clock + 120000);

  collaborators.reset();
  hub.answer = () => refusal(429, {}, "You have exceeded a secondary rate limit.");
  const untold = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(untold.reason, "rate limit");
  assert.equal(untold.pausedUntil, hub.clock + 60000);
});

test("a pause is never longer than an hour", async () => {
  const hub = github(() =>
    refusal(403, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": String((hub.clock + 10 * HOUR) / 1000),
    })
  );

  const refused = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(refused.pausedUntil, hub.clock + HOUR);
});

test("a repository GitHub does not show is remembered as such and its earlier list is dropped", async () => {
  const hub = github(() => listOf("alice"));
  await collaborators.list("udx/site", "secret", hub.options);

  hub.clock += TTL;
  hub.answer = () => refusal(404, { "x-ratelimit-remaining": "4000" }, "Not Found");
  const missing = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(missing.source, "none");
  assert.equal(missing.reason, "not found");
  assert.equal(missing.collaborators, null);

  const again = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(again.source, "cache");
  assert.equal(again.reason, "not found");
  assert.equal(again.collaborators, null);
  assert.equal(hub.asked.length, 2);

  // Not a rate limit: the next repository is asked.
  hub.answer = () => refusal(403, { "x-ratelimit-remaining": "3999" }, "Must have push access");
  const forbidden = await collaborators.list("udx/api", "secret", hub.options);
  assert.equal(forbidden.source, "none");
  assert.equal(forbidden.reason, "forbidden");
  assert.equal(hub.asked.length, 3);
});

test("when GitHub cannot be reached the last list is used, for a day at most", async () => {
  const hub = github(() => listOf("alice"));
  await collaborators.list("udx/site", "secret", hub.options);

  hub.answer = () => new Error("connect ETIMEDOUT");
  hub.clock += TTL;
  const unreachable = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(unreachable.source, "last");
  assert.equal(unreachable.reason, "connect ETIMEDOUT");
  assert.deepEqual(unreachable.collaborators.map((user) => user.login), ["alice"]);

  // An outage is not a rate limit: the next refresh asks again.
  await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(hub.asked.length, 3);

  hub.clock += 24 * HOUR;
  const stale = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(stale.source, "none");
  assert.equal(stale.collaborators, null);

  const never = await collaborators.list("udx/api", "secret", hub.options);
  assert.equal(never.source, "none");
  assert.equal(never.reason, "connect ETIMEDOUT");
});

test("a response that is not a list is not taken for one", async () => {
  const hub = github(() => ({ status: 200, headers: {}, data: { message: "?" } }));

  const odd = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(odd.source, "none");
  assert.equal(odd.reason, "unexpected response");
});

test("a lookup resolves whatever the request does", async () => {
  const now = () => 1800000000000;

  const rejected = await collaborators.list("udx/site", "secret", {
    now,
    request: () => Promise.reject(undefined),
  });
  assert.equal(rejected.source, "none");
  assert.equal(rejected.collaborators, null);

  const empty = await collaborators.list("udx/site", "secret", {
    now,
    request: async () => undefined,
  });
  assert.equal(empty.source, "none");
  assert.equal(empty.reason, "unexpected response");
});

// The refresh as the gateway runs it: pods in, key files out.

function pod(name, sshUser, repository) {
  const labels = { name };
  if (sshUser) {
    labels["ci.rabbit.ssh.user"] = sshUser;
    labels["git.owner"] = repository.split("/")[0];
    labels["git.name"] = repository.split("/")[1];
  }
  return {
    metadata: { name, namespace: "tenant", labels },
    spec: { containers: [{ name: "site" }] },
  };
}

function cluster(pods, repositories) {
  return (options) => {
    if (options.url.endsWith("/v1/pods")) {
      return { status: 200, headers: {}, data: { items: pods() } };
    }
    const url = new URL(options.url);
    const repository = /^\/repos\/(.+)\/collaborators$/.exec(url.pathname);
    if (url.hostname === "api.github.com" && repository) {
      const answer = repositories(repository[1]);
      if (answer instanceof Error) {
        throw answer;
      }
      return answer;
    }
    const user = /^\/(.+)\.keys$/.exec(url.pathname);
    if (url.hostname === "github.com" && user) {
      return { status: 200, headers: {}, data: "ssh-ed25519 AAAA " + user[1] + "-key\n" };
    }
    throw new Error("unexpected request: " + options.url);
  };
}

function refresh(directory) {
  return new Promise((resolve, reject) => {
    updateKeys(
      {
        accessToken: "secret",
        keysPath: path.join(directory, "keys"),
        passwordFile: path.join(directory, "passwd"),
        passwordTemplate: "alpine.passwords",
        passwordPath: path.join(__dirname, "..", "static", "templates") + path.sep,
      },
      (error, data) => (error ? reject(error) : resolve(data))
    );
  });
}

// Key files are written without the refresh waiting for them.
async function keyFile(directory, name, expected) {
  const file = path.join(directory, "keys", name);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (fs.existsSync(file) && expected.test(fs.readFileSync(file, "utf8"))) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function asked() {
  return requested.filter((url) => new URL(url).hostname === "api.github.com")
    .length;
}

test("a key refresh asks GitHub once per repository, whatever the number of applications", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "docker-sftp-test-"));
  fs.mkdirSync(path.join(directory, "keys"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const controllerKeysPath = process.env.CONTROLLER_KEYS_PATH;
  delete process.env.CONTROLLER_KEYS_PATH;
  process.env.NODE_PORT = "0";
  t.after(() => {
    if (controllerKeysPath !== undefined) {
      process.env.CONTROLLER_KEYS_PATH = controllerKeysPath;
    }
    delete process.env.NODE_PORT;
  });

  let pods = [
    pod("site-production-1", "www.example.com.production", "udx/www.example.com"),
    pod("site-develop-1", "www.example.com.develop", "udx/www.example.com"),
    pod("site-staging-1", "www.example.com.staging", "udx/www.example.com"),
    pod("api-staging-1", "api.example.com.staging", "udx/api.example.com"),
    pod("runner-1"),
  ];
  let limited = false;
  const lists = {
    "udx/www.example.com": [
      { login: "alice", role_name: "admin" },
      { login: "bob", role_name: "write" },
      { login: "eve", role_name: "read" },
    ],
    "udx/api.example.com": [{ login: "carol", role_name: "maintain" }],
  };
  requested.length = 0;
  respond = cluster(
    () => pods,
    (repository) =>
      limited
        ? refusal(403, { "x-ratelimit-remaining": "0" }, "API rate limit exceeded")
        : { status: 200, headers: { "x-ratelimit-remaining": "4000" }, data: lists[repository] }
  );

  const first = await refresh(directory);
  assert.equal(asked(), 2, "four applications of two repositories are two lookups");
  assert.deepEqual(Object.keys(first.users).sort(), ["alice", "bob", "carol"]);

  // Roles are still decided per application: production takes admins only.
  const production = await keyFile(directory, "www.example.com.production", /alice-key/);
  assert.match(production, /alice-key/);
  assert.doesNotMatch(production, /bob-key/);
  assert.match(production, /tenant\s+site-production-1\s+-c\s+site;alice/);
  const develop = await keyFile(directory, "www.example.com.develop", /bob-key/);
  assert.match(develop, /alice-key/);
  assert.match(develop, /bob-key/);
  assert.doesNotMatch(develop, /eve-key/);
  const api = await keyFile(directory, "api.example.com.staging", /carol-key/);
  assert.match(api, /carol-key/);
  assert.doesNotMatch(api, /alice-key/);

  // A pod is replaced inside the ten minutes: the key file follows the new pod
  // from the remembered list, and GitHub is not asked.
  const replace = (from, to) => {
    pods = pods.map((item) =>
      item.metadata.name === from
        ? pod(to, "www.example.com.develop", "udx/www.example.com")
        : item
    );
  };
  replace("site-develop-1", "site-develop-2");
  const second = await refresh(directory);
  assert.equal(asked(), 2, "a refresh within ten minutes asks nothing");
  assert.deepEqual(Object.keys(second.users).sort(), ["alice", "bob", "carol"]);
  const followed = await keyFile(directory, "www.example.com.develop", /site-develop-2/);
  assert.match(followed, /tenant\s+site-develop-2\s+-c\s+site;bob/);
  assert.match(followed, /bob-key/);

  // The answers have expired and GitHub refuses every request: the rate limit
  // is spent. The refresh asks, is refused, and goes by the last lists, so the
  // key file still follows the next pod with the same users.
  process.env.COLLABORATORS_CACHE_TTL_MS = "0";
  limited = true;
  replace("site-develop-2", "site-develop-3");
  const third = await refresh(directory);
  assert.equal(asked(), 4, "one refused request per repository");
  assert.deepEqual(Object.keys(third.users).sort(), ["alice", "bob", "carol"]);
  const limitedFile = await keyFile(directory, "www.example.com.develop", /site-develop-3/);
  assert.match(limitedFile, /tenant\s+site-develop-3\s+-c\s+site;alice/);
  assert.match(limitedFile, /tenant\s+site-develop-3\s+-c\s+site;bob/);
  assert.doesNotMatch(limitedFile, /eve-key/);

  // Until the limit resets GitHub is left alone.
  replace("site-develop-3", "site-develop-4");
  const fourth = await refresh(directory);
  assert.equal(asked(), 4, "no request while the rate limit is spent");
  assert.deepEqual(Object.keys(fourth.users).sort(), ["alice", "bob", "carol"]);
  const paused = await keyFile(directory, "www.example.com.develop", /site-develop-4/);
  assert.match(paused, /tenant\s+site-develop-4\s+-c\s+site;bob/);
});
