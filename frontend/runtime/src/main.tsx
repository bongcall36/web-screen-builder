import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { AgGridReact } from 'ag-grid-react';
import { Button, Form, Input, Layout, List, Typography } from 'antd';
import axios from 'axios';
import 'antd/dist/reset.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

function DynamicRenderer({screen}:{screen:any}) {
  return <>{(screen?.components||[]).map((c:any)=>{
    if(c.type==='Input') return <Input key={c.id} placeholder={c.props?.placeholder} style={{marginBottom:8}}/>;
    if(c.type==='Button') return <Button key={c.id} type='primary' style={{marginRight:8}}>{c.props?.text||'Button'}</Button>;
    if(c.type==='AgGrid') return <div key={c.id} className='ag-theme-quartz' style={{height:220}}><AgGridReact rowData={c.props?.rowData||[]} columnDefs={c.props?.columnDefs||[]}/></div>;
    return null;
  })}</>;
}

function App(){
  const [token,setToken]=useState(''); const [menus,setMenus]=useState<any[]>([]); const [screen,setScreen]=useState<any>(null);
  const login= async(v:any)=>{ const r= await axios.post('http://localhost:8080/api/auth/login', v); setToken(r.data.token); const m=await axios.get('http://localhost:8080/api/menus'); setMenus(m.data); };
  const load= async(id:string)=>{ const r=await axios.get(`http://localhost:8080/api/screens/${id}`); setScreen(JSON.parse(r.data.json)); };
  return <Layout style={{padding:24}}><Typography.Title level={3}>Runtime MVP</Typography.Title>
    {!token && <Form onFinish={login} layout='inline'><Form.Item name='username' rules={[{required:true}]}><Input placeholder='username'/></Form.Item><Form.Item name='password' rules={[{required:true}]}><Input.Password placeholder='password'/></Form.Item><Button htmlType='submit' type='primary'>Login</Button></Form>}
    {token && <><List header='Menu' bordered dataSource={menus} renderItem={(i:any)=><List.Item onClick={()=>load(i.screenId)} style={{cursor:'pointer'}}>{i.name}</List.Item>} />
    <div style={{marginTop:16}}><DynamicRenderer screen={screen}/></div></>}
  </Layout>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<App/>);
