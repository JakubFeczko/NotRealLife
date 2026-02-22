import { TextStyle, TouchableOpacityProps, View, ViewStyle, TextProps } from "react-native"

export type ScreenWrapperProps= {
    style?: ViewStyle;
    children:React.ReactNode;
}

export interface CustomButtonProps extends TouchableOpacityProps{
    style?: ViewStyle;
    onPress?: () => void;
    loading?: boolean;
    children: React.ReactNode;
}

export type BackButtonProps = {
    style?: ViewStyle;
    iconSize?: number;
}

export type TypoProps = {
    size?: number;
    color?: string;
    fontWeight?: TextStyle["fontWeight"];
    children: any | null;
    style?: TextStyle;
    textProps?: TextProps;
};