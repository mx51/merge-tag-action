const core = require('@actions/core');
const github = require('@actions/github');
const { graphql } = require('@octokit/graphql');
const semver = require('semver');

const MAJOR_RE = /#major|\[\s?major\s?\]/gi
const MINOR_RE = /#minor|\[\s?minor\s?\]/gi
const PATCH_RE = /#patch|\[\s?patch\s?\]/gi

async function run() {
  const client = new github.GitHub(core.getInput('repo-token'));
  const ref = getPullRef();

  const changeType = await getChangeTypeForContext(client);
  if (changeType !== "") {
    const nextVersion = await getNewVersionTag(changeType);
    // if just merged, tag and release
    if (github.context.payload.action === "closed" && github.context.payload.pull_request.merged === true) {
      return client.repos.createRelease({
        owner: ref.owner,
        repo: ref.repo,
        tag_name: nextVersion,
      });
    }
    // otherwise update the title, and make a comment.
    return Promise.all([
      updatePRTitle(client, changeType),
      createPRCommentOnce(client, `After merging this PR, https://github.com/${ref.owner}/${ref.repo} will be version \`${nextVersion}\`. Note this may no longer be correct if another PR is merged.`),
    ]);
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

async function getNewVersionTag(changeType) {
  const ref = getPullRef();
  const latestTag = await getLatestTag(ref.owner, ref.repo);
  return 'v' + semver.inc(latestTag, changeType);
}

function createPRCommentOnce(client, message) {
  const ref = getPullRef();

  return client.issues.listComments({
    owner: ref.owner,
    repo: ref.repo,
    issue_number: ref.pull_number,
    per_page: 100,
  }).then(res => {
    // only create the comment if it does not exist already
    if (res.data.filter(comment => comment.body === message).length === 0) {
      return client.issues.createComment({
        owner: ref.owner,
        repo: ref.repo,
        issue_number: ref.pull_number,
        body: message,
      });
    };
  });
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

async function getLatestTag(owner, repo) {
  const query = `
query latestTags($owner: String!, $repo: String!, $num: Int = 1) {
  repository(owner:$owner, name:$repo) {
    refs(refPrefix: "refs/tags/", first:$num , orderBy: {field: TAG_COMMIT_DATE, direction: DESC}) {
      edges {
        node {
          name
          target {
            oid
            ... on Tag {
              message
              commitUrl
              tagger {
                name
                email
                date
              }
            }
          }
        }
      }
    }
  }
}`;

  const result = await graphql(query, {
    owner,
    repo,
    headers: {
      authorization: `token ${core.getInput('repo-token')}`,
    }
  });
  return result.repository.refs.edges[0].node.name;
}

function getChangeTypeForString(string) {
  if (typeof string !== "string") {
    core.warning(`called getChangeTypeForString with non string: ${string}`)
    return ""
  }
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
  const repoFullName = github.context.payload.repository.full_name;
  const [owner, repo] = repoFullName.split("/");
  const pullNumber = github.context.payload.pull_request.number;

  return {
    owner,
    repo,
    pull_number: pullNumber,
  }
}

// quick and easy way to count occurrences, is not particularly
// memory friendly for long strings
function countOccurrences(string, regex) {
  return (string.match(regex) || []).length
}

run()
  .catch(error => {
    core.info(error.stack);
    core.setFailed(error.message);
  });
