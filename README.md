## merge-tag-action

Automatically tags commits on master after merging a pull request. This action will also place a comment suggesting which version is likely to be applied.

## Usage

After activating the action, flag your pull requests or commits using any of `[major]`, `[minor]`, `[patch]`, `#major`, `#minor`, `#patch`.

The easiest way to use this action is to put the change type in the PR title.

The action will identify the changetype by looking for any of the above strings. It will search in the following order:
- Pull Request Title
- Pull Request Body (description)
- Commits, newest first

After identifying a change type, the action will update the PR title to have the tag at the front. After this has occurred, the best way
to flag a new change type (if you change your mind, for example) is to update the PR title.

## Installation

Create a file `.github/workflows/tag.yaml` with the following content:

```yaml
# When a pull request is opened, updated or merged, run the tag action.
on:
  pull_request:
    types: [ opened, synchronize, reopened, closed, edited ]
    branches:
      - master

jobs:
  tag:
    runs-on: ubuntu-latest
    name: tag
    steps:
    - uses: mx51/merge-tag-action@v1
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
```

