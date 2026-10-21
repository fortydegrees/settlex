// design-sync shim for `next/link`.
//
// Renders the plain anchor Next would render, minus prefetching and client
// routing. Next-only props are dropped so they never reach the DOM as unknown
// attributes (React would warn, and the warning noise hides real preview
// errors).
import React from "react";

const Link = React.forwardRef(function Link(
  {
    href,
    as: _as,
    replace: _replace,
    scroll: _scroll,
    shallow: _shallow,
    passHref: _passHref,
    prefetch: _prefetch,
    locale: _locale,
    legacyBehavior: _legacyBehavior,
    children,
    ...rest
  },
  ref
) {
  const resolved =
    typeof href === "string" || href == null
      ? href
      : `${href.pathname ?? ""}${href.query ? `?${new URLSearchParams(href.query)}` : ""}`;

  return (
    <a ref={ref} href={resolved} {...rest}>
      {children}
    </a>
  );
});

export default Link;
