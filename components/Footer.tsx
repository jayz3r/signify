export default function Footer() {
  return (
    <footer className="border-t border-line/70 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-mute md:flex-row">
        <p>© {new Date().getFullYear()} Signify. Built to be seen, not just heard.</p>
        <div className="flex gap-6">
          <span>Captions on by default</span>
          <span>·</span>
          <span>Works with any webcam</span>
        </div>
      </div>
    </footer>
  );
}
