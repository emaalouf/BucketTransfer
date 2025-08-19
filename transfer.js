require('dotenv').config();
const AWS = require('aws-sdk');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

class BucketTransfer {
    constructor() {
        this.doSpacesClient = new AWS.S3({
            endpoint: process.env.DO_SPACES_ENDPOINT,
            accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID,
            secretAccessKey: process.env.DO_SPACES_SECRET_ACCESS_KEY,
            region: process.env.DO_SPACES_REGION || 'nyc3',
            s3ForcePathStyle: false,
            signatureVersion: 'v4'
        });

        this.awsS3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
        });

        this.doSpacesBucket = process.env.DO_SPACES_BUCKET_NAME;
        this.awsS3Bucket = process.env.AWS_S3_BUCKET_NAME;
        this.batchSize = parseInt(process.env.BATCH_SIZE) || 100;
        this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_TRANSFERS) || 10;
        
        this.stats = {
            totalObjects: 0,
            transferred: 0,
            skipped: 0,
            errors: 0,
            startTime: null
        };
    }

    async listAllObjects() {
        console.log(`Listing all objects in DigitalOcean Spaces bucket: ${this.doSpacesBucket}`);
        const allObjects = [];
        let continuationToken;

        do {
            const params = {
                Bucket: this.doSpacesBucket,
                MaxKeys: this.batchSize,
                ContinuationToken: continuationToken
            };

            try {
                const response = await this.doSpacesClient.listObjectsV2(params).promise();
                
                if (response.Contents) {
                    allObjects.push(...response.Contents);
                    console.log(`Found ${response.Contents.length} objects in this batch. Total so far: ${allObjects.length}`);
                }

                continuationToken = response.NextContinuationToken;
            } catch (error) {
                console.error('Error listing objects:', error);
                throw error;
            }
        } while (continuationToken);

        this.stats.totalObjects = allObjects.length;
        console.log(`Total objects found: ${this.stats.totalObjects}`);
        return allObjects;
    }

    async objectExistsInS3(key) {
        try {
            await this.awsS3Client.send(new HeadObjectCommand({
                Bucket: this.awsS3Bucket,
                Key: key
            }));
            return true;
        } catch (error) {
            if (error.name === 'NotFound') {
                return false;
            }
            throw error;
        }
    }

    async transferObject(object) {
        const key = object.Key;
        
        try {
            if (await this.objectExistsInS3(key)) {
                console.log(`Skipping ${key} - already exists in S3`);
                this.stats.skipped++;
                return { success: true, skipped: true };
            }

            const doObject = await this.doSpacesClient.getObject({
                Bucket: this.doSpacesBucket,
                Key: key
            }).promise();

            await this.awsS3Client.send(new PutObjectCommand({
                Bucket: this.awsS3Bucket,
                Key: key,
                Body: doObject.Body,
                ContentType: doObject.ContentType,
                Metadata: doObject.Metadata
            }));

            this.stats.transferred++;
            console.log(`✓ Transferred: ${key} (${this.formatBytes(object.Size)})`);
            return { success: true, skipped: false };

        } catch (error) {
            this.stats.errors++;
            console.error(`✗ Error transferring ${key}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async transferBatch(objects) {
        const promises = objects.map(obj => this.transferObject(obj));
        return Promise.all(promises);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    printStats() {
        const duration = Date.now() - this.stats.startTime;
        const durationSeconds = Math.floor(duration / 1000);
        const rate = this.stats.transferred / (durationSeconds / 60) || 0;

        console.log('\n=== Transfer Statistics ===');
        console.log(`Total Objects: ${this.stats.totalObjects}`);
        console.log(`Transferred: ${this.stats.transferred}`);
        console.log(`Skipped: ${this.stats.skipped}`);
        console.log(`Errors: ${this.stats.errors}`);
        console.log(`Duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`);
        console.log(`Rate: ${rate.toFixed(2)} objects/minute`);
    }

    async start() {
        try {
            console.log('Starting DigitalOcean Spaces to AWS S3 transfer...');
            console.log(`Source: ${this.doSpacesBucket} (DigitalOcean Spaces)`);
            console.log(`Destination: ${this.awsS3Bucket} (AWS S3)`);
            console.log(`Batch size: ${this.batchSize}, Max concurrent: ${this.maxConcurrent}\n`);

            this.stats.startTime = Date.now();

            const allObjects = await this.listAllObjects();
            
            if (allObjects.length === 0) {
                console.log('No objects found to transfer.');
                return;
            }

            console.log('\nStarting transfer...\n');

            for (let i = 0; i < allObjects.length; i += this.maxConcurrent) {
                const batch = allObjects.slice(i, i + this.maxConcurrent);
                await this.transferBatch(batch);
                
                const progress = ((i + batch.length) / allObjects.length * 100).toFixed(1);
                console.log(`Progress: ${progress}% (${i + batch.length}/${allObjects.length})`);
            }

            console.log('\nTransfer completed!');
            this.printStats();

        } catch (error) {
            console.error('Transfer failed:', error);
            process.exit(1);
        }
    }
}

function validateEnvironment() {
    const requiredVars = [
        'DO_SPACES_ENDPOINT',
        'DO_SPACES_ACCESS_KEY_ID',
        'DO_SPACES_SECRET_ACCESS_KEY',
        'DO_SPACES_BUCKET_NAME',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_S3_BUCKET_NAME'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.error('Missing required environment variables:');
        missing.forEach(varName => console.error(`- ${varName}`));
        console.error('\nPlease create a .env file based on .env.example');
        process.exit(1);
    }
}

if (require.main === module) {
    validateEnvironment();
    const transfer = new BucketTransfer();
    transfer.start().catch(console.error);
}

module.exports = BucketTransfer;