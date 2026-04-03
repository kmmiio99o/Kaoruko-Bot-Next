#!/usr/bin/env node

const esbuild = require("esbuild");
const fs = require("fs");
const { spawn } = require("child_process");

async function dev() {
  console.log("Cleaning dist directory...");
  if (fs.existsSync("./dist")) {
    fs.rmSync("./dist", { recursive: true, force: true });
  }
  console.log("Dist directory cleaned.");

  if (!fs.existsSync("./src")) {
    console.error("Error: src directory not found.");
    process.exit(1);
  }

  if (!fs.existsSync("./src/index.ts")) {
    console.error("Error: src/index.ts not found.");
    process.exit(1);
  }

  console.log("Starting esbuild bundling with watch mode...");

  const ctx = await esbuild.context({
    entryPoints: ["./src/index.ts"],
    bundle: true,
    platform: "node",
    target: "node20",
    outfile: "./dist/index.js",
    format: "cjs",
    external: [
      "discord.js",
      "express",
      "socket.io",
      "mongoose",
      "mongodb",
      "axios",
      "cors",
      "dotenv",
    ],
    sourcemap: true,
    minify: false,
    logLevel: "warning",
  });

  await ctx.watch();
  console.log("Watching for file changes...");

  let botProcess = null;

  function startBot() {
    if (botProcess) {
      botProcess.kill("SIGTERM");
    }

    console.log("Starting bot...");
    botProcess = spawn("node", ["./dist/index.js"], {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development" },
    });

    botProcess.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.log(`Bot exited with code ${code}, restarting...`);
        setTimeout(startBot, 1000);
      }
    });
  }

  await ctx.rebuild();
  startBot();

  process.on("SIGINT", () => {
    console.log("Shutting down...");
    if (botProcess) {
      botProcess.kill("SIGTERM");
    }
    ctx.dispose();
    process.exit(0);
  });
}

dev();
