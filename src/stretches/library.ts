import type { Stretch } from "./segments";
import data from "./library.data.json";

// Generated from the public-domain exercises dataset (every `category:
// stretching` entry) by scripts/build-library.ts. Re-run that script to
// refresh content/photos. Photos live in assets/stretches/<id>/ and are
// resolved for display via ./images.
export const stretches: Stretch[] = data as Stretch[];
