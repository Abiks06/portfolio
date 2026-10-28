"use client";

/** Opens the browser's print dialog, where "Save as PDF" gives a clean one- or two-page CV. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform duration-150 active:scale-[0.97] print:hidden"
    >
      Save as PDF
    </button>
  );
}
