// @ts-expect-error - no types
import ReactServer from "@jacob-ebey/react-server-dom-vite/client";
import * as React from "react";

export function Router({
	initialData,
}: { initialData: React.Usable<React.ReactElement> }) {
	const [data, setData] = React.useState(initialData);
	const [transitioning, startTransition] = React.useTransition();

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
			)
				return;

			const url = new URL(event.destination.url);
			if (url.origin !== window.location.origin) return;

			const newData = ReactServer.createFromFetch(
				fetch(url.pathname + url.search, {
					headers: {
						Accept: "text/x-component",
					},
				}),
			);

			event.intercept({
				scroll: "after-transition",
				async handler() {
					startTransition(() => {
						setData(newData);
					});
				},
			});
		};

		window.navigation.addEventListener("navigate", onNavigate);
		return () => {
			window.navigation.removeEventListener("navigate", onNavigate);
		};
	}, []);

	return React.use(data);
}
