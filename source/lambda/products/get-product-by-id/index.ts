// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { executeAthenaQuery } from '../../shared/athena-client';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  badRequestResponse,
} from '../../shared/response';
import { Product, SalesRecord } from '../../shared/types';

const GLUE_DATABASE = process.env.GLUE_DATABASE || 'retail_forecast_db';
const ATHENA_WORKGROUP = process.env.ATHENA_WORKGROUP || 'retail-forecast-workgroup';
const ATHENA_OUTPUT_BUCKET = process.env.ATHENA_OUTPUT_BUCKET || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get product by ID request:', JSON.stringify(event, null, 2));

  const rawItemId = event.pathParameters?.id;

  if (!rawItemId) {
    return badRequestResponse('Item ID is required');
  }

  // Sanitize input to prevent SQL injection
  const itemId = rawItemId.replace(/[^a-zA-Z0-9\-_]/g, '');
  if (itemId !== rawItemId) {
    return badRequestResponse('Item ID contains invalid characters');
  }

  try {
    // Get product info and recent sales data
    const productQuery = `
      SELECT item_id, 'Electronics' as item_type, item_id as item_description
      FROM sales_data
      WHERE item_id = '${itemId}'
      LIMIT 1
    `;

    const productResults = await executeAthenaQuery(productQuery, {
      database: GLUE_DATABASE,
      workgroup: ATHENA_WORKGROUP,
      outputBucket: ATHENA_OUTPUT_BUCKET,
    });

    if (productResults.length === 0) {
      return notFoundResponse(`Product with ID '${itemId}' not found`);
    }

    const product: Product = {
      itemId: productResults[0].item_id || '',
      itemType: productResults[0].item_type || 'Unknown',
      itemDescription: productResults[0].item_description || itemId,
    };

    // Get recent sales history for this product
    const salesQuery = `
      SELECT item_id, store_id, ts, demand, price
      FROM sales_data
      WHERE item_id = '${itemId}'
      ORDER BY ts DESC
      LIMIT 30
    `;

    const salesResults = await executeAthenaQuery(salesQuery, {
      database: GLUE_DATABASE,
      workgroup: ATHENA_WORKGROUP,
      outputBucket: ATHENA_OUTPUT_BUCKET,
    });

    const salesHistory: SalesRecord[] = salesResults.map((row) => ({
      itemId: row.item_id || '',
      storeId: row.store_id || '',
      timestamp: row.ts || '',
      demand: parseFloat(row.demand) || 0,
      price: parseFloat(row.price) || 0,
    }));

    return successResponse({
      product,
      salesHistory,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to fetch product: ${errorMessage}`);
  }
};
