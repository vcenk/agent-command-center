import twilio from 'twilio';
import { config } from '../config';

let twilioClient: twilio.Twilio;

function getClient(): twilio.Twilio {
  if (!twilioClient) {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
}

/**
 * Transfer a call to a human phone number
 * Updates the call's TwiML to dial the transfer number
 */
export async function transferCall(
  callSid: string,
  transferToNumber: string
): Promise<void> {
  const client = getClient();

  // Update the live call with new TwiML that dials the transfer number
  await client.calls(callSid).update({
    twiml: `<Response>
      <Say voice="alice">Please hold while I transfer you to a team member.</Say>
      <Dial callerId="${config.twilio.accountSid}">
        <Number>${transferToNumber}</Number>
      </Dial>
      <Say voice="alice">I'm sorry, the transfer was unsuccessful. Please try calling back. Goodbye.</Say>
    </Response>`,
  });

  console.log(`[Twilio] Call ${callSid} transferred to ${transferToNumber}`);
}

/**
 * Gracefully hang up a call with a message
 */
export async function hangupCall(callSid: string, message: string): Promise<void> {
  const client = getClient();

  await client.calls(callSid).update({
    twiml: `<Response><Say voice="alice">${message}</Say><Hangup/></Response>`,
  });
}
