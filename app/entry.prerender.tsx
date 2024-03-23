import { Hono } from "hono";
import { etag } from "hono/etag";

import { htmlRenderer } from "./renderers/html";

const app = new Hono();

app.use("*", etag());
app.all("*", htmlRenderer($server));

export default app;
