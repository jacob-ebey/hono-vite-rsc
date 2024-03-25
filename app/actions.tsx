"use server";

export async function sayHello(formData: FormData) {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	const name = String(formData.get("name"));
	return name;
}
