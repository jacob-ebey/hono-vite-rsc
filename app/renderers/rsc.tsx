import * as stream from "node:stream";

// @ts-expect-error - no types
import ReactServer from "@jacob-ebey/react-server-dom-vite/server";
import * as React from "react";
import type { Context, ContextRenderer, MiddlewareHandler } from "hono";
import "hono";

declare module "hono" {
	interface ContextRenderer {
		// biome-ignore lint/style/useShorthandFunctionType: declaration merging
		(
			node: React.ReactNode,
			options?: { status?: number },
		): Response | Promise<Response>;
	}
}

type PropsForRenderer = [...Required<Parameters<ContextRenderer>>] extends [
	unknown,
	infer Props,
]
	? Props
	: unknown;

export function rscRenderer(
	Component?: React.FC<
		React.PropsWithChildren<
			PropsForRenderer & { Layout: React.FC<{ children?: React.ReactNode }> }
		>
	>,
): MiddlewareHandler {
	return async (c, next) => {
		const Layout = (c.getLayout() ?? React.Fragment) as React.FC;
		if (Component) {
			c.setLayout((props) => {
				return <Component {...props} Layout={Layout} />;
			});
		}
		// biome-ignore lint/suspicious/noExplicitAny: overriding behavior and types
		c.setRenderer(createRenderer(c, Layout, Component) as any);

		await next();
	};
}

function createRenderer(
	c: Context,
	Layout: React.FC<{ children?: React.ReactNode }>,
	Component?: React.FC<
		React.PropsWithChildren<PropsForRenderer & { Layout: React.FC }>
	>,
) {
	return (
		children: React.ReactNode,
		{ status = 200 }: PropsForRenderer & {} = {},
	) => {
		const element = Component ? (
			<Component status={status} Layout={Layout}>
				{children}
			</Component>
		) : (
			children
		);

		const { abort, pipe } = ReactServer.renderToPipeableStream(
			element,
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
