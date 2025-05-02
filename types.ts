export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
}

export interface StarRecord {
  id: number;
  repo: string;
  readme: string;
  created_at: string;
  similarity?: number;
}

export interface SearchResult {
  id: number;
  repo: string;
  readme: string;
  name: string;
  link: string;
  similarity: number;
}
