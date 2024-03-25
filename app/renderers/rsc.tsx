import * as stream from "node:stream";
import type * as nodeWebStream from "node:stream/web";

// @ts-expect-error - no types
import ReactServer from "@jacob-ebey/react-server-dom-vite/server.node";
import * as React from "react";
import type {
	Context,
	ContextRenderer,
	Env,
	Input,
	MiddlewareHandler,
} from "hono";
import "hono";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type AwaitedReturnType<T> = T extends (...args: any[]) => infer R
	? Awaited<R>
	: unknown;

declare module "hono" {
	interface ContextRenderer {
		// biome-ignore lint/style/useShorthandFunctionType: declaration merging
		(
			component: React.FC,
			options?: { status: number },
		): Response | Promise<Response>;
	}

	interface ContextVariableMap {
		formState<T>(
			action: T,
		):
			| { ran: true; result: AwaitedReturnType<T> }
			| { ran: false; result: undefined };
	}
}

export type PropsForRenderer = React.PropsWithChildren<
	[...Required<Parameters<ContextRenderer>>] extends [unknown, infer Props]
		? Props
		: unknown
>;

async function loadAction(actionId: string) {
	const [modId, ...rest] = actionId.split("#");
	const exp = rest.join("#");
	const mod = (await globalThis.__vite_require__(modId)) as Record<
		string | number | symbol,
		(...args: unknown[]) => unknown
	>;
	return mod?.[exp];
}

export function rscRenderer(
	Component?: React.FC<
		PropsForRenderer & { Layout: React.FC<React.PropsWithChildren> }
	>,
): MiddlewareHandler {
	return async (c, next) => {
		const Layout = (c.getLayout() ??
			React.Fragment) as React.FC<React.PropsWithChildren>;
		if (Component) {
			c.setLayout((props) => {
				return <Component {...props} Layout={Layout} />;
			});
		}
		// biome-ignore lint/suspicious/noExplicitAny: overriding behavior and types
		c.setRenderer(createRenderer(c, Layout, Component) as any);
		c.set("formState", (action) => {
			const formState = c.get("_formState");
			if (
				formState?.action?.$$id === (action as unknown as { $$id: string }).$$id
			) {
				return {
					ran: true,
					result: formState.data,
				};
			}

			return {
				ran: false,
				result: undefined,
			};
		});

		const actionId = c.req.raw.headers.get("rsc-action-id");
		console.log({ actionId });
		const contentType = c.req.raw.headers.get("content-type");
		const isFormData =
			!!contentType && !!contentType?.match(/\bmultipart\/form\-data\b/);

		if (actionId) {
			const action = await loadAction(actionId);

			if (action) {
				let reply: string | FormData;

				if (isFormData) {
					reply = await c.req.formData();
				} else {
					reply = await c.req.text();
				}

				const args = await ReactServer.decodeReply(reply);
				const data = await action.apply(null, args);
				c.set("_formState", { action, data });
			} else {
				throw new Error(`Action not found: ${actionId}`);
			}
		} else if (c.req.method === "POST" && isFormData) {
			const action = await ReactServer.decodeAction(
				await c.req.formData(),
				global.$serverManifest,
			);
			const data = await action();
			c.set("_formState", { action, data });
		}

		await next();
	};
}

function createRenderer(
	c: Context,
	Layout: React.FC<React.PropsWithChildren>,
	Component?: React.FC<
		PropsForRenderer & { Layout: React.FC<React.PropsWithChildren> }
	>,
) {
	return (
		Route: React.FC,
		{ status = 200 }: PropsForRenderer = { status: 200 },
	) => {
		const element = Component ? (
			<Component status={status} Layout={Layout}>
				<Route />
			</Component>
		) : (
			<Route />
		);

		const { data } = c.get("_formState") || {};

		const { abort, pipe } = ReactServer.renderToPipeableStream(
			{ element, data },
			global.$serverManifest,
			{
				onError(error: unknown) {
					console.error(error);
				},
			},
		);

		c.req.raw.signal.addEventListener(
			"abort",
			() => {
				abort();
			},
			{ once: true },
		);

		const body = stream.Readable.toWeb(
			pipe(new stream.PassThrough()),
		) as ReadableStream<Uint8Array>;

		return new Response(body, {
			status,
			headers: {
				"Content-Type": "text/x-component, charset=utf-8",
				"Transfer-Encoding": "chunked",
			},
		});
	};
}
