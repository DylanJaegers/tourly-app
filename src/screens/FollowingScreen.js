import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function FollowingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>FollowingScreen</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 18 },
})
