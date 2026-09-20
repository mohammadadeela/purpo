"use client";
import { useRef, useState } from "react";

function ErrorLine({ message }: { message: string }) { return message ? <div className="form-error" role="alert">{message}</div> : null; }

export function AssetUpload({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function upload() {
    const file=input.current?.files?.[0]; if(!file)return; setBusy(true);setError("");
    const kind=file.type.startsWith("image/")?"IMAGE":file.type.startsWith("video/")?"VIDEO":file.type.startsWith("audio/")?"AUDIO":"DOCUMENT";
    const prepared=await fetch(`/api/projects/${projectId}/assets`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"prepare",name:file.name,contentType:file.type||"application/octet-stream",bytes:file.size,kind})});
    const prep=await prepared.json(); if(!prepared.ok){setError(prep.error?.message??"Upload could not start.");setBusy(false);return;}
    const sent=await fetch(prep.uploadUrl,{method:"PUT",headers:{"content-type":file.type},body:file}); if(!sent.ok){setError("Storage rejected the upload. No asset record was created.");setBusy(false);return;}
    const completed=await fetch(`/api/projects/${projectId}/assets`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"complete",name:file.name,objectKey:prep.objectKey,contentType:file.type,bytes:file.size,kind})});
    const result=await completed.json(); if(!completed.ok)setError(result.error?.message??"Upload verification failed.");else onDone(); setBusy(false);
  }
  return <div><ErrorLine message={error}/><input ref={input} type="file"/><button className="button violet" disabled={busy} onClick={()=>void upload()}>{busy?"Uploading and verifying…":"Upload asset"}</button></div>;
}

export function MediaGenerate({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [kind,setKind]=useState<"image"|"video">("image");const [prompt,setPrompt]=useState("");const [name,setName]=useState("");const [error,setError]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  async function generate(){setBusy(true);setError("");setMessage("");const response=await fetch(`/api/projects/${projectId}/media`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind,prompt,name,aspectRatio:"landscape",durationSeconds:kind==="video"?8:undefined})});const result=await response.json();if(!response.ok)setError(result.error?.message??"Generation could not start.");else{setMessage(`${kind} job ${result.job.id.slice(-8)} queued. It will appear here after provider generation and storage verification.`);setPrompt("");setName("");onDone();}setBusy(false);}
  return <div className="content-card" style={{marginBottom:18}}><div className="content-card-head"><h3>Generate project media</h3><small>{kind==="image"?"18":"120"} estimated credits</small></div><div className="page-pad"><ErrorLine message={error}/>{message&&<p>{message}</p>}<div className="field"><label>Type</label><select value={kind} onChange={(e)=>setKind(e.target.value as "image"|"video")}><option value="image">Image</option><option value="video">8-second video</option></select></div><div className="field"><label>Asset name</label><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Homepage campaign visual"/></div><div className="field"><label>Creative brief</label><textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="A premium editorial product scene using the project brand direction…"/></div><button className="button violet" disabled={busy||name.length<1||prompt.length<8} onClick={()=>void generate()}>{busy?"Reserving credits…":`Generate ${kind}`}</button></div></div>;
}

export function IntegrationConnect({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [provider,setProvider]=useState("hostinger");const [secret,setSecret]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function save(){setBusy(true);setError("");const response=await fetch(`/api/projects/${projectId}/integrations`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provider,displayName:provider.charAt(0).toUpperCase()+provider.slice(1),secret})});const result=await response.json();if(!response.ok)setError(result.error?.message??"Integration could not be saved.");else{setSecret("");onDone();}setBusy(false);}
  return <div className="content-card" style={{marginBottom:18}}><div className="content-card-head"><h3>Connect a service</h3><small>Encrypted before storage</small></div><div className="page-pad"><ErrorLine message={error}/><div className="field"><label>Provider</label><select value={provider} onChange={(e)=>setProvider(e.target.value)}>{["hostinger","firebase","supabase","postgresql","google","whatsapp","twilio","email","stripe","github","s3","webhook","custom-api"].map((item)=><option key={item}>{item}</option>)}</select></div><div className="field"><label>Credential or configuration JSON</label><textarea value={secret} onChange={(e)=>setSecret(e.target.value)} placeholder={provider==="hostinger"?'{"host":"server.example.com","username":"deploy","privateKey":"...","remotePath":"/var/www/project","healthUrl":"https://example.com"}':"Paste the server-side credential"}/></div><button className="button violet" disabled={busy||!secret} onClick={()=>void save()}>{busy?"Encrypting…":"Save connection"}</button></div></div>;
}

export function AutomationCreate({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [name,setName]=useState("");const [action,setAction]=useState("");const [error,setError]=useState("");
  async function save(){const response=await fetch(`/api/projects/${projectId}/automations`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,description:action,trigger:{type:"form",config:{event:"submitted"}},steps:[{id:"action-1",type:"action",provider:"webhook",operation:"dispatch",config:{instruction:action}}]})});const result=await response.json();if(!response.ok)setError(result.error?.message??"Automation could not be created.");else{setName("");setAction("");onDone();}}
  return <div className="content-card" style={{marginBottom:18}}><div className="content-card-head"><h3>New workflow</h3><small>Trigger → action</small></div><div className="page-pad"><ErrorLine message={error}/><div className="field"><label>Name</label><input value={name} onChange={(e)=>setName(e.target.value)} placeholder="New lead follow-up"/></div><div className="field"><label>Action</label><textarea value={action} onChange={(e)=>setAction(e.target.value)} placeholder="Send the lead to my webhook and notify the sales team."/></div><button className="button violet" disabled={!name||!action} onClick={()=>void save()}>Create automation</button></div></div>;
}

export function DeployCreate({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [domain,setDomain]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function deploy(){setBusy(true);setError("");const response=await fetch(`/api/projects/${projectId}/deployments`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({environment:"PRODUCTION",domain,healthUrl:domain?`https://${domain}`:undefined})});const result=await response.json();if(!response.ok)setError(result.error?.message??"Deployment could not start.");else onDone();setBusy(false);}
  return <div className="content-card" style={{marginBottom:18}}><div className="content-card-head"><h3>Production release</h3><small>Build → upload → health check</small></div><div className="page-pad"><ErrorLine message={error}/><div className="field"><label>Domain</label><input value={domain} onChange={(e)=>setDomain(e.target.value)} placeholder="app.example.com"/></div><button className="button violet" disabled={busy||!domain} onClick={()=>void deploy()}>{busy?"Starting deployment…":"Deploy active version"}</button></div></div>;
}
