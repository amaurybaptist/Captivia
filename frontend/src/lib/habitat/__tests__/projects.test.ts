import { habitatProjects } from '../projects';
jest.mock('@/lib/api', () => ({ getApiBase: () => 'http://localhost:3001' }));
it('notifie l’interface lorsque le serveur refuse le droit Premium', async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ code: 'PREMIUM_REQUIRED', message: 'Premium requis' }),
    });
  const locked = jest.fn();
  window.addEventListener('habitat:premium-required', locked);
  try {
    await expect(habitatProjects.list('token')).rejects.toMatchObject({ status: 403 });
    expect(locked).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener('habitat:premium-required', locked);
  }
});
it('ne confond pas un autre refus HTTP avec une révocation Premium', async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: 'Accès refusé' }) });
  const locked = jest.fn();
  window.addEventListener('habitat:premium-required', locked);
  try {
    await expect(habitatProjects.list('token')).rejects.toMatchObject({ status: 403 });
    expect(locked).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener('habitat:premium-required', locked);
  }
});
