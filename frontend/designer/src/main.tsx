import React from 'react';
import ReactDOM from 'react-dom/client';
import { Button, Form, Input, Layout, Typography, message } from 'antd';
import 'antd/dist/reset.css';
import axios from 'axios';

const { Header, Content } = Layout;

function App() {
  const [form] = Form.useForm();
  const save = async () => {
    const data = form.getFieldsValue();
    await axios.post('http://localhost:8080/api/screens', data);
    message.success('Saved metadata');
  };
  return <Layout><Header><Typography.Title style={{color:'white'}} level={4}>Designer MVP</Typography.Title></Header><Content style={{padding:24}}>
    <Form form={form} layout='vertical' initialValues={{screenId:'sample-screen', name:'Sample Screen', json:'{"components":[]}'}}>
      <Form.Item name='screenId' label='Screen ID'><Input/></Form.Item>
      <Form.Item name='name' label='Screen Name'><Input/></Form.Item>
      <Form.Item name='json' label='Screen JSON'><Input.TextArea rows={10}/></Form.Item>
      <Button type='primary' onClick={save}>Save Metadata</Button>
    </Form>
  </Content></Layout>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App/>);
