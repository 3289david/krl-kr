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
  ],
};
