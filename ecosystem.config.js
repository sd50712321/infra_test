module.exports = {
  apps: [
    {
      name: "node-app",
      script: "app.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      // pm2-metrics 모니터링 추가
      pmx: true,
      exp_backoff_restart_delay: 100,
      source_map_support: true,
      max_restarts: 10,
      out_file: "./logs/console.log",
      error_file: "./logs/console.log",
      merge_logs: true,
      time: true,
    },
  ],
};
