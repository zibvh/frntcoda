require('dotenv').config();
const express=require('express');
const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const cors=require('cors');
const path=require('path');
const morgan=require('morgan');


const app=express();
const RESEND_API_URL='https://api.resend.com/emails';
app.use(cors({origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true, credentials:true}));
app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({extended:true}));
app.use(morgan('dev'));

const PORT=process.env.PORT||3000;
const JWT_SECRET=process.env.JWT_SECRET||'dev-only-change-me';
const collections=new Map();
function model(name){
  if(!collections.has(name)) collections.set(name,mongoose.model(`Dynamic_${name}`,new mongoose.Schema({_id: mongoose.Schema.Types.Mixed}, {strict:false, collection:name})));
  return collections.get(name);
}
const User=model('users');
const PendingUser=model('pending_users');
const allowedCollections=['users','pending_users','courses','enrollments','certificates','notifications','submissions','examSubmissions','testResults','payments','questions'];
const ownerFields={enrollments:'studentId',certificates:'studentId',submissions:'studentId',examSubmissions:'studentId',testResults:'studentId',notifications:'userId'};
const sensitiveUser=['role','status','isVerified','emailVerified','registrationFeePaid','registrationFeeRef','paystackSubaccountCode','approvedAt','statusUpdatedAt'];

function clean(doc){ if(!doc) return doc; const o=doc.toObject?doc.toObject():{...doc}; o.id=String(o._id); delete o._id; delete o.__v; if(o.password) delete o.password; return o; }
function issue(user){ return jwt.sign({uid:String(user._id),role:user.role,email:user.email},JWT_SECRET,{expiresIn:'7d'}); }
function auth(req,res,next){
  const h=req.headers.authorization||''; if(!h.startsWith('Bearer ')) return res.status(401).json({error:'Authentication required'});
  try { req.auth=jwt.verify(h.slice(7),JWT_SECRET); next(); } catch(e){ return res.status(401).json({error:'Invalid or expired session'}); }
}
function admin(req,res,next){ if(req.auth?.role!=='admin') return res.status(403).json({error:'Admin access required'}); next(); }
function toMongoId(id){ return id; }
function sanitizeQuery(q){
  const out={};
  for(const [k,v] of Object.entries(q||{})){
    if(k.startsWith('$') || k.includes('.')) continue;
    if(k.endsWith('__op')) continue;
    const op=q[k+'__op']||'==';
    let val=v; try{val=JSON.parse(v);}catch{}
    if(op==='in' || op==='array-contains-any') out[k]={$in:Array.isArray(val)?val:[]};
    else if(op==='!=') out[k]={$ne:val};
    else if(op==='>') out[k]={$gt:val};
    else if(op==='>=') out[k]={$gte:val};
    else if(op==='<') out[k]={$lt:val};
    else if(op==='<=') out[k]={$lte:val};
    else out[k]=val;
  }
  return out;
}
function protectUserUpdate(data,req){
  if(req.auth.role!=='admin') for(const k of sensitiveUser) delete data[k];
  if(req.auth.role!=='admin') delete data.password;
  return data;
}
function canReadCollection(col,req,doc){
  if(req.auth.role==='admin') return true;
  if(['courses','questions'].includes(col)) return true;
  if(col==='users') return String(doc._id)===req.auth.uid || (req.auth.role==='tutor' && doc.role==='student');
  const owner=ownerFields[col];
  if(owner && String(doc[owner])===req.auth.uid) return true;
  if(col==='courses') return doc.status==='live' || String(doc.tutorId)===req.auth.uid;
  if(col==='enrollments') return String(doc.studentId)===req.auth.uid || (req.auth.role==='tutor' && String(doc.tutorId)===req.auth.uid) || (req.auth.role==='tutor');
  if(['submissions','examSubmissions'].includes(col)) return String(doc.studentId)===req.auth.uid || (req.auth.role==='tutor' && String(doc.tutorId)===req.auth.uid) || (req.auth.role==='tutor');
  if(col==='payments') return String(doc.studentId)===req.auth.uid || String(doc.tutorId)===req.auth.uid;
  return false;
}
function canWrite(col,req,data,existing){
  if(req.auth.role==='admin') return true;
  if(col==='users') return existing && String(existing._id)===req.auth.uid;
  if(col==='courses') return existing ? String(existing.tutorId)===req.auth.uid : String(data.tutorId)===req.auth.uid;
  const owner=ownerFields[col];
  if(owner) return String((existing||data)[owner])===req.auth.uid;
  if(col==='notifications') return req.auth.role==='tutor' || req.auth.role==='admin';
  return false;
}

