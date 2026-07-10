// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';
import { WhatIfRequest, WhatIfResponse, WhatIfProjection, PurchaseOrder } from '../../shared/types';
import { getForecastData } from '../../shared/forecast-data';

const s3 = new S3Client({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Run what-if scenario request:', JSON.stringify(event, null, 2));

  let body: WhatIfRequest;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const { itemId, storeId = 'store_001', currentStock } = body;

  // Support both array and legacy flat fields
  let purchaseOrders: PurchaseOrder[] = [];
  if (body.purchaseOrders && body.purchaseOrders.length > 0) {
    purchaseOrders = body.purchaseOrders;
  } else if (body.purchaseQuantity && body.purchaseDate && body.leadTimeDays !== undefined) {
    const orderDate = new Date(body.purchaseDate);
    const arrivalDate = new Date(orderDate);
    arrivalDate.setDate(arrivalDate.getDate() + body.leadTimeDays);
    purchaseOrders = [
      {
        quantity: body.purchaseQuantity,
        orderDate: body.purchaseDate,
        leadTimeDays: body.leadTimeDays,
        arrivalDate: arrivalDate.toISOString().split('T')[0],
      },
    ];
  }

  // Validate required fields
  if (!itemId) {
    return badRequestResponse('itemId is required');
  }

  if (currentStock === undefined || currentStock < 0) {
    return badRequestResponse('currentStock must be a non-negative number');
  }

  if (purchaseOrders.length === 0) {
    return badRequestResponse('At least one purchase order is required');
  }

  try {
    // Fetch forecast data
    const forecasts = await getForecastData(s3, OUTPUTS_BUCKET, itemId, storeId);

    // If no forecast data available, return empty projections
    if (!forecasts) {
      return successResponse({
        itemId,
        scenario: {
          purchaseQuantity: purchaseOrders[0].quantity,
          purchaseDate: purchaseOrders[0].orderDate,
          leadTimeDays: purchaseOrders[0].leadTimeDays,
          arrivalDate: purchaseOrders[0].arrivalDate,
        },
        projections: [],
        forecastAvailable: false,
      });
    }

    // Use first purchase order for the scenario summary
    const firstOrder = purchaseOrders[0];
    const arrivalDateStr = firstOrder.arrivalDate;

    // Simulate stock with all purchase orders
    const projections: WhatIfProjection[] = [];
    let runningStock = currentStock;
    let shortageDate: string | undefined;

    const startDate =
      forecasts.length > 0 && forecasts[0].timestamp
        ? new Date(forecasts[0].timestamp.split(' ')[0])
        : new Date();
    const forecastDays = Math.max(forecasts.length, 14);

    for (let day = 0; day < forecastDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

      // Check if any purchase arrives on this day
      let purchaseArrival = 0;
      for (const order of purchaseOrders) {
        if (isSameDay(currentDate, new Date(order.arrivalDate))) {
          purchaseArrival += order.quantity;
        }
      }

      // Add purchase to stock when it arrives
      if (purchaseArrival > 0) {
        runningStock += purchaseArrival;
      }

      // Get forecasted demand for this day
      const dailyDemand = forecasts[day]?.p50 || 0;

      // Subtract demand from stock
      runningStock = Math.max(0, runningStock - dailyDemand);
      const stockShortage = runningStock <= 0;

      // Record first shortage date
      if (stockShortage && !shortageDate) {
        shortageDate = currentDateStr;
      }

      projections.push({
        date: currentDateStr,
        availableStock: Math.round(runningStock + dailyDemand),
        forecastedDemand: Math.round(dailyDemand),
        projectedStock: Math.round(runningStock),
        purchaseArrival,
        stockShortage,
      });
    }

    const response: WhatIfResponse = {
      itemId,
      scenario: {
        purchaseQuantity: firstOrder.quantity,
        purchaseDate: firstOrder.orderDate,
        leadTimeDays: firstOrder.leadTimeDays,
        arrivalDate: arrivalDateStr,
      },
      projections,
      shortageDate,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Error running what-if scenario:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to run what-if scenario: ${errorMessage}`);
  }
};

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
