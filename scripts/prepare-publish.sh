#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

usage() {
  cat <<'USAGE'
Usage: prepare-publish.sh (--version <x.y.z> | --bump <major|minor|patch>) [--notes "release notes"] [--skip-publish]

Automates the release workflow:
  1. Updates package metadata (package.json and package-lock.json).
  2. Updates VERSION.md with the new release entry.
  3. Installs dependencies and runs lint/build checks.
  4. Commits the changes and creates an annotated git tag.
  5. Publishes the package to npm (unless --skip-publish is provided).

Options:
  --version <x.y.z>   Set the package to an explicit semantic version.
  --bump <type>       Increment the version; <type> is one of major, minor, or patch.
  --notes <text>      Release notes line to record in VERSION.md (defaults to "Describe changes here.").
  --skip-publish      Skip the final npm publish step (useful for verification runs).
  -h, --help          Show this help message and exit.
USAGE
}

ensure_clean_worktree() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Error: Working tree has uncommitted changes. Please commit or stash them before running this script." >&2
    exit 1
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: Required command '$1' not found on PATH." >&2
    exit 1
  fi
}

update_version_files() {
  local target="$1"
  if [[ "$target" =~ ^(major|minor|patch)$ ]]; then
    pnpm version "$target" --no-git-tag-version >/dev/null
    NEW_VERSION=$(node -p "require('./package.json').version")
  else
    pnpm version "$target" --no-git-tag-version >/dev/null
    NEW_VERSION="$target"
  fi
}

update_version_md() {
  local version="$1"
  local notes="$2"
  local major_minor
  major_minor="${version%.*}"

  if [[ "$major_minor" == "$version" ]]; then
    echo "Error: Expected semantic version with three components (major.minor.patch)." >&2
    exit 1
  fi

  if grep -q "^### ${version}$" VERSION.md; then
    echo "Error: VERSION.md already contains an entry for ${version}." >&2
    exit 1
  fi

  if ! grep -q "^## ${major_minor}$" VERSION.md; then
    {
      echo
      echo "## ${major_minor}"
      echo
    } >> VERSION.md
  fi

  {
    echo "### ${version}"
    echo
    echo "- ${notes}"
    echo
  } >> VERSION.md
}

run_checks() {
  pnpm install
  pnpm run lint
  pnpm run check:no-fix
  pnpm run build
  # Optional but recommended: version compatibility smoke
  if [ -f "version-compatibility-tests/run-all-tests.js" ]; then
    pnpm run test:versions || true
  fi
}

commit_and_tag() {
  local version="$1"
  git add package.json VERSION.md CHANGELOG.md pnpm-lock.yaml 2>/dev/null || true
  git commit -m "chore: release v${version}"
  git tag -a "v${version}" -m "Release v${version}"
}

publish_package() {
  pnpm publish --access public
}

main() {
  local version=""
  local bump=""
  local notes="Describe changes here."
  local skip_publish="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --version)
        version="$2"
        shift 2
        ;;
      --bump)
        bump="$2"
        shift 2
        ;;
      --notes)
        notes="$2"
        shift 2
        ;;
      --skip-publish)
        skip_publish="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        exit 1
        ;;
    esac
  done

  if [[ -z "$version" && -z "$bump" ]]; then
    echo "Error: You must supply either --version or --bump." >&2
    usage
    exit 1
  fi

  if [[ -n "$version" && -n "$bump" ]]; then
    echo "Error: Provide only one of --version or --bump." >&2
    usage
    exit 1
  fi

  ensure_clean_worktree
  require_command pnpm
  require_command node
  require_command git

  if [[ -n "$bump" ]]; then
    update_version_files "$bump"
  else
    update_version_files "$version"
  fi

  if [[ -z "${NEW_VERSION:-}" ]]; then
    NEW_VERSION=$(node -p "require('./package.json').version")
  fi

  update_version_md "$NEW_VERSION" "$notes"
  run_checks
  commit_and_tag "$NEW_VERSION"

  if [[ "$skip_publish" == "false" ]]; then
    publish_package
  else
    echo "Skipping npm publish step."
  fi

  echo "Release ${NEW_VERSION} prepared successfully."
}

main "$@"
