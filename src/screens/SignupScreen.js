import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function SignupScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>SignupScreen</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 18 },
})
