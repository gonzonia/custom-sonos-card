import { HomeAssistant } from 'custom-card-helpers';
import {
  ConfigEntry,
  MusicAssistantSearchResponse,
  MusicAssistantSearchResult,
  SearchMediaType,
  SearchResultItem,
} from '../types';

const LIBRARY_URI_PREFIX = 'library://';
const MAX_SEARCH_LIMIT = 10000;

export class MusicAssistantService {
  private readonly hass: HomeAssistant;

  constructor(hass: HomeAssistant) {
    this.hass = hass;
  }

  /**
   * Discover the Music Assistant config entry ID
   * Returns the first found Music Assistant integration ID, or null if not found
   */
  async discoverConfigEntryId(): Promise<string | null> {
    try {
      const entries = await this.hass.callWS<ConfigEntry[]>({
        type: 'config_entries/get',
      });

      const musicAssistant = entries.find((entry) => entry.domain === 'music_assistant' && entry.state === 'loaded');

      return musicAssistant?.entry_id ?? null;
    } catch (e) {
      console.warn('Failed to discover Music Assistant integration:', e);
      return null;
    }
  }

  /**
   * Search Music Assistant for media
   */
  async search(
    configEntryId: string,
    name: string,
    mediaType: SearchMediaType,
    limit: number = 50,
  ): Promise<SearchResultItem[]> {
    try {
      const response = await this.hass.callWS<{ response: MusicAssistantSearchResponse }>({
        type: 'call_service',
        domain: 'music_assistant',
        service: 'search',
        service_data: {
          config_entry_id: configEntryId,
          name,
          media_type: [mediaType],
          limit,
        },
        return_response: true,
      });

      return this.transformResults(response.response, mediaType);
    } catch (e) {
      console.error('Music Assistant search failed:', e);
      throw e;
    }
  }

  /**
   * Search with automatic retry if all results are library items
   * Keeps loading more until we have non-library items or hit the max limit
   */
  async searchWithRetry(
    configEntryId: string,
    name: string,
    mediaType: SearchMediaType,
    initialLimit: number = 50,
  ): Promise<SearchResultItem[]> {
    let currentLimit = initialLimit;
    let results: SearchResultItem[] = [];

    while (currentLimit <= MAX_SEARCH_LIMIT) {
      results = await this.search(configEntryId, name, mediaType, currentLimit);
      const nonLibraryResults = this.filterLibraryItems(results);

      if (nonLibraryResults.length > 0 || results.length < currentLimit) {
        // We have non-library results, or we've exhausted the search
        return nonLibraryResults;
      }

      // All results were library items, try loading more
      currentLimit = Math.min(currentLimit * 2, MAX_SEARCH_LIMIT);
    }

    // Return whatever we have (filtered)
    return this.filterLibraryItems(results);
  }

  /**
   * Filter out items with library:// URIs
   */
  filterLibraryItems(results: SearchResultItem[]): SearchResultItem[] {
    return results.filter((item) => !item.uri.startsWith(LIBRARY_URI_PREFIX));
  }

  /**
   * Transform Music Assistant response to our internal format
   */
  private transformResults(response: MusicAssistantSearchResponse, mediaType: SearchMediaType): SearchResultItem[] {
    const items: MusicAssistantSearchResult[] = this.getResultsForType(response, mediaType);

    return items.map((item) => this.transformResultItem(item, mediaType));
  }

  private getResultsForType(
    response: MusicAssistantSearchResponse,
    mediaType: SearchMediaType,
  ): MusicAssistantSearchResult[] {
    switch (mediaType) {
      case 'artist':
        return response.artists ?? [];
      case 'album':
        return response.albums ?? [];
      case 'track':
        return response.tracks ?? [];
      case 'playlist':
        return response.playlists ?? [];
      default:
        return [];
    }
  }

  private transformResultItem(item: MusicAssistantSearchResult, mediaType: SearchMediaType): SearchResultItem {
    let title = item.name;
    let subtitle: string | undefined;

    if (mediaType === 'track') {
      // Format: "artist - song (album)"
      const artistNames = item.artists?.map((a) => a.name).join(', ');
      if (artistNames) {
        title = `${artistNames} - ${item.name}`;
      }
      if (item.album?.name) {
        subtitle = `(${item.album.name})`;
      }
    } else if (mediaType === 'album') {
      subtitle = item.artists?.map((a) => a.name).join(', ');
    }

    return {
      title,
      subtitle,
      uri: item.uri,
      mediaType,
      imageUrl: item.image?.path,
    };
  }
}
