#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# User-facing deploy script for "Guidance for Retail Demand Forecasting on AWS".
# Cross-platform: macOS, Linux, and Windows (WSL / Git Bash).
#
# Usage:
#   ADMIN_EMAIL=you@example.com ./scripts/deploy.sh           # deploy only (data unchanged, no training)
#   ADMIN_EMAIL=you@example.com ./scripts/deploy.sh --train   # regenerate sample data + deploy + start ML pipeline
#   AWS_REGION=us-west-2 ADMIN_EMAIL=you@example.com ./scripts/deploy.sh   # override Region
#   DATASET_END_DATE=2026-01-31 ADMIN_EMAIL=you@example.com ./scripts/deploy.sh  # override dataset end date (default: today)
set -e

# ============================================================
# RESOLVE REPO ROOT (script may be invoked from anywhere)
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Training is opt-in via --train. When enabled, we regenerate a fresh sample
# dataset (which the CDK BucketDeployment uploads, triggering the pipeline) and
# ensure a training run is started.
TRAIN=false
if [ "${1:-}" = "--train" ]; then
  TRAIN=true
fi

# ============================================================
# PLATFORM DETECTION
# ============================================================
detect_platform() {
  case "$(uname -s)" in
    Darwin*) PLATFORM="macos" ;;
    Linux*)  PLATFORM="linux" ;;
    MINGW* | MSYS* | CYGWIN*) PLATFORM="windows" ;;
    *) PLATFORM="unknown" ;;
  esac
  echo "Detected platform: $PLATFORM"
}

# ============================================================
# PREREQUISITE CHECKS
# ============================================================
check_prerequisites() {
  echo "Checking prerequisites..."
  command -v aws >/dev/null 2>&1 || { echo "ERROR: AWS CLI is required — https://aws.amazon.com/cli/"; exit 1; }
  command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js 20+ is required — https://nodejs.org/"; exit 1; }
  command -v npm >/dev/null 2>&1 || { echo "ERROR: npm is required."; exit 1; }
  command -v jq >/dev/null 2>&1 || { echo "ERROR: jq is required — https://jqlang.github.io/jq/"; exit 1; }
  if [ "$TRAIN" = true ]; then
    command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python 3 is required to generate the sample dataset for --train — https://www.python.org/"; exit 1; }
  fi
  aws sts get-caller-identity >/dev/null 2>&1 || { echo "ERROR: AWS credentials not configured. Run 'aws configure'."; exit 1; }
}

detect_platform
check_prerequisites

# ============================================================
# CONFIGURATION
# ============================================================
# Region: AWS_REGION env overrides; otherwise cdk.json is the source of truth.
REGION="${AWS_REGION:-$(jq -r '.context.accounts.dev.region' deployment/cdk/cdk.json)}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account: $ACCOUNT_ID | Region: $REGION"

# Admin email — added to the Cognito "Admin" group on first sign-in.
if [ -z "${ADMIN_EMAIL:-}" ] && [ -t 0 ]; then
  read -r -p "Admin email (added to the Cognito Admin group; blank to skip): " ADMIN_EMAIL
fi
CONTEXT_ARGS=""
if [ -n "${ADMIN_EMAIL:-}" ]; then
  echo "Admin email(s): $ADMIN_EMAIL"
  CONTEXT_ARGS="--context adminEmails=$ADMIN_EMAIL"
else
  echo "WARNING: no ADMIN_EMAIL provided — using 'adminEmails' from cdk.json. No admin will be created if that is the placeholder."
fi

# ============================================================
# GENERATE SAMPLE DATASET (only with --train)
# ============================================================
# Regenerating rewrites assets/data/consumer_electronics.csv, which the CDK
# BucketDeployment (data-stack) then re-uploads — and that upload fires the S3
# event that starts the training pipeline. So we only regenerate when training
# is requested (--train). A plain deploy leaves the data untouched, avoiding an
# unintended (billable) training run.
# Override the history end date with DATASET_END_DATE=YYYY-MM-DD (defaults to today).
if [ "$TRAIN" = true ]; then
  echo "Generating sample dataset..."
  if [ -n "${DATASET_END_DATE:-}" ]; then
    echo "Dataset end date: $DATASET_END_DATE"
    python3 scripts/generate-dataset.py --end-date "$DATASET_END_DATE"
  else
    python3 scripts/generate-dataset.py
  fi
else
  echo "Skipping dataset generation (no --train). Deployed data is left unchanged."
fi

# ============================================================
# INSTALL DEPENDENCIES (npm workspaces: one install from the root)
# ============================================================
echo "Installing dependencies..."
npm ci

# ============================================================
# CDK BOOTSTRAP CHECK + DEPLOY
# ============================================================
cd deployment/cdk
echo "Building CDK app..."
npm run build

