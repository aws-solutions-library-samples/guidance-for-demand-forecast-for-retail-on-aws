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
    // Query distinct items from sales_data table
    // Since we're using consumer_electronics dataset, get unique item_ids
    const query = `
      SELECT DISTINCT item_id, 'Electronics' as item_type, item_id as item_description
      FROM sales_data
      WHERE item_id IS NOT NULL
      ORDER BY item_id
      LIMIT 100
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
