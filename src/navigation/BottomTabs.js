import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Text } from 'react-native'
import FeedScreen from '../screens/FeedScreen'
import FollowingScreen from '../screens/FollowingScreen'
import MapScreen from '../screens/MapScreen'
import InboxScreen from '../screens/InboxScreen'
import ProfileScreen from '../screens/ProfileScreen'
import ListingDetailScreen from '../screens/ListingDetailScreen'

const Tab = createBottomTabNavigator()
const FeedStack = createStackNavigator()
const FollowingStack = createStackNavigator()

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

const icon = (name, focused) => {
  const icons = {
    Home: '▶',
    Following: '👥',
    Map: '🗺',
    Inbox: '✉',
    Profile: '👤',
  }
  return <Text style={{ fontSize: 18, color: focused ? '#ffffff' : '#555555' }}>{icons[name]}</Text>
}

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => icon(route.name, focused),
        tabBarLabel: ({ focused }) => (
          <Text style={{ fontSize: 10, color: focused ? '#ffffff' : '#555555', marginBottom: 2 }}>
            {route.name}
          </Text>
        ),
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
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}