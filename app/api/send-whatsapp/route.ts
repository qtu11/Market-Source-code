import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { to, body } = await request.json();

    // Ensure environment variables are set
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !whatsappNumber) {
      throw new Error('Missing Twilio configuration in environment variables');
    }

    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      body,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${to}`,
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    logger.error('Error sending WhatsApp message', error);
    return NextResponse.json(
      {
        error: 'Failed to send WhatsApp message',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
