import React from 'react';
import { Space, Tooltip } from 'antd';
import { SocialBrandIcon } from '../common/SocialBrandIcon';

interface HeaderSocialLinksProps {
  config: {
    whatsappNumber?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    telegramUrl?: string;
    mapsUrl?: string;
  };
}

export const HeaderSocialLinks: React.FC<HeaderSocialLinksProps> = ({ config }) => {
  return (
    <Space size={12} align="center" className="omni-header-socials">
      {config.whatsappNumber && (
        <Tooltip title="Chatear por WhatsApp">
          <a
            href={`https://wa.me/${config.whatsappNumber.replace(/\\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-110 transition-transform"
          >
            <SocialBrandIcon name="whatsapp" size={26} />
          </a>
        </Tooltip>
      )}

      {config.instagramUrl && (
        <Tooltip title="Visitar Instagram">
          <a
            href={config.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-110 transition-transform"
          >
            <SocialBrandIcon name="instagram" size={26} />
          </a>
        </Tooltip>
      )}

      {config.facebookUrl && (
        <Tooltip title="Facebook Oficial">
          <a
            href={config.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-110 transition-transform"
          >
            <SocialBrandIcon name="facebook" size={26} />
          </a>
        </Tooltip>
      )}

      {config.telegramUrl && (
        <Tooltip title="Canal de Telegram">
          <a
            href={config.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-110 transition-transform"
          >
            <SocialBrandIcon name="telegram" size={26} />
          </a>
        </Tooltip>
      )}

      {config.mapsUrl && (
        <Tooltip title="Ver Ubicación">
          <a
            href={config.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-110 transition-transform"
          >
            <SocialBrandIcon name="googlemaps" size={26} />
          </a>
        </Tooltip>
      )}
    </Space>
  );
};