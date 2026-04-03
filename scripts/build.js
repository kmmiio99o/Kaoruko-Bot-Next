#!/usr/bin/env node

const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

async function build() {
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

	console.log("Starting esbuild bundling...");

	try {
		await esbuild.build({
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
			minify: true,
			logLevel: "warning",
		});

		const outputSize = fs.statSync("./dist/index.js").size;
        console.log(
            `Bundling completed. Output: dist/index.js (${outputSize} bytes)`,
        );
        try {
            const mapPath = "./dist/index.js.map";
            if (fs.existsSync(mapPath)) {
                console.log("Wrote dist/index.js.map");
            } else {
                console.debug("dist/index.js.map not found after bundle");
            }
        } catch (e) {
            // ignore
        }
	} catch (error) {
		console.error(`Build failed: ${error.message}`);
		process.exit(1);
	}
}

build();
