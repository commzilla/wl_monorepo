
export const sendEmail = async ({
  to,
  subject,
  html,
  type,
  userId
}: {
  to: string;
  subject: string;
  html: string;
  type: string;
  userId: string;
}) => {
  try {
    // Mock email sending - log to console
    console.log('📧 Mock Email Sent:', {
      to,
      subject,
      type,
      userId,
      html: html.substring(0, 100) + '...'
    });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return { success: true, data: { messageId: `mock-${Date.now()}` } };
  } catch (error) {
    console.error('Exception in sendEmail:', error);
    return { success: false, error };
  }
};

export const sendWelcomeEmail = async (email: string, firstName: string, userId: string) => {
  const html = `
    <h1>Welcome to WeFund CRM, ${firstName}!</h1>
    <p>Thank you for creating an account with us. We're excited to have you join our platform.</p>
    <p>You can now access your dashboard and start managing your prop trading activities.</p>
    <p>Best regards,<br>The WeFund Team</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to WeFund CRM',
    html,
    type: 'welcome',
    userId
  });
};

export const fetchEmailNotifications = async (userId: string) => {
  try {
    // Mock email notifications data
    const mockNotifications = [
      {
        id: `notif-${Date.now()}`,
        user_id: userId,
        type: 'welcome',
        subject: 'Welcome to WeFund CRM',
        sent_at: new Date().toISOString(),
        status: 'sent',
        metadata: { to: 'user@example.com' }
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 200));
    
    return { success: true, data: mockNotifications };
  } catch (error) {
    console.error('Exception in fetchEmailNotifications:', error);
    return { success: false, error };
  }
};
