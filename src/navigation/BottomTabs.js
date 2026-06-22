import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import FeedScreen from '../screens/FeedScreen'
import FollowingScreen from '../screens/FollowingScreen'
import MapScreen from '../screens/MapScreen'
import InboxScreen from '../screens/InboxScreen'
import ProfileScreen from '../screens/ProfileScreen'

const Tab = createBottomTabNavigator()

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
        tabBarBackground: () => null,
      })}
    >
      <Tab.Screen name="Home" component={FeedScreen} />
      <Tab.Screen name="Following" component={FollowingScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}