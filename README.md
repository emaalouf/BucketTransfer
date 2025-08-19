# Bucket Transfer Tool

A Node.js utility to transfer files from DigitalOcean Spaces to AWS S3 buckets.

## Features

- Transfers all objects from DigitalOcean Spaces to AWS S3
- Skips objects that already exist in the destination bucket
- Concurrent transfers with configurable batch size
- Progress tracking and statistics
- Error handling and logging
- Preserves object metadata and content types

## Setup

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your credentials:
   ```env
   # DigitalOcean Spaces Configuration
   DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
   DO_SPACES_ACCESS_KEY_ID=your_do_spaces_access_key
   DO_SPACES_SECRET_ACCESS_KEY=your_do_spaces_secret_key
   DO_SPACES_BUCKET_NAME=your_do_spaces_bucket_name
   DO_SPACES_REGION=nyc3

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=your_aws_s3_bucket_name

   # Transfer Options
   BATCH_SIZE=100
   MAX_CONCURRENT_TRANSFERS=10
   ```

## Usage

### Standard Usage

Run the transfer:
```bash
npm start
```

Or directly:
```bash
node transfer.js
```

### PM2 Usage (Process Manager)

For production environments or long-running transfers, you can use PM2:

1. Install PM2 globally (optional):
   ```bash
   npm install -g pm2
   ```

2. Start the transfer with PM2:
   ```bash
   npm run pm2:start
   ```

3. Monitor the process:
   ```bash
   npm run pm2:logs     # View logs
   npm run pm2:monit    # Open PM2 monitoring dashboard
   ```

4. Manage the process:
   ```bash
   npm run pm2:stop     # Stop the transfer
   npm run pm2:restart  # Restart the transfer
   npm run pm2:delete   # Remove from PM2
   ```

**PM2 Benefits:**
- Process monitoring and automatic restart on failure
- Log management with rotation
- Memory usage monitoring
- Background execution
- Detailed process statistics

## Configuration Options

- `BATCH_SIZE`: Number of objects to list per API call (default: 100)
- `MAX_CONCURRENT_TRANSFERS`: Maximum number of concurrent transfers (default: 10)

## Output

The tool provides real-time progress updates and final statistics including:
- Total objects found
- Number of objects transferred
- Number of objects skipped (already exist)
- Number of errors
- Transfer duration and rate

## Error Handling

- Objects that already exist in S3 are skipped
- Transfer errors are logged but don't stop the process
- Missing environment variables are validated at startup

## Log Files (PM2)

When using PM2, logs are stored in the `logs/` directory:
- `bucket-transfer.log` - Combined output and error logs
- `bucket-transfer-out.log` - Standard output logs
- `bucket-transfer-error.log` - Error logs

## Requirements

- Node.js 14 or higher
- Valid DigitalOcean Spaces credentials with read access
- Valid AWS S3 credentials with write access to the destination bucket
- PM2 (optional, for process management)