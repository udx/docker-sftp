/**
 * Collaborators of a repository, as GitHub lists them.
 *
 * A key refresh needs them for every application, and it runs whenever the set
 * of pods in the cluster changes, which on a busy cluster is most minutes. The
 * answer is the same for every application of a repository and rarely changes,
 * so it is asked once per repository and remembered for a while. When GitHub
 * reports the rate limit as spent, nothing is asked until the limit resets;
 * until then the last list GitHub gave for a repository is used.
 *
 * What is remembered lives in this process only. The API server and the
 * Firebase consumer are separate processes and each remembers on its own.
 */
const axios = require("axios");

const DEFAULT_TTL_MS = 600000;

// GitHub's rate limit windows are an hour long. A pause is never longer, so a
// reset time that cannot be right does not silence the lookups for good.
const LONGEST_PAUSE_MS = 60 * 60 * 1000;

// Without a reset time GitHub asks for at least a minute before a retry.
const DEFAULT_PAUSE_MS = 60 * 1000;

// An answer is never remembered for longer than a pause can last.
const LONGEST_TTL_MS = LONGEST_PAUSE_MS;

// While GitHub cannot be asked, a list it gave earlier is used for at most this
// long: the time an answer may be remembered plus one full pause. Nobody is
// added to a key file on a list older than that.
const LAST_LIST_LIMIT_MS = LONGEST_TTL_MS + LONGEST_PAUSE_MS;

// "owner/name" -> { collaborators, reason, fetchedAt, keys }. `collaborators`
// is the list, or null when GitHub answered that the repository cannot be read.
// `keys` holds the public keys fetched for the logins of this list, by login.
const answers = new Map();

// GitHub is not asked before this moment (epoch milliseconds).
let pausedUntil = 0;

function ttlMs() {
  const configured = String(process.env.COLLABORATORS_CACHE_TTL_MS || "").trim();
  // Digits only: "10m" is not ten milliseconds.
  if (!/^\d+$/.test(configured)) {
    return DEFAULT_TTL_MS;
  }
  return Math.min(Number(configured), LONGEST_TTL_MS);
}

function header(response, name) {
  const headers = (response && response.headers) || {};
  return headers[name];
}

/**
 * Whether a refusal is about the rate limit and not about the repository. A
 * refused request that uses up the limit is still judged by what it says: "must
 * have push access" with nothing left is about the repository.
 */
function refusedForLimit(response) {
  if (response.status === 429) {
    return true;
  }
  if (response.status !== 403) {
    return false;
  }
  if (header(response, "retry-after") !== undefined) {
    return true;
  }
  const message = response.data && response.data.message;
  if (typeof message === "string" && message) {
    // "abuse detection" is what GitHub called its secondary limits before.
    return /rate limit|abuse/i.test(message);
  }
  // No reason given and nothing left of the limit.
  return header(response, "x-ratelimit-remaining") === "0";
}

/**
 * The moment until which GitHub is not to be asked, or 0 when the response
 * gives no reason to wait. A response that leaves no requests counts whatever
 * its status: the next request would be refused.
 */
function pauseFrom(response, now) {
  if (!response) {
    return 0;
  }

  const spent = header(response, "x-ratelimit-remaining") === "0";
  const limited = refusedForLimit(response);
  if (!spent && !limited) {
    return 0;
  }

  const retryAfter = Number.parseInt(header(response, "retry-after"), 10);
  const reset = Number.parseInt(header(response, "x-ratelimit-reset"), 10);

  let until = 0;
  if (limited && Number.isInteger(retryAfter) && retryAfter >= 0) {
    until = now + retryAfter * 1000;
  } else if (spent && Number.isInteger(reset)) {
    until = reset * 1000;
  }
  if (until <= now) {
    until = now + DEFAULT_PAUSE_MS;
  }
  return Math.min(until, now + LONGEST_PAUSE_MS);
}

