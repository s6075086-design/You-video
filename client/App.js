import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'http://10.0.2.2:4000/api'; // adjust for device/emulator

export default function App() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feed, setFeed] = useState([]);

  useEffect(() => { loadFeed(); }, []);

  async function login() {
    const r = await fetch(`${API}/auth/login`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    const j = await r.json();
    if (j.accessToken) {
      setToken(j.accessToken);
      await AsyncStorage.setItem('token', j.accessToken);
    }
  }

  async function pickAndUpload() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
    if (res.type === 'success') {
      const form = new FormData();
      form.append('video', { uri: res.uri, name: res.name, type: 'video/mp4' });
      form.append('title', 'My Upload');
      form.append('isReel', 'false');

      const r = await fetch(`${API}/videos/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      });
      const j = await r.json();
      console.log('upload result', j);
      loadFeed();
    }
  }

  async function loadFeed() {
    const r = await fetch(`${API}/videos/feed`);
    const j = await r.json();
    setFeed(j || []);
  }

  return (
    <View style={{ padding: 16, marginTop:40 }}>
      {!token ? (
        <View>
          <Text>Login</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="email" style={{borderWidth:1, marginBottom:8}}/>
          <TextInput value={password} onChangeText={setPassword} placeholder="password" secureTextEntry style={{borderWidth:1, marginBottom:8}}/>
          <Button title="Login" onPress={login} />
        </View>
      ) : (
        <View>
          <Button title="Upload Video" onPress={pickAndUpload} />
        </View>
      )}

      <Text style={{ marginTop: 20, fontWeight: 'bold' }}>Feed</Text>
      <FlatList
        data={feed}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ padding: 10, borderBottomWidth: 1 }}>
            {item.thumbnail_url ? <Image source={{ uri: `http://10.0.2.2:4000${item.thumbnail_url}` }} style={{ width: 200, height: 120 }} /> : null}
            <Text>{item.title || 'Untitled'}</Text>
            <Text>by {item.username}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
