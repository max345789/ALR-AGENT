import { createAdminGuard } from '../utils/auth.js';

export const requireAdminKey = createAdminGuard();
