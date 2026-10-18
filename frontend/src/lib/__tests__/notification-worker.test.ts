import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';

const handlers: Record<string, (event: unknown) => void> = {};
const showNotification = jest.fn();
const openWindow = jest.fn();
const matchAll = jest.fn();
beforeEach(() => {
  jest.clearAllMocks(); showNotification.mockResolvedValue(undefined); openWindow.mockResolvedValue(undefined); matchAll.mockResolvedValue([]);
  runInNewContext(readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8'), { URL, self: {
    location: { origin: 'https://captivia.example' }, registration: { showNotification },
    addEventListener: (kind: string, callback: (event: unknown) => void) => { handlers[kind] = callback; },
    clients: { openWindow, matchAll },
  } });
});
it('affiche un push avec un identifiant stable et tolère une charge illisible', async () => {
  const waitUntil = jest.fn();
  handlers.push({ data: { json: () => ({ title: 'Rappel', body: 'Kiwi', data: { eventId: 'evt' } }) }, waitUntil });
  await waitUntil.mock.calls[0][0];
  expect(showNotification).toHaveBeenCalledWith('Rappel', expect.objectContaining({ body: 'Kiwi', tag: 'evt' }));
  handlers.push({ data: { json: () => { throw new Error('bad json'); }, text: () => 'Vous avez un rappel Captivia.' }, waitUntil });
  expect(showNotification).toHaveBeenLastCalledWith('Captivia', expect.objectContaining({ body: 'Vous avez un rappel Captivia.' }));
});
it('un clic ouvre la bonne fiche sur le même domaine', async () => {
  const waitUntil = jest.fn(); const close = jest.fn();
  handlers.notificationclick({ notification: { data: { animalId: 'id/with/slash' }, close }, waitUntil });
  await waitUntil.mock.calls[0][0];
  expect(openWindow).toHaveBeenCalledWith('/mes-animaux/id%2Fwith%2Fslash');
  expect(close).toHaveBeenCalled();
});
it('réutilise une fenêtre ouverte et dirige les rappels sans animal vers la liste', async () => {
  const client = { url: 'https://captivia.example/mes-animaux', navigate: jest.fn().mockResolvedValue(undefined), focus: jest.fn().mockResolvedValue(undefined) };
  matchAll.mockResolvedValue([client]); const waitUntil = jest.fn();
  handlers.notificationclick({ notification: { data: {}, close: jest.fn() }, waitUntil });
  await waitUntil.mock.calls[0][0];
  expect(client.navigate).toHaveBeenCalledWith('/mes-animaux');
  expect(client.focus).toHaveBeenCalled(); expect(openWindow).not.toHaveBeenCalled();
});
