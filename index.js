const {core} = require('@actions/core');
const {github} = require('@actions/github');

try {
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The context payload: ${payload}`);
  const ev = JSON.stringify(github.event, undefined, 2)
  console.log(`The event payload: ${ev}`);
} catch (error) {
  core.setFailed(error.message);
}
