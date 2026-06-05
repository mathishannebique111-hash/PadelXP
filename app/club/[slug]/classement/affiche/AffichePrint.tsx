"use client";

import { QRCodeSVG } from "qrcode.react";

const DOWNLOAD_URL = "https://padelxp.eu/download";

interface AffichePrintProps {
  clubName: string;
  clubLogoUrl: string | null;
}

export default function AffichePrint({ clubName, clubLogoUrl }: AffichePrintProps) {
  return (
    <>
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Print button */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition shadow-lg"
        >
          Imprimer / PDF
        </button>
      </div>

      {/* Poster — A4 optimized */}
      <div className="min-h-screen bg-white flex items-center justify-center p-4 print:p-0">
        <div className="w-full max-w-[600px] print:max-w-none print:w-full flex flex-col items-center text-center px-8 py-12 print:py-16 print:px-12">

          {/* Logos row */}
          <div className="flex items-center justify-center gap-5 mb-10">
            {clubLogoUrl && (
              <img
                src={clubLogoUrl}
                alt={clubName}
                className="h-20 w-20 object-contain"
              />
            )}
            <span className="text-gray-300 text-3xl font-thin">&times;</span>
            <img
              src="/images/Logo sans fond.png"
              alt="PadelXP"
              className="h-20 w-20 object-contain"
            />
          </div>

          {/* Club name */}
          <h1 className="text-3xl sm:text-4xl print:text-5xl font-extrabold text-gray-900 tracking-tight">
            {clubName}
          </h1>

          {/* Main CTA text */}
          <div className="mt-8 print:mt-12 max-w-md">
            <p className="text-xl sm:text-2xl print:text-3xl font-bold text-gray-900 leading-tight">
              Enregistre ton match pour monter au classement et gagner des récompenses
            </p>
          </div>

          {/* QR Code */}
          <div className="mt-10 print:mt-14 bg-white border-4 border-gray-900 rounded-3xl p-6 print:p-8 shadow-sm">
            <QRCodeSVG
              value={DOWNLOAD_URL}
              size={220}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          {/* Instruction */}
          <p className="mt-5 text-base print:text-lg text-gray-500 font-medium">
            Scanne avec ton téléphone pour télécharger l&apos;app
          </p>

          {/* Rewards preview */}
          <div className="mt-10 print:mt-14 w-full max-w-sm">
            <p className="text-xs print:text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
              Récompenses du classement
            </p>
            <div className="space-y-2.5 text-left">
              <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 print:py-3">
                <span className="text-xl">&#129351;</span>
                <span className="text-sm print:text-base font-semibold text-gray-800">3 parties offertes + 3 mois d&apos;abonnement premium PadelXP</span>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 print:py-3">
                <span className="text-xl">&#129352;</span>
                <span className="text-sm print:text-base font-semibold text-gray-700">1 partie offerte + 3 mois d&apos;abonnement premium PadelXP</span>
              </div>
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 print:py-3">
                <span className="text-xl">&#129353;</span>
                <span className="text-sm print:text-base font-semibold text-gray-700">1 tube de balles + 3 mois d&apos;abonnement premium PadelXP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
