#!/usr/bin/env node

// Kaoruko Bot Development Script
console.log(
  "\x1b[36m╔══════════════════════════════════════════════════════════════════════════════════════════════════╗",
);
console.log(
  "\x1b[36m║                                      KAORUKO BOT DEVELOPMENT                                     ║",
);
console.log(
  "\x1b[36m╠══════════════════════════════════════════════════════════════════════════════════════════════════╣",
);
console.log(
  "\x1b[36m║                      Advanced Discord Bot Framework - TypeScript Edition                         ║",
);
console.log(
  "\x1b[36m║                              🌐 Built-in Web Dashboard Included 🌐                              ║",
);
console.log(
  "\x1b[36m║                                  ⚡ Powered by Bun ⚡                                           ║",
);
console.log(
  "\x1b[36m╚══════════════════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m",
);
console.log("");

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Enhanced logging function
function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const colors = {
    info: "\x1b[36m", // Cyan
    warn: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
    success: "\x1b[32m", // Green
    debug: "\x1b[35m", // Magenta
    reset: "\x1b[0m", // Reset
  };

  const typeColors = {
    info: "\x1b[46m", // Cyan background
    warn: "\x1b[43m", // Yellow background
    error: "\x1b[41m", // Red background
    success: "\x1b[42m", // Green background
    debug: "\x1b[45m", // Magenta background
    reset: "\x1b[0m", // Reset
  };

  console.log(
    `${colors[type]}[${timestamp}] ${typeColors[type]}[${type.toUpperCase().padEnd(7)}]${typeColors.reset} ${message}${colors.reset}`,
  );
}

// Check if bun is available
log("🔍 Checking bun installation...", "info");
exec("bun --version", (error, stdout) => {
  if (error) {
    log("❌ Bun is not installed or not available in PATH", "error");
    log("💡 Please install bun from https://bun.sh", "info");
    process.exit(1);
  }
  log(`⚡ Using bun version: ${stdout.trim()}`, "success");
  startDevelopment();
});

