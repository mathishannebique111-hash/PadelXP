"use client";

import { QRCodeSVG } from "qrcode.react";

const DOWNLOAD_URL = "https://padelxp.eu/download";

export default function QRCodeBlock() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-white rounded-lg p-1.5 shadow-md shrink-0">
        <QRCodeSVG
          value={DOWNLOAD_URL}
          size={56}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>
      <p className="text-[11px] sm:text-xs text-white/50 leading-snug max-w-[130px]">
        Scanne pour rejoindre le classement
      </p>
    </div>
  );
}
