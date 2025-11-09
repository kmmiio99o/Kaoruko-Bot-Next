#!/usr/bin/env node

// Kaoruko Bot Development Script - Refactored for npm and tsc (multi-file compilation) with nodemon
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
  "\x1b[36m║                                🌐 Built-in Web Dashboard Included 🌐                              ║",
);
console.log(
  "\x1b[36m║                                   ⚡ Powered by Node.js & npm ⚡                                 ║",
);
console.log(
  "\x1b[36m╚══════════════════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m",
);
console.log("");

const { exec, spawn } = require("child_process");
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

// Function to execute shell commands with promises and logging
function runCommand(command, errorMessage, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Executing: ${command}`, "debug");
    const child = exec(command, options);

    child.stdout.on("data", (data) => {
      process.stdout.write(`\x1b[36m${data}\x1b[0m`);
    });

    child.stderr.on("data", (data) => {
      process.stdout.write(`\x1b[31m${data}\x1b[0m`);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${errorMessage} (Exit code: ${code})`));
      }
    });

    child.on("error", (error) => {
      reject(
        new Error(`Failed to start command "${command}": ${error.message}`),
      );
    });
  });
}

async function startDevelopment() {
  // Clean dist folder
  log("🧹 Cleaning build directory...", "info");

  if (fs.existsSync("./dist")) {
    try {
      fs.rmSync("./dist", { recursive: true, force: true });
      log("✅ Clean completed successfully", "success");
    } catch (error) {
      log(`❌ Failed to clean dist directory: ${error.message}`, "error");
      process.exit(1);
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
        module: "CommonJS",
        moduleResolution: "node",
        lib: ["ES2022"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: false, // Declarations will not be generated in dev mode
        declarationMap: false,
        sourceMap: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        types: ["node"], // Ensure Node.js types are available
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
      process.exit(1);
    }
  }

  // Check source directory
  log("📂 Checking source entry point...", "info");
  const entryPoint = "./src/index.ts";
  if (!fs.existsSync(entryPoint)) {
    log(
      `❌ Source entry point (${entryPoint}) not found! Cannot start development.`,
      "error",
    );
    log("💡 Please create the src/index.ts file.", "info");
    process.exit(1);
  }
  log(`✅ Found entry point: ${entryPoint}`, "success");

  log("🚀 Starting bot in development mode with nodemon...", "info");
  log("🔄 Auto-restart on file changes enabled.", "success");
  log("🌐 Web dashboard will be available at http://localhost:3000", "info");
  log(
    "📊 Dashboard features: Real-time stats, server management, logs, settings",
    "debug",
  );
  log(
    "🔐 Dashboard uses basic auth token (check .env DASHBOARD_TOKEN)",
    "debug",
  );
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
    "\x1b[32m║                                  🔄 Auto Reload Enabled 🔄                                        ║",
  );
  console.log(
    "\x1b[32m╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m",
  );

  const nodemonCommand = [
    "npm",
    "exec",
    "nodemon",
    "--watch",
    "src",
    "--ext",
    "ts,json",
    "--exec",
    "sh -c 'npm exec tsc && node ./dist/index.js'",
    "--delay",
    "1", // 1-second delay to debounce multiple file changes
    "--signal",
    "SIGTERM", // Gracefully shutdown previous process
    "--verbose",
    "--legacy-watch", // Fallback for some environments
  ];

  const nodemonProcess = spawn(nodemonCommand[0], nodemonCommand.slice(1), {
    stdio: "inherit", // Inherit stdin/stdout/stderr for direct output
    env: { ...process.env, NODE_ENV: "development" },
    shell: true, // Use shell to correctly execute the compound --exec command
  });

  nodemonProcess.on("close", (code) => {
    if (code === 0) {
      log("🤖 Development server exited normally", "info");
    } else {
      log(`🤖 Development server exited with code ${code}`, "warn");
    }
    process.exit(code || 0);
  });

  nodemonProcess.on("error", (error) => {
    log(`❌ Failed to start nodemon process: ${error.message}`, "error");
    process.exit(1);
  });

  // Handle Ctrl+C gracefully
  process.on("SIGINT", () => {
    log("🛑 Shutting down development mode...", "warn");
    nodemonProcess.kill("SIGINT"); // Send SIGINT to nodemon
    setTimeout(() => {
      if (!nodemonProcess.killed) {
        log("💀 Force killing nodemon process...", "error");
        nodemonProcess.kill("SIGKILL");
      }
      process.exit(0);
    }, 5000); // Give nodemon 5 seconds to shut down
  });

  process.on("SIGTERM", () => {
    log("🛑 Received SIGTERM, shutting down development mode...", "warn");
    nodemonProcess.kill("SIGTERM");
    process.exit(0);
  });
}

// Start the development process
startDevelopment();
