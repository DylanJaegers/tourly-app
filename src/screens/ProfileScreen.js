import { useFocusEffect } from '@react-navigation/native'
import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Image, Dimensions, Alert, Switch
} from 'react-native'
import { supabase } from '../lib/supabase'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_SIZE = (SCREEN_WIDTH - 3) / 2

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAgent, setIsAgent] = useState(false)
  const [savedListings, setSavedListings] = useState([])
  const [agentListings, setAgentListings] = useState([])
  const [followedAgents, setFollowedAgents] = useState([])
  const [activeTab, setActiveTab] = useState('saved')
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    React.useCallback(() => {
      loadProfile()
    }, [])
  )

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUser(user)

    const { data: userData } = await supabase
      .from('users').select('*').eq('id', user.id).single()
    setProfile(userData)

    if (userData && (userData.role === 'agent' || userData.role === 'fsbo')) {
      setIsAgent(true)
      setActiveTab('listings')

      const { data: listings } = await supabase
        .from('listings')
        .select('*, listing_photos (url, position)')
        .eq('agent_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      setAgentListings(listings || [])
    }

    const { data: saves } = await supabase
      .from('saves')
      .select('*, listings (*, listing_photos (url, position))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setSavedListings(saves?.map(s => s.listings).filter(Boolean) || [])

    const { data: follows } = await supabase
      .from('follows')
      .select('agent_id, users!follows_agent_id_fkey (full_name)')
      .eq('follower_id', user.id)
    setFollowedAgents(follows || [])

    setLoading(false)
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
        }
      }
    ])
  }

  const getCover = (l) => l.cover_photo_url ||
    (l.listing_photos?.sort((a, b) => a.position - b.position)[0]?.url) || null
  const fmt = (p) => p >= 1000000 ? '$' + (p/1000000).toFixed(1) + 'M' : '$' + (p/1000).toFixed(0) + 'K'
  const fullName = profile?.full_name || 'User'
  const tabs = isAgent ? ['listings', 'saved', 'following'] : ['saved', 'following']

  const getActiveData = () => {
    if (activeTab === 'listings') return agentListings
    if (activeTab === 'saved') return savedListings
    if (activeTab === 'following') return followedAgents
    return []
  }

  if (loading) return (
    <View style={styles.loader}>
      <Text style={styles.loaderText}>Loading...</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{fullName}</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.role}>
            {profile?.role === 'fsbo' ? 'For Sale By Owner' :
             profile?.role === 'agent' ? 'Agent' : 'Buyer'}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{savedListings.length}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>{followedAgents.length}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            {isAgent && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{agentListings.length}</Text>
                  <Text style={styles.statLabel}>Listings</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {isAgent && (
          <View style={styles.dashboardToggle}>
            <View style={styles.dashboardToggleLeft}>
              <Text style={styles.dashboardToggleTitle}>Agent dashboard</Text>
              <Text style={styles.dashboardToggleSub}>Manage listings, leads & KPIs</Text>
            </View>
            <Switch
              value={false}
              onValueChange={() => Alert.alert('Agent Dashboard', 'Agent dashboard coming soon in the next update')}
              trackColor={{ false: '#ddd', true: '#111' }}
              thumbColor="#fff"
            />
          </View>
        )}

        <View style={styles.tabRow}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'following' ? (
          <View style={styles.followingList}>
            {followedAgents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Not following anyone yet</Text>
                <Text style={styles.emptySubText}>Follow agents from their listings</Text>
              </View>
            ) : (
              followedAgents.map(follow => {
                const name = follow.users ? follow.users.full_name || 'Agent' : 'Agent'
                const brok = ''
                return (
                  <View key={follow.agent_id} style={styles.agentRow}>
                    <View style={styles.agentAvatar}>
                      <Text style={styles.agentAvatarText}>{name.charAt(0)}</Text>
                    </View>
                    <View style={styles.agentInfo}>
                      <Text style={styles.agentName}>{name}</Text>
                      <Text style={styles.agentBrok}>{brok}</Text>
                    </View>
                    <TouchableOpacity style={styles.unfollowBtn} onPress={async () => {
                      await supabase.from('follows').delete()
                        .eq('follower_id', user.id)
                        .eq('agent_id', follow.agent_id)
                      setFollowedAgents(prev => prev.filter(f => f.agent_id !== follow.agent_id))
                    }}>
                      <Text style={styles.unfollowText}>Following</Text>
                    </TouchableOpacity>
                  </View>
                )
              })
            )}
          </View>
        ) : (
          <View style={styles.grid}>
            {getActiveData().length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {activeTab === 'saved' ? 'No saved homes yet' : 'No active listings'}
                </Text>
                <Text style={styles.emptySubText}>
                  {activeTab === 'saved' ? 'Heart listings in the feed to save them here' : 'Upload your first listing'}
                </Text>
              </View>
            ) : (
              <>
                {getActiveData().map(item => {
                  const cover = getCover(item)
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.gridCard}
                      onPress={() => navigation.navigate('ListingDetail', { listing: item })}
                    >
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.gridImg} resizeMode="cover" />
                      ) : (
                        <View style={[styles.gridImg, styles.gridImgPlaceholder]}>
                          <Text style={{ fontSize: 28 }}>🏠</Text>
                        </View>
                      )}
                      <View style={styles.gridInfo}>
                        <Text style={styles.gridPrice}>{fmt(item.price)}</Text>
                        <Text style={styles.gridDetail} numberOfLines={1}>
                          {item.bedrooms}bd · {item.bathrooms}ba · {item.city}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
                {isAgent && activeTab === 'listings' && (
                  <TouchableOpacity style={[styles.gridCard, styles.addCard]}>
                    <Text style={styles.addIcon}>+</Text>
                    <Text style={styles.addText}>New listing</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderText: { color: '#aaa', fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  settingsIcon: { fontSize: 20, color: '#aaa' },
  profileSection: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 28, fontWeight: '600', color: '#555' },
  name: { fontSize: 18, fontWeight: '700', color: '#111' },
  role: { fontSize: 13, color: '#aaa', marginTop: 3 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16, gap: 0,
  },
  stat: { alignItems: 'center', paddingHorizontal: 20 },
  statNum: { fontSize: 18, fontWeight: '700', color: '#111' },
  statLabel: { fontSize: 11, color: '#aaa', marginTop: 2 },
  statDivider: { width: 0.5, height: 30, backgroundColor: '#f0f0f0' },
  dashboardToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#f8f8f8', borderRadius: 12, padding: 14,
  },
  dashboardToggleLeft: { flex: 1 },
  dashboardToggleTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  dashboardToggleSub: { fontSize: 11, color: '#aaa', marginTop: 2 },
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabActive: { borderBottomWidth: 1.5, borderBottomColor: '#111' },
  tabText: { fontSize: 13, color: '#aaa', textTransform: 'capitalize' },
  tabTextActive: { color: '#111', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },  gridCard: { width: CARD_SIZE, overflow: 'hidden', backgroundColor: '#f8f8f8' },
  gridImg: { width: CARD_SIZE, height: CARD_SIZE * 0.75 },
  gridImgPlaceholder: { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  gridInfo: { padding: 8 },
  gridPrice: { fontSize: 13, fontWeight: '700', color: '#111' },
  gridDetail: { fontSize: 11, color: '#aaa', marginTop: 2 },
  addCard: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#ddd', borderStyle: 'dashed',
    height: CARD_SIZE * 0.75 + 50,
  },
  addIcon: { fontSize: 28, color: '#ccc' },
  addText: { fontSize: 12, color: '#aaa', marginTop: 4 },
  followingList: { padding: 16, gap: 12 },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agentAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  agentAvatarText: { fontSize: 16, fontWeight: '600', color: '#555' },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 14, fontWeight: '600', color: '#111' },
  agentBrok: { fontSize: 12, color: '#aaa', marginTop: 1 },
  unfollowBtn: {
    borderWidth: 0.5, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  unfollowText: { fontSize: 12, color: '#111' },
  emptyState: { width: '100%', alignItems: 'center', paddingVertical: 40, gap: 6 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#111' },
  emptySubText: { fontSize: 13, color: '#aaa', textAlign: 'center' },
})