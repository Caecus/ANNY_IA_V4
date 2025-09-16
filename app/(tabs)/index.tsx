import { StyleSheet, View } from 'react-native';

import Text from '@/components/common/Text';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
        <Text type="h1" textAlign="center" text="Explore" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5fa',
  },
});
