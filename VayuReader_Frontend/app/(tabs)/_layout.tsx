import { Tabs } from 'expo-router'
import React from 'react'
import { View } from 'react-native'

const _Layout = () => {
  return (
    <View className="flex-1 bg-black">
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarStyle: {
            display: 'none',
            height: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            headerShown: false,
          }}
        />
      </Tabs>
    </View>
  )
}

export default _Layout
