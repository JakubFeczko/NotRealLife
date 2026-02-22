import { StyleSheet, Text, TextStyle, View } from 'react-native'
import React from 'react'
import { TypoProps } from '@/types'
import { verticalScale } from 'react-native-size-matters'

const Typo = ({size, color = "#000000ff", fontWeight = "400", children, style, textProps}: TypoProps) => {
  const textStyle: TextStyle = {
    fontSize: size ? verticalScale(size) : verticalScale(18),
    color,
    fontWeight,
  }
  return <Text style={[textStyle, style]}>{children}</Text>
}

export default Typo

const styles = StyleSheet.create({})