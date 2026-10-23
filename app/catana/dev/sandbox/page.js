import { notFound } from "next/navigation";
import { SandboxClient } from "../../../_features/dev/sandbox/SandboxClient";

export default function SandboxPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <SandboxClient />;
}
