import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import Svg, { Path, Circle, Polygon, Line, Polyline, Rect } from 'react-native-svg'
import FeedScreen from '../screens/FeedScreen'
import FollowingScreen from '../screens/FollowingScreen'
import MapScreen from '../screens/MapScreen'
import InboxScreen from '../screens/InboxScreen'
import ProfileScreen from '../screens/ProfileScreen'
import ListingDetailScreen from '../screens/ListingDetailScreen'

const Tab = createBottomTabNavigator()
const FeedStack = createStackNavigator()
const FollowingStack = createStackNavigator()
const MapStack = createStackNavigator()
const ProfileStack = createStackNavigator()

function FeedStackScreen() {
  return (
    <FeedStack.Navigator screenOptions={{ headerShown: false }}>
      <FeedStack.Screen name="FeedMain" component={FeedScreen} />
      <FeedStack.Screen name="ListingDetail" component={ListingDetailScreen} />
    </FeedStack.Navigator>
  )
}

function FollowingStackScreen() {
  return (
    <FollowingStack.Navigator screenOptions={{ headerShown: false }}>
      <FollowingStack.Screen name="FollowingMain" component={FollowingScreen} />
      <FollowingStack.Screen name="ListingDetail" component={ListingDetailScreen} />
    </FollowingStack.Navigator>
  )
}

function MapStackScreen() {
  return (
    <MapStack.Navigator screenOptions={{ headerShown: false }}>
      <MapStack.Screen name="MapMain" component={MapScreen} />
      <MapStack.Screen name="ListingDetail" component={ListingDetailScreen} />
    </MapStack.Navigator>
  )
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ListingDetail" component={ListingDetailScreen} />
    </ProfileStack.Navigator>
  )
}

function TabIcon({ name, focused }) {
  const color = focused ? '#ffffff' : '#888888'
  const size = 22

  if (name === 'Home') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={focused ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polygon points="5,3 19,12 5,21" />
    </Svg>
  )
  if (name === 'Following') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  )
  if (name === 'Map') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
      <Line x1="8" y1="2" x2="8" y2="18" />
      <Line x1="16" y1="6" x2="16" y2="22" />
    </Svg>
  )
  if (name === 'Inbox') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <Polyline points="22,6 12,13 2,6" />
    </Svg>
  )
  if (name === 'Profile') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  )
  return null
}

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarLabel: ({ focused, children }) => {
          const { Text } = require('react-native')
          return (
            <Text style={{ fontSize: 10, color: focused ? '#ffffff' : '#888888', marginBottom: 2 }}>
              {children}
            </Text>
          )
        },
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#222222',
          borderTopWidth: 0.5,
          height: 56,
          paddingBottom: 6,
        },
      })}
    >
      <Tab.Screen name="Home" component={FeedStackScreen} />
      <Tab.Screen name="Following" component={FollowingStackScreen} />
      <Tab.Screen name="Map" component={MapStackScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileStackScreen} />
    </Tab.Navigator>
  )
}