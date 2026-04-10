import { notFound } from "next/navigation";
import { SandboxClient } from "./SandboxClient";

export default function SandboxPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <SandboxClient />;
}