app.post('/api/auth/signup',async(req,res)=>{
  try{
    const {email,password,...profile}=req.body; if(!email||!password||password.length<6) return res.status(400).json({error:'Valid email and password (6+ characters) are required'});
    const normalized=email.trim().toLowerCase(); if(await User.findOne({email:normalized})||await PendingUser.findOne({email:normalized})) return res.status(409).json({error:'An account with this email already exists.'});
    const hash=await bcrypt.hash(password,12); const uid=new mongoose.Types.ObjectId();
    const doc={_id:uid,uid:String(uid),email:normalized,password:hash,...profile,createdAt:new Date()};
    await PendingUser.create(doc); const user={...doc}; delete user.password;
    const token=issue({...doc,_id:uid}); res.status(201).json({user:clean(user),token,pending:true});
  }catch(e){res.status(500).json({error:e.message});}
});
app.post('/api/auth/login',async(req,res)=>{
  try{
    const email=(req.body.email||'').trim().toLowerCase(), password=req.body.password||'';
    let u=await User.findOne({email}); let pending=false;
    if(!u){u=await PendingUser.findOne({email}); pending=!!u;}
    if(!u||!(await bcrypt.compare(password,u.password||''))) return res.status(401).json({error:'Email or password is incorrect.'});
    if(pending) return res.status(403).json({error:'Please verify your email before logging in.'});
    if(u.status==='suspended') return res.status(403).json({error:'Account suspended. Contact support.'});
    res.json({user:clean(u),token:issue(u)});
  }catch(e){res.status(500).json({error:e.message});}
});
app.get('/api/auth/me',auth,async(req,res)=>{const u=await User.findById(req.auth.uid); if(!u)return res.status(404).json({error:'User not found'}); res.json({user:clean(u)});});
app.post('/api/auth/logout',(req,res)=>res.json({ok:true}));
app.post('/api/auth/check-email',async(req,res)=>res.json({exists:!!(await User.findOne({email:(req.body.email||'').trim().toLowerCase()}))}));
app.post('/api/auth/forgot-password',async(req,res)=>res.json({ok:true,message:'If the account exists, password reset instructions will be sent.'}));
app.post('/api/auth/verify-email',async(req,res)=>{
  try{
    const {uid,email}=req.body;
    const query=uid ? {_id:toMongoId(uid)} : {email:String(email||'').trim().toLowerCase()};
    const p=await PendingUser.findOne(query);
    if(!p)return res.status(404).json({error:'Verification request not found'});
    const token=jwt.sign({uid:String(p._id),purpose:'email-verification'},JWT_SECRET,{expiresIn:'24h'});
    const verifyUrl=`${process.env.APP_URL||'http://localhost:'+PORT}/api/auth/verify-email/confirm?token=${encodeURIComponent(token)}`;
    const name=p.firstName||p.fullName||'there';
    const html=`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#292524"><h2>Verify your frNtcOda email</h2><p>Hello ${String(name).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))},</p><p>Click the button below to verify your email address.</p><p><a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#EA580C;color:#fff;text-decoration:none;border-radius:8px">Verify Email</a></p><p>This link expires in 24 hours.</p><p>If you did not create this account, you can ignore this email.</p><p>Regards,<br>frNtcOda</p></div>`;
    const result=await sendResendEmail({to:p.email,subject:'Verify your frNtcOda email',html,text:`Hello ${name},\n\nVerify your frNtcOda email: ${verifyUrl}\n\nThis link expires in 24 hours.`});
    res.json({ok:true,messageId:result.id});
  }catch(e){res.status(502).json({error:e.message});}
});
app.get('/api/auth/verify-email/confirm',async(req,res)=>{
  try{
    const payload=jwt.verify(String(req.query.token||''),JWT_SECRET);
    if(payload.purpose!=='email-verification')throw new Error('Invalid verification token');
    const p=await PendingUser.findById(payload.uid);
    if(!p)return res.status(404).send('<h2>Verification link is invalid or already used.</h2>');
    const d=p.toObject(); delete d._id; delete d.password;
    await User.create({...d,emailVerified:true});
    await PendingUser.deleteOne({_id:p._id});
    res.send('<!doctype html><html><head><meta charset="utf-8"><title>Email verified</title></head><body style="font-family:Arial,sans-serif;text-align:center;padding:60px"><h1>Email verified ✓</h1><p>Your frNtcOda account is now verified. You can close this page and log in.</p><a href="/auth.html">Go to login</a></body></html>');
  }catch(e){res.status(400).send('<!doctype html><html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px"><h2>Verification link expired or invalid.</h2><p>Please request a new verification email from frNtcOda.</p><a href="/auth.html">Back to login</a></body></html>');}
});

