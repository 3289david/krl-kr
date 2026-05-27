module.exports = {
  apps: [
    {
      name: "krl-kr",
      cwd: "/var/www/krl-kr",
      script: "./start.sh",
      interpreter: "bash",
      // Give old process 10s to die + release port before SIGKILL
      kill_timeout: 10000,
      // Minimum 8s uptime to count as "successfully started"
      min_uptime: "8s",
      // Only retry 5 times to avoid runaway restart loops
      max_restarts: 5,
      // Wait 4s between restarts (extra buffer for port release)
      restart_delay: 4000,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
