import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Dimensions, ActivityIndicator
} from 'react-native'
import { supabase } from '../lib/supabase'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')

export default function FollowingScreen({ navigation }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [followingAgents, setFollowingAgents] = useState([])
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 })

  useEffect(() => {
    loadFollowingFeed()
  }, [])

  async function loadFollowingFeed() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (!user) { setLoading(false); return }

    const { data: saves } = await supabase
      .from('saves').select('listing_id').eq('user_id', user.id)
    if (saves) setSavedIds(new Set(saves.map(s => s.listing_id)))

    const { data: follows } = await supabase
      .from('follows').select('agent_id').eq('follower_id', user.id)

    if (!follows || follows.length === 0) {
      setListings([])
      setLoading(false)
      return
    }

    const agentIds = follows.map(f => f.agent_id)
    setFollowingAgents(agentIds)

    const { data } = await supabase
      .from('listings')
      .select('*, listing_videos (video_type, mux_playback_id), listing_photos (url, position), agent_profiles (full_name, brokerage, is_fsbo)')
      .eq('status', 'active')
      .in('agent_id', agentIds)
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

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index)
  }).current

  const getCover = (l) => l.cover_photo_url ||
    (l.listing_photos?.sort((a, b) => a.position - b.position)[0]?.url) || null
  const getVid = (l) => l.listing_videos?.find(v => v.video_type === 'short_form' && v.mux_playback_id)
  const fmt = (p) => p >= 1000000 ? '$' + (p/1000000).toFixed(1) + 'M' : '$' + (p/1000).toFixed(0) + 'K'

  if (loading) return (
    <View style={styles.loader}><ActivityIndicator color="#fff" /></View>
  )

  if (followingAgents.length === 0) return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>Not following anyone yet</Text>
      <Text style={styles.emptyText}>Follow agents from their listings to see their new properties here first</Text>
      <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.browseBtnText}>Browse listings</Text>
      </TouchableOpacity>
    </View>
  )

  if (listings.length === 0) return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🏠</Text>
      <Text style={styles.emptyTitle}>No new listings</Text>
      <Text style={styles.emptyText}>Agents you follow haven't posted any active listings yet</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Following</Text>
      </View>

      <FlatList
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
          <FollowingFeedItem
            listing={item}
            isActive={index === currentIndex}
            isSaved={savedIds.has(item.id)}
            onSave={() => toggleSave(item.id)}
            onDetails={() => navigation.navigate('ListingDetail', { listing: item })}
            getCover={getCover}
            fmt={fmt}
          />
        )}
      />
    </View>
  )
}

function FollowingFeedItem({ listing, isActive, isSaved, onSave, onDetails, getCover, fmt }) {
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

      <View style={styles.topBadge}>
        <View style={styles.agentBadge}>
          <View style={styles.agentBadgeAvatar}>
            <Text style={styles.agentBadgeAvatarText}>{aName.charAt(0)}</Text>
          </View>
          <Text style={styles.agentBadgeName}>{aName}</Text>
          <Text style={styles.agentBadgeBrok}>{aBrok}</Text>
        </View>
      </View>

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
          <TouchableOpacity style={styles.actionBtn}>
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
  empty: {
    flex: 1, backgroundColor: '#000', alignItems: 'center',
    justifyContent: 'center', padding: 40, gap: 10,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyText: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
  browseBtn: {
    marginTop: 10, backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  browseBtnText: { color: '#000', fontSize: 14, fontWeight: '600' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8,
  },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  item: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBadge: {
    position: 'absolute', top: 100, left: 12,
  },
  agentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, backdropFilter: 'blur(4px)',
  },
  agentBadgeAvatar: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  agentBadgeAvatarText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  agentBadgeName: { color: '#fff', fontSize: 12, fontWeight: '500' },
  agentBadgeBrok: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
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
  actions: { alignItems: 'center', gap: 16 },
  actionBtn: { alignItems: 'center', gap: 3 },
  actionIcon: { color: '#fff', fontSize: 22 },
  actionLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
})