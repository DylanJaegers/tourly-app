import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native'
import { supabase } from '../lib/supabase'
import { createStackNavigator } from '@react-navigation/stack'

const Stack = createStackNavigator()

export default function InboxScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InboxList" component={InboxListScreen} />
      <Stack.Screen name="Thread" component={ThreadScreen} />
    </Stack.Navigator>
  )
}

function InboxListScreen({ navigation }) {
  const [threads, setThreads] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadThreads()
  }, [])

  async function loadThreads() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('messages')
      .select('*, listings (address, city, price)')
      .or('buyer_id.eq.' + user.id + ',agent_id.eq.' + user.id)
      .order('created_at', { ascending: false })

    if (data) {
      const threadMap = {}
      data.forEach(msg => {
        const key = msg.listing_id + '_' + msg.buyer_id + '_' + msg.agent_id
        if (!threadMap[key]) {
          threadMap[key] = {
            key,
            listing_id: msg.listing_id,
            buyer_id: msg.buyer_id,
            agent_id: msg.agent_id,
            listing: msg.listings,
            lastMessage: msg.content,
            lastTime: msg.created_at,
            unread: 0,
          }
        }
        if (!msg.is_read && msg.sender_id !== user.id) {
          threadMap[key].unread++
        }
      })
      setThreads(Object.values(threadMap))
    }
    setLoading(false)
  }

  async function getOtherUserName(thread, userId) {
    const otherId = thread.buyer_id === userId ? thread.agent_id : thread.buyer_id
    const { data } = await supabase.from('users').select('full_name').eq('id', otherId).single()
    return data?.full_name || 'User'
  }

  const fmt = (p) => p >= 1000000 ? '$' + (p/1000000).toFixed(1) + 'M' : '$' + (p/1000).toFixed(0) + 'K'

  if (loading) return (
    <View style={styles.loader}><ActivityIndicator color="#111" /></View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox</Text>
      </View>

      {threads.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✉</Text>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>Contact an agent from a listing to start a conversation</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={item => item.key}
          renderItem={({ item }) => (
            <ThreadRow
              thread={item}
              user={user}
              fmt={fmt}
              onPress={() => navigation.navigate('Thread', { thread: item, user })}
            />
          )}
        />
      )}
    </View>
  )
}

function ThreadRow({ thread, user, fmt, onPress }) {
  const [otherName, setOtherName] = useState('...')

  useEffect(() => {
    async function getName() {
      const otherId = thread.buyer_id === user.id ? thread.agent_id : thread.buyer_id
      const { data } = await supabase.from('users').select('full_name').eq('id', otherId).single()
      setOtherName(data?.full_name || 'User')
    }
    getName()
  }, [])

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date)
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'now'
    if (hours < 24) return hours + 'h'
    return Math.floor(hours / 24) + 'd'
  }

  return (
    <TouchableOpacity style={styles.threadRow} onPress={onPress}>
      <View style={styles.threadAvatar}>
        <Text style={styles.threadAvatarText}>{otherName.charAt(0)}</Text>
      </View>
      <View style={styles.threadInfo}>
        <View style={styles.threadTopRow}>
          <Text style={styles.threadName}>{otherName}</Text>
          <Text style={styles.threadTime}>{timeAgo(thread.lastTime)}</Text>
        </View>
        {thread.listing && (
          <Text style={styles.threadListing} numberOfLines={1}>
            Re: {thread.listing.address} · {fmt(thread.listing.price)}
          </Text>
        )}
        <Text style={styles.threadPreview} numberOfLines={1}>{thread.lastMessage}</Text>
      </View>
      {thread.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{thread.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

function ThreadScreen({ route, navigation }) {
  const { thread, user } = route.params
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [otherName, setOtherName] = useState('...')
  const [loading, setLoading] = useState(true)
  const flatListRef = useRef(null)

  useEffect(() => {
    loadMessages()
    getOtherName()
  }, [])

  async function getOtherName() {
    const otherId = thread.buyer_id === user.id ? thread.agent_id : thread.buyer_id
    const { data } = await supabase.from('users').select('full_name').eq('id', otherId).single()
    setOtherName(data?.full_name || 'User')
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('listing_id', thread.listing_id)
      .eq('buyer_id', thread.buyer_id)
      .eq('agent_id', thread.agent_id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoading(false)

    await supabase.from('messages')
      .update({ is_read: true })
      .eq('listing_id', thread.listing_id)
      .eq('buyer_id', thread.buyer_id)
      .eq('agent_id', thread.agent_id)
      .neq('sender_id', user.id)
  }

  async function sendMessage() {
    if (!input.trim()) return
    const content = input.trim()
    setInput('')

    const newMsg = {
      listing_id: thread.listing_id,
      buyer_id: thread.buyer_id,
      agent_id: thread.agent_id,
      sender_id: user.id,
      content,
    }

    const { data } = await supabase.from('messages').insert(newMsg).select().single()
    if (data) {
      setMessages(prev => [...prev, data])
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  const fmt = (p) => p >= 1000000 ? '$' + (p/1000000).toFixed(1) + 'M' : '$' + (p/1000).toFixed(0) + 'K'

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.threadHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.threadAvatar}>
          <Text style={styles.threadAvatarText}>{otherName.charAt(0)}</Text>
        </View>
        <View style={styles.threadHeaderInfo}>
          <Text style={styles.threadHeaderName}>{otherName}</Text>
          {thread.listing && (
            <Text style={styles.threadHeaderListing} numberOfLines={1}>
              {thread.listing.address} · {fmt(thread.listing.price)}
            </Text>
          )}
        </View>
      </View>

      {thread.listing && (
        <View style={styles.inquiryCard}>
          <Text style={styles.inquiryLabel}>Re: {thread.listing.address}</Text>
          <Text style={styles.inquiryPrice}>{fmt(thread.listing.price)}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color="#111" /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.sender_id === user.id
            return (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                  {item.content}
                </Text>
              </View>
            )
          }}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.messageInput}
          placeholder="Message..."
          placeholderTextColor="#aaa"
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  emptyText: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  threadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5',
  },
  threadAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  threadAvatarText: { fontSize: 16, fontWeight: '600', color: '#555' },
  threadInfo: { flex: 1, gap: 2 },
  threadTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  threadName: { fontSize: 14, fontWeight: '600', color: '#111' },
  threadTime: { fontSize: 11, color: '#aaa' },
  threadListing: { fontSize: 12, color: '#888' },
  threadPreview: { fontSize: 12, color: '#aaa' },
  unreadBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  threadHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 20, color: '#666' },
  threadHeaderInfo: { flex: 1 },
  threadHeaderName: { fontSize: 14, fontWeight: '600', color: '#111' },
  threadHeaderListing: { fontSize: 11, color: '#aaa', marginTop: 1 },
  inquiryCard: {
    backgroundColor: '#f8f8f8', margin: 12, padding: 10,
    borderRadius: 10, borderWidth: 0.5, borderColor: '#eee',
  },
  inquiryLabel: { fontSize: 11, color: '#aaa' },
  inquiryPrice: { fontSize: 13, fontWeight: '600', color: '#111', marginTop: 2 },
  messageList: { flex: 1 },
  messageContent: { padding: 12, gap: 6 },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 10, marginBottom: 2 },
  bubbleMe: { backgroundColor: '#111', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: '#111' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 10, paddingBottom: 28,
    borderTopWidth: 0.5, borderTopColor: '#f0f0f0', backgroundColor: '#fff',
  },
  messageInput: {
    flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 14, color: '#111', maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})