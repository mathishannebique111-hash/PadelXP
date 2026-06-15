"use client";

import { useEffect } from "react";

const APP_STORE_URL = "https://apps.apple.com/app/id6757870307";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=eu.padelxp.player";

export default function DownloadClient() {
  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) {
      window.location.href = PLAY_STORE_URL;
    } else if (/iphone|ipad|ipod|macintosh/i.test(ua) && "ontouchend" in document) {
      window.location.href = APP_STORE_URL;
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold">PadelXP</h1>
        <p className="text-gray-400 text-lg">
          Télécharge l&apos;application pour rejoindre le classement et enregistrer tes matchs.
        </p>
        <div className="flex flex-col gap-4 pt-4">
          <a
            href={APP_STORE_URL}
            className="bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Télécharger sur iPhone
          </a>
          <a
            href={PLAY_STORE_URL}
            className="bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Télécharger sur Android
          </a>
        </div>
      </div>
    </div>
  );
}
