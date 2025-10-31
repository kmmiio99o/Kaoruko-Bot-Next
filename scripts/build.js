#!/usr/bin/env node

// Enhanced Build Script with Bun and Detailed Logging
console.log("\x1b[36m╔══════════════════════════════════════╗");
console.log("\x1b[36m║         BUILDING DISCORD BOT         ║");
console.log("\x1b[36m╚══════════════════════════════════════╝\x1b[0m");

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Function to log with timestamps
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

  console.log(
    `${colors[type]}[${timestamp}] [${type.toUpperCase()}] ${message}${colors.reset}`,
  );
}

// Check if bun is available
log("Checking bun installation...", "info");
exec("bun --version", (error, stdout) => {
  if (error) {
    log("Bun is not installed or not available in PATH", "error");
    log("Please install bun from https://bun.sh", "info");
    process.exit(1);
  }
  log(`Using bun version: ${stdout.trim()}`, "success");
  startBuild();
});

function startBuild() {
  // Clean dist folder
  log("Cleaning build directory...", "info");

  if (fs.existsSync("./dist")) {
    try {
      fs.rmSync("./dist", { recursive: true, force: true });
      log("Clean completed successfully", "success");
    } catch (error) {
      log(`Failed to clean dist directory: ${error.message}`, "error");
    }
  } else {
    log("No dist directory to clean", "info");
  }

  // Check if TypeScript config exists
  log("Checking TypeScript configuration...", "info");
  if (!fs.existsSync("./tsconfig.json")) {
    log("tsconfig.json not found! Creating default configuration...", "warn");

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
      log("Created default tsconfig.json", "success");
    } catch (error) {
      log(`Failed to create tsconfig.json: ${error.message}`, "error");
    }
  }

  // Check source directory
  log("Checking source directory...", "info");
  if (!fs.existsSync("./src")) {
    log("Source directory (src/) not found!", "error");
    log("Please create the src/ directory with your TypeScript files", "info");
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
  log(`Found ${sourceFileCount} TypeScript source files`, "info");

  if (sourceFileCount === 0) {
    log("No TypeScript files found in src/ directory!", "warn");
    log("Make sure your .ts files are in the src/ directory", "info");
  }

  // Compile TypeScript using bun
  log("Starting TypeScript compilation with bun...", "info");
  log("This may take a moment depending on the number of files...", "debug");

  const compile = exec("bunx tsc", { cwd: process.cwd() });

  let stdoutOutput = "";
  let stderrOutput = "";

  compile.stdout.on("data", (data) => {
    stdoutOutput += data;
    // Show progress dots but limit output
    if (stdoutOutput.length < 1000) {
      process.stdout.write("\x1b[36m.\x1b[0m");
    }
  });

  compile.stderr.on("data", (data) => {
    stderrOutput += data;
    // Show error dots but limit output
    if (stderrOutput.length < 1000) {
      process.stdout.write("\x1b[31m.\x1b[0m");
    }
  });

  compile.on("close", (code) => {
    console.log(""); // New line after dots

    if (code === 0) {
      log("TypeScript compilation completed successfully!", "success");

      // Count compiled files
      function countCompiledFiles(dir) {
        if (!fs.existsSync(dir)) return 0;

        let count = 0;
        const files = fs.readdirSync(dir, { withFileTypes: true });

        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            count += countCompiledFiles(fullPath);
          } else if (file.isFile() && file.name.endsWith(".js")) {
            count++;
          }
        }

        return count;
      }

      const compiledFileCount = fs.existsSync("./dist")
        ? countCompiledFiles("./dist")
        : 0;
      log(`Compiled ${compiledFileCount} JavaScript files to dist/`, "success");
      log(`Build output: dist/ (${compiledFileCount} files)`, "info");

      console.log("\n\x1b[32m╔══════════════════════════════════════╗");
      console.log("\x1b[32m║     BUILD COMPLETED SUCCESSFULLY     ║");
      console.log("\x1b[32m╚══════════════════════════════════════╝\x1b[0m");

      log("You can now run 'bun start' to start the bot", "info");
    } else {
      log(`Build failed with exit code ${code}`, "error");

      // Show detailed error output
      if (stdoutOutput.trim()) {
        log("STDOUT output:", "debug");
        console.log("\x1b[36m" + stdoutOutput.trim() + "\x1b[0m");
      }

      if (stderrOutput.trim()) {
        log("STDERR output:", "error");
        console.log("\x1b[31m" + stderrOutput.trim() + "\x1b[0m");
      }

      // Parse TypeScript errors for better readability
      if (stderrOutput.includes("error TS")) {
        log("TypeScript Compilation Errors Detected:", "error");

        const errorLines = stderrOutput.split("\n");
        errorLines.forEach((line) => {
          if (line.includes("error TS")) {
            // Extract error code and message
            const errorCodeMatch = line.match(/error (TS\d+): (.*)/);
            if (errorCodeMatch) {
              const [, errorCode, errorMessage] = errorCodeMatch;
              log(`[${errorCode}] ${errorMessage}`, "error");
            } else {
              log(line, "error");
            }
          }
        });
      }

      console.log("\n\x1b[31m╔══════════════════════════════════════╗");
      console.log("\x1b[31m║           BUILD FAILED               ║");
      console.log("\x1b[31m╚══════════════════════════════════════╝\x1b[0m");

      process.exit(1);
    }
  });

  compile.on("error", (error) => {
    log(`Failed to start TypeScript compiler: ${error.message}`, "error");
    process.exit(1);
  });
}
