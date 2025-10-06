import React, { useCallback, useState } from 'react';
import {
    AccessibilityInfo,
    Alert,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useNavigation } from '../../context/NavigationContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { PlaceAutocomplete } from '../../services/NavigationService';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

interface AccessibleSearchProps {
  onDestinationSelected?: (destination: any) => void;
  placeholder?: string;
}

export function AccessibleSearch({ onDestinationSelected, placeholder = "¿A dónde deseas ir?" }: AccessibleSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { state, searchPlaces, selectDestination } = useNavigation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    await searchPlaces(text);
  }, [searchPlaces]);

  const handleSelectPlace = useCallback(async (place: PlaceAutocomplete) => {
    try {
      await selectDestination(place);
      setSearchQuery(place.structured_formatting.main_text);
      onDestinationSelected?.(place);
      
      // Anunciar selección para accesibilidad
      AccessibilityInfo.announceForAccessibility(`Destino seleccionado: ${place.structured_formatting.main_text}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar el destino');
    }
  }, [selectDestination, onDestinationSelected]);

  const renderSearchResult = ({ item }: { item: PlaceAutocomplete }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: colors.tabIconDefault }]}
      onPress={() => handleSelectPlace(item)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Seleccionar destino: ${item.description}`}
      accessibilityHint="Toca dos veces para seleccionar este destino"
    >
      <ThemedView style={styles.resultContent}>
        <ThemedText style={styles.mainText} numberOfLines={1}>
          {item.structured_formatting.main_text}
        </ThemedText>
        <ThemedText style={[styles.secondaryText, { color: colors.tabIconDefault }]} numberOfLines={1}>
          {item.structured_formatting.secondary_text}
        </ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.background,
              borderColor: colors.tabIconDefault,
              color: colors.text,
            }
          ]}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder={placeholder}
          placeholderTextColor={colors.tabIconDefault}
          accessible={true}
          accessibilityLabel="Campo de búsqueda de destino"
          accessibilityHint="Escribe el nombre del lugar al que deseas ir"
          accessibilityRole="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </ThemedView>

      {state.isSearching && (
        <ThemedView style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Buscando lugares...</ThemedText>
        </ThemedView>
      )}

      {state.searchResults.length > 0 && (
        <ThemedView style={styles.resultsContainer}>
          <FlatList
            data={state.searchResults}
            keyExtractor={(item) => item.place_id || item.description}
            renderItem={renderSearchResult}
            style={[styles.resultsList, { backgroundColor: colors.background }]}
            keyboardShouldPersistTaps="handled"
            accessible={true}
            accessibilityLabel="Lista de resultados de búsqueda"
          />
        </ThemedView>
      )}

      {state.error && (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={[styles.errorText, { color: '#FF6B6B' }]}>
            {state.error}
          </ThemedText>
        </ThemedView>
      )}

      {state.selectedDestination && (
        <ThemedView style={[styles.selectedContainer, { backgroundColor: colors.tint + '20' }]}>
          <ThemedText style={styles.selectedLabel}>Destino seleccionado:</ThemedText>
          <ThemedText style={styles.selectedText} numberOfLines={2}>
            {state.selectedDestination.name}
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    height: 50,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsList: {
    maxHeight: 300,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultItem: {
    borderBottomWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  resultContent: {
    flex: 1,
  },
  mainText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  secondaryText: {
    fontSize: 14,
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '500',
  },
});