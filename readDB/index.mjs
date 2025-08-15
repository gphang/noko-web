// index.mjs (Corrected for Single-Item Structure)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb"; // Use GetCommand
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

// --- Configuration ---
const region = 'eu-west-2'; // Make sure this matches your services' region
const tableName = 'noko-library'; // The table name
const colleagueRoleArn = 'arn:aws:iam::897819179352:role/gwen-db-access'; // The role to assume

// Create a client for the Security Token Service (STS)
const stsClient = new STSClient({ region: region });

export const handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    try {
        const bookId = event.pathParameters?.bookId;
        if (!bookId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'bookId is required' }) };
        }

        // Assume Role logic remains the same
        const assumeRoleCommand = new AssumeRoleCommand({
            RoleArn: colleagueRoleArn,
            RoleSessionName: "StorybookLambdaSession"
        });
        const tempCredentials = await stsClient.send(assumeRoleCommand);
        
        const tempDdbDocClient = DynamoDBDocumentClient.from(
            new DynamoDBClient({
                region: region,
                credentials: {
                    accessKeyId: tempCredentials.Credentials.AccessKeyId,
                    secretAccessKey: tempCredentials.Credentials.SecretAccessKey,
                    sessionToken: tempCredentials.Credentials.SessionToken,
                },
            })
        );
        
        // --- UPDATED LOGIC ---
        // 1. Use GetCommand to fetch the single item for the book
        const getBookCommand = new GetCommand({
            TableName: tableName,
            Key: {
                bookId: bookId // Assumes the table's primary key is named "bookId"
            }
        });
        const bookData = await tempDdbDocClient.send(getBookCommand);

        if (!bookData.Item) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Book not found' }) };
        }
        
        const bookItem = bookData.Item;

        // 2. The pages are now an attribute on this single item
        const responsePayload = {
            title: bookItem.title,
            pages: bookItem.pages.map(page => ({
                page_number: page.page_number, // The names from the CSV now match
                text: page.text,
                image: page.image
            })).sort((a, b) => a.page_number - b.page_number)
        };
        
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify(responsePayload),
        };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not process the request', details: err.message }) };
    }
};