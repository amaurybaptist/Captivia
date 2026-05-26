import { api } from '../api';

// Mock fetch
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Species endpoints', () => {
    it('searchSpecies should call correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [], total: 0 }),
      });

      await api.searchSpecies('boa', 20, 0);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/species/search?q=boa&limit=20&offset=0'),
      );
    });

    it('getSpecies should call correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 123, name: 'Test Species' }),
      });

      await api.getSpecies('123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/species/123'),
      );
    });

    it('getVernacularNames should call correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ([]),
      });

      await api.getVernacularNames('123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/species/123/vernacular'),
      );
    });
  });

  describe('Health endpoints', () => {
    it('getSpeciesHealth should call correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ speciesId: 123, editorial: null }),
      });

      await api.getSpeciesHealth('123', 'respiratory', 'fr');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/species/123/health?disease=respiratory&locale=fr'),
      );
    });
  });

  describe('Animals endpoints (with auth)', () => {
    const mockToken = 'test-token-123';

    it('getMyAnimals should include Authorization header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ([]),
      });

      await api.getMyAnimals(mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/animals'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
    });

    it('createAnimal should POST with correct data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'animal-123' }),
      });

      const animalData = {
        speciesId: 123,
        name: 'Rex',
        sex: 'male',
      };

      await api.createAnimal(animalData, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/animals'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(animalData),
        }),
      );
    });

    it('updateAnimal should PATCH with correct data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'animal-123' }),
      });

      const updateData = { name: 'Updated Name' };

      await api.updateAnimal('animal-123', updateData, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/animals/animal-123'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData),
        }),
      );
    });

    it('deleteAnimal should DELETE with auth header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await api.deleteAnimal('animal-123', mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/animals/animal-123'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
    });
  });

  describe('Routines endpoints', () => {
    const mockToken = 'test-token-123';

    it('getAnimalRoutines should call correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ([]),
      });

      await api.getAnimalRoutines('animal-123', mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/animals/animal-123/routines'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
    });

    it('createRoutine should POST with correct data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'routine-123' }),
      });

      const routineData = {
        type: 'nourrissage',
        frequency: 'daily',
        schedule: { time: '08:00' },
      };

      await api.createRoutine('animal-123', routineData, mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/animals/animal-123/routines'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(routineData),
        }),
      );
    });
  });

  describe('Auth endpoints', () => {
    it('register should POST registration data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: 'token', user: {} }),
      });

      await api.register('test@captivia.com', 'password123', 'fr');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@captivia.com',
            password: 'password123',
            locale: 'fr',
          }),
        }),
      );
    });

    it('login should POST login credentials', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: 'token', user: {} }),
      });

      await api.login('test@captivia.com', 'password123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@captivia.com',
            password: 'password123',
          }),
        }),
      );
    });

    it('getProfile should include Authorization header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123' }),
      });

      await api.getProfile('test-token');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });
  });

  describe('Error handling', () => {
    it('should throw error when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(api.getSpecies('999999')).rejects.toThrow();
    });
  });

  describe('Food endpoints', () => {
    it('searchFood should call correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await api.searchFood('dog food', 'wet');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/food/search?q=dog'),
      );
    });
  });

  describe('Equipment endpoints', () => {
    it('getRecommendedEquipment should call correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ recommendations: [] }),
      });

      await api.getRecommendedEquipment(123, 'terrarium', 'large');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/equipment?speciesId=123&category=terrarium&size=large'),
      );
    });
  });
});
