import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

// --- CONFIGURATION ---
const region = 'eu-west-2';
const booksTableName = 'noko-library';
const usersTableName = 'noko-users';
const colleagueRoleArn = 'arn:aws:iam::897819179352:role/gwen-db-access';

const stsClient = new STSClient({ region: region });

// HELPER for temp creds
const getTempDdbClient = async () => {
    const assumeRoleCommand = new AssumeRoleCommand({
        RoleArn: colleagueRoleArn,
        RoleSessionName: "NokoLambdaSession"
    });
    const tempCredentials = await stsClient.send(assumeRoleCommand);
    
    return DynamoDBDocumentClient.from(
        new DynamoDBClient({
            region: region,
            credentials: {
                accessKeyId: tempCredentials.Credentials.AccessKeyId,
                secretAccessKey: tempCredentials.Credentials.SecretAccessKey,
                sessionToken: tempCredentials.Credentials.SessionToken,
            },
        })
    );
};

// --- MAIN HANDLER ---
export const handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const action = event.queryStringParameters?.action || 'getBook';
    const entityId = event.pathParameters?.bookId; // ID: bookId or userId

    if (!entityId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing ID (bookId or userId) in URL path.' }) };
    }

    try {
        const ddbDocClient = await getTempDdbClient();

        switch (action) {
            case 'getBook':
                return await getBookById(entityId, ddbDocClient);
            case 'getUser':
                return await getUserData(entityId, ddbDocClient);
            case 'getExplore':
                return await getExploreBooks(entityId, ddbDocClient);
            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action specified.' }) };
        }
    } catch (err) {
        console.error(err);
        return { 
            statusCode: 500, 
            headers: { 'Access-Control-Allow-Origin': '*' }, 
            body: JSON.stringify({ error: 'Could not process the request', details: err.message }) 
        };
    }
};

// --- FETCH BOOK ---
const getBookById = async (bookId, ddbDocClient) => {
    const getBookCommand = new GetCommand({
        TableName: booksTableName,
        Key: { bookId: bookId }
    });
    const { Item } = await ddbDocClient.send(getBookCommand);

    if (!Item) {
        return { statusCode: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Book not found' }) };
    }
    
    // ensure page sorting
    Item.pages.sort((a, b) => a.page_number - b.page_number);

    return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify(Item),
    };
};

// --- FETCH USER ---
const getUserData = async (userId, ddbDocClient) => {
    const getUserCommand = new GetCommand({
        TableName: usersTableName,
        Key: { userId: userId }
    });
    const { Item } = await ddbDocClient.send(getUserCommand);

    if (!Item) {
        return { statusCode: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'User not found' }) };
    }

    return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify(Item),
    };
};

// --- POPULATE EXPLORE ---
const getExploreBooks = async (userId, ddbDocClient) => {
    // 1. GET user saved_books
    const getUserCommand = new GetCommand({ TableName: usersTableName, Key: { userId: userId } });
    const { Item: userData } = await ddbDocClient.send(getUserCommand);
    const savedBookIds = new Set(userData ? userData.saved_books : []);

    // 2. GET all noko-library books (quick scan)
    const scanAllBooksCommand = new ScanCommand({ 
        TableName: booksTableName,
        ProjectionExpression: "bookId, title, coverImage" 
    });
    const { Items: allBooks } = await ddbDocClient.send(scanAllBooksCommand);
    
    // 3. filter out books already saved
    const exploreBooks = allBooks.filter(book => !savedBookIds.has(book.bookId));

    return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify(exploreBooks),
    };
};