#!/usr/bin/env node

// Kaoruko Bot Build Script - Refactored for pnpm and tsc (multi-file compilation)
console.log("\x1b[36m╔══════════════════════════════════════╗");
console.log("\x1b[36m║         BUILDING DISCORD BOT         ║");
console.log("\x1b[36m╚══════════════════════════════════════╝\x1b[0m");

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

// Function to execute shell commands with promises and logging
function runCommand(command, errorMessage, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Executing: ${command}`, "debug");
    const child = exec(command, options);

    child.stdout.on("data", (data) => {
      process.stdout.write(`\x1b[36m${data}\x1b[0m`);
    });

    child.stderr.on("data", (data) => {
      process.stderr.write(`\x1b[31m${data}\x1b[0m`);
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

async function startBuild() {
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

  // Check if TypeScript config exists
  log("🔍 Checking TypeScript configuration...", "info");
  if (!fs.existsSync("./tsconfig.json")) {
    log(
      "⚠️  tsconfig.json not found! Creating default configuration...",
      "warn",
    );

    const defaultTsConfig = {
      compilerOptions: {
        target: "ES2022",
        module: "CommonJS", // Output CommonJS modules for Node.js
        moduleResolution: "node", // Node.js module resolution
        lib: ["ES2022"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true, // Generate .d.ts files
        declarationMap: true, // Generate .d.ts.map files
        sourceMap: true, // Generate .map files for .js output
        experimentalDecorators: true, // Often useful for Discord bots with decorators
        emitDecoratorMetadata: true, // Often useful for Discord bots with decorators
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
  log("📂 Checking source directory...", "info");
  if (!fs.existsSync("./src")) {
    log("❌ Source directory (src/) not found! Cannot build.", "error");
    log(
      "💡 Please create the src/ directory with your TypeScript files.",
      "info",
    );
    process.exit(1);
  }

  // Perform compilation with tsc
  log("🚀 Starting TypeScript compilation with tsc...", "info");
  try {
    await runCommand(
      "pnpm exec tsc", // Simply run tsc to compile all files
      "TypeScript compilation failed!",
    );
    log("✅ TypeScript compilation completed successfully!", "success");

    // Count compiled files for reporting
    function countCompiledFiles(dir) {
      if (!fs.existsSync(dir)) return 0;
      let count = 0;
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          count += countCompiledFiles(fullPath);
        } else if (
          file.isFile() &&
          (file.name.endsWith(".js") || file.name.endsWith(".d.ts"))
        ) {
          count++;
        }
      }
      return count;
    }

    const compiledFileCount = fs.existsSync("./dist")
      ? countCompiledFiles("./dist")
      : 0;
    log(`📄 Compiled ${compiledFileCount} files to dist/`, "success");
    log(`Build output: dist/ (multiple files)`, "info");

    console.log("\n\x1b[32m╔══════════════════════════════════════╗");
    console.log("\x1b[32m║     BUILD COMPLETED SUCCESSFULLY     ║");
    console.log("\x1b[32m╚══════════════════════════════════════╝\x1b[0m");
    log("You can now run 'pnpm start' to start the bot", "info");
  } catch (error) {
    log(`❌ Build failed: ${error.message}`, "error");
    console.log("\n\x1b[31m╔══════════════════════════════════════╗");
    console.log("\x1b[31m║           BUILD FAILED               ║");
    console.log("\x1b[31m╚══════════════════════════════════════╝\x1b[0m");
    process.exit(1);
  }
}

// Start the build process
startBuild();

// process.on handlers remain unchanged
process.on("unhandledRejection", (reason, promise) => {
  log(`Unhandled Rejection at: ${promise} reason: ${reason}`, "error");
});

process.on("uncaughtException", (error) => {
  log(`Uncaught Exception: ${error.message}\n${error.stack}`, "error");
  process.exit(1);
});
