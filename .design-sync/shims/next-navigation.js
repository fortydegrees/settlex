// design-sync shim for `next/navigation`.
//
// Storybook supplies these hooks through @storybook/nextjs' router mock; the
// standalone claude.ai/design bundle has no Next runtime, so the real module's
// hooks would throw ("invariant expected app router to be mounted"). These
// no-op equivalents keep components that merely *hold* a router reference
// rendering — navigation is not exercised in a preview or a design.
const noop = () => {};

const router = {
  push: noop,
  replace: noop,
  refresh: noop,
  back: noop,
  forward: noop,
  prefetch: () => Promise.resolve(),
};

export function useRouter() {
  return router;
}

export function usePathname() {
  return "/";
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useParams() {
  return {};
}

export function useSelectedLayoutSegment() {
  return null;
}

export function useSelectedLayoutSegments() {
  return [];
}

export function redirect() {
  throw new Error("[design-sync] redirect() is not available outside Next.js");
}

export function notFound() {
  throw new Error("[design-sync] notFound() is not available outside Next.js");
}
