import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface StripeCheckoutParams {
  membershipId: string;
  billingCycle: 'monthly' | 'yearly';
  userId: string;
}

export interface ZoomMeetingParams {
  eventId: string;
  topic: string;
  startTime: string;
  duration: number;
}

export interface EmailParams {
  to: string;
  subject: string;
  content: string;
  type: string;
}

export const stripeApi = {
  async createCheckoutSession(params: StripeCheckoutParams): Promise<{ sessionId: string; url: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      return await response.json();
    } catch (error) {
      console.error('Stripe checkout error:', error);
      throw error;
    }
  },

  async createMembershipCheckout(membershipId: string, billingCycle: 'monthly' | 'yearly'): Promise<{ data?: { url: string }; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return { error: 'Not authenticated' };
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-create-membership-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membership_id: membershipId,
          billing_cycle: billingCycle,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to create checkout session' };
      }

      return { data: result };
    } catch (error: any) {
      console.error('Stripe membership checkout error:', error);
      return { error: error.message || 'An error occurred' };
    }
  },

  async redirectToCheckout(sessionUrl: string) {
    window.location.href = sessionUrl;
  },
};

export const zoomApi = {
  async createMeeting(params: ZoomMeetingParams) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/zoom-create-meeting`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to create Zoom meeting');
      }

      return await response.json();
    } catch (error) {
      console.error('Zoom meeting error:', error);
      throw error;
    }
  },
};

export const brevoApi = {
  async sendEmail(params: EmailParams) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/brevo-send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return await response.json();
    } catch (error) {
      console.error('Brevo email error:', error);
      throw error;
    }
  },

  async queueNotification(userId: string, type: string, subject: string, content: string) {
    try {
      await supabase.from('notification_queue').insert({
        user_id: userId,
        notification_type: type,
        subject,
        content,
      });
    } catch (error) {
      console.error('Failed to queue notification:', error);
    }
  },
};

export const notificationTypes = {
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  PAYMENT_FAILED: 'payment_failed',
  TRAINING_REMINDER: 'training_reminder',
  HABIT_REMINDER: 'habit_reminder',
  EVENT_REMINDER: 'event_reminder',
  PERFORMANCE_DIGEST: 'performance_digest',
  MEMBERSHIP_CANCELLED: 'membership_cancelled',
  MEMBERSHIP_UPGRADED: 'membership_upgraded',
};

export async function scheduleEventReminders(eventId: string, eventDate: string) {
  try {
    const { data: event } = await supabase
      .from('events')
      .select('*, event_registrations(*)')
      .eq('id', eventId)
      .single();

    if (!event) return;

    const reminderDate = new Date(eventDate);
    reminderDate.setHours(reminderDate.getHours() - 24);

    const notifications = event.event_registrations.map((reg: any) => ({
      user_id: reg.user_id,
      notification_type: notificationTypes.EVENT_REMINDER,
      subject: `Reminder: ${event.title} tomorrow`,
      content: `Don't forget! You're registered for "${event.title}" starting at ${event.event_time}.`,
      scheduled_for: reminderDate.toISOString(),
    }));

    await supabase.from('notification_queue').insert(notifications);
  } catch (error) {
    console.error('Failed to schedule event reminders:', error);
  }
}

export async function sendWeeklyDigest() {
  try {
    const digestData = await import('../data/digest.json');
    const latestDigest = digestData.default[0];

    const { data: activeUsers } = await supabase
      .from('user_memberships')
      .select('user_id, profiles(email)')
      .eq('status', 'active');

    if (!activeUsers) return;

    const notifications = activeUsers.map((membership: any) => ({
      user_id: membership.user_id,
      notification_type: notificationTypes.PERFORMANCE_DIGEST,
      subject: `Performance Pills: ${latestDigest.title}`,
      content: `
        <h2>${latestDigest.title}</h2>
        <p>${latestDigest.summary}</p>
        <p><a href="${latestDigest.link}">Read more</a></p>
      `,
    }));

    await supabase.from('notification_queue').insert(notifications);
    console.log(`Weekly digest scheduled for ${activeUsers.length} users`);
  } catch (error) {
    console.error('Failed to send weekly digest:', error);
  }
}
