const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const client = new github.GitHub(core.getInput('repo-token'));

    const {
      payload: {pull_request: pullRequest, repository},
      sha: commitSha,
    } = github.context;
    console.log(`sha: ${commitSha}`)

    const {full_name: repoFullName} = repository;
    const [owner, repo] = repoFullName.split("/");
    const pullNumber = pullRequest.number;
    const prRef = {
      owner,
      repo,
      pull_number: pullNumber,
    }
    const comments = await client.pulls.listComments(prRef);
    log(comments, "comments")

    const commits = await client.pulls.listCommits(prRef);
    log(commits, "commits")

    // Get the JSON webhook payload for the event that triggered the workflow
    console.log(`merged: ${github.context.payload.pull_request.merged}`)
    console.log(`action: ${github.context.payload.action}`)
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The context payload: ${payload}`);

  } catch (error) {
    core.setFailed(error.message);
  }
}

function log(data, name) {
  const s = JSON.stringify(data, undefined, 2)
  console.log(`${name}, ${s}`)
}

run();
