// AsyncStorage has no native module under Jest; use the package's in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Vector icons load fonts asynchronously (act warnings) and drop testID under Jest.
// Render a plain element that keeps the icon name so tests can assert on it.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = require('react-native');
  const Icon = ({ name, testID }: { name: string; testID?: string }) => (
    <Text testID={testID} accessibilityElementsHidden importantForAccessibility="no">
      {`icon:${name}`}
    </Text>
  );
  return { __esModule: true, default: Icon };
});
