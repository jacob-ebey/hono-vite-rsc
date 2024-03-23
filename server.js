import * as fsp from "node:fs/promises";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { etag } from "hono/etag";

const browserManifest = JSON.parse(
	await fsp.readFile("./dist/browser/.vite/manifest.json", "utf-8"),
);

const prerenderManifest = JSON.parse(
	await fsp.readFile("./dist/prerender/.vite/manifest.json", "utf-8"),
);
const prerenderLookup = new Map(
	Object.entries(browserManifest).map(([k, v]) => [
		v.file,
		prerenderManifest[k]?.file,
	]),
);

global.$assets = {
	chunks: browserManifest["app/entry.browser.tsx"].imports.map(
		/**
		 * @param {string} c
		 */
		(c) => c.replace(/^_/, "/assets/"),
	),
	entry: `/${browserManifest["app/entry.browser.tsx"].file}`,
};

global.$prerenderManifest = {
	moduleLoading: {
		prefix: "/",
	},
	moduleMap: new Proxy(
		{},
		{
			get(target, id, receiver) {
				return new Proxy(
					{},
					{
						get(target, name, receiver) {
							const entry = prerenderLookup.get(String(id));
							if (!entry) {
								throw new Error(`Unknown client module: ${String(id)}`);
							}

							return {
								id: entry,
								name,
								chunks: [entry],
								async: true,
							};
						},
					},
				);
			},
		},
	),
};

global.$serverManifest = new Proxy(
	{},
	{
		get(target, _id, receiver) {
			const [id, ...rest] = String(_id).split("#");

			const entry = browserManifest[id];
			if (!entry?.isEntry) {
				throw new Error(`Unknown client module: ${id}`);
			}

			return {
				id: entry.file,
				name: rest.join("#"),
				chunks: [entry.file],
				async: true,
			};
		},
	},
);

global.$server = async (request) => {
	return server.fetch(request);
};

const [{ default: prerender }, { default: server }] =
	/** @type {[{default:Hono}, {default:Hono}]} */ (
		await Promise.all([
			import("./dist/prerender/entry.prerender.js"),
			import("./dist/server/entry.server.js"),
		])
	);

const requireCache = new Map();
global.__vite_require__ = global.__vite_preload__ = (id) => {
	const cached = requireCache.get(id);
	if (cached) return cached;

	const promise =
		/** @type {Promise<unknown> & {value?: unknown; error?: unknown}} */ (
			import(`./dist/prerender/${id}`).then(
				// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
				(r) => (promise.value = r),
				// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
				(e) => (promise.error = e),
			)
		);
	requireCache.set(id, promise);
	promise.then((r) => requireCache.set(id, r));
	return promise;
};

const app = new Hono();

app.use(
	"/assets/*",
	compress(),
	etag(),
	async (c, next) => {
		await next();
		if (c.res.status === 200) {
			c.res.headers.set("Cache-Control", "public, max-age=31536000");
		}
	},
	serveStatic({
		root: "dist/browser",
	}),
);

app.use("*", async (c) => prerender.fetch(c.req.raw));

await serve({
	...app,
	port: 3000,
});
console.log("Server running at http://localhost:3000");
