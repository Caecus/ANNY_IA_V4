import colors from '@/assets/colors';
import React from 'react';
import { Text as RNText, TextStyle } from 'react-native';
import { heightPercentageToDP } from 'react-native-responsive-screen';

interface TextProps {
    text?: string;
    values?: Record<string, any>;
    style?: TextStyle;
    children?: React.ReactNode;
    type?: 'h4' | 'h3' | 'h2' | 'h1' | 'subtitle1' | 'subtitle2' | 'p1' | 'p2' | 'p3' | 'p4' | 'button' | 'buttonSmall' | 'label' | 'caption' | 'aux';
    weight?: 'normal' | 'bold' | 'semibold' | 'light' | 'regular';
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    color?: string;
    numberOfLines?: number;
    otherProps?: React.ComponentProps<typeof RNText>;
}

const Text: React.FC<TextProps> = ({ 
    text, 
    children, 
    type = 'h2', 
    weight, 
    textAlign = 'left', 
    color = 'primary', 
    style, 
    numberOfLines, 
    values, 
    ...otherProps 
}) => {

    const getSize = (): TextStyle => {
        switch (type) {
            case 'h1':
                return { fontSize: heightPercentageToDP(4.37), fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'regular' };
            case 'h2':
                return { fontSize: heightPercentageToDP(3.5), fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'regular' };
            case 'h3':
                return { fontSize: heightPercentageToDP(2.62), fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'regular' };
            case 'h4':
                return { fontSize: heightPercentageToDP(2.19), fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: 'semibold' };
            case 'subtitle1':
                return { fontSize: heightPercentageToDP(1.97), fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'regular' };
            case 'subtitle2':
                return { fontSize: heightPercentageToDP(1.97), fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: 'semibold' };
            case 'p1':
                return { fontSize: heightPercentageToDP(1.75), fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'regular' };
            case 'p2':
                return { fontSize: heightPercentageToDP(1.53), fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'regular' };
            case 'p3':
                return { fontSize: heightPercentageToDP(1.53), fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: 'semibold' };
            case 'p4':
                return { fontSize: heightPercentageToDP(1.31), fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'regular' };
            case 'button':
                return { fontSize: heightPercentageToDP(1.75), fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: 'semibold' };
            case 'buttonSmall':
                return { fontSize: heightPercentageToDP(1.53), fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: 'semibold' };
            case 'label':
                return { fontSize: heightPercentageToDP(1.31), fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'regular' };
            case 'aux':
                return { fontSize: heightPercentageToDP(1.53), fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'regular' };
            case 'caption':
                return { fontSize: heightPercentageToDP(1.31), fontFamily: 'PlusJakartaSans-Bold', fontWeight: 'bold', letterSpacing: 0.6 };
            default:
                return {};
        }
    };

    const getWeight = (): TextStyle => {
        switch (weight) {
            case 'bold':
                return { fontFamily: 'PlusJakartaSans-Bold', fontWeight: 'bold' };
            case 'semibold':
                return { fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: 'semibold' };
            case 'light':
                return { fontFamily: 'PlusJakartaSans-Light', fontWeight: 'light' };
            case 'normal':
                return { fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'normal' }
            case 'regular': 
                return { fontFamily: 'PlusJakartaSans-Medium', fontWeight: 'medium' }
            default:
                return {
                    fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'regular'
                };
        }
    };

    const getTextAlign = (): TextStyle => {
        switch (textAlign) {
            case 'left':
                return { textAlign: 'left' };
            case 'center':
                return { textAlign: 'center' };
            case 'right':
                return { textAlign: 'right' };
            case 'justify':
                return { textAlign: 'justify' };
            default:
                return {  };
        }
    };

    const getColor = (): TextStyle => {
        switch (color) {
            case 'primary':
                return { color: colors.primary };
            default:
                return { color: color };
        }
    };

    const styles: TextStyle = {
        ...getSize(),
        ...getWeight(),
        ...getTextAlign(),
        ...getColor(),
        
    };

    return (
        <RNText style={[styles, { ...style }]} {...otherProps} numberOfLines={numberOfLines}>
            {text}
        </RNText>
    );
};

export default Text;
