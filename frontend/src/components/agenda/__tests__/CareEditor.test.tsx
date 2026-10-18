import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CareEditor from '../CareEditor';
import type { Agenda, Source } from '@/lib/agenda/calendar';
jest.mock('@/lib/api', () => ({ getApiBase: () => 'http://localhost:3001' }));
const agenda: Agenda = {
  today: '2026-10-18',
  timeZone: 'Europe/Brussels',
  premium: true,
  animals: [{ id: 'a', name: 'Kiwi' }],
  sources: [],
  events: [],
  truncated: false,
};
const source: Source = {
  key: 'routine:r',
  id: 'r',
  kind: 'routine',
  animalId: 'a',
  title: 'Repas',
  name: 'Repas',
  type: 'nourrissage',
  frequency: 'monthly',
  schedule: { time: '08:00', dayOfMonth: 31, startDate: '2026-01-01' },
};
beforeEach(() => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'r' }) });
});
it('modifie directement une routine sans déplacer son jour mensuel depuis février', async () => {
  const saved = jest.fn();
  render(
    <CareEditor
      source={source}
      day="2026-02-28"
      animalId="a"
      agenda={agenda}
      token="token"
      onClose={jest.fn()}
      onSaved={saved}
    />,
  );
  fireEvent.change(screen.getByLabelText('Nom du soin'), { target: { value: 'Repas modifié' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith('2026-02-28'));
  const init = jest.mocked(fetch).mock.calls[0][1]!;
  expect(JSON.parse(String(init.body))).toMatchObject({
    name: 'Repas modifié',
    schedule: { dayOfMonth: 31, startDate: '2026-01-01' },
  });
});
it('crée un soin ponctuel pour le jour sélectionné', async () => {
  const saved = jest.fn();
  render(
    <CareEditor
      day="2026-10-20"
      animalId="a"
      agenda={agenda}
      token="token"
      onClose={jest.fn()}
      onSaved={saved}
    />,
  );
  fireEvent.change(screen.getByLabelText('Nom du soin'), { target: { value: 'Bain Kiwi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(jest.mocked(fetch).mock.calls[0][0]).toContain('/animals/a/routines');
  expect(JSON.parse(String(jest.mocked(fetch).mock.calls[0][1]!.body))).toMatchObject({
    frequency: 'once',
    schedule: { date: '2026-10-20', time: '08:00' },
  });
});
it('reste dans l’éditeur après un refus du serveur et ne prétend pas avoir sauvegardé', async () => {
  jest
    .mocked(fetch)
    .mockResolvedValue({ ok: false, status: 403, json: async () => ({}) } as Response);
  const saved = jest.fn();
  render(
    <CareEditor
      source={source}
      day="2026-02-28"
      animalId="a"
      agenda={agenda}
      token="token"
      onClose={jest.fn()}
      onSaved={saved}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Premium');
  expect(saved).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
it('conserve un rendez-vous ambigu en automne lorsque son horaire n’est pas modifié', async () => {
  const saved = jest.fn(),
    appointment: Source = {
      key: 'appointment:v',
      kind: 'appointment',
      id: 'v',
      animalId: 'a',
      title: 'Visite',
      vetName: 'Dr Test',
      date: '2026-10-25T01:30:00.000Z',
    };
  render(
    <CareEditor
      source={appointment}
      day="2026-10-25"
      animalId="a"
      agenda={agenda}
      token="token"
      onClose={jest.fn()}
      onSaved={saved}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(JSON.parse(String(jest.mocked(fetch).mock.calls[0][1]!.body)).date).toBe(appointment.date);
});
