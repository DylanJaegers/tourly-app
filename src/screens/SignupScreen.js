import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView
} from 'react-native'
import { supabase } from '../lib/supabase'

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('buyer')
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    if (!fullName || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role }
      }
    })
    setLoading(false)
    if (error) Alert.alert('Signup failed', error.message)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>T</Text>
          </View>
          <Text style={styles.logoText}>Tourly</Text>
        </View>

        <Text style={styles.tagline}>Create your account</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#555"
            value={fullName}
            onChangeText={setFullName}
            keyboardAppearance="dark"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            keyboardAppearance="dark"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            keyboardAppearance="dark"
          />

          <View style={styles.roleSection}>
            <Text style={styles.roleLabel}>I am a</Text>
            <View style={styles.roleRow}>
              {['buyer', 'agent', 'fsbo'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                    {r === 'fsbo' ? 'FSBO' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.signupBtn}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.signupBtnText}>Create account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>
              Already have an account? <Text style={styles.loginLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  logoBox: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#000', fontSize: 18, fontWeight: '600' },
  logoText: { color: '#fff', fontSize: 26, fontWeight: '600' },
  tagline: { color: '#555', fontSize: 14, marginBottom: 40 },
  form: { gap: 12 },
  input: {
    backgroundColor: '#111',
    borderWidth: 0.5,
    borderColor: '#333',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
  },
  roleSection: { gap: 8 },
  roleLabel: { color: '#555', fontSize: 13 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#333',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
  roleBtnText: { color: '#555', fontSize: 13 },
  roleBtnTextActive: { color: '#000', fontWeight: '600' },
  signupBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  signupBtnText: { color: '#000', fontSize: 15, fontWeight: '600' },
  loginBtn: { alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#555', fontSize: 13 },
  loginLink: { color: '#fff', fontWeight: '500' },
})