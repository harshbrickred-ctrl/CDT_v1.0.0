export type OrganizationId = 'cdt' | 'brickred' | 'agyom';

/** Background tone the logo sits on */
export type LogoTone = 'light' | 'dark';

export type Organization = {
  id: OrganizationId;
  name: string;
  shortName: string;
  productName: string;
  tagline: string;
  /** Wordmark for light UI backgrounds. Omitted brands use a text wordmark. */
  logoLightSrc?: string;
  /** Wordmark for dark UI backgrounds */
  logoDarkSrc?: string;
  /** Mark for light UI backgrounds */
  logoMarkLightSrc?: string;
  /** Mark for dark UI backgrounds */
  logoMarkDarkSrc?: string;
  accentClass: string;
};

export const ORGANIZATIONS: Organization[] = [
  {
    id: 'cdt',
    name: 'Client Delivery Tracker',
    shortName: 'CDT',
    productName: 'CDT',
    tagline: 'Client Delivery Tracker',
    accentClass: 'border-primary/40 bg-primary/10 text-primary',
  },
  {
    id: 'brickred',
    name: 'BrickRed',
    shortName: 'BrickRed',
    productName: 'CDT',
    tagline: 'Client Delivery Tracker',
    logoLightSrc: '/brands/brickred-light.png',
    logoDarkSrc: '/brands/brickred-dark.png',
    logoMarkLightSrc: '/brands/brickred-mark-light.png',
    logoMarkDarkSrc: '/brands/brickred-mark-dark.png',
    accentClass: 'border-[#A6192E]/40 bg-[#A6192E]/10 text-[#A6192E]',
  },
  {
    id: 'agyom',
    name: 'Agyom',
    shortName: 'Agyom',
    productName: 'CDT',
    tagline: 'Client Delivery Tracker',
    accentClass: 'border-[#0F766E]/40 bg-[#0F766E]/10 text-[#0F766E]',
  },
];

export function isOrganizationId(value: string): value is OrganizationId {
  return value === 'cdt' || value === 'brickred' || value === 'agyom';
}

export function brandForCostCenter(
  costCenter: 'ALL' | 'BRICKRED' | 'AGYOM',
): OrganizationId {
  if (costCenter === 'BRICKRED') return 'brickred';
  if (costCenter === 'AGYOM') return 'agyom';
  return 'cdt';
}

export function getOrganization(id?: OrganizationId | null): Organization {
  return ORGANIZATIONS.find((o) => o.id === id) ?? ORGANIZATIONS[0];
}

export function orgLogoSrc(
  org: Organization,
  tone: LogoTone,
  variant: 'full' | 'mark' = 'full',
) {
  if (variant === 'mark') {
    return tone === 'dark' ? org.logoMarkDarkSrc : org.logoMarkLightSrc;
  }
  return tone === 'dark' ? org.logoDarkSrc : org.logoLightSrc;
}
