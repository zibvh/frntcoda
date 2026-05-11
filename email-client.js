/**
 * frNtcOda Email Client
 * Drop this script into any page that needs to send emails.
 * 
 * Usage:
 *   <script src="email-client.js"></script>
 *   await FrntEmail.tutorWelcome({ to, toName })
 */

const FrntEmail = (() => {
  const BASE_URL = 'https://frntcoda-email.onrender.com';
  const API_KEY  = '670d9d5e2c85f4e8aab027704c38d946'; // replace with your EMAIL_SERVICE_API_KEY value from Render

  async function post(endpoint, body) {
    const res = await fetch(`${BASE_URL}/email/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Email send failed (${res.status})`);
    }
    return res.json();
  }

  return {
    /** Send welcome email to a new tutor applicant */
    tutorWelcome:              (data) => post('tutor-welcome',              data),
    /** Send welcome email to a new student */
    studentWelcome:            (data) => post('student-welcome',            data),
    /** Send "you're live" email after ₦1,000 fee is paid */
    tutorActivated:            (data) => post('tutor-activated',            data),
    /** Notify tutor their course is live */
    courseLive:                (data) => post('course-live',                data),
    /** Notify tutor their course was rejected + reason */
    courseRejected:            (data) => post('course-rejected',            data),
    /** Confirm enrollment to a student */
    studentEnrolled:           (data) => post('student-enrolled',           data),
    /** Notify student their certificate is ready */
    certificateReady:          (data) => post('certificate-ready',          data),
    /** Send password reset link */
    passwordReset:             (data) => post('password-reset',             data),
    /** Notify tutor of a payment (enrollment or certificate) */
    tutorPaymentNotification:  (data) => post('tutor-payment-notification', data),
    /** Notify tutor a student submitted an exam/assignment */
    submissionNotification:    (data) => post('submission-notification',    data),
  };
})();

// Make available as ES module too
if (typeof module !== 'undefined') module.exports = FrntEmail;
