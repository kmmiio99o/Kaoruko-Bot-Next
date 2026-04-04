import { Logger } from "@utils/logger";
import fs from "fs";
import os from "os";
import path from "path";
import vm from "vm";
import { Worker } from "worker_threads";

export interface SandboxContext {
	message?: Record<string, any>;
	interaction?: Record<string, any>;
	client?: Record<string, any>;
	guild?: Record<string, any>;
	channel?: Record<string, any>;
	user?: Record<string, any>;
	member?: Record<string, any>;
	args?: string[];
	variables?: Record<string, any>;
	customCommand?: Record<string, any>;
}

export interface SandboxResult {
	success: boolean;
	output?: any;
	error?: string;
}

const CHECKS: Array<{ pattern: RegExp; msg: string }> = [
	{ pattern: /\brequire\s*\(/, msg: "require() is not allowed" },
	{ pattern: /\bimport\s+/, msg: "import statements are not allowed" },
	{ pattern: /\bimport\s*\(/, msg: "dynamic import() is not allowed" },
	{ pattern: /\beval\s*\(/, msg: "eval() is not allowed" },
	{ pattern: /\bFunction\s*\(/, msg: "Function constructor is not allowed" },
	{ pattern: /\bnew\s+Function\s*\(/, msg: "Function constructor is not allowed" },
	{ pattern: /\bprocess\b/, msg: "process access is not allowed" },
	{ pattern: /\bglobal\b/, msg: "global access is not allowed" },
	{ pattern: /\bglobalThis\b/, msg: "globalThis access is not allowed" },
	{ pattern: /\b__dirname\b/, msg: "__dirname is not allowed" },
	{ pattern: /\b__filename\b/, msg: "__filename is not allowed" },
	{ pattern: /\bmodule\b/, msg: "module access is not allowed" },
	{ pattern: /\bexports\b/, msg: "exports access is not allowed" },
	{ pattern: /\bchild_process\b/, msg: "child_process is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]fs['"]\s*\)/, msg: "fs module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]path['"]\s*\)/, msg: "path module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]os['"]\s*\)/, msg: "os module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]http['"]\s*\)/, msg: "http module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]https['"]\s*\)/, msg: "https module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]net['"]\s*\)/, msg: "net module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]dgram['"]\s*\)/, msg: "dgram module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]cluster['"]\s*\)/, msg: "cluster module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]worker_threads['"]\s*\)/, msg: "worker_threads module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]vm['"]\s*\)/, msg: "vm module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]crypto['"]\s*\)/, msg: "crypto module is not allowed" },
	{ pattern: /\brequire\s*\(\s*['"]dns['"]\s*\)/, msg: "dns module is not allowed" },
	{ pattern: /\bconstructor\s*\[/, msg: "constructor access is not allowed" },
	{ pattern: /\bconstructor\s*\./, msg: "constructor access is not allowed" },
	{ pattern: /\bconstructor\s*\(/, msg: "constructor access is not allowed" },
	{ pattern: /\b__proto__\b/, msg: "__proto__ access is not allowed" },
	{ pattern: /\bprototype\b/, msg: "prototype access is not allowed" },
	{ pattern: /\barguments\b/, msg: "arguments access is not allowed" },
	{ pattern: /\bcallee\b/, msg: "callee access is not allowed" },
	{ pattern: /\bcaller\b/, msg: "caller access is not allowed" },
	{ pattern: /\bexec\s*\(/, msg: "exec() is not allowed" },
	{ pattern: /\bspawn\s*\(/, msg: "spawn() is not allowed" },
	{ pattern: /\bexecFile\s*\(/, msg: "execFile() is not allowed" },
	{ pattern: /\bexecSync\s*\(/, msg: "execSync() is not allowed" },
	{ pattern: /\bspawnSync\s*\(/, msg: "spawnSync() is not allowed" },
	{ pattern: /\bfork\s*\(/, msg: "fork() is not allowed" },
	{ pattern: /\bfetch\s*\(/, msg: "fetch() is not allowed" },
	{ pattern: /\bXMLHttpRequest\b/, msg: "XMLHttpRequest is not allowed" },
	{ pattern: /\bWebAssembly\b/, msg: "WebAssembly is not allowed" },
	{ pattern: /\bWorker\b/, msg: "Worker is not allowed" },
	{ pattern: /while\s*\(\s*true\s*\)/, msg: "infinite while loop is not allowed" },
	{ pattern: /for\s*\(\s*;\s*;\s*\)/, msg: "infinite for loop is not allowed" },
	{ pattern: /\[Symbol\.toStringTag\]/, msg: "Symbol.toStringTag modification is not allowed" },
	{ pattern: /Object\.getOwnPropertyDescriptor/, msg: "Object.getOwnPropertyDescriptor is not allowed" },
	{ pattern: /Object\.getOwnPropertyDescriptors/, msg: "Object.getOwnPropertyDescriptors is not allowed" },
	{ pattern: /Object\.defineProperty/, msg: "Object.defineProperty is not allowed" },
	{ pattern: /Object\.defineProperties/, msg: "Object.defineProperties is not allowed" },
	{ pattern: /Object\.setPrototypeOf/, msg: "Object.setPrototypeOf is not allowed" },
	{ pattern: /Object\.create\s*\(\s*null\s*\)/, msg: "Object.create(null) is not allowed" },
	{ pattern: /\bthis\b/, msg: "this access is not allowed" },
	{ pattern: /String\s*\.\s*fromCharCode/, msg: "String.fromCharCode is not allowed (obfuscation vector)" },
	{ pattern: /String\s*\.\s*raw/, msg: "String.raw is not allowed" },
	{ pattern: /\bsetTimeout\b/, msg: "setTimeout is not allowed" },
	{ pattern: /\bsetInterval\b/, msg: "setInterval is not allowed" },
	{ pattern: /\bsetImmediate\b/, msg: "setImmediate is not allowed" },
	{ pattern: /\bclearTimeout\b/, msg: "clearTimeout is not allowed" },
	{ pattern: /\bclearInterval\b/, msg: "clearInterval is not allowed" },
	{ pattern: /\bclearImmediate\b/, msg: "clearImmediate is not allowed" },
	{ pattern: /\bqueueMicrotask\b/, msg: "queueMicrotask is not allowed" },
	{ pattern: /\bAbortController\b/, msg: "AbortController is not allowed" },
	{ pattern: /\bAbortSignal\b/, msg: "AbortSignal is not allowed" },
	{ pattern: /\bEventSource\b/, msg: "EventSource is not allowed" },
	{ pattern: /\bWebSocket\b/, msg: "WebSocket is not allowed" },
	{ pattern: /\bnavigator\b/, msg: "navigator is not allowed" },
	{ pattern: /\bperformance\b/, msg: "performance is not allowed" },
	{ pattern: /\bSharedArrayBuffer\b/, msg: "SharedArrayBuffer is not allowed" },
	{ pattern: /\bAtomics\b/, msg: "Atomics is not allowed" },
	{ pattern: /\bDTRACE\b/, msg: "DTRACE is not allowed" },
	{ pattern: /\bLTTNG\b/, msg: "LTTNG is not allowed" },
	{ pattern: /\bparentPort\b/, msg: "parentPort is not allowed" },
	{ pattern: /\bthreadId\b/, msg: "threadId is not allowed" },
	{ pattern: /\bisMainThread\b/, msg: "isMainThread is not allowed" },
	{ pattern: /\bMessageChannel\b/, msg: "MessageChannel is not allowed" },
	{ pattern: /\bMessagePort\b/, msg: "MessagePort is not allowed" },
	{ pattern: /\bBroadcastChannel\b/, msg: "BroadcastChannel is not allowed" },
];

const DANGEROUS_MODULES = [
	"fs", "path", "os", "http", "https", "net", "dgram",
	"cluster", "worker_threads", "vm", "crypto", "dns",
	"child_process", "tls", "zlib", "stream", "util",
	"sys", "url", "querystring", "punycode", "string_decoder",
	"timers", "assert", "buffer", "events", "readline",
	"repl", "domain", "inspector", "async_hooks", "perf_hooks",
	"trace_events", "v8", "napi", "node_api",
];

const DANGEROUS_KEYS = [
	"constructor", "__proto__", "prototype", "require",
	"process", "global", "globalThis", "module", "exports",
	"__dirname", "__filename", "main", "parent",
];

const WORKER_CODE = `
const { parentPort } = require('worker_threads');
const vm = require('vm');

parentPort.on('message', async (msg) => {
	if (msg.type !== 'execute') return;

	try {
		const { source, context } = msg;

		const sandbox = {
			console: {
				log: (...a) => parentPort.postMessage({ type: 'console', level: 'log', args: a }),
				error: (...a) => parentPort.postMessage({ type: 'console', level: 'error', args: a }),
				warn: (...a) => parentPort.postMessage({ type: 'console', level: 'warn', args: a }),
				info: (...a) => parentPort.postMessage({ type: 'console', level: 'info', args: a }),
				debug: (...a) => parentPort.postMessage({ type: 'console', level: 'debug', args: a }),
			},
			message: context.message || null,
			interaction: context.interaction || null,
			client: context.client || null,
			guild: context.guild || null,
			channel: context.channel || null,
			user: context.user || null,
			member: context.member || null,
			args: context.args || [],
			variables: context.variables || {},
			customCommand: context.customCommand || null,
			Math: Math,
			JSON: JSON,
			Array: Array,
			Object: Object,
			String: String,
			Number: Number,
			Boolean: Boolean,
			Date: Date,
			RegExp: RegExp,
			Error: Error,
			TypeError: TypeError,
			RangeError: RangeError,
			SyntaxError: SyntaxError,
			ReferenceError: ReferenceError,
			URIError: URIError,
			parseInt: parseInt,
			parseFloat: parseFloat,
			isNaN: isNaN,
			isFinite: isFinite,
			Infinity: Infinity,
			NaN: NaN,
			Promise: Promise,
			Map: Map,
			Set: Set,
			WeakMap: WeakMap,
			WeakSet: WeakSet,
			Symbol: Symbol,
			Proxy: Proxy,
			Reflect: Reflect,
			Intl: Intl,
			ArrayBuffer: ArrayBuffer,
			DataView: DataView,
			Int8Array: Int8Array,
			Uint8Array: Uint8Array,
			Uint8ClampedArray: Uint8ClampedArray,
			Int16Array: Int16Array,
			Uint16Array: Uint16Array,
			Int32Array: Int32Array,
			Uint32Array: Uint32Array,
			Float32Array: Float32Array,
			Float64Array: Float64Array,
			BigInt: BigInt,
			BigInt64Array: BigInt64Array,
			BigUint64Array: BigUint64Array,
			TextEncoder: TextEncoder,
			TextDecoder: TextDecoder,
			encodeURIComponent: encodeURIComponent,
			decodeURIComponent: decodeURIComponent,
			encodeURI: encodeURI,
			decodeURI: decodeURI,
			escape: escape,
			unescape: unescape,
			atob: atob,
			btoa: btoa,
		};

		const contextified = vm.createContext(sandbox);
		const wrappedCode = '(async () => { ' + source + ' })()';
		const script = new vm.Script(wrappedCode);
		const result = await script.runInContext(contextified, { timeout: 5000 });

		parentPort.postMessage({ type: 'result', output: result });
	} catch (err) {
		parentPort.postMessage({
			type: 'error',
			error: err instanceof Error ? err.message : String(err),
		});
	}
});
`;

let workerScriptPath: string | null = null;

function getWorkerScriptPath(): string {
	if (workerScriptPath && fs.existsSync(workerScriptPath)) return workerScriptPath;

	const tmpDir = os.tmpdir();
	const scriptName = `kaoruko-sandbox-worker-${Date.now()}-${Math.random().toString(36).slice(2)}.js`;
	workerScriptPath = path.join(tmpDir, scriptName);

	fs.writeFileSync(workerScriptPath, WORKER_CODE, { mode: 0o444 });

	return workerScriptPath;
}

function extractSerializable(obj: any, depth = 0, maxDepth = 8): any {
	if (depth > maxDepth) return null;
	if (obj === null || obj === undefined) return obj;
	if (typeof obj === "function") return null;
	if (typeof obj === "symbol") return null;
	if (typeof obj === "bigint") return String(obj);
	if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") return obj;
	if (obj instanceof Date) return obj.toISOString();
	if (obj instanceof RegExp) return obj.source;
	if (obj instanceof Error) return { name: obj.name, message: obj.message };

	if (obj instanceof Map) {
		const result: Record<string, any> = {};
		for (const [k, v] of obj.entries()) {
			result[String(k)] = extractSerializable(v, depth + 1, maxDepth);
		}
		return result;
	}

	if (obj instanceof Set) {
		return Array.from(obj).map((v) => extractSerializable(v, depth + 1, maxDepth));
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => extractSerializable(item, depth + 1, maxDepth));
	}

	if (typeof obj === "object") {
		const seen = new WeakSet();

		const processObj = (o: any, d: number): any => {
			if (d > maxDepth) return null;
			if (o === null || o === undefined) return o;
			if (typeof o !== "object") return o;
			if (seen.has(o)) return "[Circular]";
			seen.add(o);

			if (Array.isArray(o)) return o.map((item) => processObj(item, d + 1));
			if (o instanceof Date) return o.toISOString();
			if (o instanceof RegExp) return o.source;
			if (o instanceof Error) return { name: o.name, message: o.message };
			if (o instanceof Map) {
				const r: Record<string, any> = {};
				for (const [k, v] of o.entries()) r[String(k)] = processObj(v, d + 1);
				return r;
			}
			if (o instanceof Set) return Array.from(o).map((v) => processObj(v, d + 1));

			const res: Record<string, any> = {};
			for (const key of Object.keys(o)) {
				if (key === "constructor" || key === "__proto__" || key === "prototype") continue;
				try {
					res[key] = processObj(o[key], d + 1);
				} catch {
					res[key] = null;
				}
			}
			return res;
		};

		return processObj(obj, depth);
	}

	return null;
}

export class SandboxExecutor {
	static validateCode(source: string): string | null {
		const normalized = source
			.replace(/\\\\/g, "")
			.replace(/[\u200B-\u200D\uFEFF]/g, "")
			.replace(/\r\n/g, "\n")
			.replace(/\r/g, "\n");

		for (const { pattern, msg } of CHECKS) {
			if (pattern.test(normalized)) {
				return msg;
			}
		}

		const stringLiterals = normalized.match(/['"`](.*?)['"`]/g);
		if (stringLiterals) {
			for (const lit of stringLiterals) {
				const inner = lit.slice(1, -1).trim();
				if (DANGEROUS_MODULES.includes(inner)) {
					return `Module "${inner}" is not allowed`;
				}
			}
		}

		const bracketAccess = normalized.match(/\[\s*['"`]([^'"`]+)['"`]\s*\]/g);
		if (bracketAccess) {
			for (const match of bracketAccess) {
				const keyMatch = match.match(/['"`]([^'"`]+)['"`]/);
				if (keyMatch && DANGEROUS_KEYS.includes(keyMatch[1])) {
					return `Access to "${keyMatch[1]}" is not allowed`;
				}
			}
		}

		const unicodeEscapes = normalized.match(/\\u[0-9a-fA-F]{4}/g);
		if (unicodeEscapes) {
			const decoded = unicodeEscapes
				.map((esc) => String.fromCharCode(parseInt(esc.slice(2), 16)))
				.join("");
			const decodedCheck = normalized + decoded;
			for (const { pattern, msg } of CHECKS) {
				if (pattern.test(decodedCheck)) {
					return `Obfuscated code detected: ${msg}`;
				}
			}
		}

		const hexEscapes = normalized.match(/\\x[0-9a-fA-F]{2}/g);
		if (hexEscapes) {
			const decoded = hexEscapes
				.map((esc) => String.fromCharCode(parseInt(esc.slice(2), 16)))
				.join("");
			const decodedCheck = normalized + decoded;
			for (const { pattern, msg } of CHECKS) {
				if (pattern.test(decodedCheck)) {
					return `Obfuscated code detected: ${msg}`;
				}
			}
		}

		let parenDepth = 0;
		let braceDepth = 0;
		let bracketDepth = 0;
		for (const char of normalized) {
			if (char === "(") parenDepth++;
			else if (char === ")") parenDepth--;
			else if (char === "{") braceDepth++;
			else if (char === "}") braceDepth--;
			else if (char === "[") bracketDepth++;
			else if (char === "]") bracketDepth--;

			if (parenDepth < 0 || braceDepth < 0 || bracketDepth < 0) {
				return "Unbalanced brackets detected";
			}
		}
		if (parenDepth !== 0 || braceDepth !== 0 || bracketDepth !== 0) {
			return "Unbalanced brackets detected";
		}

		return null;
	}

	static async execute(
		source: string,
		context: SandboxContext,
		timeout: number = 5000,
	): Promise<SandboxResult> {
		const validationError = SandboxExecutor.validateCode(source);
		if (validationError) {
			return { success: false, error: validationError };
		}

		const sanitizedContext = SandboxExecutor.sanitizeContext(context);

		return SandboxExecutor.executeInWorker(source, sanitizedContext, timeout);
	}

	private static sanitizeContext(context: SandboxContext): SandboxContext {
		return {
			message: extractSerializable(context.message),
			interaction: extractSerializable(context.interaction),
			client: extractSerializable(context.client),
			guild: extractSerializable(context.guild),
			channel: extractSerializable(context.channel),
			user: extractSerializable(context.user),
			member: extractSerializable(context.member),
			args: context.args ? [...context.args] : [],
			variables: extractSerializable(context.variables),
			customCommand: extractSerializable(context.customCommand),
		};
	}

	private static async executeInWorker(
		source: string,
		context: SandboxContext,
		timeout: number,
	): Promise<SandboxResult> {
		let worker: Worker | null = null;

		try {
			const workerPath = getWorkerScriptPath();

			worker = new Worker(workerPath, {
				workerData: null,
				env: {
					NODE_OPTIONS: "--max-old-space-size=64",
				},
			});

			const result = await new Promise<SandboxResult>((resolve) => {
				const timeoutId = setTimeout(() => {
					worker?.terminate().catch(() => {});
					resolve({ success: false, error: `Code execution timed out after ${timeout}ms` });
				}, timeout + 2000);

				worker?.on("message", (msg: any) => {
					if (msg.type === "console") {
						const level = msg.level || "log";
						const args = msg.args || [];
						Logger.info(`[CustomCode:${level}] ${args.join(" ")}`);
						return;
					}

					if (msg.type === "result") {
						clearTimeout(timeoutId);
						resolve({ success: true, output: msg.output });
					} else if (msg.type === "error") {
						clearTimeout(timeoutId);
						resolve({ success: false, error: msg.error || "Unknown error" });
					}
				});

				worker?.on("error", (err: any) => {
					clearTimeout(timeoutId);
					resolve({ success: false, error: err.message || "Worker error" });
				});

				worker?.on("exit", (code) => {
					clearTimeout(timeoutId);
					if (code !== 0) {
						resolve({ success: false, error: `Worker exited with code ${code}` });
					}
				});

				worker?.postMessage({
					type: "execute",
					source,
					context,
				});
			});

			return result;
		} catch (error: any) {
			Logger.error(`Worker execution error: ${error.message}`);
			return { success: false, error: error.message || String(error) };
		} finally {
			if (worker) {
				try {
					await worker.terminate();
				} catch {}
			}
		}
	}

	static cleanupWorkerScripts(): void {
		if (workerScriptPath && fs.existsSync(workerScriptPath)) {
			try {
				fs.unlinkSync(workerScriptPath);
				workerScriptPath = null;
			} catch {}
		}
	}
}
