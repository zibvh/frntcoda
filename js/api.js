import { initializeApp as firebaseInitializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth as firebaseGetAuth,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword as firebaseLogin,
  createUserWithEmailAndPassword as firebaseSignup,
  signOut as firebaseSignOut,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  fetchSignInMethodsForEmail as firebaseFetchSignInMethodsForEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup as firebaseSignInWithPopup
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyATtx9-URlB2-ZKc_4eIlr8Qxg_dlJAQ",
  authDomain: "frnt-coda.firebaseapp.com",
  projectId: "frnt-coda",
  storageBucket: "frnt-coda.firebasestorage.app",
  messagingSenderId: "564512970305",
  appId: "1:564512970305:web:d7fd66bdcf6b8268d4d8c0"
};

const firebaseApp = firebaseInitializeApp(firebaseConfig);
const firebaseAuth = firebaseGetAuth(firebaseApp);
const API_BASE = window.API_BASE_URL || '/api';
const TOKEN_KEY='frntcoda_token';
const USER_KEY='frntcoda_user';

async function request(path, options={}){
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  let token=localStorage.getItem(TOKEN_KEY);
  if(firebaseAuth.currentUser){
    try {
      token=await firebaseAuth.currentUser.getIdToken();
      localStorage.setItem(TOKEN_KEY,token);
    } catch {}
  }
  if(token) headers.Authorization=`Bearer ${token}`;
  const res=await fetch(API_BASE+path,{...options,headers});
  let data={}; try{data=await res.json();}catch{}
  if(!res.ok){const e=new Error(data.error||`Request failed (${res.status})`);e.status=res.status;e.code=data.code||'api/error';throw e;}
  return data;
}

export const serverTimestamp=()=>({__serverTimestamp:true});
export const initializeApp=()=>firebaseApp;
export const getApps=()=>[firebaseApp];
export const getFirestore=()=>({});

export function collection(_db,name){return {kind:'collection',name};}
export function doc(_db,col,id){return {kind:'doc',collection:col,id};}
export function where(field,op,value){return {field,op,value};}
export function orderBy(field,direction='asc'){return {field,op:'orderBy',value:direction};}
export function limit(n){return {field:'__limit',op:'limit',value:n};}
export function query(ref,...constraints){return {kind:'query',name:ref.name,constraints};}
function encode(v){return encodeURIComponent(typeof v==='object'?JSON.stringify(v):String(v));}
export async function getDoc(ref){try{const data=await request(`/${ref.collection}/${encode(ref.id)}`);return {id:data.id,exists:()=>true,data:()=>({...data})};}catch(e){if(e.status===404)return {id:ref.id,exists:()=>false,data:()=>undefined};throw e;}}
export async function getDocs(ref){const name=ref.name||ref.collection;const constraints=ref.constraints||[];const params=new URLSearchParams();for(const c of constraints){if(c.op==='orderBy')params.set('sort',(c.value==='desc'?'-':'')+c.field);else if(c.op==='limit')params.set('limit',c.value);else {params.set(c.field,typeof c.value==='object'?JSON.stringify(c.value):String(c.value));if(c.op&&c.op!=='==')params.set(c.field+'__op',c.op);}}const data=await request(`/${name}?${params}`);return {docs:data.map(d=>({id:d.id,exists:()=>true,data:()=>({...d})})),empty:data.length===0,size:data.length,forEach(fn){this.docs.forEach(fn)}};}
export async function addDoc(ref,data){const out=await request(`/${ref.name}`,{method:'POST',body:JSON.stringify(resolve(data))});return {id:out.id};}
export async function setDoc(ref,data,options={}){if(options.merge)return updateDoc(ref,data);const existing=await getDoc(ref);if(existing.exists())return updateDoc(ref,data);return request(`/${ref.collection}`,{method:'POST',body:JSON.stringify({...resolve(data),_id:ref.id})});}
export async function updateDoc(ref,data){return request(`/${ref.collection}/${encode(ref.id)}`,{method:'PATCH',body:JSON.stringify(resolve(data))});}
export async function deleteDoc(ref){return request(`/${ref.collection}/${encode(ref.id)}`,{method:'DELETE'});}
function resolve(v){if(v&&typeof v==='object'){if(v.__serverTimestamp)return new Date().toISOString();if(Array.isArray(v))return v.map(resolve);const o={};for(const [k,x] of Object.entries(v))o[k]=resolve(x);return o;}return v;}

function userObj(u){return u?{uid:u.uid||u.id||'',id:u.uid||u.id||'',email:u.email||'',displayName:u.displayName||'',photoURL:u.photoURL||'',emailVerified:!!u.emailVerified,providerId:u.providerData?.[0]?.providerId||''}:null;}
let listeners=[];
export const getAuth=()=>firebaseAuth;
export async function signInWithEmailAndPassword(_auth,email,password){const out=await firebaseLogin(firebaseAuth,email,password);const token=await out.user.getIdToken();localStorage.setItem(TOKEN_KEY,token);localStorage.setItem(USER_KEY,JSON.stringify(userObj(out.user)));return {user:userObj(out.user)};}
export async function createUserWithEmailAndPassword(_auth,email,password){const out=await firebaseSignup(firebaseAuth,email,password);const token=await out.user.getIdToken();localStorage.setItem(TOKEN_KEY,token);localStorage.setItem(USER_KEY,JSON.stringify(userObj(out.user)));return {user:userObj(out.user)};}
export async function signOut(){await firebaseSignOut(firebaseAuth);localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);}
export function onAuthStateChanged(_auth,cb){return firebaseOnAuthStateChanged(firebaseAuth,async u=>{if(u){try{localStorage.setItem(TOKEN_KEY,await u.getIdToken());localStorage.setItem(USER_KEY,JSON.stringify(userObj(u)));}catch{}cb(userObj(u));}else{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);cb(null);}});}
export async function sendEmailVerification(user){return firebaseSendEmailVerification(firebaseAuth.currentUser||user);}
export async function sendPasswordResetEmail(_auth,email){return firebaseSendPasswordResetEmail(firebaseAuth,email);}
export async function fetchSignInMethodsForEmail(_auth,email){return firebaseFetchSignInMethodsForEmail(firebaseAuth,email);}
export {GoogleAuthProvider,GithubAuthProvider};
export async function signInWithPopup(_auth,provider){const out=await firebaseSignInWithPopup(firebaseAuth,provider);const token=await out.user.getIdToken();localStorage.setItem(TOKEN_KEY,token);localStorage.setItem(USER_KEY,JSON.stringify(userObj(out.user)));return {user:userObj(out.user)};}
export async function createAuthProfile(profile){
  return request('/auth/profile',{method:'POST',body:JSON.stringify(profile)});
}

export function updateProfile(user,data){return request(`/users/${user.uid}`,{method:'PATCH',body:JSON.stringify(data)});}

export function authErrorMessage(e){ return e?.message || e?.code || 'Authentication failed'; }
