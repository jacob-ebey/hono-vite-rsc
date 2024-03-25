// @ts-expect-error - no types
import ReactServer from "@jacob-ebey/react-server-dom-vite/client";
import * as React from "react";
import ReactDOM from "react-dom/client";
import { rscStream } from "rsc-html-stream/client";

import { Router, callServer } from "./client-router";

const data: React.Usable<React.ReactElement> =
	ReactServer.createFromReadableStream(rscStream, { callServer });

export function hydrate() {
	return ReactDOM.hydrateRoot(
		document,
		<React.StrictMode>
			<Router initialData={data} />
		</React.StrictMode>,
	);
}
