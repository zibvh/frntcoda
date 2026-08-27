const API_BASE = window.API_BASE_URL || '/api';
const TOKEN_KEY='frntcoda_token';
const USER_KEY='frntcoda_user';

async function request(path, options={}){
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  const token=localStorage.getItem(TOKEN_KEY); if(token) headers.Authorization=`Bearer ${token}`;
  const res=await fetch(API_BASE+path,{...options,headers});
  let data={}; try{data=await res.json();}catch{}
  if(!res.ok){const e=new Error(data.error||`Request failed (${res.status})`);e.status=res.status;e.code=data.code||'api/error';throw e;}
  return data;
}
export const serverTimestamp=()=>({__serverTimestamp:true});
export const initializeApp=()=>({}); export const getApps=()=>[{}]; export const getFirestore=()=>({}); export const enableNetwork=async()=>{};
export function collection(_db,name){return {kind:'collection',name};}
export function doc(_db,col,id){return {kind:'doc',collection:col,id};}
export function where(field,op,value){return {field,op,value};}
export function orderBy(field,direction='asc'){return {field,op:'orderBy',value:direction};}
export function limit(n){return {field:'__limit',op:'limit',value:n};}
export function query(ref,...constraints){return {kind:'query',name:ref.name,constraints};}
function encode(v){return encodeURIComponent(typeof v==='object'?JSON.stringify(v):String(v));}
export async function getDoc(ref){try{const data=await request(`/${ref.collection}/${encode(ref.id)}`);return {id:data.id,exists:()=>true,data:()=>({...data})};}catch(e){if(e.status===404)return {id:ref.id,exists:()=>false,data:()=>undefined};throw e;}}
export async function getDocs(ref){const name=ref.name||ref.collection;const constraints=ref.constraints||[];const params=new URLSearchParams();for(const c of constraints){if(c.op==='orderBy')params.set('sort',(c.value==='desc'?'-':'')+c.field);else if(c.op==='limit')params.set('limit',c.value);else if(c.op==='in'){}else { params.set(c.field, typeof c.value==='object'?JSON.stringify(c.value):String(c.value)); if(c.op && c.op!=='==') params.set(c.field+'__op',c.op); }}const data=await request(`/${name}?${params}`);return {docs:data.map(d=>({id:d.id,exists:()=>true,data:()=>({...d})})),empty:data.length===0,size:data.length,forEach(fn){this.docs.forEach(fn)}};}
export async function addDoc(ref,data){const out=await request(`/${ref.name}`,{method:'POST',body:JSON.stringify(resolve(data))});return {id:out.id};}
export async function setDoc(ref,data,options={}){if(options.merge){return updateDoc(ref,data);}const existing=await getDoc(ref);if(existing.exists())return updateDoc(ref,data);const out=await request(`/${ref.collection}`,{method:'POST',body:JSON.stringify({...resolve(data),_id:ref.id})});return out;}
export async function updateDoc(ref,data){return request(`/${ref.collection}/${encode(ref.id)}`,{method:'PATCH',body:JSON.stringify(resolve(data))});}
export async function deleteDoc(ref){return request(`/${ref.collection}/${encode(ref.id)}`,{method:'DELETE'});}
function resolve(v){if(v&&typeof v==='object'){if(v.__serverTimestamp)return new Date().toISOString();if(Array.isArray(v))return v.map(resolve);const o={};for(const [k,x] of Object.entries(v))o[k]=resolve(x);return o;}return v;}

function userObj(u){return u?{...u,uid:u.uid||u.id}:null;}
let listeners=[];
export const getAuth=()=>({});
export async function signInWithEmailAndPassword(_auth,email,password){const out=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem(TOKEN_KEY,out.token);localStorage.setItem(USER_KEY,JSON.stringify(out.user));notify();return {user:userObj(out.user)};}
export async function createUserWithEmailAndPassword(_auth,email,password){const out=await request('/auth/signup',{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem(TOKEN_KEY,out.token);localStorage.setItem(USER_KEY,JSON.stringify(out.user));notify();return {user:userObj(out.user)};}
export async function signOut(){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);notify();}
export function onAuthStateChanged(_auth,cb){listeners.push(cb);setTimeout(async()=>{if(localStorage.getItem(TOKEN_KEY)){try{const out=await request('/auth/me');localStorage.setItem(USER_KEY,JSON.stringify(out.user));cb(userObj(out.user));return;}catch{localStorage.removeItem(TOKEN_KEY);}}cb(null);},0);return()=>{listeners=listeners.filter(x=>x!==cb)};}
function notify(){let u=null;try{u=JSON.parse(localStorage.getItem(USER_KEY)||'null')}catch{}listeners.forEach(cb=>cb(userObj(u)));}
export async function sendEmailVerification(user){return request('/auth/verify-email',{method:'POST',body:JSON.stringify({uid:user.uid,email:user.email})});}
export async function sendPasswordResetEmail(_auth,email){return request('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})});}
export async function fetchSignInMethodsForEmail(_auth,email){const x=await request('/auth/check-email',{method:'POST',body:JSON.stringify({email})});return x.exists?['password']:[];}
export function GoogleAuthProvider(){this.providerId='google.com';}
export function GithubAuthProvider(){this.providerId='github.com';}
export async function signInWithPopup(){const e=new Error('Social sign-in is not configured in the MongoDB migration. Use email/password or configure OAuth in the Node.js server.');e.code='auth/popup-not-configured';throw e;}
export function updateProfile(user,data){return request(`/users/${user.uid}`,{method:'PATCH',body:JSON.stringify(data)});}
