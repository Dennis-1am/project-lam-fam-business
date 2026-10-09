/**
 * Client-only image helpers shared by the product form and the homepage banner
 * editor. Kept out of the form components so both upload flows behave the same.
 */

/** Reads a picked file's intrinsic size so crops can be stored against it. */
export function readImageDims(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement("img");
    probe.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
    };
    probe.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({});
    };
    probe.src = objectUrl;
  });
}

/**
 * The `accept` attribute for every image picker. Mirrors the formats
 * `/api/upload` accepts; the server still rejects anything else, but matching
 * them keeps the OS file dialog from offering a photo the upload would refuse.
 */
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";