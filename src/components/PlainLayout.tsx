import { Suspense } from "react";
import { Link, Outlet } from "react-router";
import { Wordmark } from "./Logo";
import { Skeleton } from "./ui/Skeleton";

export function PlainLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-120 flex-col">
      <header className="px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link to="/" aria-label="conneX">
          <Wordmark />
        </Link>
      </header>
      <main className="flex-1 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
