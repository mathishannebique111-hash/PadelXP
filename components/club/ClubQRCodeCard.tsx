'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';

interface ClubQRCodeCardProps {
  clubName: string;
  subdomain: string;
}

export default function ClubQRCodeCard({ clubName, subdomain }: ClubQRCodeCardProps) {
  const clubUrl = `https://${subdomain}.padelxp.eu`;

  const downloadQRCode = () => {
    const svg = document.getElementById("club-qrcode-svg");
    if (!svg) return;

    // Convert SVG to string
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    // Use base64 encoded SVG to avoid CORS/tainted canvas issues
    img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));

    img.onload = () => {
      // Set high resolution for printing
      canvas.width = 1000;
      canvas.height = 1000;
      
      // Fill background with white
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the QR code
      ctx.drawImage(img, 100, 100, 800, 800);

      // Trigger download
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_Code_${subdomain}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
  };

  return (
    <div className="w-full rounded-2xl border border-blue-500/40 bg-gradient-to-br from-[#03204a] via-[#01142d] to-[#000916] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] flex flex-col h-full">
      <div className="flex flex-col gap-4 flex-1">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <QrCode className="text-blue-400" size={24} />
            Lien de votre application
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Affichez ce QR Code à l'accueil de votre club. Vos joueurs pourront le scanner pour accéder directement à l'application de votre complexe.
          </p>
        </div>
        
        <div className="flex-1 rounded-2xl border border-white/15 bg-gradient-to-r from-white/10 to-white/5 p-6 shadow-inner flex flex-col items-center justify-center gap-4 relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-[60px]" />
          
          <div className="bg-white p-4 rounded-2xl shadow-2xl relative z-10 transition-transform hover:scale-105 duration-300">
            <QRCodeSVG
              id="club-qrcode-svg"
              value={clubUrl}
              size={180}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"H"}
              includeMargin={false}
            />
          </div>

          <div className="z-10 text-center">
            <p className="text-xs font-mono text-white/50 bg-black/40 px-3 py-1 rounded-full border border-white/10 mb-4 inline-block">
              {clubUrl}
            </p>
            
            <button
              onClick={downloadQRCode}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-blue-600/20 hover:bg-blue-600/40 px-6 py-3 text-sm font-semibold text-white transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)]"
            >
              <Download size={18} />
              Télécharger pour impression
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
