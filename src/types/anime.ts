export interface Anime {
  id: string;
  title: string;
  image: string;
  synopsis: string;
  rating?: number;
  status: 'ongoing' | 'completed' | 'upcoming';
  year?: number;
  genres?: string[];
  studios?: string[];
  episodes?: number;
  url?: string;
}

export interface AnimeDetail extends Anime {
  fullSynopsis: string;
  aired: string;
  producers: string[];
  source: string;
  episodesList: Episode[];
  episode?: number; // Current airing episode count
  totalEpisode?: number; // Total episodes from site
  japanese?: string;
  english?: string;
  type?: string;
  duration?: string;
  season?: string;
  synonyms?: string;
}

export interface Episode {
  episode: number;
  title: string;
  url: string;
  date?: string;
}

export interface EpisodeMetadata {
  title: string | null;
  description: string | null;
  episode_number: string | null;
  subtitle_language: string | null;
  release_time: string | null;
}

export interface EpisodeData extends EpisodeMetadata {
  servers: Array<{
    server: string;
    quality: string;
    url: string;
    type: string;
  }>;
  downloads: Array<{
    type: string;
    qualities: Array<{
      quality: string;
      servers: Array<{
        name: string;
        url: string;
      }>;
    }>;
  }>;
}

export interface StreamServer {
  name: string;
  url: string;
  type?: string;
  metadata?: {
    server?: string;
    quality?: string;
    needsClientSideHandling?: boolean;
    onclickFunction?: string;
    ajaxFunction?: string;
    detectedFrom?: string;
    directUrl?: string;
    isDirectPlayable?: boolean;
  };
}

export interface Genre {
  id: string;
  name: string;
  url: string;
  count?: number;
}

export interface Batch {
  id: string;
  title: string;
  episodes: number;
  size: string;
  quality: string;
  image: string;
  synopsis: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
  debug?: unknown; // Allow debug information
}

export interface PaginationData<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}

export interface ScheduleData {
  [day: string]: Anime[];
}
