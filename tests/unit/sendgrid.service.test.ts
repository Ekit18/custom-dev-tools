import { sendOtpEmail } from '@/lib/email/sendgrid';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

import sgMail from '@sendgrid/mail';

const mockSend = sgMail.send as jest.Mock;

describe('sendOtpEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue([{ statusCode: 202 }, {}]);
  });

  it('calls sgMail.send exactly once', async () => {
    await sendOtpEmail('alice@devit.group', '482931');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('sends to the correct recipient', async () => {
    await sendOtpEmail('alice@devit.group', '482931');
    const [msg] = mockSend.mock.calls[0];
    expect(msg.to).toBe('alice@devit.group');
  });

  it('includes "verification code" in the subject', async () => {
    await sendOtpEmail('alice@devit.group', '482931');
    const [msg] = mockSend.mock.calls[0];
    expect(msg.subject.toLowerCase()).toContain('verification code');
  });

  it('includes the OTP code in the text body', async () => {
    await sendOtpEmail('alice@devit.group', '482931');
    const [msg] = mockSend.mock.calls[0];
    expect(msg.text).toContain('482931');
  });

  it('includes the OTP code in the HTML body', async () => {
    await sendOtpEmail('alice@devit.group', '482931');
    const [msg] = mockSend.mock.calls[0];
    expect(msg.html).toContain('482931');
  });

  it('throws when sgMail.send rejects', async () => {
    mockSend.mockRejectedValue(new Error('SendGrid unavailable'));
    await expect(sendOtpEmail('alice@devit.group', '123456')).rejects.toThrow(
      'SendGrid unavailable'
    );
  });
});
