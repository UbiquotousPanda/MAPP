import { z } from 'zod';

/** An ID read from an address: any short text the API answers for; the API alone knows its format. */
export const addressIdSchema = z.string().trim().min(1).max(40);
