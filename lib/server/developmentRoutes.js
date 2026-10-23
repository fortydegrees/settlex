import { notFound, redirect } from "next/navigation";

// Check the guard before awaiting params: aliases never disclose dev surfaces in production.
export async function redirectDevelopmentRoute(destination, searchParams) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(await searchParams ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item != null) query.append(name, item);
    }
  }
  redirect(destination + (query.size ? `?${query}` : ""));
}
