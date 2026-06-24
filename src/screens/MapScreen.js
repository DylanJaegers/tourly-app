import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, Dimensions, TextInput, ScrollView, ActivityIndicator
} from 'react-native'
import MapView, { Marker, Callout } from 'react-native-maps'
import { supabase } from '../lib/supabase'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')
const MAP_HEIGHT = SCREEN_HEIGHT * 0.5

export default function MapScreen({ navigation }) {
  const [listings, setListings] = useState([])
  const [filteredListings, setFilteredListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [region, setRegion] = useState({
    latitude: 39.5,
    longitude: -98.35,
    latitudeDelta: 20,
    longitudeDelta: 20,
  })
  const mapRef = useRef(null)
  const listRef = useRef(null)
  const [mapBounds, setMapBounds] = useState(null)

  useEffect(() => {
    loadListings()
  }, [])

  async function loadListings() {
    const { data } = await supabase
      .from('listings')
      .select('*, listing_photos (url, position)')
      .eq('status', 'active')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
    const listingsData = data || []
    setListings(listingsData)
    setFilteredListings(listingsData)
    if (listingsData.length > 0) {
      setRegion({
        latitude: parseFloat(listingsData[0].lat),
        longitude: parseFloat(listingsData[0].lng),
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      })
    }
    setLoading(false)
  }

  function applyFilter(filter) {
    setActiveFilter(filter)
    if (filter === 'all') {
      setFilteredListings(listings)
    } else if (filter === 'for_sale') {
      setFilteredListings(listings.filter(l => l.listing_type === 'for_sale'))
    } else if (filter === 'for_rent') {
      setFilteredListings(listings.filter(l => l.listing_type === 'for_rent'))
    }
  }

  function handleSearch(text) {
    setSearchText(text)
    if (!text.trim()) {
      setFilteredListings(listings)
      return
    }
    const filtered = listings.filter(l =>
      l.city.toLowerCase().includes(text.toLowerCase()) ||
      l.address.toLowerCase().includes(text.toLowerCase()) ||
      l.zip.includes(text)
    )
    setFilteredListings(filtered)
    if (filtered.length > 0 && filtered[0].lat) {
      setRegion({
        latitude: parseFloat(filtered[0].lat),
        longitude: parseFloat(filtered[0].lng),
        latitudeDelta: 0.3,
        longitudeDelta: 0.3,
      })
    }
  }

  function handlePinPress(listing) {
    setSelectedId(listing.id)
    setRegion({
      latitude: parseFloat(listing.lat),
      longitude: parseFloat(listing.lng),
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    })
    const idx = filteredListings.findIndex(l => l.id === listing.id)
    if (idx !== -1 && listRef.current) {
      listRef.current.scrollToIndex({ index: idx, animated: true })
    }
  }

  const fmt = (p) => p >= 1000000 ? '$' + (p/1000000).toFixed(1) + 'M' : '$' + (p/1000).toFixed(0) + 'K'
  const getCover = (l) => l.cover_photo_url ||
    (l.listing_photos?.sort((a,b) => a.position - b.position)[0]?.url) || null

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color="#111" />
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search city, zip, address..."
          placeholderTextColor="#aaa"
          value={searchText}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={(region) => {
        setRegion(region)
        const bounds = {
          north: region.latitude + region.latitudeDelta / 2,
          south: region.latitude - region.latitudeDelta / 2,
          east: region.longitude + region.longitudeDelta / 2,
          west: region.longitude - region.longitudeDelta / 2,
        }
        setMapBounds(bounds)
        const inBounds = listings.filter(l => {
          if (!l.lat || !l.lng) return false
          const lat = parseFloat(l.lat)
          const lng = parseFloat(l.lng)
          return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east
        })
        setFilteredListings(inBounds)
      }}
        showsUserLocation
      >
        {filteredListings.map(listing => (
          <Marker
            key={listing.id}
            coordinate={{
              latitude: parseFloat(listing.lat),
              longitude: parseFloat(listing.lng),
            }}
            onPress={() => handlePinPress(listing)}
          >
            <View style={[styles.pin, selectedId === listing.id && styles.pinSelected]}>
              <Text style={[styles.pinText, selectedId === listing.id && styles.pinTextSelected]}>
                {fmt(listing.price)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {[
            { key: 'all', label: 'All' },
            { key: 'for_sale', label: 'For sale' },
            { key: 'for_rent', label: 'For rent' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, activeFilter === f.key && styles.filterBtnActive]}
              onPress={() => applyFilter(f.key)}
            >
              <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.filterCount}>{filteredListings.length} listings</Text>
        </ScrollView>
      </View>

      <FlatList
        ref={listRef}
        data={filteredListings}
        keyExtractor={item => item.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => {
          const cover = getCover(item)
          const isSelected = selectedId === item.id
          return (
            <TouchableOpacity
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => navigation.navigate('ListingDetail', { listing: item })}
              activeOpacity={0.8}
            >
              <View style={styles.cardThumb}>
                {cover ? (
                  <Image source={{ uri: cover }} style={styles.cardImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
                    <Text style={{ fontSize: 24 }}>🏠</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardPrice}>{fmt(item.price)}</Text>
                <Text style={styles.cardBeds}>{item.bedrooms} bd · {item.bathrooms} ba · {(item.sqft||0).toLocaleString()} sqft</Text>
                <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                <Text style={styles.cardCity}>{item.city}, {item.state}</Text>
              </View>
              <TouchableOpacity style={styles.cardHeart}>
                <Text style={styles.cardHeartIcon}>♡</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 56, paddingHorizontal: 14, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#111' },
  clearBtn: { fontSize: 14, color: '#aaa', padding: 4 },
  map: { width: SCREEN_WIDTH, height: MAP_HEIGHT },
  pin: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  pinSelected: { backgroundColor: '#111', borderColor: '#111' },
  pinText: { fontSize: 11, fontWeight: '600', color: '#111' },
  pinTextSelected: { color: '#fff' },
  filterRow: { borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  filters: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd',
  },
  filterBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  filterText: { fontSize: 12, color: '#555' },
  filterTextActive: { color: '#fff', fontWeight: '500' },
  filterCount: { fontSize: 12, color: '#aaa', marginLeft: 4 },
  list: { flex: 1 },
  card: {
    flexDirection: 'row', gap: 10, padding: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5', alignItems: 'center',
  },
  cardSelected: { backgroundColor: '#f8f8f8' },
  cardThumb: { width: 80, height: 62, borderRadius: 8, overflow: 'hidden', flexShrink: 0 },
  cardImg: { width: 80, height: 62 },
  cardImgPlaceholder: { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 2 },
  cardPrice: { fontSize: 15, fontWeight: '700', color: '#111' },
  cardBeds: { fontSize: 12, color: '#666' },
  cardAddress: { fontSize: 11, color: '#888' },
  cardCity: { fontSize: 11, color: '#aaa' },
  cardHeart: { padding: 8 },
  cardHeartIcon: { fontSize: 18, color: '#ccc' },
})