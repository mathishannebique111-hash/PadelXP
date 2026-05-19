/**
 * Utility to generate a story image from a DOM element and share/download it.
 */
import html2canvas from "html2canvas-pro";

export async function generateStoryImage(
  element: HTMLElement
): Promise<Blob | null> {
  try {
    const canvas = await html2canvas(element, {
      width: 1080,
      height: 1920,
      scale: 1,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1);
    });
  } catch (err) {
    console.error("[story-share] Error generating image:", err);
    return null;
  }
}

export async function shareStoryImage(element: HTMLElement, fileName: string = "padelxp-story.png") {
  const blob = await generateStoryImage(element);
  if (!blob) return false;

  const file = new File([blob], fileName, { type: "image/png" });

  // Try native share (mobile)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch {
      // User cancelled or error — fall through to download
    }
  }

  // Fallback: download
  downloadBlob(blob, fileName);
  return true;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