function startDevelopment() {
  // Clean dist folder
  log("🧹 Cleaning build directory...", "info");

  if (fs.existsSync("./dist")) {
    try {
      fs.rmSync("./dist", { recursive: true, force: true });
      log("✅ Clean completed successfully", "success");
    } catch (error) {
      log(`❌ Failed to clean dist directory: ${error.message}`, "error");
    }
  } else {
    log("✅ No dist directory to clean", "success");
  }

  // Check TypeScript configuration
  log("🔍 Checking TypeScript configuration...", "info");
  if (!fs.existsSync("./tsconfig.json")) {
    log(
      "⚠️  tsconfig.json not found! Creating default configuration...",
      "warn",
    );

    const defaultTsConfig = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        lib: ["ES2022"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        types: ["bun-types"],
        allowImportingTsExtensions: false,
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };

    try {
      fs.writeFileSync(
        "./tsconfig.json",
        JSON.stringify(defaultTsConfig, null, 2),
      );
      log("✅ Created default tsconfig.json", "success");
    } catch (error) {
      log(`❌ Failed to create tsconfig.json: ${error.message}`, "error");
    }
  }

  // Check source directory
  log("📂 Checking source directory...", "info");
  if (!fs.existsSync("./src")) {
    log("❌ Source directory (src/) not found!", "error");
    log(
      "💡 Please create the src/ directory with your TypeScript files",
      "info",
    );
    process.exit(1);
  }

  // Count source files
  function countSourceFiles(dir) {
    if (!fs.existsSync(dir)) return 0;

    let count = 0;
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        count += countSourceFiles(fullPath);
      } else if (
        file.isFile() &&
        (file.name.endsWith(".ts") || file.name.endsWith(".tsx"))
      ) {
        count++;
      }
    }

    return count;
  }

  const sourceFileCount = countSourceFiles("./src");
  log(`📄 Found ${sourceFileCount} TypeScript source files`, "info");

  if (sourceFileCount === 0) {
    log("⚠️  No TypeScript files found in src/ directory!", "warn");
    log("💡 Make sure your .ts files are in the src/ directory", "info");
  }

  // Use bun's built-in watch mode for development
  log("🚀 Starting bot in development mode with bun...", "info");
  log("⚡ Using bun's built-in hot reloading", "success");
  log("🌐 Web dashboard will be available at http://localhost:3000", "info");
  log(
    "📊 Dashboard features: Real-time stats, server management, logs, settings",
    "debug",
  );
  log(
    "🔐 Dashboard uses basic auth token (check .env DASHBOARD_TOKEN)",
    "debug",
  );
  log("🔄 Auto-restart enabled", "debug");
  log("⌨️  Press Ctrl+C to stop", "debug");
  console.log("");

  console.log(
    "\n\x1b[32m╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "\x1b[32m║                                    DEVELOPMENT MODE READY                                           ║",
  );
  console.log(
    "\x1b[32m║                              🌐 Dashboard: http://localhost:3000 🌐                              ║",
  );
  console.log(
    "\x1b[32m║                                  ⚡ Hot Reload Enabled ⚡                                        ║",
  );
  console.log(
    "\x1b[32m╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m",
  );

  // Start the bot process with bun's watch mode
  const botProcess = exec("bun --watch src/index.ts", {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
    env: { ...process.env, NODE_ENV: "development" },
  });

  botProcess.stdout.on("data", (data) => {
    const output = data.toString();
    if (output.includes("[SUCCESS]")) {
      console.log("\x1b[32m" + output.trim() + "\x1b[0m");
    } else if (output.includes("[ERROR]")) {
      console.log("\x1b[31m" + output.trim() + "\x1b[0m");
    } else if (output.includes("[WARN]")) {
      console.log("\x1b[33m" + output.trim() + "\x1b[0m");
    } else if (output.includes("[INFO]")) {
      console.log("\x1b[36m" + output.trim() + "\x1b[0m");
    } else if (
      output.includes("Dashboard dostępny") ||
      output.includes("dashboard")
    ) {
      console.log("\x1b[35m🌐 " + output.trim() + "\x1b[0m");
    } else if (
      output.includes("Serwer webowy") ||
      output.includes("web server")
    ) {
      console.log("\x1b[35m🌐 " + output.trim() + "\x1b[0m");
    } else if (
      output.includes("restarting") ||
      output.includes("File change detected")
    ) {
      console.log("\x1b[35m🔄 " + output.trim() + "\x1b[0m");
    } else {
      console.log("\x1b[37m" + output.trim() + "\x1b[0m");
    }
  });

  botProcess.stderr.on("data", (data) => {
    const error = data.toString();
    // Filter out bun's development warnings that aren't critical
    if (!error.includes("warn:") && !error.includes("ExperimentalWarning")) {
      console.log("\x1b[31mERROR: " + error.trim() + "\x1b[0m");
    }
  });

  botProcess.on("close", (code) => {
    if (code === 0) {
      log("🤖 Bot process exited normally", "info");
    } else {
      log(`🤖 Bot process exited with code ${code}`, "warn");
    }
  });

  botProcess.on("error", (error) => {
    log(`❌ Failed to start bot process: ${error.message}`, "error");
  });

  // Handle Ctrl+C gracefully
  process.on("SIGINT", () => {
    log("🛑 Shutting down bot...", "warn");
    botProcess.kill("SIGTERM");

    setTimeout(() => {
      log("💀 Force killing bot process...", "error");
      botProcess.kill("SIGKILL");
      process.exit(0);
    }, 5000);
  });

  process.on("SIGTERM", () => {
    log("🛑 Received SIGTERM, shutting down...", "warn");
    botProcess.kill("SIGTERM");
    process.exit(0);
  });
}
