// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { PostAuthenticationTriggerEvent } from 'aws-lambda';

const cognito = new CognitoIdentityProviderClient({});
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

export const handler = async (event: PostAuthenticationTriggerEvent) => {
  const email = event.request.userAttributes.email;
  const userPoolId = event.userPoolId;
  const username = event.userName;

  if (!ADMIN_EMAILS.includes(email)) {
    return event;
  }

  const { Groups } = await cognito.send(
    new AdminListGroupsForUserCommand({ UserPoolId: userPoolId, Username: username }),
  );

  const alreadyAdmin = Groups?.some((g: { GroupName?: string }) => g.GroupName === 'Admin');
  if (alreadyAdmin) {
    return event;
  }

  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: 'Admin',
    }),
  );

  return event;
};
