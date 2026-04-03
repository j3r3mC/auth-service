import { resetTestDB } from '../prisma/test-utils/resetTestDb';

beforeAll(() => {
  resetTestDB();
});
