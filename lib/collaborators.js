/**
 * Collaborators of a repository, as GitHub lists them.
 *
 * A key refresh needs them for every application, and it runs whenever the set
 * of pods in the cluster changes, which on a busy cluster is most minutes. The
 * answer is the same for every application of a repository and rarely changes,
 * so it is asked once per repository and remembered for a while. When GitHub
 * reports the rate limit as spent, nothing is asked until the limit resets;
 * until then the last list GitHub gave for a repository is used.
 */
const axios = require("axios");

const DEFAULT_TTL_MS = 600000;

// A remembered list older than this is not used, even while GitHub cannot be
// asked: after a day without confirmation nobody is granted access on it.
const LAST_LIST_LIMIT_MS = 24 * 60 * 60 * 1000;

// GitHub's rate limit windows are an hour long. A pause is never longer, so a
// reset time that cannot be right does not silence the lookups for good.
const LONGEST_PAUSE_MS = 60 * 60 * 1000;

// Without a reset time GitHub asks for at least a minute before a retry.
const DEFAULT_PAUSE_MS = 60 * 1000;

// "owner/name" -> { collaborators, reason, fetchedAt }. `collaborators` is the
// list, or null when GitHub answered that the repository cannot be read.
const answers = new Map();

// GitHub is not asked before this moment (epoch milliseconds).
let pausedUntil = 0;

function ttlMs() {
  const configured = Number.parseInt(
    process.env.COLLABORATORS_CACHE_TTL_MS || "",
    10
  );
  return Number.isInteger(configured) && configured >= 0
    ? configured
    : DEFAULT_TTL_MS;
}

function header(response, name) {
  const headers = (response && response.headers) || {};
  return headers[name];
}

/**
 * The moment until which GitHub asks not to be called, or 0 when the response
 * says nothing of the kind. A response that leaves no requests counts whatever
 * its status: the next request would be refused.
 */
function pauseFrom(response, now) {
  if (!response) {
    return 0;
  }

  const refused = response.status === 403 || response.status === 429;
  const spent = header(response, "x-ratelimit-remaining") === "0";
  const retryAfter = Number.parseInt(header(response, "retry-after"), 10);
  const reset = Number.parseInt(header(response, "x-ratelimit-reset"), 10);
  const message = String((response.data && response.data.message) || "");
  const limited =
    refused && (Number.isInteger(retryAfter) || /rate limit/i.test(message));

  if (!spent && !limited) {
    return 0;
  }

  let until = 0;
  if (refused && Number.isInteger(retryAfter) && retryAfter >= 0) {
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
 * It never rejects.
 */
async function list(
  repository,
  token,
  { request = axios, now = Date.now } = {}
) {
  const known = answers.get(repository);
  const age = known ? now() - known.fetchedAt : Infinity;

  if (known && age < ttlMs()) {
    return {
      collaborators: known.collaborators,
      source: "cache",
      reason: known.reason,
    };
  }

  const lastList = (reason, until) =>
    known && known.collaborators && age < LAST_LIST_LIMIT_MS
      ? {
          collaborators: known.collaborators,
          source: "last",
          reason,
          pausedUntil: until,
        }
      : { collaborators: null, source: "none", reason, pausedUntil: until };

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
    if (pause && (status === 403 || status === 429)) {
      return lastList("rate limit", pausedUntil);
    }

    // GitHub answered that the repository cannot be read with this token. That
    // is an answer, not an outage: an earlier list does not stand, and the
    // answer is remembered like any other.
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

  answers.set(repository, { collaborators: response.data, fetchedAt: now() });
  return {
    collaborators: response.data,
    source: "github",
    remaining: header(response, "x-ratelimit-remaining"),
  };
}

/**
 * Forgets every answer and any pause. For tests.
 */
function reset() {
  answers.clear();
  pausedUntil = 0;
}

module.exports = { list, reset };
