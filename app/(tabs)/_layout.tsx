import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { black } from "react-native-paper/lib/typescript/styles/themes/v2/colors";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf="house.fill" drawable="custom_android_drawable" selectedColor='black'/>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="habbits">
        <Icon sf="list.bullet" drawable="custom_settings_drawable" selectedColor='black' />
        <Label>Habbits</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="roadMap">
        <Icon sf="map" drawable="custom_settings_drawable" selectedColor='black'/>
        <Label>RoadMap</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="statistics">
        <Icon sf="chart.bar" drawable="custom_settings_drawable" selectedColor='black'/>
        <Label>Statistics</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf="gear" drawable="custom_settings_drawable" selectedColor='black'/>
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
