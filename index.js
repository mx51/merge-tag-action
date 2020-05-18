const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const client = new github.GitHub(core.getInput('repo-token'));
    const pullRef = getPullRef();

    const changeType = await getChangeTypeForContext(client);

    oktokit.issues.udate({
      owner: pullRef.owner,
      repo: pullRef.repo,
      issue_number: pullRef.pull_number,
      labels: [changeType],
    })


  } catch (error) {

    //const comments = await client.pulls.listComments(pullRef);
    //log(comments, "comments");

    //const commits = await client.pulls.listCommits(pullRef);
    //log(commits, "commits");

    // Get the JSON webhook payload for the event that triggered the workflow
    console.log(`merged: ${github.context.payload.pull_request.merged}`);
    console.log(`action: ${github.context.payload.action}`);
    //log(github.context.payload, "github.context.payload");
    core.setFailed(error.message);
  }
}

function log(data, name) {
  const s = JSON.stringify(data, undefined, 2)
  console.log(`${name}, ${s}`)
}

async function getChangeTypeForContext(client) {
  const titleTag = getChangeTypeForString(github.context.payload.pull_request.title);
  const bodyTag = getChangeTypeForString(github.context.payload.pull_request.body);
  if (titleTag !== "") {
    if (bodyTag !== "") {
      if (titleTag === bodyTag) {
        return titleTag
      }
      throw "title and body do not match"
    }
    return titleTag;
  } else {
    if (bodyTag !== "") {
      return bodyTag
    }
  }

  const pullRef = getPullRef();
  const commits = await client.pulls.listCommits(pullRef);
  for (let commit of commits.data.reverse()) {
    const tag = getChangeTypeForString(commit.message);
    if (tag !== "") {
      return tag;
    }
  }
}

function getChangeTypeForString(string) {
  if (string == "") {
    return ""
  }
  const major = countOccurrences(string, /[\s?major\s?]/gi) + countOccurrences(string, /[#!]major/gi);
  if (major > 0) {
    return "major";
  }
  const minor = countOccurrences(string, /[\s?minor\s?]/gi) + countOccurrences(string, /[#!]minor/gi);
  if (minor > 0) {
    return "minor"
  }
  const patch = countOccurrences(string, /[\s?patch\s?]/gi) + countOccurrences(string, /[#!]patch/gi);
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

run();
