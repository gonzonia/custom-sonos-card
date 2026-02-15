// @ts-nocheck
import type { HomeAssistant } from 'custom-card-helpers';

export interface BrandsUrlOptions {
    domain: string;
    type: string;
    darkOptimized?: boolean;
}

export const brandsUrl = (options: BrandsUrlOptions): string =>
    `https://brands.home-assistant.io/_/${options.domain}/${options.darkOptimized ? 'dark_' : ''}${options.type}.png`;

export const isBrandUrl = (url?: string): boolean => {
    return url?.startsWith('https://brands.home-assistant.io/') ?? false;
};

export const extractDomainFromBrandUrl = (url: string): string => {
    const match = url.match(/brands\.home-assistant\.io\/[^/]+\/([^/]+)\//);
    return match?.[1] ?? '';
};
