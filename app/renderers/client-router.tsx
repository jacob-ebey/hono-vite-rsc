// @ts-expect-error - no types
import ReactServer from "@jacob-ebey/react-server-dom-vite/client.browser";
import * as React from "react";

let setData: (data: React.Usable<unknown>) => void;
let serverController = new AbortController();
export async function callServer(id: string, args: unknown[]) {
	serverController.abort();
	serverController = new AbortController();
	const signal = serverController.signal;

	const reply = await ReactServer.encodeReply(args);

	const data = ReactServer.createFromFetch(
		fetch(location.href, {
			body: reply,
			method: "POST",
			headers: {
				Accept: "text/x-component",
				"rsc-action-id": id,
			},
			signal,
		}),
		{
			callServer,
		},
	);

	if (!signal.aborted) {
		setData(data);
	}

	return (await data).data;
}

export function Router({
	initialData,
}: { initialData: React.Usable<unknown> }) {
	const [data, _setData] = React.useState(initialData);
	const [transitioning, startTransition] = React.useTransition();

	setData = React.useCallback((newData: React.Usable<unknown>) => {
		startTransition(() => {
			_setData(newData);
		});
	}, []);

	console.log({ transitioning });

	// React.useEffect(() => {
	// 	if (!window.navigation) {
	// 		console.error(
	// 			"No navigation object found on window, client-side routing will not work.",
	// 		);
	// 		return;
	// 	}

	// 	const onNavigate = (event: NavigateEvent) => {
	// 		if (
	// 			!event.canIntercept ||
	// 			event.defaultPrevented ||
	// 			event.downloadRequest ||
	// 			event.navigationType === "reload"
	// 		) {
	// 			return;
	// 		}

	// 		const url = new URL(event.destination.url);
	// 		if (url.origin !== window.location.origin) return;

	// 		const newData = ReactServer.createFromFetch(
	// 			fetch(url.pathname + url.search, {
	// 				method: event.formData ? "POST" : "GET",
	// 				body: event.formData,
	// 				duplex: event.formData ? "half" : undefined,
	// 				headers: {
	// 					Accept: "text/x-component",
	// 				},
	// 				signal: event.signal,
	// 			}),
	// 		);

	// 		event.intercept({
	// 			scroll: "after-transition",
	// 			async handler() {
	// 				startTransition(() => {
	// 					setData(newData);
	// 				});
	// 			},
	// 		});
	// 	};

	// 	window.navigation.addEventListener("navigate", onNavigate);
	// 	return () => {
	// 		window.navigation.removeEventListener("navigate", onNavigate);
	// 	};
	// }, []);

	const { element } = React.use(data) as unknown as {
		element: React.ReactNode;
	};
	return element;
}
