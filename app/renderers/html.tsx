import * as stream from "node:stream";
import type * as nodeWeb from "node:stream/web";

// @ts-expect-error - no types
import ReactServer from "@jacob-ebey/react-server-dom-vite/client";
import type { MiddlewareHandler } from "hono";
import * as ReactDOM from "react-dom/server";
import { injectRSCPayload } from "rsc-html-stream/server";

export function htmlRenderer(
	fetchRSC: (request: Request) => Promise<Response>,
): MiddlewareHandler {
	return async ({ req }) => {
		const serverResponse = await fetchRSC(req.raw);

		if (!serverResponse.body) throw new Error("No body");

		const [serverA, serverB] = serverResponse.body.tee();

		const element = await ReactServer.createFromNodeStream(
			stream.Readable.fromWeb(serverA as nodeWeb.ReadableStream<Uint8Array>),
			global.$prerenderManifest,
		);

		let status = 200;

		const body = await new Promise<ReadableStream<Uint8Array>>(
			(resolve, reject) => {
				let shellSent = false;
				const { abort, pipe } = ReactDOM.renderToPipeableStream(element, {
					bootstrapModules: [...$assets.chunks, $assets.entry],
					onShellError(error) {
						reject(error);
					},
					onShellReady() {
						shellSent = true;
						resolve(
							stream.Readable.toWeb(
								pipe(new stream.PassThrough()),
							) as ReadableStream<Uint8Array>,
						);
					},
					onError(error) {
						status = 500;
						if (shellSent) {
							console.error(error);
						}
					},
				});

				req.raw.signal.addEventListener(
					"abort",
					() => {
						abort();
					},
					{ once: true },
				);
			},
		);

		return new Response(body.pipeThrough(injectRSCPayload(serverB)), {
			status,
			headers: {
				"Content-Type": "text/html, charset=utf-8",
				"Transfer-Encoding": "chunked",
			},
		});
	};
}
