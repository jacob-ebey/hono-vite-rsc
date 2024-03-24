import { Hono } from "hono";

import { Counter } from "./client";
import { Document } from "./document";
import { rscRenderer } from "./renderers/rsc";

const app = new Hono();

app.use("*", rscRenderer(Document));

app.use(
	"*",
	rscRenderer(({ Layout, children }) => (
		<Layout>
			<nav>
				<ul>
					<li>
						<a href="/">Home</a>
					</li>
					<li>
						<a href="/about">About</a>
					</li>
				</ul>
			</nav>
			{children}
		</Layout>
	)),
);

app.get("/", async (c) => {
	return c.render(
		<>
			<title>Hello, Renderer!</title>
			<h1>Hello, Renderer!</h1>
			<Counter />
		</>,
	);
});

app.all("*", (c) => {
	return c.render(
		<>
			<title>404</title>
			<h1>404</h1>
		</>,
		{ status: 404 },
	);
});

export default app;
