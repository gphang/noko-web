import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
import os

load_dotenv()

# --- dynamodb conn ---
try:
    region = os.getenv("AWS_REGION")
    if not region:
        raise ValueError("AWS_REGION not set in .env file")

    dynamodb = boto3.resource('dynamodb', region_name=region)
    table = dynamodb.Table('noko-library')

except Exception as e:
    print(f"error connecting to database: {e}")
    dynamodb = None
    table = None

def get_book_from_db(book_id: str):
    if not table:
        # TODO: improve error handling / logging
        return None
    
    try:
        response = table.get_item(Key={'bookId': book_id})
        if 'Item' in response:
            return response['Item']
        else:
            return None
    except ClientError as e:
        print(f"AWS client error occurred: {e.response['Error']['Message']}")
        return None