/**
 * Lists the collaborators of a repository ("owner/name").
 *
 * Resolves to { collaborators, source, reason, remaining, pausedUntil }:
 *   source "github"  asked now; `remaining` is what is left of the rate limit
 *   source "cache"   the answer from within the last COLLABORATORS_CACHE_TTL_MS
 *   source "last"    GitHub could not be asked or failed; its last list is used
 *   source "none"    there is no list to go by
 * `collaborators` is null when there is no list; `reason` then says why:
 * "rate limit" (with `pausedUntil`), "not found", "forbidden" or the error.
 * With `fresh` the remembered answer is passed over and GitHub is asked, unless
 * the rate limit is spent. It never rejects.
 */
async function list(
  repository,
  token,
  { request = axios, now = Date.now, fresh = false } = {}
) {
  const known = answers.get(repository);

  if (!fresh && known && now() - known.fetchedAt < ttlMs()) {
    return {
      collaborators: known.collaborators,
      source: "cache",
      reason: known.reason,
    };
  }

  // Read when it is needed, not before the request: a lookup of the same
  // repository that ran meanwhile may have a newer answer.
  const lastList = (reason, until) => {
    const last = answers.get(repository);
    return last &&
      last.collaborators &&
      now() - last.fetchedAt < LAST_LIST_LIMIT_MS
      ? {
          collaborators: last.collaborators,
          source: "last",
          reason,
          pausedUntil: until,
        }
      : { collaborators: null, source: "none", reason, pausedUntil: until };
  };

  if (now() < pausedUntil) {
    return lastList("rate limit", pausedUntil);
  }

  let response;
  try {
    response = await request({
      method: "get",
      url: "https://api.github.com/repos/" + repository + "/collaborators",
      headers: {
        Authorization: "token " + token,
      },
    });
  } catch (error) {
    const refusal = error && error.response;
    const status = refusal && refusal.status;
    const pause = pauseFrom(refusal, now());
    if (pause) {
      pausedUntil = Math.max(pausedUntil, pause);
    }
    if (refusal && refusedForLimit(refusal)) {
      return lastList("rate limit", pausedUntil);
    }

    // GitHub answered that the repository cannot be read with this token. That
    // is an answer, not an outage: the gateway stops going by an earlier list,
    // and the answer is remembered like any other.
    if (status === 401 || status === 403 || status === 404) {
      const reason = status === 404 ? "not found" : "forbidden";
      answers.set(repository, { collaborators: null, reason, fetchedAt: now() });
      return { collaborators: null, source: "none", reason };
    }

    return lastList(String((error && error.message) || error));
  }

  const pause = pauseFrom(response, now());
  if (pause) {
    pausedUntil = Math.max(pausedUntil, pause);
  }

  if (!response || !Array.isArray(response.data)) {
    return lastList("unexpected response");
  }

  answers.set(repository, {
    collaborators: response.data,
    fetchedAt: now(),
    keys: new Map(),
  });
  return {
    collaborators: response.data,
    source: "github",
    remaining: header(response, "x-ratelimit-remaining"),
  };
}

/**
 * A user's public keys are kept with the list that names the user, and go when
 * that list is replaced by a new answer. A refresh that goes by a remembered
 * list writes the keys fetched for that list: the login may have changed hands
 * since, and its new holder is not the collaborator GitHub listed. Keys are
 * fetched only for a list GitHub gave in the same refresh; where a remembered
 * list has none for a user it gives access to, the repository is asked again
 * (`fresh`) and the keys with it.
 */
function rememberKeys(repository, login, publicKeys) {
  const answer = answers.get(repository);
  if (answer && answer.collaborators) {
    answer.keys.set(login, publicKeys);
  }
}

function rememberedKeys(repository, login) {
  const answer = answers.get(repository);
  return answer && answer.keys ? answer.keys.get(login) : undefined;
}

/**
 * Forgets every answer, with its keys, and any pause. For tests.
 */
function reset() {
  answers.clear();
  pausedUntil = 0;
}

module.exports = { list, rememberKeys, rememberedKeys, reset };
