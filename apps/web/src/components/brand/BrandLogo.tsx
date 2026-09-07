import {
  getOrganization,
  orgLogoSrc,
  type LogoTone,
  type OrganizationId,
} from '../../lib/organizations';

type BrandLogoProps = {
  organization: OrganizationId | null | undefined;
  /** `full` = wordmark, `mark` = icon only */
  variant?: 'full' | 'mark';
  /**
   * Background the logo sits on.
   * `dark` → dark-mode logo assets; `light` → light-mode assets.
   * `inverse` is accepted as an alias for `dark` (legacy).
   */
  tone?: LogoTone;
  inverse?: boolean;
  className?: string;
  markClassName?: string;
  /** Override wordmark image sizing */
  imgClassName?: string;
  showTagline?: boolean;
};

export default function BrandLogo({
  organization,
  variant = 'full',
  tone,
  inverse = false,
  className = '',
  markClassName = '',
  imgClassName = '',
  showTagline = false,
}: BrandLogoProps) {
  const org = getOrganization(organization);
  const resolvedTone: LogoTone = tone ?? (inverse ? 'dark' : 'light');
  const src = orgLogoSrc(org, resolvedTone, variant);
  const onDark = resolvedTone === 'dark';

  if (variant === 'mark') {
    return (
      <img
        src={src}
        alt={org.name}
        className={`object-contain ${markClassName || 'h-9 w-9'}`}
      />
    );
  }

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <img
        src={src}
        alt={org.name}
        className={
          imgClassName ||
          'h-10 w-auto max-w-[220px] rounded-md object-contain object-left sm:h-11'
        }
      />
      {showTagline && (
        <p
          className={`mt-1 text-[10px] font-medium uppercase tracking-[0.16em] ${
            onDark ? 'text-white/55' : 'text-muted-foreground'
          }`}
        >
          {org.productName} · {org.tagline}
        </p>
      )}
    </div>
  );
}
