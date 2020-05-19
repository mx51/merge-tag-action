const core = require('@actions/core');
const github = require('@actions/github');

const MAJOR_RE = /#major|\[\s?major\s?\]/gi
const MINOR_RE = /#minor|\[\s?minor\s?\]/gi
const PATCH_RE = /#patch|\[\s?patch\s?\]/gi

const VERSION_REGEX = /v(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/

async function run() {
  const client = new github.GitHub(core.getInput('repo-token'));

  const latestRelease = client.repos.getLatestRelease({
    owner: ref.owner,
    repo: ref.repo,
  });
  log("latestRelease", latestRelease);

  const changeType = await getChangeTypeForContext(client);
  if (changeType !== "") {
    // if just merged, tag and release
    if (github.context.payload.action === "closed" && github.context.payload.pull_request.merged === true) {
      return tagRelease(client, changeType);
    }
    // otherwise update the title.
    return updatePRTitle(client, changeType);
  } else {
    throw new Error("Failed to identify a valid change type. Check the workflow logs for more info.");
  }
}

function updatePRTitle(client, changeType) {
  const ref = getPullRef();
  // get the existing title and remove any tags
  let title = github.context.payload.pull_request.title;
  title = title.replace(MAJOR_RE, '');
  title = title.replace(MINOR_RE, '');
  title = title.replace(PATCH_RE, '');
  // prepend the new tag
  title = `[${changeType}] ${title.trim()}`;

  return client.pulls.update({
    ...ref,
    title: title,
  });
}

function tagRelease(client, changeType) {
  const ref = getPullRef();

  const latestRelease = client.repos.getLatestRelease({
    owner: ref.owner,
    repo: ref.repo,
  });
  log("latestRelease", latestRelease);

  const previousTag = 'v1.2.3';
  const tag = getNextTag(previousTag, changeType);

  return client.repos.createRelease({
    owner: ref.owner,
    repo: ref.repo,
    tag_name: tag,
  });
}

function getNextTag(previousTag, changeType) {
  const version = previousTag.match(VERSION_REGEX).groups;
  switch (changeType) {
    case "major":
      version.major = Number(version.major) + 1;
      break;
    case "minor":
      version.minor = Number(version.minor) + 1;
      break;
    case "patch":
      version.patch = Number(version.patch) + 1;
      break;
    default:
      throw new Error("Attempted to bump with invalid changeType: " + changeType);
  }
  return `v${version.major}.${version.minor}.${version.patch}`;
}

async function getChangeTypeForContext(client) {
  const titleTag = getChangeTypeForString(github.context.payload.pull_request.title);
  if (titleTag !== "") {
    return titleTag;
  }
  const bodyTag = getChangeTypeForString(github.context.payload.pull_request.body);
  if (bodyTag !== "") {
    return bodyTag;
  }

  const pullRef = getPullRef();
  const commits = await client.pulls.listCommits(pullRef);
  for (let commit of commits.data.reverse()) {
    const tag = getChangeTypeForString(commit.commit.message);
    if (tag !== "") {
      return tag;
    }
  }
  return "";
}


function getChangeTypeForString(string) {
  const major = countOccurrences(string, MAJOR_RE);
  if (major > 0) {
    return "major";
  }
  const minor = countOccurrences(string, MINOR_RE);
  if (minor > 0) {
    return "minor"
  }
  const patch = countOccurrences(string, PATCH_RE);
  if (patch > 0) {
    return "patch"
  }

  return ""
}

function getPullRef() {
  try {
    const repoFullName = github.context.payload.repository.full_name;
    const [owner, repo] = repoFullName.split("/");
    const pullNumber = github.context.payload.pull_request.number;

    return {
      owner,
      repo,
      pull_number: pullNumber,
    }
  }
  catch (e) {
    console.trace([github.context, e])
  }
}

// quick and easy way to count occurrences, is not particularly
// memory friendly for long strings
function countOccurrences(string, regex) {
  return (string.match(regex) || []).length
}



function log(name, data) {
  const s = JSON.stringify(data, undefined, 2)
  console.log(`${name}: ${s}`)
}


run()
  .catch(error => {
    core.setFailed(error.message);
  });
