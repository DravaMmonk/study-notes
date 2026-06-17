#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
manifest="$script_dir/resources.tsv"
output_root="$script_dir/readings"

mkdir -p "$output_root"

tail -n +2 "$manifest" |
while IFS=$'\t' read -r id mode local_path url; do
  if [[ "$mode" != "download" ]]; then
    printf 'skip  %-24s %s\n' "$id" "$mode"
    continue
  fi

  destination="$output_root/$local_path"
  mkdir -p "$(dirname "$destination")"

  if [[ -s "$destination" ]]; then
    printf 'keep  %-24s %s\n' "$id" "$local_path"
    continue
  fi

  printf 'fetch %-24s %s\n' "$id" "$local_path"
  curl \
    --fail \
    --location \
    --silent \
    --show-error \
    --retry 3 \
    --retry-delay 2 \
    --connect-timeout 20 \
    --output "$destination.part" \
    "$url"
  mv "$destination.part" "$destination"
done

printf '\nResources are available under %s\n' "$output_root"
