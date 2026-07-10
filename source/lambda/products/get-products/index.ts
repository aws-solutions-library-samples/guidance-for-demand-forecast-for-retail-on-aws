// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { executeAthenaQuery } from '../../shared/athena-client';
import { successResponse, errorResponse } from '../../shared/response';
import { Product } from '../../shared/types';

const GLUE_DATABASE = process.env.GLUE_DATABASE || 'retail_forecast_db';
const ATHENA_WORKGROUP = process.env.ATHENA_WORKGROUP || 'retail-forecast-workgroup';
const ATHENA_OUTPUT_BUCKET = process.env.ATHENA_OUTPUT_BUCKET || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get products request:', JSON.stringify(event, null, 2));

  try {
    const query = `
      SELECT item_id, item_description, item_type, base_price, image_key
      FROM products_metadata
      ORDER BY item_type, item_description
    `;

    const results = await executeAthenaQuery(query, {
      database: GLUE_DATABASE,
      workgroup: ATHENA_WORKGROUP,
      outputBucket: ATHENA_OUTPUT_BUCKET,
    });

    const products: Product[] = results.map((row) => ({
      itemId: row.item_id || '',
      itemType: row.item_type || 'Unknown',
      itemDescription: row.item_description || row.item_id || '',
      basePrice: parseFloat(row.base_price) || 0,
      imageKey: row.image_key || '',
    }));

    return successResponse({
      products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to fetch products: ${errorMessage}`);
  }
};
