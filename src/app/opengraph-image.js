import { shareAlt, shareImage, shareSize } from "@/lib/share-image";

export const alt = shareAlt;
export const size = shareSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return shareImage();
}
