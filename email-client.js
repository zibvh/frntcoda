/** frNtcOda Email Client — credentials stay on the Node.js server. */
const FrntEmail = (() => {
  async function post(endpoint, body) {
    const token = localStorage.getItem('frntcoda_token');
    const res = await fetch(`/api/email/${endpoint}`, {
      method:'POST',
      headers:{'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})},
      body:JSON.stringify(body)
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||`Email send failed (${res.status})`);
    return data;
  }
  return {
    tutorWelcome:d=>post('tutor-welcome',d), studentWelcome:d=>post('student-welcome',d),
    tutorActivated:d=>post('tutor-activated',d), courseLive:d=>post('course-live',d),
    courseRejected:d=>post('course-rejected',d), studentEnrolled:d=>post('student-enrolled',d),
    certificateReady:d=>post('certificate-ready',d), passwordReset:d=>post('password-reset',d),
    tutorPaymentNotification:d=>post('tutor-payment-notification',d),
    submissionNotification:d=>post('submission-notification',d)
  };
})();
if(typeof module!=='undefined')module.exports=FrntEmail;
