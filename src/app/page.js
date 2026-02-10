import { Suspense } from "react";
import HomeClient from "./HomeClient";

export default function Page() {
  return (
    <main className="min-h-screen bg-base-200">
      <Suspense fallback={<div className="p-8 opacity-70">Loading…</div>}>
        <HomeClient />
      </Suspense>
    </main>
  );
}
