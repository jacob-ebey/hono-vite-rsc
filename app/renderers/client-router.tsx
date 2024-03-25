// @ts-expect-error - no types
import ReactServer from "@jacob-ebey/react-server-dom-vite/client.browser";
import * as React from "react";

let setData: (data: React.Usable<unknown>) => void;
let callServerActionController = new AbortController();
let navigationAbortController = new AbortController();
export async function callServer(id: string, args: unknown[]) {
	callServerActionController.abort();
	callServerActionController = new AbortController();
	const actionSignal = callServerActionController.signal;
	const navigationSignal = navigationAbortController.signal;

	const reply = await ReactServer.encodeReply(args);

	const data = ReactServer.createFromFetch(
		fetch(location.href, {
			body: reply,
			method: "POST",
			headers: {
				Accept: "text/x-component",
				"rsc-action-id": id,
			},
			signal: actionSignal,
		}),
		{
			callServer,
		},
	);

	const result = await data;
	if (!actionSignal.aborted && !navigationSignal.aborted) {
		setData(data);
	}

	return result.data;
}

export function Router({
	initialData,
}: { initialData: React.Usable<unknown> }) {
	const [data, _setData] = React.useState(initialData);
	const [optimisticData, setOptimisticData] = React.useOptimistic(data);
	const [transitioning, startTransition] = React.useTransition();

	if (optimisticData !== data) {
		_setData(optimisticData);
	}

	setData = React.useCallback(
		(newData: React.Usable<unknown>) => {
			startTransition(() => {
				setOptimisticData(newData);
			});
		},
		[setOptimisticData],
	);

	React.useEffect(() => {
		if (!window.navigation) {
			console.error(
				"No navigation object found on window, client-side routing will not work.",
			);
			return;
		}

		const onNavigate = (event: NavigateEvent) => {
			if (
				!event.canIntercept ||
				event.defaultPrevented ||
				event.downloadRequest ||
				event.navigationType === "reload"
			) {
				return;
			}

			const url = new URL(event.destination.url);
			if (url.origin !== window.location.origin) return;

			navigationAbortController.abort();
			navigationAbortController = new AbortController();
			const controller = new AbortController();
			navigationAbortController.signal.addEventListener(
				"abort",
				() => {
					if (controller.signal.aborted) return;
					controller.abort();
				},
				{
					once: true,
				},
			);
			event.signal.addEventListener(
				"abort",
				() => {
					if (controller.signal.aborted) return;
					controller.abort();
				},
				{
					once: true,
				},
			);

			const newData = ReactServer.createFromFetch(
				fetch(url.pathname + url.search, {
					method: event.formData ? "POST" : "GET",
					body: event.formData,
					duplex: event.formData ? "half" : undefined,
					headers: {
						Accept: "text/x-component",
					},
					signal: controller.signal,
				}),
				{
					callServer,
				},
			);

			event.intercept({
				scroll: "after-transition",
				async handler() {
					await newData;
					setData(newData);
				},
			});
		};

		window.navigation.addEventListener("navigate", onNavigate);
		return () => {
			window.navigation.removeEventListener("navigate", onNavigate);
		};
	}, []);

	const { element } = React.use(optimisticData || data) as unknown as {
		element: React.ReactNode;
	};
	return element;
}