app.get('/api/:collection',async(req,res)=>{
  const col=req.params.collection; if(!allowedCollections.includes(col)) return res.status(404).json({error:'Unknown collection'});
  try{
    let a=req.auth; const h=req.headers.authorization||''; if(h.startsWith('Bearer ')){try{a=jwt.verify(h.slice(7),JWT_SECRET)}catch{}}
    if(!a && col!=='courses') return res.status(401).json({error:'Authentication required'});
    const filter=sanitizeQuery(req.query); if(!a && col==='courses') filter.status='live';
    if(a && a.role==='tutor' && ['enrollments','submissions','examSubmissions'].includes(col)){
      const owned=await model('courses').find({tutorId:a.uid},{_id:1}).lean();
      filter.courseId={$in:owned.map(x=>x._id.toString())};
    }
    const docs=await model(col).find(filter).limit(Math.min(Number(req.query.limit)||500,1000)).sort(req.query.sort||'-createdAt');
    res.json(docs.filter(d=>!a ? (col==='courses' && d.status==='live') : canReadCollection(col,{auth:a},d)).map(clean));
  }catch(e){res.status(500).json({error:e.message});}
});
app.get('/api/:collection/:id',async(req,res)=>{const col=req.params.collection;if(!allowedCollections.includes(col))return res.status(404).json({error:'Unknown collection'});try{let a;const h=req.headers.authorization||'';if(h.startsWith('Bearer ')){try{a=jwt.verify(h.slice(7),JWT_SECRET)}catch{}}const d=await model(col).findById(toMongoId(req.params.id));if(!d||(!a && !(col==='courses'&&d.status==='live'))||(a&&!canReadCollection(col,{auth:a},d)))return res.status(404).json({error:'Not found'});res.json(clean(d));}catch(e){res.status(400).json({error:'Invalid id'});}});
app.post('/api/:collection',auth,async(req,res)=>{
  const col=req.params.collection;
  if(!allowedCollections.includes(col))return res.status(404).json({error:'Unknown collection'});
  if(['users','pending_users'].includes(col)&&req.auth.role!=='admin')return res.status(403).json({error:'Admin access required'});
  if(col==='payments'&&req.auth.role!=='admin')return res.status(403).json({error:'Payments are server-verified; use /api/payments/verify'});
  try{
    let data={...req.body};
    if(col==='courses'&&req.auth.role==='tutor'){data.tutorId=req.auth.uid;data.status='pending';}
    if(ownerFields[col]&&req.auth.role!=='admin'&&String(data[ownerFields[col]])!==req.auth.uid)return res.status(403).json({error:'You can only create records for your own account'});
    if(col==='notifications'&&req.auth.role!=='admin'&&req.auth.role!=='tutor'&&String(data.userId)!==req.auth.uid)return res.status(403).json({error:'Not allowed'});
    const d=await model(col).create(data);res.status(201).json(clean(d));
  }catch(e){res.status(400).json({error:e.message});}
});
app.patch('/api/:collection/:id',auth,async(req,res)=>{const col=req.params.collection;if(!allowedCollections.includes(col))return res.status(404).json({error:'Unknown collection'});try{const M=model(col),d=await M.findById(toMongoId(req.params.id));if(!d||!canWrite(col,req,req.body,d))return res.status(403).json({error:'Not allowed'});let data={...req.body};if(col==='users')data=protectUserUpdate(data,req);if(col==='courses'&&req.auth.role==='tutor'){delete data.status;delete data.approvedAt;delete data.rejectionReason;}Object.assign(d,data);await d.save();res.json(clean(d));}catch(e){res.status(400).json({error:e.message});}});
app.delete('/api/:collection/:id',auth,async(req,res)=>{const col=req.params.collection;if(!allowedCollections.includes(col))return res.status(404).json({error:'Unknown collection'});try{const M=model(col),d=await M.findById(toMongoId(req.params.id));if(!d||!canWrite(col,req,{},d))return res.status(403).json({error:'Not allowed'});await M.deleteOne({_id:d._id});res.json({ok:true});}catch(e){res.status(400).json({error:e.message});}});

