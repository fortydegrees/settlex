import { notFound } from "next/navigation";
import { ViewportWallClient } from "./ViewportWallClient";

export default function ViewportWallPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <ViewportWallClient />;
}
