#!/usr/bin/env node

const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

function getTsFiles(dir, relativeTo) {
	const files = [];
	const items = fs.readdirSync(dir, { withFileTypes: true });
	for (const item of items) {
		const full = path.join(dir, item.name);
		if (item.isDirectory()) {
			files.push(...getTsFiles(full, relativeTo));
		} else if (item.name.endsWith(".ts") && !item.name.endsWith(".d.ts")) {
			files.push(path.relative(relativeTo, full).replace(/\\/g, "/"));
		}
	}
	return files;
}

function generateManifest() {
	const commandFiles = getTsFiles("./src/commands", "./src");
	const eventFiles = getTsFiles("./src/events", "./src");

	let content = `// Auto-generated manifest — do not edit\n\n`;

	content += `export const commands = [\n`;
	for (const f of commandFiles) {
		const importPath = f.replace(/\.ts$/, "");
		content += `  { path: "${f}", module: import("@/${importPath}") },\n`;
	}
	content += `];\n\n`;

	content += `export const events = [\n`;
	for (const f of eventFiles) {
		const importPath = f.replace(/\.ts$/, "");
		content += `  { path: "${f}", module: import("@/${importPath}") },\n`;
	}
	content += `];\n`;

	fs.writeFileSync("./src/manifest.ts", content);
	console.log(`Manifest generated: ${commandFiles.length} commands, ${eventFiles.length} events`);
}

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

	generateManifest();

	console.log("Starting esbuild bundling (minified, single file)...");

	try {
		await esbuild.build({
			entryPoints: ["./src/index.ts"],
			bundle: true,
			platform: "node",
			target: "node20",
			outfile: "./dist/index.js",
			format: "cjs",
			alias: {
				"@": "./src",
				"@manifest": "./src/manifest",
				"@utils": "./src/utils",
				"@handlers": "./src/handlers",
				"@events": "./src/events",
				"@models": "./src/models",
				"@services": "./src/services",
				"@types": "./src/types",
				"@config": "./src/config",
			},
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
			minify: true,
			sourcemap: true,
			logLevel: "warning",
			logOverride: { "direct-eval": "silent" },
		});

		const outputSize = fs.statSync("./dist/index.js").size;
		console.log(`Build completed. Output: dist/index.js (${outputSize} bytes)`);
	} catch (error) {
		console.error(`Build failed: ${error.message}`);
		process.exit(1);
	}
}

build();
