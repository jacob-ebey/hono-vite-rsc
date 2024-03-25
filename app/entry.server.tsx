import { Hono } from "hono";

import { sayHello } from "./actions";
import { Counter, OptimisticShow, OptimisticValue } from "./client";
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
						<a href="/forms">Forms</a>
					</li>
					<li>
						<a href="/404">404</a>
					</li>
				</ul>
			</nav>
			{children}
		</Layout>
	)),
);

app.all("/", async (c) => {
	return c.render(() => (
		<>
			<title>Hello, Renderer!</title>
			<h1>Hello, Renderer!</h1>
			<Counter />
		</>
	));
});

app.all("/forms", async (c) => {
	const url = new URL(c.req.url);
	const urlName = url.searchParams.get("name") ?? "";

	const { result: formName = "" } = c.var.formState(sayHello);

	return c.render(() => {
		return (
			<>
				<title>Forms!</title>
				<h1>Forms!</h1>
				<h2>GET</h2>
				<form>
					<input type="text" name="name" defaultValue={urlName} />
					<button type="submit">Submit</button>
					{urlName ? <p>Hello, {urlName}!</p> : null}
				</form>
				<h2>POST</h2>
				<form action={sayHello}>
					<input type="text" name="name" defaultValue={formName} />
					<button type="submit">Submit</button>
					<OptimisticShow show={!!formName} inputNames={["name"]}>
						<p>
							Hello, <OptimisticValue inputName="name" value={formName} />!
						</p>
					</OptimisticShow>
				</form>
			</>
		);
	});
});

app.all("*", (c) => {
	return c.render(
		() => (
			<>
				<title>404</title>
				<h1>404</h1>
			</>
		),
		{ status: 404 },
	);
});

export default app;
