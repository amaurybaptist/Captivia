import { PrismaService } from '../prisma/prisma.service';
import { GradeService } from '../grade/grade.service';
import { NotificationsService } from './notifications.service';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
let service: NotificationsSchedulerService;
let check: jest.SpyInstance<Promise<void>, [now?: Date]>;
const previousEnv = process.env.NODE_ENV;
const previousEnabled = process.env.NOTIFICATIONS_SCHEDULER_ENABLED;
beforeEach(() => {
  jest.useFakeTimers();
  service = new NotificationsSchedulerService(
    {} as PrismaService,
    {} as NotificationsService,
    {} as GradeService,
  );
  check = jest
    .spyOn(service, 'checkRoutinesAndSendNotifications')
    .mockResolvedValue(undefined);
});
afterEach(() => {
  service.onModuleDestroy();
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;
  if (previousEnabled === undefined)
    delete process.env.NOTIFICATIONS_SCHEDULER_ENABLED;
  else process.env.NOTIFICATIONS_SCHEDULER_ENABLED = previousEnabled;
});
it('démarre un passage chaque minute et arrête le timer à la fermeture', () => {
  process.env.NODE_ENV = 'development';
  process.env.NOTIFICATIONS_SCHEDULER_ENABLED = 'true';
  service.onModuleInit();
  jest.advanceTimersByTime(60000);
  expect(check).toHaveBeenCalledTimes(1);
  service.onModuleDestroy();
  jest.advanceTimersByTime(120000);
  expect(check).toHaveBeenCalledTimes(1);
});
it('ne lance aucun worker automatique sous Jest ni lorsque les envois sont suspendus', () => {
  process.env.NODE_ENV = 'test';
  process.env.NOTIFICATIONS_SCHEDULER_ENABLED = 'true';
  service.onModuleInit();
  jest.advanceTimersByTime(60000);
  process.env.NODE_ENV = 'development';
  process.env.NOTIFICATIONS_SCHEDULER_ENABLED = 'false';
  service.onModuleInit();
  jest.advanceTimersByTime(60000);
  expect(check).not.toHaveBeenCalled();
});
