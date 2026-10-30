"use client";

/** If rendering fails (say, an unexpected saved visit), offer a way back instead of a blank page. */
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
    <main className="mx-auto max-w-[60ch] px-4 py-24 text-center sm:px-6">
      <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">The exam room went dark</h1>
      <p className="mt-4 text-ink-2">
        Something on this page failed to load. Clearing your saved prescriptions usually fixes it.
      </p>
      <button
        type="button"
        onClick={clearAndRetry}
        className="mt-8 inline-flex items-center rounded-xl bg-teal px-5 py-3 font-semibold text-on-teal hover:bg-teal-hover"
      >
        Clear my file and reload
      </button>
    </main>
  );
}
