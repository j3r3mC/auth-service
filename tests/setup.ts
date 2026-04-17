import { resetTestDB } from '../prisma/test-utils/resetTestDb';

beforeAll(async () => {
  await resetTestDB();
});

afterEach(async () => {
  await resetTestDB();
});