// Trusted server-side operations for payments/enrollments/certificates.
app.post('/api/payments/verify',auth,async(req,res)=>{
  const {reference,courseId,type='enrollment'}=req.body; if(!reference||!courseId)return res.status(400).json({error:'reference and courseId are required'});
  try{
    if(!process.env.PAYSTACK_SECRET_KEY)return res.status(503).json({error:'PAYSTACK_SECRET_KEY is not configured on the server'});
    const r=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`}}); const j=await r.json();
    if(!r.ok||!j.status||j.data?.status!=='success')return res.status(400).json({error:'Payment could not be verified'});
    const amountNaira=Math.round(Number(j.data.amount)/100); const course=await model('courses').findById(toMongoId(courseId)); if(!course)return res.status(404).json({error:'Course not found'});
    if(type==='enrollment'){
      const expected=Number(course.price||0); if(expected!==amountNaira)return res.status(400).json({error:'Payment amount does not match course price'});
      const existing=await model('enrollments').findOne({studentId:req.auth.uid,courseId});
      const en=existing||await model('enrollments').create({studentId:req.auth.uid,courseId,status:'active',progress:0,completedLessons:[]});
      Object.assign(en,{paid:true,paystackRef:reference,status:'active',paidAt:new Date()}); await en.save();
      const payment=await model('payments').findOneAndUpdate({paystackRef:reference},{studentId:req.auth.uid,courseId,tutorId:course.tutorId,courseTitle:course.title||course.name,type:'enrollment',amount:amountNaira,status:'success',paystackRef:reference,paidAt:new Date()},{upsert:true,new:true});
      return res.json({enrollment:clean(en),payment:clean(payment)});
    }
    res.json({verified:true,transaction:j.data});
  }catch(e){res.status(500).json({error:e.message});}
});


async function sendResendEmail({to,subject,html,text}) {
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.EMAIL_FROM;
  if(!apiKey || !from) throw new Error('Resend is not configured on the server');
  const response=await fetch(RESEND_API_URL,{
    method:'POST',
    headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({from,to,subject,html,text})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) {
    const message=data?.message || data?.name || `Resend API request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

function emailTemplate(endpoint, body){
  const labels={
    'tutor-welcome':'Welcome to frNtcOda',
    'student-welcome':'Welcome to frNtcOda',
    'tutor-activated':'Your tutor account is activated',
    'course-live':'Your course is now live',
    'course-rejected':'Your course needs changes',
    'student-enrolled':'Course enrollment confirmed',
    'certificate-ready':'Your certificate is ready',
    'password-reset':'Reset your frNtcOda password',
    'tutor-payment-notification':'Payment received for your course',
    'submission-notification':'New student submission'
  };
  const subject=labels[endpoint] || 'frNtcOda notification';
  const title=subject;
  const name=body.toName || body.studentName || 'there';
  const details=Object.entries(body)
    .filter(([k,v])=>!['to','toName','html','text'].includes(k) && v!==undefined && v!==null && v!=='')
    .map(([k,v])=>`<p><strong>${String(k).replace(/([A-Z])/g,' $1')}:</strong> ${String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</p>`).join('');
  const html=body.html || `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#292524"><h2>${title}</h2><p>Hello ${name},</p>${details}<p>Regards,<br>frNtcOda</p></div>`;
  return {subject,html,text:body.text || `${title}\n\nHello ${name},\n\nThis is a notification from frNtcOda.`};
}

app.post('/api/email/:endpoint',auth,async(req,res)=>{
  try{
    const to=req.body.to;
    if(!to)return res.status(400).json({error:'Recipient email is required'});
    const tpl=emailTemplate(req.params.endpoint,req.body);
    const info=await sendResendEmail({to,subject:tpl.subject,text:tpl.text,html:tpl.html});
    res.json({ok:true,messageId:info.id});
  }catch(e){res.status(502).json({error:e.message});}
});
app.get('/health',(req,res)=>res.json({ok:true,service:'frNtcOda API',database:mongoose.connection.readyState===1?'mongodb':'disconnected'}));
app.use(express.static(path.join(__dirname)));
app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'API route not found'});res.sendFile(path.join(__dirname,'index.html'));});

mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/frntcoda').then(async()=>{
  if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){
    const email=process.env.ADMIN_EMAIL.trim().toLowerCase();
    if(!await User.findOne({email})){const password=await bcrypt.hash(process.env.ADMIN_PASSWORD,12);await User.create({email,password,fullName:process.env.ADMIN_NAME||'Administrator',role:'admin',status:'active',isVerified:true,emailVerified:true,createdAt:new Date()});console.log('Bootstrap admin created:',email);}
  }
  app.listen(PORT,()=>console.log(`frNtcOda running on http://localhost:${PORT}`));
}).catch(e=>{console.error('MongoDB connection failed:',e.message);process.exit(1);});
