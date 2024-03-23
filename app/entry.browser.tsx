// @ts-expect-error - no types
import ReactServer from "@jacob-ebey/react-server-dom-vite/client";
import * as React from "react";
import ReactDOM from "react-dom/client";
import { rscStream } from "rsc-html-stream/client";

// This installs the module loading runtime and dev HMR runtime
import "react-runtime";

let data: React.Usable<React.ReactElement>;
function Router() {
	data ??= ReactServer.createFromReadableStream(rscStream);
	return React.use(data);
}

React.startTransition(() => {
	ReactDOM.hydrateRoot(
		document,
		<React.StrictMode>
			<Router />
		</React.StrictMode>,
	);
});
