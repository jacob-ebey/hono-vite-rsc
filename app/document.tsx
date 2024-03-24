import type { PropsForRenderer } from "./renderers/rsc";

export function Document({ children }: PropsForRenderer) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
			</head>
			<body>{children}</body>
		</html>
	);
}