BOOTSTRAP=$(aws cloudformation describe-stacks --region "$REGION" \
  --query "Stacks[?StackName=='CDKToolkit'].StackName" --output text 2>/dev/null || true)
if [ -z "$BOOTSTRAP" ] || [ "$BOOTSTRAP" = "None" ]; then
  echo "Bootstrapping CDK environment aws://$ACCOUNT_ID/$REGION ..."
  npx cdk bootstrap "aws://$ACCOUNT_ID/$REGION"
fi

echo "Deploying all stacks..."
# shellcheck disable=SC2086
npx cdk deploy --all --require-approval never $CONTEXT_ARGS
cd "$REPO_ROOT"

# ============================================================
# CAPTURE STACK OUTPUTS
# ============================================================
get_export() { aws cloudformation list-exports --query "Exports[?Name=='$1'].Value" --output text --region "$REGION"; }
API_URL=$(get_export ApiUrl)
USER_POOL_ID=$(get_export UserPoolId)
USER_POOL_CLIENT_ID=$(get_export UserPoolClientId)
IDENTITY_POOL_ID=$(get_export IdentityPoolId)
BUCKET_NAME=$(get_export WebsiteBucketName)
DISTRIBUTION_ID=$(get_export DistributionId)
CLOUDFRONT_DOMAIN=$(get_export DistributionDomainName)

# ============================================================
# BUILD + PUBLISH FRONTEND
# ============================================================
echo "Building and publishing the frontend..."
cd source/frontend
NEXT_PUBLIC_API_URL="$API_URL" \
  NEXT_PUBLIC_USER_POOL_ID="$USER_POOL_ID" \
  NEXT_PUBLIC_USER_POOL_CLIENT_ID="$USER_POOL_CLIENT_ID" \
  NEXT_PUBLIC_IDENTITY_POOL_ID="$IDENTITY_POOL_ID" \
  NEXT_PUBLIC_REGION="$REGION" \
  npm run build
aws s3 sync out/ "s3://$BUCKET_NAME/" --delete
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" >/dev/null
cd "$REPO_ROOT"

# ============================================================
# VALIDATION
# ============================================================
echo "Validating deployment..."
if [ -z "$API_URL" ] || [ -z "$CLOUDFRONT_DOMAIN" ]; then
  echo "ERROR: could not read expected stack outputs. Check CloudFormation in $REGION."
  exit 1
fi
echo "  API: $API_URL"
echo "  App: https://$CLOUDFRONT_DOMAIN"

echo ""
echo "Deployed. Open: https://$CLOUDFRONT_DOMAIN"
echo "Sign up with your admin email, then sign out and back in once to get admin access."

# ============================================================
# OPTIONAL: start the ML training pipeline
# ============================================================
if [ "$TRAIN" = true ]; then
  # State machine name is CDK-generated (not hardcoded), so look up its ARN from
  # the CloudFormation export rather than filtering by name.
  SM_ARN=$(aws cloudformation list-exports \
    --query "Exports[?Name=='PipelineStateMachineArn'].Value" \
    --output text --region "$REGION")

  # The data upload during 'cdk deploy' (BucketDeployment writing
  # data/sales/consumer_electronics.csv) fires an S3 event that auto-starts the
  # pipeline. To avoid launching a duplicate (and a second billable SageMaker
  # run), only start a new execution if one is not already running.
  RUNNING_EXEC=$(aws stepfunctions list-executions --state-machine-arn "$SM_ARN" \
    --status-filter RUNNING --max-results 1 \
    --query 'executions[0].executionArn' --output text --region "$REGION" 2>/dev/null || true)

  if [ -n "$RUNNING_EXEC" ] && [ "$RUNNING_EXEC" != "None" ]; then
    echo "ML pipeline already running (auto-started by the data upload): $RUNNING_EXEC"
    echo "Skipping duplicate start."
  else
    echo "Starting ML pipeline..."
    EXEC=$(aws stepfunctions start-execution --state-machine-arn "$SM_ARN" --input '{}' \
      --region "$REGION" --query 'executionArn' --output text)
    echo "Pipeline started: $EXEC"
  fi
fi

# ============================================================
# CLEANUP INSTRUCTIONS
# ============================================================
echo ""
echo "To remove all resources when you are done:"
echo "  cd deployment/cdk && npx cdk destroy --all"
echo "Then delete any running SageMaker real-time endpoint (it is created by the ML"
echo "pipeline, not by CDK, so 'cdk destroy' will not remove it):"
echo "  aws sagemaker list-endpoints --region $REGION"
echo "  aws sagemaker delete-endpoint --endpoint-name <name> --region $REGION"
