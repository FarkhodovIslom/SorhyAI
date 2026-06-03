import type { Context, SessionFlavor } from 'grammy';
import type { IUser } from '@sorhy/db';
export interface SessionData {
    step?: string;
    data?: Record<string, unknown>;
}

export type BotContext = Context & SessionFlavor<SessionData> & {
    user?: IUser;
};
