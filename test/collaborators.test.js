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

test("each repository has its own answer, also under the same name with another owner", async () => {
  const lists = { "udx/site": "alice", "udx/api": "bob", "other/site": "carol" };
  const hub = github((options) =>
    listOf(lists[new URL(options.url).pathname.split("/").slice(2, 4).join("/")])
  );
  const logins = async (repository) =>
    (await collaborators.list(repository, "secret", hub.options)).collaborators.map(
      (user) => user.login
    );

  assert.deepEqual(await logins("udx/site"), ["alice"]);
  assert.deepEqual(await logins("udx/api"), ["bob"]);
  assert.deepEqual(await logins("other/site"), ["carol"]);
  assert.equal(hub.asked.length, 3);

  assert.deepEqual(await logins("udx/site"), ["alice"]);
  assert.deepEqual(await logins("other/site"), ["carol"]);
  assert.equal(hub.asked.length, 3);
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

  // Anything but digits is not a number of milliseconds: the default applies.
  for (const odd of ["soon", "10m", "1e6", "600,000", "-5"]) {
    process.env.COLLABORATORS_CACHE_TTL_MS = odd;
    collaborators.reset();
    const before = hub.asked.length;
    await collaborators.list("udx/site", "secret", hub.options);
    hub.clock += TTL - 1;
    await collaborators.list("udx/site", "secret", hub.options);
    assert.equal(hub.asked.length, before + 1, odd);
    hub.clock += 1;
    await collaborators.list("udx/site", "secret", hub.options);
    assert.equal(hub.asked.length, before + 2, odd);
  }

  // An answer is remembered for an hour at most.
  process.env.COLLABORATORS_CACHE_TTL_MS = String(5 * HOUR);
  collaborators.reset();
  const before = hub.asked.length;
  await collaborators.list("udx/site", "secret", hub.options);
  hub.clock += HOUR - 1;
  await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(hub.asked.length, before + 1);
  hub.clock += 1;
  await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(hub.asked.length, before + 2);
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

  // The wording GitHub used before, with requests left.
  collaborators.reset();
  hub.answer = () =>
    refusal(403, { "x-ratelimit-remaining": "4000" }, "You have triggered an abuse detection mechanism.");
  const abuse = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(abuse.reason, "rate limit");
  assert.equal(abuse.pausedUntil, hub.clock + 60000);
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

test("when GitHub cannot be reached the last list is used, for two hours at most", async () => {
  const hub = github(() => listOf("alice"));
  const listedAt = hub.clock;
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

  hub.clock = listedAt + 2 * HOUR - 1;
  const late = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(late.source, "last");

  hub.clock = listedAt + 2 * HOUR;
  const stale = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(stale.source, "none");
  assert.equal(stale.collaborators, null);

  const never = await collaborators.list("udx/api", "secret", hub.options);
  assert.equal(never.source, "none");
  assert.equal(never.reason, "connect ETIMEDOUT");
});

test("forbidden and bad credentials are answers too: the earlier list is dropped", async () => {
  for (const [status, message] of [[403, "Must have admin rights to Repository."], [401, "Bad credentials"]]) {
    collaborators.reset();
    const hub = github(() => listOf("alice"));
    await collaborators.list("udx/site", "secret", hub.options);

    hub.clock += TTL;
    hub.answer = () => refusal(status, { "x-ratelimit-remaining": "4000" }, message);
    const refused = await collaborators.list("udx/site", "secret", hub.options);
    assert.equal(refused.source, "none", String(status));
    assert.equal(refused.reason, "forbidden", String(status));
    assert.equal(refused.collaborators, null, String(status));

    // Remembered, and no pause: another repository is asked.
    const again = await collaborators.list("udx/site", "secret", hub.options);
    assert.equal(again.source, "cache", String(status));
    assert.equal(again.collaborators, null, String(status));
    await collaborators.list("udx/api", "secret", hub.options);
    assert.equal(hub.asked.length, 3, String(status));
  }
});

test("a refusal about the repository that also uses up the limit is not taken for the rate limit", async () => {
  for (const [status, message, reason] of [
    [403, "Must have push access to view repository collaborators.", "forbidden"],
    [404, "Not Found", "not found"],
  ]) {
    collaborators.reset();
    const hub = github(() => listOf("alice"));
    await collaborators.list("udx/site", "secret", hub.options);

    hub.clock += TTL;
    const reset = hub.clock + 30 * 60 * 1000;
    hub.answer = () =>
      refusal(
        status,
        { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset / 1000) },
        message
      );
    const refused = await collaborators.list("udx/site", "secret", hub.options);
    assert.equal(refused.source, "none", message);
    assert.equal(refused.reason, reason, message);
    assert.equal(refused.collaborators, null, message);

    // Nothing is left of the limit all the same: the next repository waits.
    const next = await collaborators.list("udx/api", "secret", hub.options);
    assert.equal(next.reason, "rate limit", message);
    assert.equal(next.pausedUntil, reset, message);
    assert.equal(hub.asked.length, 2, message);
  }

  // A refusal that gives no reason, with nothing left, is taken for the limit.
  collaborators.reset();
  const hub = github(() => listOf("alice"));
  await collaborators.list("udx/site", "secret", hub.options);
  hub.clock += TTL;
  hub.answer = () => refusal(403, { "x-ratelimit-remaining": "0" });
  const unexplained = await collaborators.list("udx/site", "secret", hub.options);
  assert.equal(unexplained.source, "last");
  assert.equal(unexplained.reason, "rate limit");
});

test("lookups under way at the same time: the longer pause stands and the newer list is used", async () => {
  const clock = 1800000000000;
  const waiting = [];
  const options = {
    now: () => clock,
    request: () => new Promise((resolve, reject) => waiting.push({ resolve, reject })),
  };
  const limit = (headers) => refusal(403, headers, "API rate limit exceeded");

  // Two repositories asked at once: one is told to wait half an hour, the
  // other a minute. The half hour stands.
  const first = collaborators.list("udx/site", "secret", options);
  const second = collaborators.list("udx/api", "secret", options);
  const reset = clock + 30 * 60 * 1000;
  waiting[0].reject(limit({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset / 1000) }));
  await first;
  waiting[1].reject(limit({ "retry-after": "60" }));
  assert.equal((await second).pausedUntil, reset);
  assert.equal((await collaborators.list("udx/www", "secret", options)).pausedUntil, reset);

  // One repository asked twice at once: the first is answered with a new list,
  // the second is refused. The refused one goes by the new list.
  collaborators.reset();
  waiting.length = 0;
  const answered = collaborators.list("udx/site", "secret", options);
  const refused = collaborators.list("udx/site", "secret", options);
  waiting[0].resolve(listOf("bob"));
  await answered;
  waiting[1].reject(limit({ "x-ratelimit-remaining": "0" }));
  const fallback = await refused;
  assert.equal(fallback.source, "last");
  assert.deepEqual(fallback.collaborators.map((user) => user.login), ["bob"]);
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

function cluster(pods, repositories, keysOf = (login) => login + "-key") {
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
      // A promise lets the test hold the response back; nothing means the
      // user has no public key.
      return Promise.resolve(keysOf(user[1])).then((key) => ({
        status: 200,
        headers: {},
        data: key ? "ssh-ed25519 AAAA " + key + "\n" : "",
      }));
    }
    throw new Error("unexpected request: " + options.url);
  };
}

