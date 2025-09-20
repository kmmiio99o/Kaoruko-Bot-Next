// Kaoruko Bot Development Script
console.log(
  "\x1b[36m╔══════════════════════════════════════════════════════════════════════════════════════════════════╗",
);
console.log(
  "\x1b[36m║                                    KAORUKO BOT DEVELOPMENT                                       ║",
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
  log("⚠️  tsconfig.json not found! Creating default configuration...", "warn");

  const defaultTsConfig = {
    compilerOptions: {
      target: "ES2022",
      module: "commonjs",
      lib: ["ES2022"],
      outDir: "./dist",
      rootDir: "./src",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      allowSyntheticDefaultImports: true,
      moduleResolution: "node",
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
  log("💡 Please create the src/ directory with your TypeScript files", "info");
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

// Compile TypeScript with enhanced error handling
log("🚀 Starting TypeScript compilation...", "info");
log("⏳ This may take a moment depending on the number of files...", "debug");

const compile = exec("tsc", { cwd: process.cwd() });

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
    log("✅ TypeScript compilation completed successfully!", "success");

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
    log(
      `📁 Compiled ${compiledFileCount} JavaScript files to dist/`,
      "success",
    );
    log(`📦 Build output: dist/ (${compiledFileCount} files)`, "info");

    console.log(
      "\n\x1b[32m╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "\x1b[32m║                                    START COMPLETED SUCCESSFULLY                                      ║",
    );
    console.log(
      "\x1b[32m║                              🌐 Dashboard: http://localhost:3000 🌐                              ║",
    );
    console.log(
      "\x1b[32m╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m",
    );

    // Start the bot
    log("🚀 Starting bot in development mode...", "info");
    log("🌐 Web dashboard will be available at http://localhost:3000", "info");
    log("📊 Dashboard features: Real-time stats, server management, logs, settings", "debug");
    log("🔐 Dashboard uses basic auth token (check .env DASHBOARD_TOKEN)", "debug");
    log("🔄 Auto-restart enabled", "debug");
    log("⌨️  Press Ctrl+C to stop", "debug");
    console.log("");

    // Start the bot process
    const botProcess = exec("node dist/index.js", {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
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
      } else if (output.includes("Dashboard dostępny")) {
        console.log("\x1b[35m🌐 " + output.trim() + "\x1b[0m");
      } else if (output.includes("Serwer webowy")) {
        console.log("\x1b[35m🌐 " + output.trim() + "\x1b[0m");
      } else {
        console.log("\x1b[37m" + output.trim() + "\x1b[0m");
      }
    });

    botProcess.stderr.on("data", (data) => {
      console.log("\x1b[31mSTDERR: " + data.toString().trim() + "\x1b[0m");
    });

    botProcess.on("close", (code) => {
      log(`🤖 Bot process exited with code ${code}`, "info");
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
  } else {
    log(`❌ Build failed with exit code ${code}`, "error");

    // Show detailed error output
    if (stdoutOutput.trim()) {
      log("📄 STDOUT output:", "debug");
      console.log("\x1b[36m" + stdoutOutput.trim() + "\x1b[0m");
    }

    if (stderrOutput.trim()) {
      log("📄 STDERR output:", "error");
      console.log("\x1b[31m" + stderrOutput.trim() + "\x1b[0m");
    }

    // Parse TypeScript errors for better readability
    if (stderrOutput.includes("error TS")) {
      log("🔥 TypeScript Compilation Errors:", "error");

      const errorLines = stderrOutput.split("\n");
      let errorCount = 0;

      errorLines.forEach((line) => {
        if (line.includes("error TS") && errorCount < 10) {
          // Limit to 10 errors
          // Extract error code and message
          const errorCodeMatch = line.match(/error (TS\d+): (.*)/);
          if (errorCodeMatch) {
            const [, errorCode, errorMessage] = errorCodeMatch;
            log(`[${errorCode}] ${errorMessage}`, "error");
            errorCount++;
          } else {
            log(line, "error");
            errorCount++;
          }
        }
      });

      if (errorCount >= 10) {
        log(
          `... and ${errorLines.filter((l) => l.includes("error TS")).length - 10} more errors`,
          "warn",
        );
      }
    }

    console.log(
      "\n\x1b[31m╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "\x1b[31m║                                           BUILD FAILED                                             ║",
    );
    console.log(
      "\x1b[31m║                              🌐 Dashboard will not be available 🌐                              ║",
    );
    console.log(
      "\x1b[31m╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m",
    );

    process.exit(1);
  }
});

compile.on("error", (error) => {
  log(`❌ Failed to start TypeScript compiler: ${error.message}`, "error");
  process.exit(1);
});
