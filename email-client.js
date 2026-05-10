/**
 * frNtcOda Email Client
 * Drop this script into any page that needs to send emails.
 * 
 * Usage:
 *   <script src="email-client.js"></script>
 *   await FrntEmail.tutorWelcome({ to, toName })
 */

const FrntEmail = (() => {
  const BASE_URL = 'https://frntcoda-email.onrender.com'; // update after deploy
  const API_KEY  = '%%EMAIL_SERVICE_API_KEY%%';           // replace at build time or set in your config

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
    tutorWelcome:     (data) => post('tutor-welcome',     data),
    /** Send "you're live" email after ₦1,000 fee is paid */
    tutorActivated:   (data) => post('tutor-activated',   data),
    /** Notify tutor their course is live */
    courseLive:       (data) => post('course-live',       data),
    /** Notify tutor their course was rejected + reason */
    courseRejected:   (data) => post('course-rejected',   data),
    /** Confirm enrollment to a student */
    studentEnrolled:  (data) => post('student-enrolled',  data),
    /** Notify student their certificate is ready */
    certificateReady: (data) => post('certificate-ready', data),
    /** Send password reset link */
    passwordReset:    (data) => post('password-reset',    data),
  };
})();

// Make available as ES module too
if (typeof module !== 'undefined') module.exports = FrntEmail;
