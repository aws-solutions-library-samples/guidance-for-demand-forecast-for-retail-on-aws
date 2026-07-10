// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import AdmZip from 'adm-zip';

const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});

const BUCKET = process.env.RAW_DATA_BUCKET || '';
const TABLE_NAME = process.env.UPLOAD_STATUS_TABLE || '';
const DATASET_PREFIX = 'data/sales/';

// Required CSV fields for the sales timeseries data
const REQUIRED_FIELDS = ['item_id', 'store_id', 'ts', 'demand', 'price'];

interface UploadStatus {
  user: string;
  fileName: string;
  status: 'processing' | 'valid' | 'invalid';
  message?: string;
  s3Key?: string;
  timestamp: string;
}

async function writeStatus(status: UploadStatus): Promise<void> {
  await dynamodb.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: { S: status.user },
        sk: { S: `${status.timestamp}#${status.fileName}` },
        user: { S: status.user },
        fileName: { S: status.fileName },
        status: { S: status.status },
        message: { S: status.message || '' },
        s3Key: { S: status.s3Key || '' },
        timestamp: { S: status.timestamp },
      },
    }),
  );
}

function validateCsvHeader(headerLine: string): { valid: boolean; missing: string[] } {
  const headers = headerLine
    .trim()
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/"/g, ''));

  const missing = REQUIRED_FIELDS.filter((field) => !headers.includes(field));
  return { valid: missing.length === 0, missing };
}

export const handler: S3Handler = async (event) => {
  console.log('Process upload event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing: s3://${bucket}/${key}`);

    // Extract username from the key path: uploads/zip/{username}/{timestamp}-{filename}.zip
    const keyParts = key.split('/');
    const username = keyParts[2] || 'unknown';
    const zipFileName = keyParts[keyParts.length - 1];
    const timestamp = new Date().toISOString();

    // Write initial processing status
    await writeStatus({
      user: username,
      fileName: zipFileName,
      status: 'processing',
      message: 'Unzipping and validating file...',
      timestamp,
    });

    try {
      // Download the zip file from S3
      const getResponse = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

      if (!getResponse.Body) {
        throw new Error('Empty file body');
      }

      // Read body into buffer
      const chunks: Uint8Array[] = [];
      const stream = getResponse.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const zipBuffer = Buffer.concat(chunks);

      // Parse zip using adm-zip (pure JS, no native deps)
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();

      const csvEntries = entries.filter(
        (entry) => !entry.isDirectory && entry.entryName.endsWith('.csv'),
      );

      if (csvEntries.length === 0) {
        await writeStatus({
          user: username,
          fileName: zipFileName,
          status: 'invalid',
          message: 'No CSV file found inside the zip archive',
          timestamp,
        });
        return;
      }

      // Process each CSV file found in the zip
      let allValid = true;
      const processedFiles: string[] = [];

      for (const csvEntry of csvEntries) {
        const csvContent = csvEntry.getData();
        const csvString = csvContent.toString('utf-8');
        const lines = csvString.split('\n').filter((l) => l.trim().length > 0);

        if (lines.length < 2) {
          await writeStatus({
            user: username,
            fileName: zipFileName,
            status: 'invalid',
            message: `File ${csvEntry.entryName} is empty or has no data rows`,
            timestamp,
          });
          allValid = false;
          break;
        }

        // Validate header
        const { valid, missing } = validateCsvHeader(lines[0]);

        if (!valid) {
          await writeStatus({
            user: username,
            fileName: zipFileName,
            status: 'invalid',
            message: `File ${csvEntry.entryName} is missing required fields: ${missing.join(', ')}. Required: ${REQUIRED_FIELDS.join(', ')}`,
            timestamp,
          });
          allValid = false;
          break;
        }

        // If valid, upload the CSV to the datasets folder with fixed naming convention
        const destinationKey = `${DATASET_PREFIX}consumer_electronics.csv`;

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: destinationKey,
            Body: csvContent,
            ContentType: 'text/csv',
            Metadata: {
              'uploaded-by': username,
              'source-zip': zipFileName,
              'upload-date': timestamp,
            },
          }),
        );

        processedFiles.push(destinationKey);
      }

      if (allValid) {
        await writeStatus({
          user: username,
          fileName: zipFileName,
          status: 'valid',
          message: `Successfully processed ${processedFiles.length} CSV file(s). Ready for model training.`,
          s3Key: processedFiles.join(', '),
          timestamp,
        });
      }
    } catch (err) {
      console.error('Error processing upload:', err);
      await writeStatus({
        user: username,
        fileName: zipFileName,
        status: 'invalid',
        message: `Processing error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp,
      });
    }
  }
};
