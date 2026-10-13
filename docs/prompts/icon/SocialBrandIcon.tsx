import React, { useState } from 'react';

export type BrandIconName =
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'telegram'
  | 'tiktok'
  | 'googlemaps'
  | 'messenger'
  | 'x'
  | 'youtube';

interface SocialBrandIconProps {
  name: BrandIconName;
  size?: number;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

// Colores oficiales de marca para fondos o badges
export const BRAND_COLORS: Record<BrandIconName, string> = {
  whatsapp: '#25D366',
  instagram: '#E4405F',
  facebook: '#1877F2',
  telegram: '#229ED9',
  tiktok: '#000000',
  googlemaps: '#EA4335',
  messenger: '#0084FF',
  x: '#000000',
  youtube: '#FF0000'
};

export const SocialBrandIcon: React.FC<SocialBrandIconProps> = ({
  name,
  size = 24,
  className = '',
  alt,
  style
}) => {
  const [hasError, setHasError] = useState(false);

  // Fallback si por algún motivo no existe el archivo local aún
  const iconSrc = hasError
    ? `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${name}.svg`
    : `/icons/social/${name}.svg`;

  return (
    <img
      src={iconSrc}
      alt={alt || `${name} icon`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`omni-social-icon ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        transition: 'transform 0.2s ease',
        ...style
      }}
    />
  );
};