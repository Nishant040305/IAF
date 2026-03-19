/**
 * MinIO Client Configuration
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const https = require('https');
const http = require('http');
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_REGION = process.env.MINIO_REGION;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_BUCKET = process.env.MINIO_BUCKET;

const s3 = new S3Client({
    endpoint: MINIO_ENDPOINT,
    region: MINIO_REGION,
    credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    maxAttempts: 3,
    requestHandler: new NodeHttpHandler({
        connectionTimeout: 3000,
        socketTimeout: 30000,
        httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50 }),
        httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 }),  // ← reuse connections
    }),
});
/**
 * Upload a file buffer or stream to MinIO.
 * @param {string} key        - Object key e.g. "pdfs/<uuid>/<uuid>.pdf"
 * @param {Buffer|Readable}   - body
 * @param {string} contentType
 */
const uploadObject = async (key, body, contentType) => {
    await s3.send(new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
    return key;
};

/**
 * Delete an object from MinIO.
 * @param {string} key
 */
const deleteObject = async (key) => {
    await s3.send(new DeleteObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
    }));
};

/**
 * Check if an object exists.
 * @param {string} key
 */
const objectExists = async (key) => {
    try {
        await s3.send(new HeadObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
        return true;
    } catch {
        return false;
    }
};
const connectMinio = async () => {
    try {
        await s3.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
        console.log(`✅ MinIO: bucket "${MINIO_BUCKET}" ready`);
    } catch (err) {
        // Log everything — UnknownError hides the real cause
        console.error('MinIO error details:', {
            name: err.name,
            message: err.message,
            code: err.Code,
            statusCode: err.$metadata?.httpStatusCode,
            cause: err.cause?.message,   // ← this is usually the real error
            endpoint: MINIO_ENDPOINT,
            bucket: MINIO_BUCKET,
            region: MINIO_REGION,
        });

        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            await s3.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));
            console.log(`✅ MinIO: bucket "${MINIO_BUCKET}" created`);
        } else {
            throw err;
        }
    }
};
/**
 * Generate a pre-signed GET URL (replaces your current signed-URL logic).
 * @param {string} key
 * @param {number} expiresInSeconds  default 60
 */
const getPresignedUrl = async (key, expiresInSeconds = 60) => {
    const command = new GetObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
    });

    const internalUrl = await getSignedUrl(s3, command, {  // ← use s3 directly, not s3WithoutChecksum
        expiresIn: expiresInSeconds
    });

    const PUBLIC_MINIO_BASE = process.env.PUBLIC_MINIO_BASE || 'http://localhost/storage';  // ← add this
    const url = new URL(internalUrl);
    return internalUrl.replace(url.origin, PUBLIC_MINIO_BASE);
};
module.exports = { s3, uploadObject, deleteObject, getPresignedUrl, objectExists, connectMinio, MINIO_BUCKET };