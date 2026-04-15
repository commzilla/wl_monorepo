
export const logEmailNotification = async (
  userId: string,
  type: string,
  subject: string,
  metadata?: Record<string, any>
) => {
  try {
    // Mock email notification logging
    console.log('📧 Email Notification Logged:', {
      userId,
      type,
      subject,
      metadata,
      timestamp: new Date().toISOString()
    });
    
    // Store in localStorage for demo purposes
    const notifications = JSON.parse(localStorage.getItem('email_notifications') || '[]');
    notifications.push({
      id: `notif-${Date.now()}`,
      user_id: userId,
      type,
      subject,
      metadata,
      sent_at: new Date().toISOString()
    });
    localStorage.setItem('email_notifications', JSON.stringify(notifications));
    
  } catch (error) {
    console.error('Error in logEmailNotification:', error);
  }
};

export const sendWelcomeEmail = async (email: string, firstName: string) => {
  try {
    console.log(`📧 Sending welcome email to ${email} for ${firstName}`);
    
    // Mock welcome email
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};
