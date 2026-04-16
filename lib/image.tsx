/**
 * OptimizedImage — art-directed image component
 * Follows the image rules: <picture> with srcset, lazy loading, gradient overlays
 */

interface OptimizedImageProps {
  src: string;
  srcSmall: string;
  alt: string;
  credit?: string;
  creditUrl?: string;
  className?: string;
  overlay?: "dark" | "light" | "none";
  aspect?: "hero" | "card" | "portrait" | "square";
  priority?: boolean;
  objectPosition?: string;
}

export function OptimizedImage({
  src,
  srcSmall,
  alt,
  credit,
  creditUrl,
  className = "",
  overlay = "none",
  aspect = "card",
  priority = false,
  objectPosition = "center",
}: OptimizedImageProps) {
  const aspectClass = {
    hero: "aspect-video sm:aspect-[21/9]",
    card: "aspect-[3/2]",
    portrait: "aspect-[4/5]",
    square: "aspect-square",
  }[aspect];

  const overlayGradient = {
    dark: "bg-gradient-to-t from-warm-950/80 via-warm-900/40 to-warm-900/20",
    light: "bg-gradient-to-t from-white/80 via-white/30 to-transparent",
    none: "",
  }[overlay];

  return (
    <div className={`relative overflow-hidden ${aspectClass} ${className}`}>
      <picture>
        <source
          type="image/webp"
          srcSet={`${srcSmall}&fm=webp 800w, ${src}&fm=webp 1600w`}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <img
          src={src}
          srcSet={`${srcSmall} 800w, ${src} 1600w`}
          sizes="(max-width: 768px) 100vw, 50vw"
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition }}
        />
      </picture>
      {overlay !== "none" && (
        <div className={`absolute inset-0 ${overlayGradient}`} />
      )}
      {credit && (
        <div className="absolute bottom-2 right-3 z-10">
          {creditUrl ? (
            <a
              href={creditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-white/50 hover:text-white/70 transition-colors"
            >
              Photo by {credit}
            </a>
          ) : (
            <span className="text-[10px] text-white/50">Photo by {credit}</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * HeroImage — full-bleed hero with gradient overlay for text readability
 */
interface HeroImageProps {
  src: string;
  srcSmall: string;
  alt: string;
  credit?: string;
  creditUrl?: string;
  children: React.ReactNode;
  className?: string;
  objectPosition?: string;
}

export function HeroImage({
  src,
  srcSmall,
  alt,
  credit,
  creditUrl,
  children,
  className = "",
  objectPosition = "center top",
}: HeroImageProps) {
  return (
    <section className={`relative overflow-hidden ${className}`}>
      <picture>
        <source
          type="image/webp"
          srcSet={`${srcSmall}&fm=webp 800w, ${src}&fm=webp 1600w`}
          sizes="100vw"
        />
        <img
          src={src}
          srcSet={`${srcSmall} 800w, ${src} 1600w`}
          sizes="100vw"
          alt={alt}
          loading="eager"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition }}
        />
      </picture>
      {/* Multi-stop gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-warm-950/90 via-warm-900/50 to-warm-900/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-warm-950/40 to-transparent" />
      <div className="relative z-10">{children}</div>
      {credit && (
        <div className="absolute bottom-3 right-4 z-10">
          {creditUrl ? (
            <a
              href={creditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
            >
              Photo by {credit}
            </a>
          ) : (
            <span className="text-[10px] text-white/30">Photo by {credit}</span>
          )}
        </div>
      )}
    </section>
  );
}
