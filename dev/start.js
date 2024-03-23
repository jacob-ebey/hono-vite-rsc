import { Worker } from "node:worker_threads";

const PORT_SERVER = 3001;
const PORT_PRERENDER = 3000;

const serverWorker = new Worker(new URL("./vite.js", import.meta.url), {
	env: {
		SERVER_BUILD: "server",
	},
	name: "server",
	execArgv: ["--conditions", "react-server"],
	workerData: {
		PORT: PORT_SERVER,
	},
});

const prerenderWorker = new Worker(new URL("./vite.js", import.meta.url), {
	env: {
		SERVER_BUILD: "prerender",
	},
	name: "prerender",
	workerData: {
		PORT: PORT_PRERENDER,
		SERVER_PORT: PORT_SERVER,
	},
});
