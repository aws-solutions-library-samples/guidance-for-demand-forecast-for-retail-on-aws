// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { ResourcesConfig } from 'aws-amplify';

const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID || '';
const userPoolClientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '';
const region = process.env.NEXT_PUBLIC_REGION || 'us-east-1';

export const awsConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
      },
    },
  },
};

export const AWS_REGION = region;
