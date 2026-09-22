import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth as fbGetAuth, onAuthStateChanged as fbOnAuthStateChanged, signInWithEmailAndPassword as fbLogin, createUserWithEmailAndPassword as fbSignup, signOut as fbSignOut, sendEmailVerification as fbVerify, sendPasswordResetEmail as fbReset, GoogleAuthProvider, GithubAuthProvider, signInWithPopup as fbPopup } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig={apiKey:"AIzaSyATtx9-URlB2-ZKc_4eIlr8Qxg_dlJAQ",authDomain:"frnt-coda.firebaseapp.com",projectId:"frnt-coda",storageBucket:"frnt-coda.firebasestorage.app",messagingSenderId:"564512970305",appId:"1:564512970305:web:d7fd66bdcf6b8268d4d8c0"};
const app=initializeApp(firebaseConfig); const auth=fbGetAuth(app); const TOKEN='frntcoda_token'; const USER='frntcoda_user';
export const initializeAppCompat=()=>app; export {GoogleAuthProvider,GithubAuthProvider}; export const getAuth=()=>auth; export const getFirestore=()=>({}); export const enableNetwork=async()=>{};
export const collection=(_db,name)=>({kind:'collection',name}); export const doc=(_db,collection,id)=>({kind:'doc',collection,id});
export const where=(field,op,value)=>({field,op,value}); export const orderBy=(field,direction='asc')=>({field,op:'orderBy',value:direction}); export const limit=n=>({field:'__limit',op:'limit',value:n}); export const query=(ref,...constraints)=>({kind:'query',name:ref.name,constraints});
const cleanUser=u=>u?{uid:u.uid,id:u.uid,email:u.email||'',displayName:u.displayName||'',photoURL:u.photoURL||'',emailVerified:!!u.emailVerified,providerId:u.providerData?.[0]?.providerId||''}:null;
async function api(path,options={}){let token=localStorage.getItem(TOKEN);if(auth.currentUser)try{token=await auth.currentUser.getIdToken();localStorage.setItem(TOKEN,token);}catch{}const headers={'Content-Type':'application/json',...(options.headers||{})};if(token)headers.Authorization=`Bearer ${token}`;const r=await fetch('/api'+path,{...options,headers});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||`Request failed (${r.status})`);e.status=r.status;e.code=d.code||'api/error';throw e;}return d;}
export const getIdToken=async()=>auth.currentUser?.getIdToken();
export async function getDoc(ref){try{const d=await api(`/${ref.collection}/${encodeURIComponent(ref.id)}`);return{id:d.id||ref.id,exists:()=>true,data:()=>({...d})};}catch(e){if(e.status===404)return{id:ref.id,exists:()=>false,data:()=>undefined};throw e;}}
export async function getDocs(ref){const name=ref.name||ref.collection;const p=new URLSearchParams();for(const c of ref.constraints||[]){if(c.op==='orderBy')p.set('sort',(c.value==='desc'?'-':'')+c.field);else if(c.op==='limit')p.set('limit',c.value);else{p.set(c.field,typeof c.value==='object'?JSON.stringify(c.value):String(c.value));if(c.op&&c.op!=='==')p.set(c.field+'__op',c.op);}}const d=await api(`/${name}?${p}`);return{docs:d.map(x=>({id:x.id,exists:()=>true,data:()=>({...x})})),empty:!d.length,size:d.length,forEach(fn){this.docs.forEach(fn)}};}
const resolve=v=>{if(v&&typeof v==='object'){if(v.__serverTimestamp)return new Date().toISOString();if(Array.isArray(v))return v.map(resolve);const o={};for(const[k,x]of Object.entries(v))o[k]=resolve(x);return o;}return v;};
export const serverTimestamp=()=>({__serverTimestamp:true});
export async function setDoc(ref,data,options={}){const body=JSON.stringify(resolve(data));if(options.merge)return updateDoc(ref,data);try{await getDoc(ref);return updateDoc(ref,data);}catch(e){if(e.status!==404)throw e;return api(`/${ref.collection}`,{method:'POST',body:JSON.stringify({...resolve(data),_id:ref.id})});}}
export async function addDoc(ref,data){const d=await api(`/${ref.name}`,{method:'POST',body:JSON.stringify(resolve(data))});return{id:d.id};}
export async function updateDoc(ref,data){return api(`/${ref.collection}/${encodeURIComponent(ref.id)}`,{method:'PATCH',body:JSON.stringify(resolve(data))});}
export async function deleteDoc(ref){return api(`/${ref.collection}/${encodeURIComponent(ref.id)}`,{method:'DELETE'});}
export async function signInWithEmailAndPassword(_a,email,password){const c=await fbLogin(auth,email,password);await persist(c.user);return{user:c.user};}
export async function createUserWithEmailAndPassword(_a,email,password){const c=await fbSignup(auth,email,password);await persist(c.user);return{user:c.user};}
export async function signInWithPopup(_a,provider){const c=await fbPopup(auth,provider);await persist(c.user);return{user:c.user};}
async function persist(u){const t=await u.getIdToken();localStorage.setItem(TOKEN,t);localStorage.setItem(USER,JSON.stringify(cleanUser(u)));}
export async function signOut(){await fbSignOut(auth);localStorage.removeItem(TOKEN);localStorage.removeItem(USER);}
export function onAuthStateChanged(_a,cb){return fbOnAuthStateChanged(auth,async u=>{if(u)await persist(u);else{localStorage.removeItem(TOKEN);localStorage.removeItem(USER);}cb(u);});}
export const sendEmailVerification=user=>fbVerify(auth.currentUser||user);
export const sendPasswordResetEmail=(_a,email)=>fbReset(auth,email);
export const fetchSignInMethodsForEmail=async()=>[];
export const updateProfile=async(user,data)=>api(`/users/${encodeURIComponent(user.uid)}`,{method:'PATCH',body:JSON.stringify(data)});
