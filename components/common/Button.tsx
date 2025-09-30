import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, TouchableOpacity, View, ViewStyle } from 'react-native';
import colors from '../../assets/colors';
import Text from './Text';

interface ButtonProps {
    text?: string;
    textType?: 'buttonSmall' | 'button' | 'h3' | 'h2' | 'h1' | 'h4';
    type?: 'primary' | 'outlined-primary' | 'secondary' | 'outlined' | 'ghost';
    size?: 'sm' | 'lg';
    width?: string;
    margin?: number;
    onPress?: () => void;
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode | keyof typeof Ionicons.glyphMap;
    iconPosition?: 'left' | 'right';
    style?: ViewStyle;
    textColor?: string;
    otherProps?: React.ComponentProps<typeof TouchableOpacity>;
}

const Button: React.FC<ButtonProps> = ({
    text,
    textType = 'button',
    type = 'primary',
    size = 'lg',
    width,
    margin,
    onPress,
    loading = false,
    disabled = false,
    icon,
    iconPosition = 'right',
    style,
    textColor,
    otherProps,
}) => {
    const baseStyle: ViewStyle = {
        flexDirection: 'row',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        // margin: margin ?? 20,
        paddingVertical: 16,
        // paddingHorizontal: 32,
    };

    const textStyle: { type: 'buttonSmall' | 'button'; color: string } = {
        type: size === 'sm' ? 'buttonSmall' : 'button',
        color: type === 'secondary' && !disabled 
            ? colors.buttonSecondaryText 
            :
            type === 'outlined' ? colors.primary : colors.buttonPrimaryText,
    };

    const getType = (): ViewStyle => {
        switch (type) {
            case 'primary':
                return {
                    borderWidth: 1,
                    borderColor: colors.buttonPrimaryBg,
                    backgroundColor: colors.buttonPrimaryBg,
                };
            case 'outlined-primary':
                return {
                    backgroundColor: colors.buttonPrimaryText,
                    borderWidth: 1,
                    // backgroundColor: colors.lightBreeze300,
                    borderColor: colors.buttonPrimaryBg,
                };
            case 'secondary':
                return {
                    backgroundColor: colors.buttonSecondaryText,
                };
            default:
                return {};
        }
    };

    const getSize = (): ViewStyle => {
        switch (size) {
            case 'sm':
                return {
                    paddingVertical: 12,
                };
            case 'lg':
            default:
                return {
                    paddingVertical: 16,
                };
        }
    };

    const disabledStyle = (): ViewStyle => {
        if (loading || disabled) {
            return {
                borderColor: colors.buttonDisabledBg,
                backgroundColor: colors.buttonDisabledBg,
            };
        } else {
            return {};
        }
    };

    const styles: ViewStyle = {
        ...baseStyle,
        ...getType(),
        ...getSize(),
        ...disabledStyle(),
        ...style,
    };

    return (
        <TouchableOpacity
            style={[
                styles,
                {
                    width: width ? width : '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                } as ViewStyle,
            ]}
            onPress={onPress}
            disabled={disabled}
            {...otherProps}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    gap: 8
                }}
            >
                {loading && <ActivityIndicator  color={colors.textSecondary}/>}
                {icon && iconPosition === 'left' && (
                    typeof icon === 'string' ? (
                        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={textStyle.color} style={{ marginRight: 8, alignSelf: 'center' }} />
                    ) : (
                        <View style={{ alignSelf: 'center' }}>{icon}</View>
                    )
                )}

                {text && <Text
                    type={textType}
                    color={textStyle.color}
                    text={text}
                    numberOfLines={1}
                    style={{
                        textAlign: 'center',
                        textAlignVertical: 'center',
                        includeFontPadding: false, // <- clave para Android
                        flexShrink: 1
                    }}
                />}
                {icon && iconPosition === 'right' && (
                    typeof icon === 'string' ? (
                        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={textStyle.color} style={{ marginLeft: 8, alignSelf: 'center' }} />
                    ) : (
                        <View style={{ alignSelf: 'center' }}>{icon}</View>
                    )
                )}
            </View>
        </TouchableOpacity>
    );
};

export default Button;
