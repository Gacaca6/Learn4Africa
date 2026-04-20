import { continueRender, delayRender } from "remotion";

let loaded = false;

export const waitForFonts = () => {
  if (loaded) return;
  loaded = true;
  const handle = delayRender("Loading Google Fonts");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500;1,9..144,600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
  link.onload = () => {
    // Wait one frame for fonts to actually be usable
    if ((document as any).fonts && (document as any).fonts.ready) {
      (document as any).fonts.ready.then(() => continueRender(handle));
    } else {
      continueRender(handle);
    }
  };
  link.onerror = () => continueRender(handle);
  document.head.appendChild(link);
};
