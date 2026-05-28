import { Schema, model, Document} from 'mongoose';

export interface IUser extends Document {
    telegramId: string;
    username?: string;
    firstName?: string;
    language: string;
    subscription: {
        plan: 'free' | 'pro',
        status: 'active' | 'cancelled' | 'past_due',
        billingProvider?: string;
        currentPeriodEnd?: Date;
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
        cancelAtPeriodEnd: boolean;
    };
    settings: {
        aiModel: string;
        responseStyle: 'default' | 'concise' | 'detailed';
        language: string;
    };
    byok: Array<{
        provider: string;
        encryptedKey: string;
        iv: string;
        isActive: boolean;
    }>;
    usage: {
        dailyMessages: number;
        dailyDownloads: number;
        lastResetAt: Date;
    };
    credits: {
        balance: number;
        lastStreakAt?: Date;
        streakDays: number;
    };
    warns: number;
    isBanned: boolean;
    referralCode: string;
    referredBy?: string;
    adStats: {
        impressionsCount: number;
        lastAdShownAt?: Date;
    };
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    telegramId: {
        type: String,
        required: true,
        unique: true,
    },
    username: String,
    firstName: String,
    language: {type: String, default: 'en'},
    subscription: {
        plan: {type: String, enum: ['free', 'pro'], default: 'free'},
        status: {type: String, enum: ['active', 'cancelled', 'past_due'], default: 'active'},
        billingProvider: String,
        currentPeriodEnd: Date,
        stripeCustomerId: String,
        stripeSubscriptionId: String,
        cancelAtPeriodEnd: { type: Boolean, default: false }
    },

    settings: {
        aiModel: {type: String, default: 'google/gemma-4'},
        responseStyle: {type: String, enum: ['default', 'concise', 'detailed'], default: 'default'},
        language: {type: String, default: 'en'}
    },
    byok: [{
        provider: String,
        encryptedKey: String,
        iv: String,
        isActive: { type: Boolean, default: false }
    }],
    usage: {
        dailyMessages: {type: Number, default: 0},
        dailyDownloads: {type: Number, default: 0},
        lastResetAt: {type: Date, default: Date.now}
    },
    credits: {
        balance: {type: Number, default: 50},
        lastStreakAt: Date,
        streakDays: {type: Number, default: 0}
    },
    warns: {type: Number, default: 0},
    isBanned: {type: Boolean, default: false},
    referralCode: {type: String, unique: true},
    referredBy: String,
    adStats: {
        impressionsCount: { type: Number, default: 0 },
        lastAdShownAt: Date
    },
    createdAt: {type: Date, default: Date.now}
});

export const User = model<IUser>('User', UserSchema);