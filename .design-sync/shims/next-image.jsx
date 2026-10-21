// design-sync shim for `next/image`.
//
// Next's Image compiles to an <img> plus a srcset built by its loader. Outside
// Next there is no optimizer endpoint, so the raw src is used directly.
// Static imports arrive as a {src,width,height} object rather than a string.
import React from "react";

const Image = React.forwardRef(function Image(
  {
    src,
    alt = "",
    width,
    height,
    fill,
    loader: _loader,
    quality: _quality,
    priority: _priority,
    placeholder: _placeholder,
    blurDataURL: _blurDataURL,
    unoptimized: _unoptimized,
    style,
    ...rest
  },
  ref
) {
  const resolved = typeof src === "string" ? src : src?.src;
  const fillStyle = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
    : null;

  return (
    <img
      ref={ref}
      src={resolved}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      style={fillStyle ? { ...fillStyle, ...style } : style}
      {...rest}
    />
  );
});

export default Image;
