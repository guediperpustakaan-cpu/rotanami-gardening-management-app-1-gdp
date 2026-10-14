"use client";

import { useState } from "react";
import { Coffee, Download, Heart, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button, cn } from "./ui";

export const TRAKTEER_URL = "https://trakteer.id/perpus_opera/";
const SOURCE_ZIP_PATH = "/rotanami-source-code.zip";

/** Nominal traktiran: kelipatan Rp6.000. */
const NOMINALS = [6000, 12000, 18000, 24000, 36000, 60000];

function formatRp(value: number): string {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export function TrakteerWidget() {
  const [open, setOpen] = useState(false);
  const [nominal, setNominal] = useState(NOMINALS[0]);

  return (
    <>
      {/* Tombol mengambang di sudut kanan bawah */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Traktir kopi — dukung aplikasi ini"
        title="Web app ini gratis & bebas iklan. Kopi kecil, server tetap jalan"
        className={cn(
          "fixed right-4 z-40 flex items-center gap-2.5 rounded-full py-3 pr-4 pl-3.5 shadow-lg",
          "bg-gradient-to-br from-trakteer-500 to-trakteer-600 text-white",
          "transition-all hover:from-trakteer-600 hover:to-trakteer-700 hover:shadow-xl",
          "bottom-[5.5rem] md:bottom-6",
        )}
      >
        <Coffee aria-hidden className="h-5 w-5 shrink-0" />
        <span className="text-sm font-bold leading-tight">Traktir kopi</span>
      </button>

      {/* Dialog pilihan nominal + QR code (tanpa pindah halaman) */}
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
            tabIndex={-1}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Dukung Rotanami"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-2xl bg-cream shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line bg-gradient-to-br from-trakteer-50 to-cream px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-trakteer-500 text-white">
                  <Heart aria-hidden className="h-5 w-5" fill="currentColor" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Traktir kopinya</h2>
                  <p className="text-xs font-medium text-trakteer-700">Rotanami</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup dialog"
                className="rounded-lg p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              <p className="text-sm text-ink-soft">
                Web app ini gratis &amp; bebas iklan.{" "}
                <strong className="font-semibold text-ink">Kopi kecil, server tetap jalan.</strong>{" "}
                Dukungan apa pun sangat membantu menjaga aplikasi tetap hidup.
              </p>

              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Pilih nominal traktiran</p>
                <div className="grid grid-cols-3 gap-2">
                  {NOMINALS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNominal(n)}
                      aria-pressed={nominal === n}
                      className={cn(
                        "rounded-lg border px-2 py-2.5 text-sm font-bold transition-colors",
                        nominal === n
                          ? "border-trakteer-500 bg-trakteer-50 text-trakteer-700"
                          : "border-line-strong bg-paper text-ink-soft hover:border-trakteer-300 hover:text-ink",
                      )}
                    >
                      {formatRp(n)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-paper/60 px-4 py-4">
                <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
                  Scan untuk traktir {formatRp(nominal)}
                </p>
                <div className="rounded-xl border-2 border-trakteer-100 bg-white p-3">
                  <QRCodeSVG
                    value={`${TRAKTEER_URL}?amount=${nominal}`}
                    size={180}
                    level="M"
                    marginSize={1}
                    fgColor="#23291c"
                    bgColor="#ffffff"
                    aria-label="Kode QR halaman Trakteer"
                  />
                </div>
                <p className="text-center text-xs text-ink-faint">
                  Pindai kode di atas dengan kamera ponsel, atau buka halaman Trakteer langsung.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <a href={TRAKTEER_URL} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full">
                    <Heart aria-hidden className="h-4 w-4" fill="currentColor" /> Traktir via Trakteer
                  </Button>
                </a>
                <a href={SOURCE_ZIP_PATH} download>
                  <Button variant="secondary" className="w-full">
                    <Download aria-hidden className="h-4 w-4" /> Unduh source code lengkap
                  </Button>
                </a>
              </div>

              <p className="text-center text-xs text-ink-faint">
                Open Source oleh MZF — 2026
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}