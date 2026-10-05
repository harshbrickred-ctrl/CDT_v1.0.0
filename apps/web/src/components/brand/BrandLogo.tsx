import { useEffect, useState } from 'react';
import {
  getOrganization,
  orgLogoSrc,
  type LogoTone,
  type Organization,
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

function TextWordmark({
  org,
  variant,
  onDark,
  large,
  className,
  markClassName,
  showTagline,
}: {
  org: Organization;
  variant: 'full' | 'mark';
  onDark: boolean;
  large: boolean;
  className: string;
  markClassName: string;
  showTagline: boolean;
}) {
  if (variant === 'mark') {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-lg bg-primary/15 font-semibold text-primary ${
          markClassName || 'h-9 w-9 text-[10px]'
        }`}
        aria-label={org.name}
      >
        {org.shortName.slice(0, 3)}
      </span>
    );
  }

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <p
        className={`font-display font-semibold leading-tight ${
          large ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-xl sm:text-2xl'
        } ${onDark ? 'text-white' : 'text-slate-deep'}`}
      >
        {org.name}
      </p>
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <TextWordmark
        org={org}
        variant={variant}
        onDark={onDark}
        large={Boolean(imgClassName)}
        className={className}
        markClassName={markClassName}
        showTagline={showTagline}
      />
    );
  }

  if (variant === 'mark') {
    return (
      <img
        src={src}
        alt={org.name}
        className={`object-contain ${markClassName || 'h-9 w-9'}`}
        onError={() => setFailed(true)}
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
        onError={() => setFailed(true)}
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
