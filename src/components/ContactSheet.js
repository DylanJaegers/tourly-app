import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, ScrollView, Alert
} from 'react-native'
import { supabase } from '../lib/supabase'

export default function ContactSheet({ visible, onClose, listing, user }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const agentId = listing?.agent_id
  const fmt = (p) => p >= 1000000 ? '$' + (p/1000000).toFixed(1) + 'M' : '$' + (p/1000).toFixed(0) + 'K'

  async function handleSend() {
    if (!message.trim()) return
    if (!user) { Alert.alert('Sign in required', 'Please sign in to contact agents'); return }
    setSending(true)

    const { error } = await supabase.from('messages').insert({
      listing_id: listing.id,
      buyer_id: user.id,
      agent_id: agentId,
      sender_id: user.id,
      content: message.trim(),
      is_read: false,
    })

    await supabase.from('leads').insert({
      listing_id: listing.id,
      agent_id: agentId,
      buyer_id: user.id,
      buyer_name: user.email,
      buyer_email: user.email,
      message: message.trim(),
    }).single()

    setSending(false)
    if (error) {
      Alert.alert('Error', 'Could not send message. Please try again.')
      return
    }
    setSent(true)
  }

  function handleClose() {
    setSent(false)
    setMessage('')
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.dismissArea} onPress={handleClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          {sent ? (
            <View style={styles.sentContainer}>
              <View style={styles.sentIcon}>
                <Text style={styles.sentIconText}>✓</Text>
              </View>
              <Text style={styles.sentTitle}>Message sent!</Text>
              <Text style={styles.sentSub}>
                The agent will receive your message and respond via the inbox.
              </Text>
              {listing && (
                <View style={styles.sentListing}>
                  <Text style={styles.sentListingLabel}>Re:</Text>
                  <Text style={styles.sentListingAddress}>{listing.address}</Text>
                  <Text style={styles.sentListingPrice}>{fmt(listing.price)}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>Contact agent</Text>
                  {listing && (
                    <Text style={styles.headerSub} numberOfLines={1}>
                      Re: {listing.address} · {fmt(listing.price)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={handleClose}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Your message</Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Hi, I'm interested in this property and would love to schedule a showing..."
                  placeholderTextColor="#aaa"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  autoFocus
                />

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Your contact info and buyer preferences will be shared with the agent.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!message.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.sendBtnText}>Send message</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  dismissArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    minHeight: 400,
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#ddd',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub: { fontSize: 12, color: '#aaa', marginTop: 3, maxWidth: 260 },
  closeBtn: { fontSize: 18, color: '#aaa', padding: 4 },
  form: { padding: 20, gap: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#555' },
  messageInput: {
    backgroundColor: '#f8f8f8',
    borderWidth: 0.5, borderColor: '#e5e5e5',
    borderRadius: 12, padding: 14,
    fontSize: 14, color: '#111',
    minHeight: 120,
  },
  infoBox: {
    backgroundColor: '#f8f8f8', borderRadius: 10,
    padding: 12,
  },
  infoText: { fontSize: 12, color: '#aaa', lineHeight: 18 },
  sendBtn: {
    backgroundColor: '#111', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', padding: 8 },
  cancelBtnText: { color: '#aaa', fontSize: 14 },
  sentContainer: { padding: 30, alignItems: 'center', gap: 12 },
  sentIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#f0faf0', alignItems: 'center', justifyContent: 'center',
  },
  sentIconText: { fontSize: 24, color: '#22c55e' },
  sentTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  sentSub: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  sentListing: {
    backgroundColor: '#f8f8f8', borderRadius: 10, padding: 12,
    width: '100%', gap: 3,
  },
  sentListingLabel: { fontSize: 11, color: '#aaa' },
  sentListingAddress: { fontSize: 13, fontWeight: '600', color: '#111' },
  sentListingPrice: { fontSize: 13, color: '#555' },
  doneBtn: {
    backgroundColor: '#111', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center',
    marginTop: 8, width: '100%',
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})