#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# Convenience wrapper — delegates to the canonical user-facing deploy script
# at scripts/deploy.sh. Usage:
#   ADMIN_EMAIL=you@example.com ./deploy.sh [--train]
exec "$(dirname "$0")/scripts/deploy.sh" "$@"
