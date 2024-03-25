"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";

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

export function OptimisticShow({
	children,
	inputNames,
	show,
}: React.PropsWithChildren<{ inputNames?: string[]; show: boolean }>) {
	const { pending, data } = ReactDOM.useFormStatus();

	if (!show && !pending) {
		return null;
	}

	if (
		pending &&
		inputNames?.length &&
		inputNames.some((name) => !data?.get(name))
	) {
		return null;
	}

	return children;
}

export function OptimisticValue({
	inputName,
	value,
}: { inputName: string; value: string }) {
	const { pending, data } = ReactDOM.useFormStatus();

	let optimisticValue = data?.get(inputName) ?? null;
	optimisticValue = optimisticValue !== null ? String(optimisticValue) : null;

	return optimisticValue ?? value;
}
