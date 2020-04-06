const core = require('@actions/core');
const github = require('@actions/github');

try {
  // Get the JSON webhook payload for the event that triggered the workflow
  console.log(`merged: ${github.context.payload.pull_request.merged}`)
  console.log(`action: ${github.context.payload.action}`)
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The context payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
