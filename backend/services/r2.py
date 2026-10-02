import os
import boto3
from botocore.config import Config


def get_r2_client():
    account_id = os.getenv("CLOUDFLARE_R2_ACCOUNT_ID")
    access_key = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
    secret_key = os.getenv("CLOUDFLARE_R2_SECRET_KEY")

    if not account_id or not access_key or not secret_key:
        raise ValueError("Missing Cloudflare R2 credentials in environment variables.")

    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"

    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def get_presigned_download_url(file_key: str, expires_in: int = 7200) -> str:
    bucket_name = os.getenv("CLOUDFLARE_R2_BUCKET_NAME", "gnani-audio")
    client = get_r2_client()

    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket_name, "Key": file_key},
        ExpiresIn=expires_in,
    )
