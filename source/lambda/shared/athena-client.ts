// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  QueryExecutionState,
} from '@aws-sdk/client-athena';

const athena = new AthenaClient({});

const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 120; // 60 seconds max

export interface AthenaQueryOptions {
  database: string;
  workgroup: string;
  outputBucket: string;
}

export async function executeAthenaQuery(
  query: string,
  options: AthenaQueryOptions,
): Promise<Record<string, string>[]> {
  const { database, workgroup, outputBucket } = options;

  // Start query execution
  const startCommand = new StartQueryExecutionCommand({
    QueryString: query,
    QueryExecutionContext: { Database: database },
    WorkGroup: workgroup,
    ResultConfiguration: {
      OutputLocation: `s3://${outputBucket}/query-results/`,
    },
  });

  const startResponse = await athena.send(startCommand);
  const queryExecutionId = startResponse.QueryExecutionId;

  if (!queryExecutionId) {
    throw new Error('Failed to start Athena query execution');
  }

  // Poll for query completion
  let attempts = 0;
  let state: QueryExecutionState | undefined;

  while (attempts < MAX_POLL_ATTEMPTS) {
    const statusCommand = new GetQueryExecutionCommand({
      QueryExecutionId: queryExecutionId,
    });

    const statusResponse = await athena.send(statusCommand);
    state = statusResponse.QueryExecution?.Status?.State;

    if (state === QueryExecutionState.SUCCEEDED) {
      break;
    }

    if (state === QueryExecutionState.FAILED) {
      const errorMessage = statusResponse.QueryExecution?.Status?.StateChangeReason;
      throw new Error(`Athena query failed: ${errorMessage}`);
    }

    if (state === QueryExecutionState.CANCELLED) {
      throw new Error('Athena query was cancelled');
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    attempts++;
  }

  if (state !== QueryExecutionState.SUCCEEDED) {
    throw new Error('Athena query timed out');
  }

  // Get query results
  const resultsCommand = new GetQueryResultsCommand({
    QueryExecutionId: queryExecutionId,
  });

  const resultsResponse = await athena.send(resultsCommand);
  const rows = resultsResponse.ResultSet?.Rows || [];

  if (rows.length === 0) {
    return [];
  }

  // First row contains column headers
  const headers = rows[0].Data?.map((col) => col.VarCharValue || '') || [];

  // Transform remaining rows to objects
  const results: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    row.Data?.forEach((col, index) => {
      const header = headers[index];
      if (header) {
        obj[header] = col.VarCharValue || '';
      }
    });
    results.push(obj);
  }

  return results;
}
