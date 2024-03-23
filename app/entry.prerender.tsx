import { Hono } from "hono";
import { compress } from "hono/compress";

import { htmlRenderer } from "./renderers/html";

const app = new Hono();

app.all("*", compress(), htmlRenderer($server));

export default app;
