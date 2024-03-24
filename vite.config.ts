import * as fsp from "node:fs/promises";
import * as path from "node:path";

import devServer from "@hono/vite-dev-server";
import reactRefresh from "@vitejs/plugin-react";
import { rscClientPlugin, rscServerPlugin } from "unplugin-rsc";
import { type UserConfig, defineConfig } from "vite";
import banner from "vite-plugin-banner-injection";
import tsconfigPaths from "vite-tsconfig-paths";

const serverBuild = process.env.SERVER_BUILD;
const mode =
	process.env.NODE_ENV === "development" ? "development" : "production";

function transformModuleId(id: string) {
	return path.relative(process.cwd(), id);
}

const outCacheDir = path.resolve("dist/.cache");
await fsp.mkdir(outCacheDir, { recursive: true });
const clientModulesPath = path.join(outCacheDir, "client-modules.json");

const clientModules = new Set<string>(
	await readFileOrDefault<string[]>(clientModulesPath, []),
);
function onModuleFound(id: string, type: "use client" | "use server") {
	if (type === "use client") {
		clientModules.add(path.relative(process.cwd(), id));
	}
}

export default defineConfig(
	({ isSsrBuild }) =>
		({
			cacheDir: `node_modules/.vite/${serverBuild}`,
			define: {
				"process.env.NODE_ENV": `"${mode}"`,
			},
			build: {
				dynamicImportVarsOptions: {
					exclude: ["react-runtime"],
				},
				outDir: isSsrBuild ? `dist/${serverBuild}` : "dist/browser",
				rollupOptions: {
					preserveEntrySignatures: "exports-only",
					input: isSsrBuild
						? serverBuild === "server"
							? `app/entry.${serverBuild}.tsx`
							: [`app/entry.${serverBuild}.tsx`, ...clientModules]
						: ["app/entry.browser.tsx", ...clientModules],
				},
			},
			plugins: [
				banner({ banner: "//@ts-nocheck\n" }),
				reactRefresh({}),
				tsconfigPaths(),
				serverBuild === "server"
					? rscServerPlugin.vite({
							transformModuleId,
							useClientRuntime: {
								function: "registerClientReference",
								module: "@jacob-ebey/react-server-dom-vite/server",
							},
							useServerRuntime: {
								function: "registerServerReference",
								module: "@jacob-ebey/react-server-dom-vite/server",
							},
							onModuleFound,
						})
					: rscClientPlugin.vite({
							transformModuleId,
							useServerRuntime: {
								function: "registerServerReference",
								module: "@jacob-ebey/react-server-dom-vite/client",
							},
							onModuleFound,
						}),
				{
					name: "rsc-browser-runtime",
					resolveId(id) {
						if (id === "rsc-browser-runtime") {
							return id;
						}
					},
					load(id) {
						if (id === "rsc-browser-runtime") {
							const js = String.raw;
							const rscRuntime = js`
							window.__moduleCache__ = new Map();
							window.__vite_require__ = window.__vite_preload__ = (id) => {
								const cached = window.__moduleCache__.get(id);
								if (cached) return cached;

								const promise = import(/* @vite-ignore */ location.origin + "/" + id).then(r => promise.value = r, e => promise.error = e);
								window.__moduleCache__.set(id, promise);
								return promise;
							};`;

							return mode === "development"
								? `${rscRuntime}\n${reactRefresh.preambleCode.replace(
										/__BASE__/g,
										"/",
									)}`
								: rscRuntime;
						}
					},
				},
				{
					name: "manifests",
					async buildEnd() {
						if (serverBuild === "server") {
							const toWrite = [
								...new Set([
									...(await readFileOrDefault<string[]>(clientModulesPath, [])),
									...clientModules,
								]),
							];
							await fsp.writeFile(clientModulesPath, JSON.stringify(toWrite));
						}
					},
				},
				devServer({ entry: `app/entry.${serverBuild}.tsx` }),
			],
			resolve: {
				conditions:
					serverBuild === "server" ? ["react-server", "..."] : undefined,
				dedupe: [
					"@jacob-ebey/react-server-dom-vite",
					"react",
					"react-dom",
					"react-dom/client",
					"react-dom/server",
				],
			},
			ssr: {
				external:
					mode === "development"
						? [
								"hono",
								"react",
								"react-dom",
								"@jacob-ebey/react-server-dom-vite",
							]
						: ["hono"],
				noExternal: true,
				resolve:
					serverBuild === "server"
						? {
								conditions: ["react-server"],
								externalConditions: ["react-server"],
							}
						: undefined,
			},
		}) satisfies UserConfig,
);

async function readFileOrDefault<T>(path: string, defaultValue: T): Promise<T> {
	try {
		return JSON.parse(await fsp.readFile(path, "utf8")) ?? defaultValue;
	} catch {
		return defaultValue;
	}
}
