/**
 * Unsplash image constants for Learn4Africa
 * All images are editorial quality, sourced via Unsplash API
 * Each entry has 1600w (hero/full) and 800w (card/srcset) variants
 */

const UNSPLASH = "https://images.unsplash.com";

interface ImageEntry {
  src: string;
  srcSmall: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

function img(
  id: string,
  alt: string,
  credit: string,
  creditHandle: string
): ImageEntry {
  return {
    src: `${UNSPLASH}/${id}?w=1600&q=85&auto=format`,
    srcSmall: `${UNSPLASH}/${id}?w=800&q=80&auto=format`,
    alt,
    credit,
    creditUrl: `https://unsplash.com/@${creditHandle}`,
  };
}

export const IMAGES = {
  hero: img(
    "photo-1632215861513-130b66fe97f4",
    "Students learning together at a school in Nigeria",
    "Emmanuel Ikwuegbu",
    "emmages"
  ),
  mwalimu: img(
    "photo-1687794504223-8bdc02e25ef6",
    "Young people learning together in Accra, Ghana",
    "Ato Aikins",
    "ato_aikins"
  ),
  solarEnergy: img(
    "photo-1680355065203-43ad84bb6e69",
    "Rows of solar panels generating clean energy",
    "Harisankar",
    "imsankar"
  ),
  python: img(
    "photo-1675495277087-10598bf7bcd1",
    "Python code displayed on a laptop screen",
    "Bernd Dittrich",
    "hdbernd"
  ),
  africanKingdoms: img(
    "photo-1655981654045-5c45b14f3bc2",
    "Ancient stone walls of Great Zimbabwe ruins",
    "Ajeet Panesar",
    "ajeetpanesarphotography"
  ),
  financialLiteracy: img(
    "photo-1687422809654-579d81c29d32",
    "Local vendor at a street market in Dar es Salaam, Tanzania",
    "Ali Mkumbwa",
    "mkumbwajr"
  ),
  ai: img(
    "photo-1750365919971-7dd273e7b317",
    "AI brain concept illustration inside a lightbulb",
    "Omar Lopez-Rincon",
    "procopiopi"
  ),
  healthNutrition: img(
    "photo-1759344114577-b6c32e4d68c8",
    "Fresh fruits and vegetables at Mpanga market, Uganda",
    "Ivan Sabayuki",
    "ivansabayuki"
  ),
} as const;

export type ImageKey = keyof typeof IMAGES;
