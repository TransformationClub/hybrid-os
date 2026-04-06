module.exports = {
  apps: [
    {
      name: "hybrid-os",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/hybrid-os",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/hybrid-os/error.log",
      out_file: "/var/log/hybrid-os/out.log",
      merge_logs: true,
    },
  ],
};
