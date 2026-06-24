import { useFocusEffect } from '@react-navigation/native'
import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, ActivityIndicator, Image
} from 'react-native'
import { supabase } from '../lib/supabase'
import ContactSheet from '../components/ContactSheet'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')

export default function FeedScreen({ navigation }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [followingIds, setFollowingIds] = useState(new Set())
  const [activeTab, setActiveTab] = useState('home')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showContact, setShowContact] = useState(false)
  const [contactListing, setContactListing] = useState(null)
  const flatListRef = useRef(null)
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 })

  useEffect(() => {
    loadFeed()
  }, [activeTab])

  useFocusEffect(
    React.useCallback(() => {
      checkUser()
    }, [])
  )

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data: saves } = await supabase
        .from('saves').select('listing_id').eq('user_id', user.id)
      if (saves) setSavedIds(new Set(saves.map(s => s.listing_id)))

      const { data: follows } = await supabase
        .from('follows').select('agent_id').eq('follower_id', user.id)
      if (follows) setFollowingIds(new Set(follows.map(f => f.agent_id)))
    }
  }

  async function loadFeed() {
    setLoading(true)
    const { data } = await supabase
      .from('listings')
      .select('*, listing_videos (video_type, mux_playback_id), listing_photos (url, position), agent_profiles (full_name, brokerage, is_fsbo)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setListings(data || [])
    setLoading(false)
  }

  async function toggleSave(listingId) {
    if (!user) return
    if (savedIds.has(listingId)) {
      await supabase.from('saves').delete().eq('user_id', user.id).eq('listing_id', listingId)
      setSavedIds(prev => { const next = new Set(prev); next.delete(listingId); return next })
    } else {
      await supabase.from('saves').insert({ user_id: user.id, listing_id: listingId })
      setSavedIds(prev => new Set([...prev, listingId]))
    }
  }

  async function toggleFollow(agentId) {
  if (!user) return
  if (agentId === user.id) return
  console.log('toggleFollow called', agentId, 'user:', user.id)
  if (followingIds.has(agentId)) {
    const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('agent_id', agentId)
    console.log('unfollow error:', error)
    setFollowingIds(prev => { const next = new Set(prev); next.delete(agentId); return next })
  } else {
    const { data, error } = await supabase.from('follows').insert({ follower_id: user.id, agent_id: agentId }).select()
    console.log('follow result:', data, 'error:', error)
    setFollowingIds(prev => new Set([...prev, agentId]))
  }
}

  const getCover = (l) => l.cover_photo_url ||
    (l.listing_photos?.sort((a, b) => a.position - b.position)[0]?.url) || null
  const getVid = (l) => l.listing_videos?.find(v => v.video_type === 'short_form' && v.mux_playback_id)
  const fmt = (p) => p >= 1000000 ? `$${(p / 1000000).toFixed(1)}M` : `$${(p / 1000).toFixed(0)}K`

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index)
    }
  }).current

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color="#fff" />
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.tabs}>
          {['home', 'following'].map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tab}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={listings}
        keyExtractor={item => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item, index }) => (
          <FeedItem
            listing={item}
            isActive={index === currentIndex}
            isSaved={savedIds.has(item.id)}
            isFollowing={followingIds.has(item.agent_id)}
            onSave={() => toggleSave(item.id)}
            onFollow={() => toggleFollow(item.agent_id)}
            onDetails={() => navigation.navigate('ListingDetail', { listing: item })}
            onContact={() => { setContactListing(item); setShowContact(true) }}
            getCover={getCover}
            getVid={getVid}
            fmt={fmt}
          />
        )}
      />

      <ContactSheet
        visible={showContact}
        onClose={() => setShowContact(false)}
        listing={contactListing}
        user={user}
      />
    </View>
  )
}

function FeedItem({ listing, isActive, isSaved, isFollowing, onSave, onFollow, onDetails, onContact, getCover, getVid, fmt }) {
  const cover = getCover(listing)
  const aName = listing.agent_profiles?.full_name || 'Agent'
  const aBrok = listing.agent_profiles?.is_fsbo ? 'FSBO' : (listing.agent_profiles?.brokerage || '')

  return (
    <TouchableOpacity style={styles.item} activeOpacity={1} onPress={onDetails}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.bg} resizeMode="cover" />
      ) : (
        <View style={[styles.bg, { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 60 }}>🏠</Text>
        </View>
      )}

      <View style={styles.overlay} />

      <View style={styles.bottomInfo}>
        <View style={styles.infoLeft}>
          <Text style={styles.price}>{fmt(listing.price)}</Text>
          <Text style={styles.address}>{listing.address}</Text>
          <Text style={styles.city}>{listing.city}, {listing.state}</Text>
          <View style={styles.pills}>
            {[listing.bedrooms + ' bed', listing.bathrooms + ' ba', (listing.sqft || 0).toLocaleString() + ' sqft'].map(tag => (
              <View key={tag} style={styles.pill}>
                <Text style={styles.pillText}>{tag}</Text>
              </View>
            ))}
          </View>
          <View style={styles.agentRow}>
            <View style={styles.agentAvatar}>
              <Text style={styles.agentAvatarText}>{aName.charAt(0)}</Text>
            </View>
            <Text style={styles.agentName}>{aName}</Text>
            <Text style={styles.agentBrok}>{aBrok}</Text>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={onFollow}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onSave}>
            <Text style={[styles.actionIcon, isSaved && { color: '#ff4d4d' }]}>♥</Text>
            <Text style={styles.actionLabel}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onDetails}>
            <Text style={styles.actionIcon}>→</Text>
            <Text style={styles.actionLabel}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onContact}>
            <Text style={styles.actionIcon}>✉</Text>
            <Text style={styles.actionLabel}>Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>⬆</Text>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8,
  },
  tabs: { flexDirection: 'row', gap: 20 },
  tab: { alignItems: 'center', paddingBottom: 4 },
  tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: 0, width: '100%', height: 2, backgroundColor: '#fff', borderRadius: 1 },
  searchBtn: { padding: 4 },
  searchIcon: { fontSize: 18 },
  item: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bottomInfo: {
    position: 'absolute', bottom: 80, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
  },
  infoLeft: { flex: 1 },
  price: { color: '#fff', fontSize: 22, fontWeight: '700' },
  address: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  city: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 1 },
  pills: { flexDirection: 'row', gap: 5, marginTop: 8, flexWrap: 'wrap' },
  pill: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  agentAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  agentAvatarText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  agentName: { color: '#fff', fontSize: 12, fontWeight: '500' },
  agentBrok: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  followBtn: { borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  followBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: '#fff' },
  followBtnText: { color: '#fff', fontSize: 10 },
  followBtnTextActive: { fontWeight: '700' },
  actions: { alignItems: 'center', gap: 16 },
  actionBtn: { alignItems: 'center', gap: 3 },
  actionIcon: { color: '#fff', fontSize: 22 },
  actionLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
})