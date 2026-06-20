module.exports = {
  apps: [
    {
      name: "krl-kr",
      script: ".next/standalone/server.js",
      cwd: "/var/www/krl-kr",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: "3000",
        // All secrets are loaded from .env.local — do NOT commit that file.
        // Copy .env.example to .env.local and fill in the values.
      },
    },
    {
      name: "krl-ws-terminal",
      script: "ws-terminal.js",
      cwd: "/var/www/krl-kr",
      interpreter: "node",
      env_file: ".env.local",
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
