#!/usr/bin/env bash

set -euo pipefail

for file in lib/*.js; do
  echo "Checking JavaScript syntax: ${file}"
  node --check "${file}"
done

for file in bin/*.sh test/*.sh; do
  echo "Checking shell syntax: ${file}"
  bash -n "${file}"
done

node --test test/*.test.js
