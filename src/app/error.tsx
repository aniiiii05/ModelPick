"use client";

/** If rendering fails (say, an unexpected saved entry), offer a way back instead of a blank page. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  function clearAndRetry() {
    try {
      localStorage.removeItem("mp-file");
    } catch {
      // Storage unavailable: nothing to clear.
    }
    reset();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-[44ch] text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Something went wrong</h1>
        <p className="mt-2 text-[15px] text-fg-2">Part of the page failed to load. Clearing your saved history usually fixes it.</p>
        <button
          type="button"
          onClick={clearAndRetry}
          className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-on-primary hover:opacity-85"
        >
          Clear history and reload
        </button>
      </div>
    </main>
  );
}
