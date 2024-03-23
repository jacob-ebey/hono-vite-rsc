"use client";

import * as React from "react";

export function Counter() {
	const [count, setCount] = React.useState(0);

	return (
		<div>
			<h1>Count: {count}</h1>
			<button type="button" onClick={() => setCount((c) => c + 1)}>
				Increment
			</button>
		</div>
	);
}
