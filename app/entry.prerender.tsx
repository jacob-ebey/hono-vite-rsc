import { Hono } from "hono";

import { htmlRenderer } from "./renderers/html";

const app = new Hono();

app.all("*", htmlRenderer($server));

export default app;
