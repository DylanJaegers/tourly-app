import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, FlatList, ActivityIndicator, Alert
} from 'react-native'
import { supabase } from '../lib/supabase'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function ListingDetailScreen({ route, navigation }) {
  const { listing } = route.params
  const [photos, setPhotos] = useState([])
  const [agent, setAgent] = useState(null)
  const [similarListings, setSimilarListings] = useState([])
  const [user, setUser] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Details')

  useEffect(() => { loadDetail() }, [])

  async function loadDetail() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data: save } = await supabase.from('saves')
        .select('id').eq('user_id', user.id).eq('listing_id', listing.id).single()
      setSaved(!!save)
    }
    const { data: photosData } = await supabase
      .from('listing_photos').select('*').eq('listing_id', listing.id).order('position')
    setPhotos(photosData || [])
    const { data: agentData } = await supabase
      .from('agent_profiles').select('*').eq('id', listing.agent_id).single()
    setAgent(agentData)
    const { data: similar } = await supabase
      .from('listings')
      .select('*, listing_photos (url, position)')
      .eq('status', 'active')
      .eq('city', listing.city)
      .neq('id', listing.id)
      .limit(6)
    setSimilarListings(similar || [])
    await supabase.from('listings')
      .update({ view_count: (listing.view_count || 0) + 1 })
      .eq('id', listing.id)
    setLoading(false)
  }

  async function toggleSave() {
    if (!user) return
    if (saved) {
      await supabase.from('saves').delete().eq('user_id', user.id).eq('listing_id', listing.id)
      setSaved(false)
    } else {
      await supabase.from('saves').insert({ user_id: user.id, listing_id: listing.id })
      setSaved(true)
    }
  }

  const fmt = (p) => '$' + (p || 0).toLocaleString()
  const pricePerSqft = listing.sqft ? Math.round(listing.price / listing.sqft) : 0
  const estMonthly = Math.round((listing.price * 0.8 * 0.065) / 12)
  const aName = agent ? (agent.full_name || 'Agent') : 'Agent'
  const aBrok = agent ? (agent.is_fsbo ? 'For Sale By Owner' : (agent.brokerage || '')) : ''
  const tabs = ['Details', 'Stats', 'Map', 'Agent', 'Similar']
  const getCoverPhoto = (l) => l.cover_photo_url ||
    (l.listing_photos && l.listing_photos.length > 0 ? l.listing_photos.sort((a,b) => a.position - b.position)[0].url : null)

  if (loading) return (
    <View style={styles.loader}><ActivityIndicator color="#111" /></View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerAddress} numberOfLines={1}>{listing.address}</Text>
        <TouchableOpacity onPress={toggleSave}>
          <Text style={[styles.heartBtn, saved && styles.heartBtnSaved]}>♥</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {photos.length > 0 ? (
          <FlatList
            data={photos}
            keyExtractor={item => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.photoStrip}
            renderItem={({ item }) => (
              <Image source={{ uri: item.url }} style={styles.photo} resizeMode="cover" />
            )}
          />
        ) : listing.cover_photo_url ? (
          <Image source={{ uri: listing.cover_photo_url }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={{ fontSize: 48 }}>🏠</Text>
          </View>
        )}

        <View style={styles.tabRow}>
          {tabs.map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tab}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.price}>{fmt(listing.price)}</Text>
          <Text style={styles.address}>{listing.address}, {listing.city} {listing.state} {listing.zip}</Text>
          <View style={styles.tags}>
            {[listing.bedrooms + ' bed', listing.bathrooms + ' bath',
              (listing.sqft || 0).toLocaleString() + ' sqft',
              listing.property_type,
              listing.listing_type === 'for_rent' ? 'For rent' : 'For sale'
            ].filter(Boolean).map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property stats</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Per sqft', value: '$' + pricePerSqft },
              { label: 'Year built', value: listing.year_built || '—' },
              { label: 'Lot size', value: listing.lot_size ? listing.lot_size + ' ac' : '—' },
              { label: 'Est/month', value: '$' + estMonthly.toLocaleString() },
              { label: 'Garage', value: listing.garage || '—' },
              { label: 'HVAC', value: listing.hvac || '—' },
            ].map(stat => (
              <View key={stat.label} style={styles.statBox}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {listing.description && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing agent</Text>
          <View style={styles.agentRow}>
            <View style={styles.agentAvatar}>
              <Text style={styles.agentAvatarText}>{aName.charAt(0)}</Text>
            </View>
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>{aName}</Text>
              <Text style={styles.agentBrok}>{aBrok}</Text>
            </View>
            <TouchableOpacity style={styles.followBtn}>
              <Text style={styles.followBtnText}>Follow</Text>
            </TouchableOpacity>
          </View>
        </View>

        {similarListings.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Similar listings</Text>
              <FlatList
                data={similarListings}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => {
                  const cover = getCoverPhoto(item)
                  const simPrice = item.price >= 1000000
                    ? '$' + (item.price / 1000000).toFixed(1) + 'M'
                    : '$' + (item.price / 1000).toFixed(0) + 'K'
                  return (
                    <TouchableOpacity
                      style={styles.similarCard}
                      onPress={() => navigation.push('ListingDetail', { listing: item })}
                    >
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.similarPhoto} resizeMode="cover" />
                      ) : (
                        <View style={[styles.similarPhoto, styles.photoPlaceholder]}>
                          <Text>🏠</Text>
                        </View>
                      )}
                      <View style={styles.similarInfo}>
                        <Text style={styles.similarPrice}>{simPrice}</Text>
                        <Text style={styles.similarDetail}>{item.bedrooms}bd · {item.bathrooms}ba · {item.city}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                }}
              />
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.contactBtn}
          onPress={() => Alert.alert('Contact', 'Messaging coming soon')}
        >
          <Text style={styles.contactBtnText}>Contact agent</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 20, color: '#666' },
  headerAddress: { flex: 1, fontSize: 13, fontWeight: '500', color: '#111' },
  heartBtn: { fontSize: 20, color: '#ddd' },
  heartBtnSaved: { color: '#ff4d4d' },
  scroll: { flex: 1 },
  photoStrip: { height: SCREEN_WIDTH * 0.65 },
  photo: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.65 },
  photoPlaceholder: { backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabText: { fontSize: 11, color: '#aaa' },
  tabTextActive: { color: '#111', fontWeight: '600' },
  tabUnderline: { position: 'absolute', bottom: 0, width: '60%', height: 1.5, backgroundColor: '#111', borderRadius: 1 },
  section: { paddingHorizontal: 16, paddingVertical: 14 },
  price: { fontSize: 22, fontWeight: '700', color: '#111' },
  address: { fontSize: 12, color: '#888', marginTop: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 11, color: '#555', textTransform: 'capitalize' },
  divider: { height: 0.5, backgroundColor: '#f0f0f0', marginHorizontal: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { width: (SCREEN_WIDTH - 56) / 3, backgroundColor: '#f8f8f8', borderRadius: 10, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 13, fontWeight: '600', color: '#111' },
  statLabel: { fontSize: 10, color: '#aaa', marginTop: 2 },
  description: { fontSize: 13, color: '#555', lineHeight: 20 },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  agentAvatarText: { fontSize: 16, fontWeight: '600', color: '#555' },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 13, fontWeight: '600', color: '#111' },
  agentBrok: { fontSize: 11, color: '#aaa', marginTop: 1 },
  followBtn: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  followBtnText: { fontSize: 11, color: '#111' },
  similarCard: { width: 130, marginRight: 10, borderWidth: 0.5, borderColor: '#f0f0f0', borderRadius: 10, overflow: 'hidden' },
  similarPhoto: { width: 130, height: 85 },
  similarInfo: { padding: 7 },
  similarPrice: { fontSize: 12, fontWeight: '600', color: '#111' },
  similarDetail: { fontSize: 10, color: '#aaa', marginTop: 2 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 12, paddingBottom: 28,
    backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#f0f0f0',
  },
  contactBtn: { backgroundColor: '#111', borderRadius: 12, padding: 14, alignItems: 'center' },
  contactBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
