import { setDefaultResultOrder } from "node:dns";
import { workerData } from "node:worker_threads";

import { createServer } from "vite";

setDefaultResultOrder("ipv4first");

const { PORT, SERVER_PORT } = workerData;

const devServer = await createServer({
	server: {
		port: PORT,
	},
});

global.$assets = {
	chunks: [],
	entry: "/app/entry.browser.tsx",
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
							return {
								id,
								name,
								chunks: [id],
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

			return {
				id,
				name: rest.join("#"),
				chunks: [id],
				async: true,
			};
		},
	},
);

const requireCache = new Map();
global.__vite_require__ = (id) => {
	const cached = requireCache.get(id);
	if (cached) return cached;

	const promise =
		/** @type {Promise<unknown> & {value?: unknown; error?: unknown}} */ (
			devServer.ssrLoadModule(id, { fixStacktrace: true }).then(
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

global.__vite_preload__ = (id) => {
	const loaded = global.__vite_require__(id);
	if (typeof loaded.then === "function") return loaded;
	return Promise.resolve(loaded);
};

global.$server = async (request) => {
	// Reset every request to make sure things don't go stale
	const requireCache = new Map();
	global.__vite_require__ = (id) => {
		const cached = requireCache.get(id);
		if (cached) return cached;

		const promise =
			/** @type {Promise<unknown> & {value?: unknown; error?: unknown}} */ (
				devServer.ssrLoadModule(id, { fixStacktrace: true }).then(
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

	const url = new URL(request.url);
	const serverUrl = new URL(
		url.pathname + url.search,
		`http://localhost:${SERVER_PORT}`,
	);

	const response = await fetch(serverUrl, {
		body: request.body,
		duplex: request.method === "POST" ? "half" : undefined,
		headers: request.headers,
		method: request.method,
		signal: request.signal,
	});

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
};

await devServer.listen(PORT);
console.log(`${process.env.SERVER_BUILD} running at http://localhost:${PORT}`);
