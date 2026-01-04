import { Stack } from "expo-router";
import React from "react";
import { StatusBar } from "react-native";

const isLoggedIn = true;

export default function RootLayout() {
  return (
    <React.Fragment>
      <StatusBar barStyle="dark-content" />
      <Stack>
        <Stack.Protected guard={!isLoggedIn}> 
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
        
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }}/>
        </Stack.Protected>
        
      </Stack>
    </React.Fragment>
  );
}
