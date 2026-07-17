#!/usr/bin/env bash

set -euo pipefail
shopt -s nullglob

javascript_files=(lib/*.js)
shell_files=(bin/*.sh test/*.sh)
test_files=(test/*.test.js)

if (( ${#javascript_files[@]} == 0 )); then
  echo "No JavaScript files found in lib/" >&2
  exit 1
fi

if (( ${#shell_files[@]} == 0 )); then
  echo "No shell files found in bin/ or test/" >&2
  exit 1
fi

if (( ${#test_files[@]} == 0 )); then
  echo "No Node.js test files found in test/" >&2
  exit 1
fi

for file in "${javascript_files[@]}"; do
  echo "Checking JavaScript syntax: ${file}"
  node --check "${file}"
done

for file in "${shell_files[@]}"; do
  echo "Checking shell syntax: ${file}"
  bash -n "${file}"
done

node --test "${test_files[@]}"
