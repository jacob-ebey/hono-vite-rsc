export function Document({
	children,
	Layout,
}: {
	children?: React.ReactNode;
	Layout: React.FC<{ children?: React.ReactNode }>;
}) {
	return (
		<Layout>
			<html lang="en">
				<head>
					<meta charSet="utf-8" />
				</head>
				<body>{children}</body>
			</html>
		</Layout>
	);
}
