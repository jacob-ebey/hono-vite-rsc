import * as stream from "node:stream";

// @ts-expect-error - no types
import ReactServer from "@jacob-ebey/react-server-dom-vite/server";
import { Hono } from "hono";

import { App } from "./app";

const app = new Hono();

app.on("GET", ["/", "/*"], async ({ req }) => {
	const { abort, pipe } = ReactServer.renderToPipeableStream(
		<App />,
		global.$serverManifest,
		{
			onError(error: unknown) {
				console.error(error);
			},
		},
	);

	req.raw.signal.addEventListener(
		"abort",
		() => {
			abort();
		},
		{ once: true },
	);

	const body = stream.Readable.toWeb(
		pipe(new stream.PassThrough()),
	) as ReadableStream<Uint8Array>;

	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "text/x-component, charset=utf-8",
			"Transfer-Encoding": "chunked",
		},
	});
});

export default app;
