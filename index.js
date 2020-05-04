const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const client = new github.GitHub(github.token);
    console.log("tok: "+ core.getInput('repo-token'));
    console.log("tok2: "+ github.token);

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
    const {data: comments} = await client.pulls.listComments(prRef);

    console.log(`comments: ${comments}`)

    // Get the JSON webhook payload for the event that triggered the workflow
    console.log(`merged: ${github.context.payload.pull_request.merged}`)
    console.log(`action: ${github.context.payload.action}`)
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The context payload: ${payload}`);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
