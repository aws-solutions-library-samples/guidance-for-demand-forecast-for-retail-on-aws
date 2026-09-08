#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# INTERNAL automated validation script for the Guidance solutions team.
# Runs fully unattended in AWS CodeBuild (Amazon Linux 2023,
# aws/codebuild/amazonlinux-x86_64-standard:5.0, privileged, us-east-1).
# NOT intended for end users — they use scripts/deploy.sh.
set -e

# ============================================================
# RESOLVE REPO ROOT
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ============================================================
# CONFIGURATION
# ============================================================
export AWS_REGION="us-east-1"
ADMIN_EMAIL="admin@example.com"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account: $ACCOUNT_ID | Region: $AWS_REGION"

# ============================================================
# INSTALL DEPENDENCIES (CodeBuild AL2023 ships git, awscli, node/npm)
# ============================================================
echo "Installing dependencies..."
if ! command -v jq >/dev/null 2>&1; then
  echo "Installing jq..."
  sudo dnf install -y jq || dnf install -y jq
fi
npm ci

# ============================================================
# CDK BOOTSTRAP CHECK
# ============================================================
BOOTSTRAP=$(aws cloudformation describe-stacks --region "$AWS_REGION" \
  --query "Stacks[?StackName=='CDKToolkit'].StackName" --output text 2>/dev/null || true)
if [ -z "$BOOTSTRAP" ] || [ "$BOOTSTRAP" = "None" ]; then
  echo "Bootstrapping CDK environment..."
  (cd deployment/cdk && npx cdk bootstrap "aws://$ACCOUNT_ID/$AWS_REGION")
fi

# ============================================================
# DEPLOY (unattended)
# ============================================================
cd deployment/cdk
npm run build
npx cdk deploy --all --require-approval never --context adminEmails="$ADMIN_EMAIL"
cd "$REPO_ROOT"

# ============================================================
# BUILD + PUBLISH FRONTEND
# ============================================================
get_export() { aws cloudformation list-exports --query "Exports[?Name=='$1'].Value" --output text --region "$AWS_REGION"; }
API_URL=$(get_export ApiUrl)
USER_POOL_ID=$(get_export UserPoolId)
USER_POOL_CLIENT_ID=$(get_export UserPoolClientId)
IDENTITY_POOL_ID=$(get_export IdentityPoolId)
BUCKET_NAME=$(get_export WebsiteBucketName)
DISTRIBUTION_ID=$(get_export DistributionId)
CLOUDFRONT_DOMAIN=$(get_export DistributionDomainName)

cd source/frontend
NEXT_PUBLIC_API_URL="$API_URL" \
  NEXT_PUBLIC_USER_POOL_ID="$USER_POOL_ID" \
  NEXT_PUBLIC_USER_POOL_CLIENT_ID="$USER_POOL_CLIENT_ID" \
  NEXT_PUBLIC_IDENTITY_POOL_ID="$IDENTITY_POOL_ID" \
  NEXT_PUBLIC_REGION="$AWS_REGION" \
  npm run build
aws s3 sync out/ "s3://$BUCKET_NAME/" --delete
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" >/dev/null
cd "$REPO_ROOT"

# ============================================================
# VALIDATION (fail the build if outputs are missing)
# ============================================================
echo "Validating deployment..."
[ -n "$API_URL" ] || { echo "VALIDATION FAILED: ApiUrl export not found"; exit 1; }
[ -n "$CLOUDFRONT_DOMAIN" ] || { echo "VALIDATION FAILED: DistributionDomainName export not found"; exit 1; }
echo "  API: $API_URL"
echo "  App: https://$CLOUDFRONT_DOMAIN"

echo "Deployment completed successfully!"
