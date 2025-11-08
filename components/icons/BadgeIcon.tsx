"use client";

import React from "react";
import Image from "next/image";

type Props = {
  className?: string;
  size?: number;
};

export default function BadgeIcon({ className, size = 24 }: Props) {
  return (
    <Image
      src="/images/Badge_free_icons_designed_by_Freepik-removebg-preview.png"
      alt="Badge"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
