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
}

export interface Episode {
  episode: number;
  title: string;
  url: string;
  date?: string;
}

export interface StreamServer {
  name: string;
  url: string;
  type?: string;
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
  debug?: any; // Allow debug information
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