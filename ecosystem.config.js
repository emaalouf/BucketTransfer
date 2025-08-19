module.exports = {
  apps: [{
    name: 'bucket-transfer',
    script: 'transfer.js',
    instances: 1,
    autorestart: false,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    log_file: './logs/bucket-transfer.log',
    out_file: './logs/bucket-transfer-out.log',
    error_file: './logs/bucket-transfer-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};