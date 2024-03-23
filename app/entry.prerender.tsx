import { Hono } from "hono";

import { htmlRenderer, rscPassthrough } from "./renderers/html";

const app = new Hono();

app.on(["GET", "POST"], "*", rscPassthrough($server));
app.all("*", htmlRenderer($server));

export default app;
