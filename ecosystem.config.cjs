module.exports = {
  apps: [
    { name: "purpo-web", script: "node_modules/next/dist/bin/next", args: "start -p 3000", instances: 2, exec_mode: "cluster", max_memory_restart: "1G", env: { NODE_ENV: "production" } },
    { name: "purpo-worker", script: "node_modules/tsx/dist/cli.mjs", args: "src/worker.ts", instances: 1, max_memory_restart: "1G", env: { NODE_ENV: "production" } }
  ]
};