function refresh(directory) {
  return new Promise((resolve, reject) => {
    // A refresh that never calls back fails its test instead of hanging it.
    setTimeout(() => reject(new Error("the refresh did not finish")), 5000).unref();
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

function asked(hostname = "api.github.com") {
  return requested.filter((url) => new URL(url).hostname === hostname).length;
}

// A scratch directory for key files, and the environment a refresh reads.
function gateway(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "docker-sftp-test-"));
  fs.mkdirSync(path.join(directory, "keys"));
  const controllerKeysPath = process.env.CONTROLLER_KEYS_PATH;
  delete process.env.CONTROLLER_KEYS_PATH;
  process.env.NODE_PORT = "0";
  requested.length = 0;
  t.after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    if (controllerKeysPath !== undefined) {
      process.env.CONTROLLER_KEYS_PATH = controllerKeysPath;
    }
    delete process.env.NODE_PORT;
  });
  return directory;
}

test("a key refresh asks GitHub once per repository, whatever the number of applications", async (t) => {
  const directory = gateway(t);

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
  assert.equal(asked(), 4, "the two requests under way are refused");
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

test("a remembered list goes with the keys remembered with it", async (t) => {
  const directory = gateway(t);
  let pods = [pod("site-develop-1", "www.example.com.develop", "udx/www.example.com")];
  let holder = "alice-key";
  respond = cluster(
    () => pods,
    () => ({
      status: 200,
      headers: { "x-ratelimit-remaining": "4000" },
      data: [{ login: "alice", role_name: "admin" }],
    }),
    () => holder
  );

  await refresh(directory);
  assert.match(await keyFile(directory, "www.example.com.develop", /alice-key/), /alice-key/);
  assert.equal(asked("github.com"), 1);

  // The login changes hands and a pod is replaced, inside the ten minutes. The
  // list is the remembered one, and so are the keys: github.com is not asked
  // who holds the login today.
  holder = "somebody-else-key";
  pods = [pod("site-develop-2", "www.example.com.develop", "udx/www.example.com")];
  await refresh(directory);
  const remembered = await keyFile(directory, "www.example.com.develop", /site-develop-2/);
  assert.match(remembered, /site-develop-2/);
  assert.match(remembered, /alice-key/);
  assert.doesNotMatch(remembered, /somebody-else-key/);
  assert.equal(asked("github.com"), 1);

  // A list GitHub gives now takes the keys as they are now.
  process.env.COLLABORATORS_CACHE_TTL_MS = "0";
  pods = [pod("site-develop-3", "www.example.com.develop", "udx/www.example.com")];
  await refresh(directory);
  const current = await keyFile(directory, "www.example.com.develop", /site-develop-3/);
  assert.match(current, /somebody-else-key/);
  assert.doesNotMatch(current, /alice-key/);
  assert.equal(asked("github.com"), 2);
});

test("keys that could not be fetched are fetched at the next refresh, with the list asked again", async (t) => {
  const directory = gateway(t);
  let pods = [pod("site-develop-1", "www.example.com.develop", "udx/www.example.com")];
  let reachable = false;
  respond = cluster(
    () => pods,
    () => ({
      status: 200,
      headers: { "x-ratelimit-remaining": "4000" },
      data: [{ login: "alice", role_name: "admin" }, { login: "bob", role_name: "write" }],
    }),
    (login) => {
      if (login === "alice" && !reachable) {
        throw new Error("connect ETIMEDOUT");
      }
      return login + "-key";
    }
  );

  await refresh(directory);
  const without = await keyFile(directory, "www.example.com.develop", /bob-key/);
  assert.match(without, /bob-key/);
  assert.doesNotMatch(without, /alice-key/);
  assert.equal(asked("github.com"), 2);

  // Inside the ten minutes. The remembered list has no keys for alice, and
  // keys are only fetched for a list GitHub gives in the same refresh: the
  // repository is asked again, and the keys of its users with it.
  reachable = true;
  pods = [pod("site-develop-2", "www.example.com.develop", "udx/www.example.com")];
  await refresh(directory);
  const withAlice = await keyFile(directory, "www.example.com.develop", /alice-key/);
  assert.match(withAlice, /tenant\s+site-develop-2\s+-c\s+site;alice/);
  assert.match(withAlice, /bob-key/);
  assert.equal(asked(), 2);
  assert.equal(asked("github.com"), 4);

  // Nothing is missing any more: the next refresh asks nothing.
  pods = [pod("site-develop-3", "www.example.com.develop", "udx/www.example.com")];
  await refresh(directory);
  assert.match(await keyFile(directory, "www.example.com.develop", /site-develop-3/), /alice-key/);
  assert.equal(asked(), 2);
  assert.equal(asked("github.com"), 4);
});

test("a user gets keys when a new application of a remembered repository allows the role", async (t) => {
  const directory = gateway(t);
  let pods = [pod("site-production-1", "www.example.com.production", "udx/www.example.com")];
  respond = cluster(
    () => pods,
    () => ({
      status: 200,
      headers: { "x-ratelimit-remaining": "4000" },
      data: [{ login: "carol", role_name: "admin" }, { login: "alice", role_name: "write" }],
    })
  );

  // Production takes admins only: alice has no access yet, and no keys of hers are fetched.
  await refresh(directory);
  const production = await keyFile(directory, "www.example.com.production", /carol-key/);
  assert.match(production, /carol-key/);
  assert.doesNotMatch(production, /alice-key/);
  assert.equal(asked("github.com"), 1);

  // A develop environment of the same repository is deployed inside the ten
  // minutes. Alice has access now and the remembered list has no keys for
  // her: the repository is asked again, and the keys with it.
  pods = [...pods, pod("site-develop-1", "www.example.com.develop", "udx/www.example.com")];
  await refresh(directory);
  const develop = await keyFile(directory, "www.example.com.develop", /alice-key/);
  assert.match(develop, /carol-key/);
  assert.match(develop, /alice-key/);
  assert.equal(asked(), 2);
  assert.equal(asked("github.com"), 3);
});

test("keys that can never be fetched cost one more lookup, not one at every refresh", async (t) => {
  const directory = gateway(t);
  let pods = [pod("site-develop-1", "www.example.com.develop", "udx/www.example.com")];
  respond = cluster(
    () => pods,
    () => ({
      status: 200,
      headers: { "x-ratelimit-remaining": "4000" },
      data: [{ login: "alice", role_name: "admin" }, { login: "bob", role_name: "write" }],
    }),
    (login) => {
      if (login === "alice") {
        throw new Error("Request failed with status code 404");
      }
      return login + "-key";
    }
  );
  const next = async (name) => {
    pods = [pod(name, "www.example.com.develop", "udx/www.example.com")];
    await refresh(directory);
    const file = await keyFile(directory, "www.example.com.develop", new RegExp(name));
    assert.match(file, /bob-key/);
    assert.doesNotMatch(file, /alice/);
  };

  await refresh(directory);
  assert.equal(asked(), 1);

  // The repository is asked again once, and alice's keys fail again.
  await next("site-develop-2");
  assert.equal(asked(), 2);

  // After that the list is left alone until it expires.
  await next("site-develop-3");
  await next("site-develop-4");
  assert.equal(asked(), 2);
});

test("when a repository is asked again, its new list decides", async (t) => {
  const directory = gateway(t);
  let pods = [pod("site-production-1", "www.example.com.production", "udx/www.example.com")];
  let list = [{ login: "carol", role_name: "admin" }, { login: "alice", role_name: "write" }];
  respond = cluster(
    () => pods,
    () => ({ status: 200, headers: { "x-ratelimit-remaining": "4000" }, data: list })
  );

  await refresh(directory);

  // Alice is removed from the repository, and a develop environment is
  // deployed inside the ten minutes. The remembered list would give her
  // access and has no keys for her, so the repository is asked again: she is
  // not on the list any more and gets nothing.
  list = [{ login: "carol", role_name: "admin" }];
  pods = [...pods, pod("site-develop-1", "www.example.com.develop", "udx/www.example.com")];
  const data = await refresh(directory);
  assert.deepEqual(Object.keys(data.users), ["carol"]);
  assert.deepEqual(Object.keys(data.applications["www.example.com.develop"].users), ["carol"]);
  const develop = await keyFile(directory, "www.example.com.develop", /carol-key/);
  assert.match(develop, /carol-key/);
  assert.doesNotMatch(develop, /alice/);
  assert.equal(asked(), 2);
});

test("with the rate limit spent, a user whose keys are not with the remembered list gets none", async (t) => {
  const directory = gateway(t);
  let pods = [pod("site-production-1", "www.example.com.production", "udx/www.example.com")];
  let limited = false;
  respond = cluster(
    () => pods,
    () =>
      limited
        ? refusal(403, { "x-ratelimit-remaining": "0" }, "API rate limit exceeded")
        : {
            status: 200,
            headers: { "x-ratelimit-remaining": "4000" },
            data: [{ login: "carol", role_name: "admin" }, { login: "alice", role_name: "write" }],
          }
  );

  await refresh(directory);
  assert.equal(asked("github.com"), 1);

  // The develop environment arrives while GitHub refuses requests. The list
  // cannot be asked again, so nobody's keys are fetched: carol's are with the
  // remembered list, alice's are not, and github.com is not asked who holds
  // her login today.
  limited = true;
  pods = [...pods, pod("site-develop-1", "www.example.com.develop", "udx/www.example.com")];
  const data = await refresh(directory);
  assert.deepEqual(Object.keys(data.users).sort(), ["alice", "carol"]);
  const develop = await keyFile(directory, "www.example.com.develop", /carol-key/);
  assert.match(develop, /carol-key/);
  assert.doesNotMatch(develop, /alice/);
  assert.equal(asked(), 2, "one refused request");
  assert.equal(asked("github.com"), 1);
});

test("a remembered list keeps its keys when another repository's new list names the same login", async (t) => {
  const directory = gateway(t);
  let pods = [pod("a-production-1", "a.example.com.production", "udx/tenant-a")];
  let holder = "alice-key";
  respond = cluster(
    () => pods,
    () => ({
      status: 200,
      headers: { "x-ratelimit-remaining": "4000" },
      data: [{ login: "alice", role_name: "admin" }],
    }),
    () => holder
  );

  await refresh(directory);
  assert.match(await keyFile(directory, "a.example.com.production", /alice-key/), /alice-key/);

  // The login changes hands. Its new holder is a collaborator of another
  // repository, which is deployed now; a pod of the first is replaced too.
  holder = "new-holder-key";
  pods = [
    pod("a-production-2", "a.example.com.production", "udx/tenant-a"),
    pod("b-production-1", "b.example.com.production", "udx/tenant-b"),
  ];
  await refresh(directory);
  const first = await keyFile(directory, "a.example.com.production", /a-production-2/);
  assert.match(first, /a-production-2/);
  assert.match(first, /alice-key/);
  assert.doesNotMatch(first, /new-holder-key/);
  const other = await keyFile(directory, "b.example.com.production", /new-holder-key/);
  assert.match(other, /new-holder-key/);
  assert.doesNotMatch(other, /alice-key/);
});

test("a key a user adds arrives with the next list, also for a user who had none", async (t) => {
  const directory = gateway(t);
  let pods = [pod("site-develop-1", "www.example.com.develop", "udx/www.example.com")];
  let added = false;
  respond = cluster(
    () => pods,
    () => ({
      status: 200,
      headers: { "x-ratelimit-remaining": "4000" },
      data: [{ login: "alice", role_name: "admin" }, { login: "bob", role_name: "write" }],
    }),
    (login) => (login === "alice" && !added ? null : login + "-key")
  );

  await refresh(directory);
  const before = await keyFile(directory, "www.example.com.develop", /bob-key/);
  assert.match(before, /bob-key/);
  assert.doesNotMatch(before, /alice/);

  // She adds her key on GitHub. Inside the ten minutes the remembered list
  // goes with what was fetched for it, which for her was no key: github.com
  // is not asked again, about her or anyone.
  added = true;
  pods = [pod("site-develop-2", "www.example.com.develop", "udx/www.example.com")];
  await refresh(directory);
  const remembered = await keyFile(directory, "www.example.com.develop", /site-develop-2/);
  assert.match(remembered, /bob-key/);
  assert.doesNotMatch(remembered, /alice/);
  assert.equal(asked(), 1);
  assert.equal(asked("github.com"), 2);

  // The next list brings her key.
  process.env.COLLABORATORS_CACHE_TTL_MS = "0";
  pods = [pod("site-develop-3", "www.example.com.develop", "udx/www.example.com")];
  await refresh(directory);
  const listed = await keyFile(directory, "www.example.com.develop", /alice-key/);
  assert.match(listed, /alice-key/);
  assert.match(listed, /bob-key/);
});

test("a refresh writes the keys it fetched, whatever another refresh does meanwhile", async (t) => {
  const directory = gateway(t);
  process.env.COLLABORATORS_CACHE_TTL_MS = "0";
  const held = [];
  let bobRequests = 0;
  respond = cluster(
    () => [pod("site-develop-1", "www.example.com.develop", "udx/www.example.com")],
    () => ({
      status: 200,
      headers: { "x-ratelimit-remaining": "4000" },
      data: [{ login: "alice", role_name: "admin" }, { login: "bob", role_name: "admin" }],
    }),
    (login) => {
      // The first refresh gets alice's keys at once and waits for bob's. Every
      // request after that, the second refresh's, is held for good.
      if (login === "alice" && asked() === 1) {
        return "alice-key";
      }
      if (login === "bob") {
        bobRequests += 1;
      }
      return new Promise((resolve) => held.push({ login, resolve }));
    }
  );
  const until = async (condition) => {
    for (let attempt = 0; attempt < 200 && !condition(); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.ok(condition(), "the refreshes did not get that far");
  };

  const first = refresh(directory);
  await until(() => bobRequests === 1);

  // A second refresh asks the list again, which replaces what is remembered,
  // and is still waiting for keys when the first one finishes.
  refresh(directory).catch(() => {});
  await until(() => asked() === 2 && bobRequests === 2);

  held.find((request) => request.login === "bob").resolve("bob-key");
  await first;
  const written = await keyFile(directory, "www.example.com.develop", /bob-key/);
  assert.match(written, /alice-key/);
  assert.match(written, /bob-key/);
});

test("a list entry that cannot be read costs its application its list, not the others their refresh", async (t) => {
  const directory = gateway(t);
  respond = cluster(
    () => [
      pod("broken-1", "broken.example.com.develop", "udx/broken.example.com"),
      pod("site-1", "www.example.com.develop", "udx/www.example.com"),
    ],
    (repository) => ({
      status: 200,
      headers: { "x-ratelimit-remaining": "4000" },
      data:
        repository === "udx/broken.example.com"
          ? [null, { login: "alice", role_name: "admin" }]
          : // A login that is also the name of something every object has.
            [{ login: "constructor", role_name: "admin" }, { login: "carol", role_name: "write" }],
    })
  );

  const data = await refresh(directory);
  assert.deepEqual(Object.keys(data.users).sort(), ["carol", "constructor"]);
  const site = await keyFile(directory, "www.example.com.develop", /carol-key/);
  assert.match(site, /constructor-key/);
  assert.match(site, /carol-key/);
  assert.equal(await keyFile(directory, "broken.example.com.develop", /alice-key/), "");
});

test("a refresh finishes when a lookup fails in a way it never should", async (t) => {
  const directory = gateway(t);
  respond = cluster(
    () => [pod("site-1", "www.example.com.develop", "udx/www.example.com")],
    () => listOf("alice")
  );
  const list = collaborators.list;
  collaborators.list = () => Promise.reject(new Error("unforeseen"));
  t.after(() => {
    collaborators.list = list;
  });

  const data = await refresh(directory);
  assert.deepEqual(Object.keys(data.users), []);
});
