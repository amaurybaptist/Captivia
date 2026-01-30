const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = {
  // Species endpoints
  searchSpecies: async (query: string, limit = 20, offset = 0) => {
    const response = await fetch(`${API_URL}/species/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
    return response.json();
  },

  getSpecies: async (id: string) => {
    const response = await fetch(`${API_URL}/species/${id}`);
    return response.json();
  },

  getVernacularNames: async (id: string) => {
    const response = await fetch(`${API_URL}/species/${id}/vernacular`);
    return response.json();
  },

  getIucn: async (id: string) => {
    const response = await fetch(`${API_URL}/species/${id}/iucn`);
    return response.json();
  },

  getDistributions: async (id: string) => {
    const response = await fetch(`${API_URL}/species/${id}/distributions`);
    return response.json();
  },

  getMedia: async (id: string) => {
    const response = await fetch(`${API_URL}/species/${id}/media`);
    return response.json();
  },

  getMetrics: async (id: string) => {
    const response = await fetch(`${API_URL}/species/${id}/metrics`);
    return response.json();
  },

  countOccurrences: async (id: string) => {
    const response = await fetch(`${API_URL}/species/${id}/occurrences/count`);
    return response.json();
  },
};