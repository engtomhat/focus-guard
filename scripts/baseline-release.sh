#!/usr/bin/env bash
# Prints the tag of the release that a build's permissions should be compared with:
# the newest published release that has both extension zips and is not a release
# of the commit being built.
#
# Why not simply "the latest release": right after a release PR is merged, CI runs
# on the release commit itself, while the Release workflow is still attaching the
# zips to that brand-new release. Comparing a build with itself proves nothing anyway.
#
# usage: scripts/baseline-release.sh <owner/repo> <commit sha being built>
set -euo pipefail

repo="$1"
sha="$2"

gh api "repos/${repo}/releases?per_page=30" --jq '
  .[]
  | select(.draft == false)
  | select([.assets[].name] | any(endswith("chrome.zip")) and any(endswith("firefox.zip")))
  | .tag_name' |
while read -r tag; do
  tag_sha="$(gh api "repos/${repo}/commits/${tag}" --jq .sha)"
  if [ "${tag_sha}" != "${sha}" ]; then
    echo "${tag}"
    exit 0
  fi
done
