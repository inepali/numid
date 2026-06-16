const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "";
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "avatars";

// Lazy-loaded client creator using eval('require') to bypass Webpack static resolution
async function getR2Client() {
  const { S3Client } = eval('require("@aws-sdk/client-s3")');
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  const { PutObjectCommand } = eval('require("@aws-sdk/client-s3")');
  const client = await getR2Client();
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);
  console.log(`[R2] Uploaded object: ${key} to bucket: ${bucketName}`);
}

export async function getFromR2(key: string): Promise<Buffer> {
  const { GetObjectCommand } = eval('require("@aws-sdk/client-s3")');
  const client = await getR2Client();
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await client.send(command);
  if (!response.Body) {
    throw new Error("No body returned from R2");
  }

  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}
